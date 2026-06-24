import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyTrackLink } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const tel = searchParams.get('tel') || ''
  const sig = searchParams.get('sig') || ''

  if (!tel || !sig || !verifyTrackLink(tel, sig)) {
    return NextResponse.json({ error: 'Link inválido' }, { status: 403 })
  }

  const pedido = await queryOne<any>(
    `SELECT p.* FROM public.pedidos p
     JOIN public.conversaciones c ON c.id = p.conversacion_id
     WHERE p.id = $1 AND c.telefono = $2`,
    [params.id, tel]
  )
  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const items = await query('SELECT * FROM public.pedido_items WHERE pedido_id = $1', [params.id])
  const evidencias = pedido.pedido_json?.evidencias || []
  return NextResponse.json({ ...pedido, items, evidencias })
}
