import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const [stats, byEstado, byOrigen, topModelos, ultimosPedidos, stockBajo] = await Promise.all([
    queryOne<any>(`SELECT * FROM public.v_dashboard_stats`),

    query(`
      SELECT estado, COUNT(*) as cantidad
      FROM public.pedidos
      GROUP BY estado
      ORDER BY cantidad DESC
    `),

    query(`
      SELECT origen, COUNT(*) as cantidad
      FROM public.pedidos
      GROUP BY origen
    `),

    query(`
      SELECT pi.modelo, pi.tipo_case, SUM(pi.cantidad) as total
      FROM public.pedido_items pi
      JOIN public.pedidos p ON p.id = pi.pedido_id
      WHERE p.creado_en >= NOW() - INTERVAL '30 days'
      GROUP BY pi.modelo, pi.tipo_case
      ORDER BY total DESC
      LIMIT 10
    `),

    query(`
      SELECT p.id, p.telefono, c.nombre as cliente_nombre,
             p.estado, p.origen, p.resumen, p.creado_en
      FROM public.pedidos p
      LEFT JOIN public.clientes c ON c.telefono = p.telefono
      ORDER BY p.creado_en DESC
      LIMIT 5
    `),

    queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM public.catalogo_cases
      WHERE stock <= COALESCE((SELECT valor::int FROM public.config_portal WHERE clave = 'stock_bajo_umbral'), 10)
    `),
  ])

  // Pedidos por día (últimos 7 días)
  const porDia = await query(`
    SELECT 
      DATE(creado_en) as fecha,
      COUNT(*) as pedidos
    FROM public.pedidos
    WHERE creado_en >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(creado_en)
    ORDER BY fecha
  `)

  return NextResponse.json({
    stats,
    byEstado,
    byOrigen,
    topModelos,
    ultimosPedidos,
    porDia,
    stockBajo: parseInt(stockBajo?.count || '0'),
  })
}
