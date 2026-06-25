import { query, queryOne, withTransaction } from './db'
import { sendEmail, emailStockBajo, emailSurtidoTardio } from './email'
import { notificarVencimientoProximo } from './whatsapp'

export class InsufficientStockError extends Error {
  faltantes: { case_id: string; disponible: number }[]
  constructor(faltantes: { case_id: string; disponible: number }[]) {
    super('Stock insuficiente')
    this.faltantes = faltantes
  }
}

// Limpia reservas vencidas. Se llama de forma oportunista antes de leer
// disponibilidad — no requiere cron, basta con que cada lectura purgue.
export async function purgeExpiredReservas(): Promise<void> {
  await query(`DELETE FROM public.stock_reservas WHERE expira_en <= NOW()`, [])
}

// Disponible = stock físico - reservas activas (CARRITO + PEDIDO) no vencidas.
export async function getDisponibilidad(caseIds: string[]): Promise<Record<string, number>> {
  if (!caseIds.length) return {}
  await purgeExpiredReservas()

  const rows = await query<{ case_id: string; disponible: number }>(
    `SELECT c.case_id,
            (c.stock - COALESCE(SUM(r.cantidad), 0))::int AS disponible
     FROM public.catalogo_cases c
     LEFT JOIN public.stock_reservas r
       ON r.case_id = c.case_id AND r.expira_en > NOW()
     WHERE c.case_id = ANY($1::uuid[])
     GROUP BY c.case_id, c.stock`,
    [caseIds]
  )

  const map: Record<string, number> = {}
  for (const r of rows) map[r.case_id] = Math.max(0, Number(r.disponible))
  return map
}

export async function resolveCaseId(tipo_case: string, modelo: string, color: string): Promise<string | null> {
  const row = await queryOne<{ case_id: string }>(
    `SELECT case_id FROM public.catalogo_cases WHERE tipo_case = $1 AND modelo = $2 AND color = $3`,
    [tipo_case, modelo, color]
  )
  return row?.case_id ?? null
}

export async function getConfigMinutos(clave: string, def: number): Promise<number> {
  const row = await queryOne<{ valor: string }>(`SELECT valor FROM public.config_portal WHERE clave = $1`, [clave])
  const n = parseInt(row?.valor || '')
  return Number.isFinite(n) && n > 0 ? n : def
}

// ── Reserva de carrito (CARRITO) ────────────────────────────────────────
// referencia = identificador del cliente (en este portal, su email/sesión).
export async function reservarCarrito(
  caseId: string, referencia: string, cantidad: number, ttlMin: number
): Promise<{ ok: boolean; disponible: number }> {
  await purgeExpiredReservas()

  const row = await queryOne<{ disponible: number }>(
    `SELECT (c.stock - COALESCE(SUM(r.cantidad) FILTER (
              WHERE NOT (r.origen = 'CARRITO' AND r.referencia = $2)
            ), 0))::int AS disponible
     FROM public.catalogo_cases c
     LEFT JOIN public.stock_reservas r ON r.case_id = c.case_id AND r.expira_en > NOW()
     WHERE c.case_id = $1
     GROUP BY c.case_id, c.stock`,
    [caseId, referencia]
  )
  const disponible = Math.max(0, Number(row?.disponible ?? 0))
  if (cantidad > disponible) return { ok: false, disponible }

  const expiraEn = new Date(Date.now() + ttlMin * 60_000)
  await query(
    `INSERT INTO public.stock_reservas (case_id, origen, referencia, cantidad, expira_en)
     VALUES ($1, 'CARRITO', $2, $3, $4)
     ON CONFLICT (case_id, origen, referencia) DO UPDATE SET cantidad = $3, expira_en = $4`,
    [caseId, referencia, cantidad, expiraEn]
  )
  return { ok: true, disponible }
}

export async function liberarCarritoItem(caseId: string, referencia: string): Promise<void> {
  await query(
    `DELETE FROM public.stock_reservas WHERE case_id = $1 AND origen = 'CARRITO' AND referencia = $2`,
    [caseId, referencia]
  )
}

export async function liberarCarritoTodo(referencia: string): Promise<void> {
  await query(`DELETE FROM public.stock_reservas WHERE origen = 'CARRITO' AND referencia = $1`, [referencia])
}

// ── Conversión carrito → pedido (al crear el pedido) ────────────────────
// Recibe el `tx` de una transacción ya abierta para que el caller pueda
// envolver la inserción del pedido y la conversión de stock en una sola
// transacción atómica (si falta stock, se revierte todo y el pedido nunca
// llega a existir — no se crea un registro CANCELADO fantasma).
export async function convertirCarritoAPedidoTx(
  tx: <U = any>(text: string, params?: any[]) => Promise<U[]>,
  referenciaCarrito: string,
  pedidoId: string,
  items: { case_id: string; cantidad: number }[],
  ttlMinPago: number
): Promise<void> {
  if (!items.length) return

  await tx(`DELETE FROM public.stock_reservas WHERE expira_en <= NOW()`, [])

  const faltantes: { case_id: string; disponible: number }[] = []
  for (const it of items) {
    const [row] = await tx<{ disponible: number }>(
      `SELECT (c.stock - COALESCE(SUM(r.cantidad) FILTER (
                WHERE NOT (r.origen = 'CARRITO' AND r.referencia = $2)
              ), 0))::int AS disponible
       FROM public.catalogo_cases c
       LEFT JOIN public.stock_reservas r ON r.case_id = c.case_id AND r.expira_en > NOW()
       WHERE c.case_id = $1
       GROUP BY c.case_id, c.stock`,
      [it.case_id, referenciaCarrito]
    )
    const disponible = Math.max(0, Number(row?.disponible ?? 0))
    if (it.cantidad > disponible) faltantes.push({ case_id: it.case_id, disponible })
  }
  if (faltantes.length) throw new InsufficientStockError(faltantes)

  const expiraEn = new Date(Date.now() + ttlMinPago * 60_000)
  for (const it of items) {
    await tx(
      `DELETE FROM public.stock_reservas WHERE case_id = $1 AND origen = 'CARRITO' AND referencia = $2`,
      [it.case_id, referenciaCarrito]
    )
    await tx(
      `INSERT INTO public.stock_reservas (case_id, origen, referencia, cantidad, expira_en)
       VALUES ($1, 'PEDIDO', $2, $3, $4)
       ON CONFLICT (case_id, origen, referencia) DO UPDATE SET cantidad = $3, expira_en = $4`,
      [it.case_id, pedidoId, it.cantidad, expiraEn]
    )
  }
}

// Bitácora de movimientos de stock — base del reporte de inventario.
// Se llena desde ahora hacia adelante en cada punto donde se toca
// catalogo_cases.stock; acepta el `tx` de una transacción ya abierta o usa
// `query` directo si se llama fuera de una.
export async function registrarMovimiento(
  params: {
    case_id: string
    tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
    cantidad: number
    stock_resultante: number
    motivo?: string
    pedido_id?: string
    realizado_por?: string
  },
  tx: <U = any>(text: string, p?: any[]) => Promise<U[]> = query
): Promise<void> {
  await tx(
    `INSERT INTO public.movimientos_stock (case_id, tipo, cantidad, stock_resultante, motivo, pedido_id, realizado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [params.case_id, params.tipo, params.cantidad, params.stock_resultante, params.motivo || null, params.pedido_id || null, params.realizado_por || null]
  )
}

// Revisa el stock de los productos dados contra el umbral configurado y, si
// alguno quedó en o por debajo, dispara un email al admin. No bloquea al
// caller — cualquier falla de envío solo se registra en consola.
export async function checkStockBajoYNotificar(caseIds: string[]): Promise<void> {
  if (!caseIds.length) return
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
  if (!adminEmail) return

  try {
    const umbral = await getConfigMinutos('stock_bajo_umbral', 10)
    const rows = await query<{ modelo: string; color: string; tipo_case: string; stock: number }>(
      `SELECT modelo, color, tipo_case, stock FROM public.catalogo_cases WHERE case_id = ANY($1::uuid[]) AND stock <= $2`,
      [caseIds, umbral]
    )
    if (rows.length) {
      await sendEmail({ to: adminEmail, subject: '⚠️ Stock bajo en catálogo', html: emailStockBajo(rows) })
    }
  } catch (e) {
    console.error('[checkStockBajoYNotificar]', e)
  }
}

// ── Cierre del pedido ────────────────────────────────────────────────────
// Confirmado/pagado: descuenta stock físico definitivamente y libera la reserva.
export async function finalizarPedido(pedidoId: string, realizadoPor?: string): Promise<void> {
  const caseIds: string[] = []
  await withTransaction(async (tx) => {
    const rows = await tx<{ case_id: string; cantidad: number }>(
      `SELECT case_id, cantidad FROM public.stock_reservas WHERE origen = 'PEDIDO' AND referencia = $1`,
      [pedidoId]
    )
    for (const r of rows) {
      const [updated] = await tx<{ stock: number }>(
        `UPDATE public.catalogo_cases SET stock = GREATEST(0, stock - $1) WHERE case_id = $2 RETURNING stock`,
        [r.cantidad, r.case_id]
      )
      await registrarMovimiento({
        case_id: r.case_id, tipo: 'SALIDA', cantidad: r.cantidad, stock_resultante: updated.stock,
        motivo: 'Pedido confirmado/pagado', pedido_id: pedidoId, realizado_por: realizadoPor,
      }, tx)
      caseIds.push(r.case_id)
    }
    await tx(`DELETE FROM public.stock_reservas WHERE origen = 'PEDIDO' AND referencia = $1`, [pedidoId])
  })
  await checkStockBajoYNotificar(caseIds)
}

// Cancelado o vencido sin pago: libera la reserva sin tocar el stock físico.
export async function liberarPedido(pedidoId: string): Promise<void> {
  await query(`DELETE FROM public.stock_reservas WHERE origen = 'PEDIDO' AND referencia = $1`, [pedidoId])
}

// Reactiva un pedido CANCELADO: revalida disponibilidad igual que un pedido
// nuevo y, si alcanza, descuenta stock y lo regresa a CONFIRMADO. Si no
// alcanza, lanza InsufficientStockError sin tocar nada (el admin decide).
export async function reactivarPedido(pedidoId: string, realizadoPor?: string): Promise<void> {
  const items = await query<{ tipo_case: string; modelo: string; color: string; cantidad: number }>(
    `SELECT tipo_case, modelo, color, cantidad FROM public.pedido_items WHERE pedido_id = $1`,
    [pedidoId]
  )
  if (!items.length) return

  let notifyCaseIds: string[] = []
  await withTransaction(async (tx) => {
    await tx(`DELETE FROM public.stock_reservas WHERE expira_en <= NOW()`, [])

    const resolved: { case_id: string; cantidad: number }[] = []
    for (const it of items) {
      const [row] = await tx<{ case_id: string }>(
        `SELECT case_id FROM public.catalogo_cases WHERE tipo_case = $1 AND modelo = $2 AND color = $3`,
        [it.tipo_case, it.modelo, it.color]
      )
      if (row) resolved.push({ case_id: row.case_id, cantidad: it.cantidad })
    }

    const faltantes: { case_id: string; disponible: number }[] = []
    for (const r of resolved) {
      const [row] = await tx<{ disponible: number }>(
        `SELECT (c.stock - COALESCE(SUM(res.cantidad) FILTER (WHERE res.expira_en > NOW()), 0))::int AS disponible
         FROM public.catalogo_cases c
         LEFT JOIN public.stock_reservas res ON res.case_id = c.case_id
         WHERE c.case_id = $1
         GROUP BY c.case_id, c.stock`,
        [r.case_id]
      )
      const disponible = Math.max(0, Number(row?.disponible ?? 0))
      if (r.cantidad > disponible) faltantes.push({ case_id: r.case_id, disponible })
    }
    if (faltantes.length) throw new InsufficientStockError(faltantes)

    for (const r of resolved) {
      const [updated] = await tx<{ stock: number }>(
        `UPDATE public.catalogo_cases SET stock = GREATEST(0, stock - $1) WHERE case_id = $2 RETURNING stock`,
        [r.cantidad, r.case_id]
      )
      await registrarMovimiento({
        case_id: r.case_id, tipo: 'SALIDA', cantidad: r.cantidad, stock_resultante: updated.stock,
        motivo: 'Pedido reactivado', pedido_id: pedidoId, realizado_por: realizadoPor,
      }, tx)
    }
    notifyCaseIds = resolved.map(r => r.case_id)

    await tx(
      `UPDATE public.pedidos SET estado='CONFIRMADO', motivo_cancelacion=NULL, cancelado_en=NULL, confirmado_en=NOW(), aviso_surtido_enviado=false WHERE id=$1`,
      [pedidoId]
    )
  })
  await checkStockBajoYNotificar(notifyCaseIds)
}

// Auto-cancela pedidos PENDIENTE_PAGO cuya ventana de pago ya venció.
// Lazy: se llama al listar pedidos, sin necesidad de cron.
export async function liberarPedidosVencidos(): Promise<void> {
  const vencidos = await query<{ id: string }>(
    `SELECT id FROM public.pedidos
     WHERE estado = 'PENDIENTE_PAGO' AND reserva_expira_en IS NOT NULL AND reserva_expira_en <= NOW()`,
    []
  )
  for (const p of vencidos) {
    await liberarPedido(p.id)
    await query(
      `UPDATE public.pedidos SET estado = 'CANCELADO', cancelado_en = NOW(), motivo_cancelacion = 'Tiempo de pago vencido' WHERE id = $1`,
      [p.id]
    )
    await query(
      `INSERT INTO public.pedido_timeline (pedido_id, estado, nota)
       VALUES ($1, 'CANCELADO', 'Cancelado automáticamente: tiempo de pago vencido')`,
      [p.id]
    )
  }
}

// Avisa por WhatsApp a los clientes cuya reserva de pago está por vencer
// (dentro de `aviso_vencimiento_min` minutos) y aún no se les ha avisado.
// Pensado para correr periódicamente desde un cron en proceso
// (ver src/instrumentation.ts) — sin esto, la cancelación solo se detecta
// de forma lazy y nunca hay un aviso *antes* de que pase.
export async function avisarPedidosPorVencer(): Promise<void> {
  const avisoMin = await getConfigMinutos('aviso_vencimiento_min', 120)
  const pedidos = await query<{ id: string; telefono: string; numero_pedido: string | null; reserva_expira_en: string }>(
    `SELECT id, telefono, numero_pedido, reserva_expira_en FROM public.pedidos
     WHERE estado = 'PENDIENTE_PAGO' AND aviso_vencimiento_enviado = false
       AND reserva_expira_en IS NOT NULL
       AND reserva_expira_en > NOW()
       AND reserva_expira_en <= NOW() + ($1::int * INTERVAL '1 minute')`,
    [avisoMin]
  )
  for (const p of pedidos) {
    try {
      await notificarVencimientoProximo({ id: p.id, telefono: p.telefono, numeroPedido: p.numero_pedido || undefined, expiraEn: p.reserva_expira_en })
    } catch (e) {
      console.error('[avisarPedidosPorVencer] notify', e)
    }
    await query(`UPDATE public.pedidos SET aviso_vencimiento_enviado = true WHERE id = $1`, [p.id]).catch(() => {})
  }
}

// Avisa al equipo (email) cuando un pedido ya confirmado/pagado está cerca
// de cumplir su SLA de surtido (config_portal.tiempo_surtido_horas) sin
// haber avanzado a EN_REPARTO/ENTREGADO — para atenderlo antes de perder
// la venta por demora. Se llama desde el mismo cron que los avisos de
// vencimiento (ver src/instrumentation.ts).
export async function avisarSurtidoTardio(): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
  if (!adminEmail) return

  const tiempoHoras = await getConfigMinutos('tiempo_surtido_horas', 72)
  const avisoHoras  = await getConfigMinutos('aviso_surtido_horas_antes', 24)

  const pedidos = await query<{ id: string; numero_pedido: string | null; telefono: string; confirmado_en: string; resumen: string | null }>(
    `SELECT id, numero_pedido, telefono, confirmado_en, resumen FROM public.pedidos
     WHERE estado IN ('CONFIRMADO', 'EN_PREPARACION')
       AND aviso_surtido_enviado = false
       AND confirmado_en IS NOT NULL
       AND confirmado_en + ($1::int * INTERVAL '1 hour') - ($2::int * INTERVAL '1 hour') <= NOW()`,
    [tiempoHoras, avisoHoras]
  )
  if (!pedidos.length) return

  try {
    await sendEmail({
      to: adminEmail,
      subject: `⏰ ${pedidos.length} pedido(s) por surtir a tiempo`,
      html: emailSurtidoTardio(pedidos.map(p => ({
        numeroPedido: p.numero_pedido || p.id.slice(0, 8),
        telefono: p.telefono,
        resumen: p.resumen || '',
      }))),
    })
  } catch (e) {
    console.error('[avisarSurtidoTardio] email', e)
  }

  for (const p of pedidos) {
    await query(`UPDATE public.pedidos SET aviso_surtido_enviado = true WHERE id = $1`, [p.id]).catch(() => {})
  }
}
