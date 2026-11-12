// Edición de cantidades de un pedido ya creado (corregir errores del cliente).
// Mantiene consistentes reservas/stock, monto (con el descuento por volumen) y bitácora, todo en una transacción.
//  • PENDIENTE_PAGO / PENDIENTE_CONFIRMACION: ajusta la reserva del pedido (el stock físico aún no se descontó).
//  • CONFIRMADO / EN_PREPARACION (solo admin): el stock ya se descontó → se ajusta la diferencia con movimientos.
import { withTransaction } from './db'
import { calcularTotal } from './pricing'
import { registrarMovimiento } from './stock'

export class EdicionPedidoError extends Error {}

const ESTADOS_PENDIENTES = ['PENDIENTE_PAGO', 'PENDIENTE_CONFIRMACION']
const ESTADOS_ADMIN = ['CONFIRMADO', 'EN_PREPARACION']

export interface CambioItem { id: string; cantidad: number }

export async function editarItemsPedido(
  pedidoId: string, cambios: CambioItem[], motivo: string, actor: { id: string; esAdmin: boolean }
): Promise<{ resumen: string; monto_anterior: number | null; monto_nuevo: number; estado: string; telefono: string; numero_pedido: string; detalle: string[] }> {
  return withTransaction(async (tx) => {
    const [ped] = await tx<{ estado: string; monto_total: string | null; telefono: string; numero_pedido: string | null }>(
      `SELECT estado, monto_total, telefono, numero_pedido FROM public.pedidos WHERE id = $1 FOR UPDATE`, [pedidoId]
    )
    if (!ped) throw new EdicionPedidoError('Pedido no encontrado')
    const pendiente = ESTADOS_PENDIENTES.includes(ped.estado)
    if (!pendiente && !ESTADOS_ADMIN.includes(ped.estado)) {
      throw new EdicionPedidoError('Solo se pueden editar pedidos pendientes o confirmados en preparación')
    }
    if (!pendiente && !actor.esAdmin) {
      throw new EdicionPedidoError('Un pedido ya confirmado solo lo edita el administrador (el stock ya fue descontado)')
    }

    const items = await tx<{ id: string; producto_id: string | null; serie: string | null; modelo: string | null; color: string | null; nombre_producto: string | null; cantidad: number; precio_unitario: string }>(
      `SELECT id, producto_id, serie, modelo, color, nombre_producto, cantidad, precio_unitario FROM public.pedido_items WHERE pedido_id = $1`, [pedidoId]
    )
    const porId = new Map(items.map(i => [i.id, i]))
    const nuevas = new Map<string, number>()
    for (const c of cambios) {
      const it = porId.get(c.id)
      if (!it) throw new EdicionPedidoError('Artículo no pertenece al pedido')
      if (!Number.isInteger(c.cantidad) || c.cantidad < 0 || c.cantidad > 100000) throw new EdicionPedidoError('Cantidad inválida')
      if (c.cantidad !== Number(it.cantidad)) nuevas.set(c.id, c.cantidad)
    }
    if (!nuevas.size) throw new EdicionPedidoError('No hay cambios en las cantidades')
    const piezasFinal = items.reduce((s, i) => s + (nuevas.has(i.id) ? nuevas.get(i.id)! : Number(i.cantidad)), 0)
    if (piezasFinal < 1) throw new EdicionPedidoError('El pedido debe conservar al menos una pieza (para anularlo, cancélalo)')

    // Diferencia por producto (resolviendo producto_id de pedidos históricos)
    const deltaPorProducto = new Map<string, number>()
    const detalle: string[] = []
    for (const [id, nueva] of nuevas) {
      const it = porId.get(id)!
      let pid = it.producto_id
      if (!pid && it.modelo && it.color) {
        const [row] = await tx<{ producto_id: string }>(
          `SELECT producto_id FROM public.catalogo_productos WHERE COALESCE(serie,'') = $1 AND modelo = $2 AND color = $3 LIMIT 1`,
          [it.serie || '', it.modelo, it.color]
        )
        pid = row?.producto_id ?? null
      }
      if (pid) deltaPorProducto.set(pid, (deltaPorProducto.get(pid) || 0) + (nueva - Number(it.cantidad)))
      detalle.push(`${it.nombre_producto || it.modelo || 'Artículo'} ${it.color || ''}`.trim() + `: ${it.cantidad} → ${nueva}`)
    }

    for (const [pid, delta] of deltaPorProducto) {
      if (pendiente) {
        const [cat] = await tx<{ stock: number; otras: number }>(
          `SELECT c.stock::int AS stock,
                  COALESCE((SELECT SUM(r.cantidad) FROM public.stock_reservas r
                             WHERE r.producto_id = c.producto_id AND r.expira_en > NOW()
                               AND NOT (r.origen = 'PEDIDO' AND r.referencia = $2)), 0)::int AS otras
             FROM public.catalogo_productos c WHERE c.producto_id = $1`, [pid, pedidoId]
        )
        const [res] = await tx<{ cantidad: number }>(
          `SELECT cantidad FROM public.stock_reservas WHERE origen = 'PEDIDO' AND referencia = $1 AND producto_id = $2`, [pedidoId, pid]
        )
        const nuevaReserva = Math.max(0, Number(res?.cantidad ?? 0) + delta)
        if (delta > 0 && cat && nuevaReserva > cat.stock - cat.otras) {
          throw new EdicionPedidoError(`Stock insuficiente: solo hay ${Math.max(0, cat.stock - cat.otras)} disponibles para aumentar ese artículo`)
        }
        if (nuevaReserva === 0) {
          await tx(`DELETE FROM public.stock_reservas WHERE origen = 'PEDIDO' AND referencia = $1 AND producto_id = $2`, [pedidoId, pid])
        } else {
          await tx(
            `INSERT INTO public.stock_reservas (producto_id, origen, referencia, cantidad, expira_en)
             VALUES ($1, 'PEDIDO', $2, $3, NOW() + INTERVAL '60 minutes')
             ON CONFLICT (producto_id, origen, referencia) DO UPDATE SET cantidad = $3`,
            [pid, pedidoId, nuevaReserva]
          )
        }
      } else if (delta !== 0) {
        const [upd] = await tx<{ stock: number }>(
          delta > 0
            ? `UPDATE public.catalogo_productos SET stock = stock - $1 WHERE producto_id = $2 AND stock >= $1 RETURNING stock`
            : `UPDATE public.catalogo_productos SET stock = stock + $1 WHERE producto_id = $2 RETURNING stock`,
          [Math.abs(delta), pid]
        )
        if (!upd) throw new EdicionPedidoError('Stock insuficiente para aumentar ese artículo')
        await registrarMovimiento({
          producto_id: pid, tipo: delta > 0 ? 'SALIDA' : 'AJUSTE', cantidad: Math.abs(delta), stock_resultante: upd.stock,
          motivo: `Edición de pedido: ${motivo}`, pedido_id: pedidoId, realizado_por: actor.id,
        }, tx)
      }
    }

    for (const [id, nueva] of nuevas) {
      if (nueva === 0) await tx(`DELETE FROM public.pedido_items WHERE id = $1`, [id])
      else await tx(`UPDATE public.pedido_items SET cantidad = $1, cantidad_surtida = LEAST(cantidad_surtida, $1) WHERE id = $2`, [nueva, id])
    }

    const tiers = await tx<{ piezas_minimas: number; porcentaje: number }>(
      `SELECT piezas_minimas, porcentaje FROM public.descuentos_volumen WHERE activo = true`
    )
    const restantes = items
      .map(i => ({ cantidad: nuevas.has(i.id) ? nuevas.get(i.id)! : Number(i.cantidad), precio: Number(i.precio_unitario) }))
      .filter(i => i.cantidad > 0)
    const { total, descuentoPct } = calcularTotal(restantes, tiers)
    const resumen = `${restantes.length} modelos, ${piezasFinal} piezas`
    const montoAnterior = ped.monto_total === null ? null : Number(ped.monto_total)
    await tx(`UPDATE public.pedidos SET monto_total = $1, resumen = $2, actualizado_en = NOW() WHERE id = $3`, [total, resumen, pedidoId])

    await tx(
      `INSERT INTO public.pedido_timeline (pedido_id, estado, tipo_evento, nota, detalle, realizado_por)
       VALUES ($1, $2, 'EDICION', $3, $4::jsonb, $5)`,
      [pedidoId, ped.estado, `Pedido editado: ${motivo}`,
       JSON.stringify({ cambios: detalle, monto_anterior: montoAnterior, monto_nuevo: total, descuento_pct: descuentoPct }), actor.id]
    )

    return { resumen, monto_anterior: montoAnterior, monto_nuevo: total, estado: ped.estado, telefono: ped.telefono, numero_pedido: ped.numero_pedido || pedidoId.slice(0, 8), detalle }
  })
}
