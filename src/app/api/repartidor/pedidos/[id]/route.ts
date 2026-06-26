import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notificarCambioEstatus } from '@/lib/whatsapp'
import { notificarClienteEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// GET /api/repartidor/pedidos/[id] — detalle de una entrega propia.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || session.rolTipo !== 'REPARTIDOR') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const pedido = await queryOne<any>(
    `SELECT p.*, c.nombre as cliente_nombre
     FROM public.pedidos p
     LEFT JOIN public.clientes c ON c.telefono = p.telefono
     WHERE p.id = $1`,
    [params.id]
  )
  if (!pedido || pedido.asignado_a !== session.sub) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const items = await query(
    'SELECT * FROM public.pedido_items WHERE pedido_id = $1 ORDER BY creado_en',
    [params.id]
  )
  const evidencias: string[] = pedido.pedido_json?.evidencia_entrega || []

  return NextResponse.json({ ...pedido, items, evidencias })
}

// PATCH /api/repartidor/pedidos/[id] — marca entregado (con cobro de
// efectivo si aplica) o entrega fallida (con motivo).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || session.rolTipo !== 'REPARTIDOR') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const pedido = await queryOne<{ asignado_a: string; estado: string; metodo_pago: string; telefono: string; numero_pedido: string | null }>(
    `SELECT asignado_a, estado, metodo_pago, telefono, numero_pedido FROM public.pedidos WHERE id = $1`,
    [params.id]
  )
  if (!pedido || pedido.asignado_a !== session.sub) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
  if (pedido.estado !== 'EN_REPARTO') {
    return NextResponse.json({ error: 'Este pedido ya no está en reparto' }, { status: 400 })
  }

  const { accion, monto_cobrado, motivo } = await req.json()

  let nuevoEstado: string
  let nota: string

  if (accion === 'entregado') {
    if (pedido.metodo_pago === 'efectivo' && !monto_cobrado) {
      return NextResponse.json({ error: 'Registra el monto cobrado en efectivo' }, { status: 400 })
    }
    nuevoEstado = 'ENTREGADO'
    nota = pedido.metodo_pago === 'efectivo'
      ? `Entregado — efectivo cobrado: $${Number(monto_cobrado).toFixed(2)}`
      : 'Entregado'
  } else if (accion === 'fallida') {
    if (!motivo?.trim()) {
      return NextResponse.json({ error: 'El motivo es obligatorio' }, { status: 400 })
    }
    nuevoEstado = 'ENTREGA_FALLIDA'
    nota = `Entrega fallida: ${motivo}`
  } else {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  const updated = await queryOne<any>(
    `UPDATE public.pedidos
     SET estado = $1,
         entregado_en = CASE WHEN $1 = 'ENTREGADO' THEN NOW() ELSE entregado_en END,
         monto_cobrado = CASE WHEN $1 = 'ENTREGADO' THEN $2 ELSE monto_cobrado END,
         motivo_entrega_fallida = CASE WHEN $1 = 'ENTREGA_FALLIDA' THEN $3 ELSE NULL END,
         actualizado_en = NOW()
     WHERE id = $4
     RETURNING id, telefono, estado, resumen, numero_pedido`,
    [nuevoEstado, monto_cobrado || null, motivo || null, params.id]
  )
  if (!updated) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await query(
    `INSERT INTO public.pedido_timeline (pedido_id, estado, nota, realizado_por) VALUES ($1, $2, $3, $4)`,
    [params.id, nuevoEstado, nota, session.sub]
  )

  try {
    await notificarCambioEstatus({
      id: updated.id, telefono: updated.telefono, estado: updated.estado, resumen: updated.resumen,
    })
  } catch (e) {
    console.warn('[WA notify failed]', e)
  }
  await notificarClienteEmail(updated.telefono, updated.numero_pedido || updated.id.slice(0, 8), updated.estado)

  return NextResponse.json({ ok: true, data: updated })
}
