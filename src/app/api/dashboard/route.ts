import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession, can } from '@/lib/auth'
import { getReporteVentas } from '@/lib/reports'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'dashboard')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const [stats, byEstado, byOrigen, topModelos, ultimosPedidos, stockBajo] = await Promise.all([
    // pedidos_confirmados y clientes_unicos no existen en la vista v_dashboard_stats
    // (por eso el dashboard los mostraba siempre en 0), así que se calculan aquí.
    queryOne<any>(`
      SELECT s.*,
        (SELECT COUNT(*)::int FROM public.pedidos
          WHERE estado NOT IN ('PENDIENTE_PAGO','PENDIENTE_CONFIRMACION','PENDIENTE','CANCELADO')) AS pedidos_confirmados,
        (SELECT COUNT(DISTINCT telefono)::int FROM public.pedidos)                                 AS clientes_unicos
      FROM public.v_dashboard_stats s`),

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
      SELECT pi.modelo, pi.serie, SUM(pi.cantidad) as total
      FROM public.pedido_items pi
      JOIN public.pedidos p ON p.id = pi.pedido_id
      WHERE p.creado_en >= NOW() - INTERVAL '30 days'
      GROUP BY pi.modelo, pi.serie
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
      SELECT COUNT(*) as count FROM public.catalogo_productos
      WHERE stock <= COALESCE((SELECT valor::int FROM public.config_portal WHERE clave = 'stock_bajo_umbral'), 10)
    `),
  ])

  // Pedidos por día — período configurable (días, o mes específico)
  const { searchParams } = new URL(req.url)
  const diasParam = parseInt(searchParams.get('dias') || '7')
  const dias = [7, 30].includes(diasParam) ? diasParam : 7

  // Una serie por grupo de estado para poder graficarlas como líneas.
  const porDia = await query(`
    SELECT
      DATE(creado_en) as fecha,
      COUNT(*) as pedidos,
      COUNT(*) FILTER (WHERE estado IN ('PENDIENTE_PAGO','PENDIENTE_CONFIRMACION','PENDIENTE')) as pendientes,
      COUNT(*) FILTER (WHERE estado IN ('CONFIRMADO','EN_PREPARACION','POR_VALIDAR_SURTIDO','EN_REPARTO','LISTO_PARA_RECOGER','ENTREGA_FALLIDA','EN_PROCESO')) as en_proceso,
      COUNT(*) FILTER (WHERE estado IN ('ENTREGADO','COMPLETADO')) as entregados,
      COUNT(*) FILTER (WHERE estado = 'CANCELADO') as cancelados
    FROM public.pedidos
    WHERE creado_en >= NOW() - INTERVAL '${dias} days'
    GROUP BY DATE(creado_en)
    ORDER BY fecha
  `)

  const primerDiaMes = new Date()
  primerDiaMes.setDate(1)
  primerDiaMes.setHours(0, 0, 0, 0)
  const ventasMes = await getReporteVentas({ desde: primerDiaMes.toISOString() })

  return NextResponse.json({
    stats,
    byEstado,
    byOrigen,
    topModelos,
    ultimosPedidos,
    porDia,
    dias,
    stockBajo: parseInt(stockBajo?.count || '0'),
    ventasMes: ventasMes.totalVentas,
  })
}
