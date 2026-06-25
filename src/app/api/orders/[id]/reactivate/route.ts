import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { reactivarPedido, InsufficientStockError } from '@/lib/stock'
import { notificarCambioEstatus } from '@/lib/whatsapp'
import { notificarClienteEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// POST /api/orders/[id]/reactivate - reactiva un pedido CANCELADO
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const pedido = await queryOne<{ estado: string; telefono: string; resumen: string; numero_pedido: string | null }>(
    `SELECT estado, telefono, resumen, numero_pedido FROM public.pedidos WHERE id = $1`, [params.id]
  )
  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (pedido.estado !== 'CANCELADO') {
    return NextResponse.json({ error: 'Solo se pueden reactivar pedidos cancelados' }, { status: 400 })
  }

  try {
    await reactivarPedido(params.id, session.sub)
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: 'No hay stock suficiente para reactivar este pedido', faltantes: e.faltantes },
        { status: 409 }
      )
    }
    console.error('[POST /api/orders/[id]/reactivate]', e)
    return NextResponse.json({ error: 'Error al reactivar el pedido' }, { status: 500 })
  }

  await query(
    `INSERT INTO public.pedido_timeline (pedido_id, estado, nota, realizado_por)
     VALUES ($1, 'CONFIRMADO', 'Pedido reactivado', $2)`,
    [params.id, session.sub]
  )

  const numeroPedido = pedido.numero_pedido || params.id.slice(0, 8)
  await notificarCambioEstatus({
    id: params.id, telefono: pedido.telefono, estado: 'CONFIRMADO', resumen: pedido.resumen,
  }).catch(() => {})
  await notificarClienteEmail(pedido.telefono, numeroPedido, 'CONFIRMADO', 'Tu pedido fue reactivado')

  return NextResponse.json({ ok: true })
}
