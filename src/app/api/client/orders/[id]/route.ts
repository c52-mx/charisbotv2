// src/app/api/client/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const [pedido] = await query(`
      SELECT p.*, c.telefono AS conv_telefono
      FROM public.pedidos p
      LEFT JOIN public.conversaciones c ON c.id = p.conversacion_id
      WHERE p.id = $1
    `, [params.id])

    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

    // Verificar que pertenece al usuario
    const userPhone = session.email
    if (pedido.telefono !== userPhone && pedido.conv_telefono !== userPhone) {
      return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
    }

    const items = await query(`
      SELECT modelo, tipo_case, color, cantidad FROM public.pedido_items WHERE pedido_id = $1
    `, [params.id])

    const timeline = await query(`
      SELECT estado, nota, creado_en FROM public.pedido_timeline
      WHERE pedido_id = $1 ORDER BY creado_en ASC
    `, [params.id])

    return NextResponse.json({ ...pedido, items, timeline })
  } catch (e: any) {
    console.error('[GET /api/client/orders/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
