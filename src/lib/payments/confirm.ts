import { query, queryOne } from '@/lib/db'
import { finalizarPedido } from '@/lib/stock'
import { notificarCambioEstatus } from '@/lib/whatsapp'
import { notificarClienteEmail } from '@/lib/email'

// Punto único de confirmación de pago, usado por ambos webhooks (Stripe y Mercado Pago).
// Idempotente: si el pedido ya no está PENDIENTE_PAGO (reintento del webhook), no hace nada.
export async function confirmarPagoPedido(
  pedidoId: string,
  referenciaExterna: string,
  gateway: 'STRIPE' | 'MERCADOPAGO',
  montoPagado?: number // MXN realmente cobrado por la pasarela
): Promise<void> {
  // El monto cobrado debe cubrir el total del pedido; si no, se deja pendiente para revisión manual.
  const pedido = await queryOne<{ monto_total: string | null }>(
    `SELECT monto_total FROM public.pedidos WHERE id = $1`, [pedidoId]
  )
  if (!pedido) return
  if (montoPagado === undefined || !Number.isFinite(montoPagado) || montoPagado + 0.01 < Number(pedido.monto_total || 0)) {
    console.error(`[confirmarPagoPedido] monto no coincide (pedido ${pedidoId}, ${gateway}): cobrado=${montoPagado} esperado=${pedido.monto_total}`)
    return
  }

  const updated = await queryOne<{ id: string; telefono: string; resumen: string; numero_pedido: string | null }>(
    `UPDATE public.pedidos
     SET estado = 'CONFIRMADO', pago_referencia_externa = $1, pago_gateway = $2,
         confirmado_en = COALESCE(confirmado_en, NOW()), actualizado_en = NOW()
     WHERE id = $3 AND estado = 'PENDIENTE_PAGO'
     RETURNING id, telefono, resumen, numero_pedido`,
    [referenciaExterna, gateway, pedidoId]
  )
  if (!updated) return

  const nombreGateway = gateway === 'STRIPE' ? 'Stripe' : 'Mercado Pago'
  await query(
    `INSERT INTO public.pedido_timeline (pedido_id, estado, nota) VALUES ($1, 'CONFIRMADO', $2)`,
    [pedidoId, `Pago confirmado vía ${nombreGateway}`]
  )

  await finalizarPedido(pedidoId).catch(e => console.error('[confirmarPagoPedido] finalizarPedido', e))

  await notificarCambioEstatus({
    id: updated.id,
    telefono: updated.telefono,
    estado: 'CONFIRMADO',
    resumen: updated.resumen,
  }).catch(() => {})
  await notificarClienteEmail(updated.telefono, updated.numero_pedido || updated.id.slice(0, 8), 'CONFIRMADO')
}
