// src/app/api/client/orders/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { liberarPedido } from '@/lib/stock'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const [pedido] = await query(`SELECT * FROM public.pedidos WHERE id = $1`, [params.id])
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

    const userPhone = session.email
    if (pedido.telefono !== userPhone) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

    if (!['PENDIENTE_PAGO','PENDIENTE_CONFIRMACION'].includes(pedido.estado)) {
      return NextResponse.json({ error: 'Este pedido ya no se puede cancelar' }, { status: 400 })
    }

    await query(`
      UPDATE public.pedidos SET estado='CANCELADO', cancelado_en=NOW() WHERE id=$1
    `, [params.id])

    await query(`
      INSERT INTO public.pedido_timeline (pedido_id, estado, nota)
      VALUES ($1, 'CANCELADO', 'Cancelado por el cliente')
    `, [params.id])

    await liberarPedido(params.id).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Error al cancelar' }, { status: 500 })
  }
}
