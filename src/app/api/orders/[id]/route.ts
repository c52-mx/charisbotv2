import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notificarCambioEstatus } from '@/lib/whatsapp'

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

  const { estado, notas } = await req.json()

  const validStates = ['PENDIENTE', 'PENDIENTE_CONFIRMACION', 'CONFIRMADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO']
  if (!validStates.includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const updated = await queryOne<any>(
    `UPDATE public.pedidos
     SET estado = $1, 
         resumen = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE resumen END,
         actualizado_en = NOW()
     WHERE id = $3
     RETURNING id, telefono, estado, resumen`,
    [estado, notas || null, params.id]
  )

  if (!updated) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

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
