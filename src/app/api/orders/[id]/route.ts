import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notificarCambioEstatus } from '@/lib/whatsapp'
import { finalizarPedido, liberarPedido } from '@/lib/stock'

export const dynamic = 'force-dynamic'

// Solo CONFIRMADO descuenta stock — EN_PREPARACION/EN_REPARTO/ENTREGADO son
// pasos de seguimiento posteriores que no vuelven a tocar el inventario.
const ESTADOS_FINALES = ['CONFIRMADO']

// GET /api/orders/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const pedido = await queryOne<any>(
    `SELECT p.*, c.nombre as cliente_nombre
     FROM public.pedidos p
     LEFT JOIN public.clientes c ON c.telefono = p.telefono
     WHERE p.id = $1`,
    [params.id]
  )

  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const items = await query(
    'SELECT * FROM public.pedido_items WHERE pedido_id = $1 ORDER BY creado_en',
    [params.id]
  )

  const timeline = await query(
    `SELECT t.id, t.estado, t.nota, t.creado_en, u.nombre as realizado_por_nombre
     FROM public.pedido_timeline t
     LEFT JOIN public.usuarios u ON u.id = t.realizado_por
     WHERE t.pedido_id = $1
     ORDER BY t.creado_en`,
    [params.id]
  )

  // Extraer evidencias guardadas en pedido_json
  const evidencias: string[] = pedido.pedido_json?.evidencias || []

  return NextResponse.json({ ...pedido, items, timeline, evidencias })
}

// PATCH /api/orders/[id] - cambiar estado
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { estado, notas, monto_total, motivo_cancelacion } = await req.json()

  // Solo permitir actualizar el monto a cobrar, sin cambiar de estado
  if (estado === undefined && monto_total !== undefined) {
    const updated = await queryOne<any>(
      `UPDATE public.pedidos SET monto_total = $1, actualizado_en = NOW() WHERE id = $2 RETURNING id, monto_total`,
      [monto_total === null || monto_total === '' ? null : Number(monto_total), params.id]
    )
    if (!updated) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true, data: updated })
  }

  const validStates = [
    'PENDIENTE_PAGO', 'PENDIENTE_CONFIRMACION', 'CONFIRMADO',
    'EN_PREPARACION', 'EN_REPARTO', 'ENTREGADO', 'CANCELADO',
  ]
  if (!validStates.includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }
  if (estado === 'CANCELADO' && !motivo_cancelacion?.trim()) {
    return NextResponse.json({ error: 'El motivo de cancelación es obligatorio' }, { status: 400 })
  }

  const before = await queryOne<{ estado: string }>(`SELECT estado FROM public.pedidos WHERE id = $1`, [params.id])
  if (!before) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const updated = await queryOne<any>(
    `UPDATE public.pedidos
     SET estado = $1,
         resumen = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE resumen END,
         monto_total = CASE WHEN $4::numeric IS NOT NULL THEN $4 ELSE monto_total END,
         motivo_cancelacion = CASE WHEN $1 = 'CANCELADO' THEN $5 ELSE motivo_cancelacion END,
         cancelado_en = CASE WHEN $1 = 'CANCELADO' THEN NOW() ELSE cancelado_en END,
         actualizado_en = NOW()
     WHERE id = $3
     RETURNING id, telefono, estado, resumen`,
    [
      estado, notas || null, params.id,
      monto_total === undefined || monto_total === '' ? null : monto_total,
      motivo_cancelacion || null,
    ]
  )

  if (!updated) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await query(
    `INSERT INTO public.pedido_timeline (pedido_id, estado, nota, realizado_por)
     VALUES ($1, $2, $3, $4)`,
    [params.id, estado, estado === 'CANCELADO' ? motivo_cancelacion : (notas || null), session.sub]
  )

  // Confirmado/pagado por primera vez → descuenta stock definitivo y libera la reserva.
  // Cancelado → libera la reserva sin tocar el stock (nunca se vendió).
  if (ESTADOS_FINALES.includes(estado) && !ESTADOS_FINALES.includes(before.estado)) {
    await finalizarPedido(params.id).catch(e => console.error('[finalizarPedido]', e))
  } else if (estado === 'CANCELADO' && before.estado !== 'CANCELADO') {
    await liberarPedido(params.id).catch(e => console.error('[liberarPedido]', e))
  }

  // Notificar al cliente
  try {
    await notificarCambioEstatus({
      id: updated.id,
      telefono: updated.telefono,
      estado: updated.estado,
      resumen: updated.resumen,
    })
  } catch (e) {
    console.warn('[WA notify failed]', e)
  }

  return NextResponse.json({ ok: true, data: updated })
}
