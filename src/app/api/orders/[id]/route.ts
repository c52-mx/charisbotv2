import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notificarCambioEstatus } from '@/lib/whatsapp'
import { finalizarPedido, liberarPedido } from '@/lib/stock'

const ESTADOS_FINALES = ['CONFIRMADO', 'EN_PROCESO', 'COMPLETADO']

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

  // Extraer evidencias guardadas en pedido_json
  const evidencias: string[] = pedido.pedido_json?.evidencias || []

  return NextResponse.json({ ...pedido, items, evidencias })
}

// PATCH /api/orders/[id] - cambiar estado
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { estado, notas, monto_total } = await req.json()

  // Solo permitir actualizar el monto a cobrar, sin cambiar de estado
  if (estado === undefined && monto_total !== undefined) {
    const updated = await queryOne<any>(
      `UPDATE public.pedidos SET monto_total = $1, actualizado_en = NOW() WHERE id = $2 RETURNING id, monto_total`,
      [monto_total === null || monto_total === '' ? null : Number(monto_total), params.id]
    )
    if (!updated) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true, data: updated })
  }

  const validStates = ['PENDIENTE', 'PENDIENTE_CONFIRMACION', 'CONFIRMADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO']
  if (!validStates.includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const before = await queryOne<{ estado: string }>(`SELECT estado FROM public.pedidos WHERE id = $1`, [params.id])
  if (!before) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const updated = await queryOne<any>(
    `UPDATE public.pedidos
     SET estado = $1,
         resumen = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE resumen END,
         monto_total = CASE WHEN $4::numeric IS NOT NULL THEN $4 ELSE monto_total END,
         actualizado_en = NOW()
     WHERE id = $3
     RETURNING id, telefono, estado, resumen`,
    [estado, notas || null, params.id, monto_total === undefined || monto_total === '' ? null : monto_total]
  )

  if (!updated) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

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
