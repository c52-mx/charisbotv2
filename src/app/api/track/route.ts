import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyTrackLink } from '@/lib/auth'

// GET /api/track?tel=521...&sig=... — returns orders for client (no auth cookie)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tel = searchParams.get('tel') || ''
  const sig = searchParams.get('sig') || ''

  if (!tel || !sig || !verifyTrackLink(tel, sig)) {
    return NextResponse.json({ error: 'Link inválido o expirado' }, { status: 403 })
  }

  // Auto-register client if not exists
  await queryOne(
    `INSERT INTO public.clientes (telefono, nombre, creado_en)
     VALUES ($1, $1, NOW())
     ON CONFLICT (telefono) DO NOTHING`,
    [tel]
  )
  await queryOne(
    `INSERT INTO public.conversaciones (telefono) VALUES ($1)
     ON CONFLICT (telefono) DO NOTHING`,
    [tel]
  )

  const pedidos = await query(
    `SELECT p.id, p.estado, p.tipo_case, p.resumen, p.creado_en, p.origen,
            (SELECT COUNT(*) FROM public.pedido_items pi WHERE pi.pedido_id = p.id) as total_items
     FROM public.pedidos p
     JOIN public.conversaciones c ON c.id = p.conversacion_id
     WHERE c.telefono = $1
     ORDER BY p.creado_en DESC
     LIMIT 20`,
    [tel]
  )

  const cliente = await queryOne<any>(
    'SELECT nombre, telefono FROM public.clientes WHERE telefono = $1', [tel]
  )

  return NextResponse.json({ ok:true, cliente, pedidos })
}
