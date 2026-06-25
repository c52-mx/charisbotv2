import { query } from './db'

export interface RangoFechas {
  desde?: string
  hasta?: string
}

// ── Reporte de pedidos ──────────────────────────────────────────────────
export interface FiltrosPedidos extends RangoFechas {
  estado?: string
  telefono?: string
}

export async function getReportePedidos(f: FiltrosPedidos) {
  const conditions: string[] = []
  const params: any[] = []
  let idx = 1

  if (f.desde)    { conditions.push(`p.creado_en >= $${idx++}`); params.push(f.desde) }
  if (f.hasta)    { conditions.push(`p.creado_en <= $${idx++}`); params.push(f.hasta) }
  if (f.estado)   { conditions.push(`p.estado = $${idx++}`); params.push(f.estado) }
  if (f.telefono) { conditions.push(`p.telefono ILIKE $${idx++}`); params.push(`%${f.telefono}%`) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query(
    `SELECT p.id, p.numero_pedido, p.telefono, c.nombre as cliente_nombre,
            p.tipo_case, p.estado, p.origen, p.monto_total, p.creado_en,
            COALESCE(SUM(pi.cantidad), 0) as total_piezas
     FROM public.pedidos p
     LEFT JOIN public.clientes c ON c.telefono = p.telefono
     LEFT JOIN public.pedido_items pi ON pi.pedido_id = p.id
     ${where}
     GROUP BY p.id, c.nombre
     ORDER BY p.creado_en DESC`,
    params
  )

  const totales = rows.reduce((acc: any, r: any) => ({
    pedidos: acc.pedidos + 1,
    piezas: acc.piezas + Number(r.total_piezas || 0),
    monto: acc.monto + Number(r.monto_total || 0),
  }), { pedidos: 0, piezas: 0, monto: 0 })

  return { rows, totales }
}

// ── Reporte de inventario (stock actual + movimientos) ──────────────────
export interface FiltrosInventario extends RangoFechas {
  tipo_case?: string
  soloStockBajo?: boolean
}

export async function getReporteInventario(f: FiltrosInventario) {
  const condStock: string[] = []
  const paramsStock: any[] = []
  let idx = 1
  if (f.tipo_case) { condStock.push(`tipo_case = $${idx++}`); paramsStock.push(f.tipo_case) }

  const umbralRow = await query<{ valor: string }>(`SELECT valor FROM public.config_portal WHERE clave='stock_bajo_umbral'`, [])
  const umbral = parseInt(umbralRow[0]?.valor || '10')
  if (f.soloStockBajo) { condStock.push(`stock <= $${idx++}`); paramsStock.push(umbral) }

  const whereStock = condStock.length ? `WHERE ${condStock.join(' AND ')}` : ''
  const stock = await query(
    `SELECT case_id, tipo_case, modelo, color, stock, ubicacion
     FROM public.catalogo_cases ${whereStock}
     ORDER BY tipo_case, modelo, color`,
    paramsStock
  )

  const condMov: string[] = []
  const paramsMov: any[] = []
  idx = 1
  if (f.desde) { condMov.push(`m.creado_en >= $${idx++}`); paramsMov.push(f.desde) }
  if (f.hasta) { condMov.push(`m.creado_en <= $${idx++}`); paramsMov.push(f.hasta) }
  const whereMov = condMov.length ? `WHERE ${condMov.join(' AND ')}` : ''

  const movimientos = await query(
    `SELECT m.id, m.tipo, m.cantidad, m.stock_resultante, m.motivo, m.creado_en,
            c.tipo_case, c.modelo, c.color,
            p.numero_pedido, u.nombre as realizado_por_nombre
     FROM public.movimientos_stock m
     LEFT JOIN public.catalogo_cases c ON c.case_id = m.case_id
     LEFT JOIN public.pedidos p ON p.id = m.pedido_id
     LEFT JOIN public.usuarios u ON u.id = m.realizado_por
     ${whereMov}
     ORDER BY m.creado_en DESC
     LIMIT 500`,
    paramsMov
  )

  return { stock, movimientos, umbral }
}

// ── Reporte de ventas ────────────────────────────────────────────────────
export async function getReporteVentas(f: RangoFechas) {
  const conditions: string[] = [`p.monto_total IS NOT NULL`]
  const params: any[] = []
  let idx = 1
  if (f.desde) { conditions.push(`p.creado_en >= $${idx++}`); params.push(f.desde) }
  if (f.hasta) { conditions.push(`p.creado_en <= $${idx++}`); params.push(f.hasta) }
  const where = `WHERE ${conditions.join(' AND ')}`

  const [resumen] = await query<{ total_ventas: string; total_pedidos: string }>(
    `SELECT COALESCE(SUM(p.monto_total),0) as total_ventas, COUNT(*) as total_pedidos
     FROM public.pedidos p ${where}`,
    params
  )

  const porDia = await query(
    `SELECT DATE(p.creado_en) as fecha, SUM(p.monto_total) as total
     FROM public.pedidos p ${where}
     GROUP BY DATE(p.creado_en) ORDER BY fecha`,
    params
  )

  const topClientes = await query(
    `SELECT p.telefono, c.nombre as cliente_nombre, SUM(p.monto_total) as total, COUNT(*) as pedidos
     FROM public.pedidos p
     LEFT JOIN public.clientes c ON c.telefono = p.telefono
     ${where}
     GROUP BY p.telefono, c.nombre
     ORDER BY total DESC LIMIT 10`,
    params
  )

  const topModelos = await query(
    `SELECT pi.modelo, pi.tipo_case, SUM(pi.cantidad) as total_piezas
     FROM public.pedido_items pi
     JOIN public.pedidos p ON p.id = pi.pedido_id
     ${where}
     GROUP BY pi.modelo, pi.tipo_case
     ORDER BY total_piezas DESC LIMIT 10`,
    params
  )

  return {
    totalVentas: Number(resumen?.total_ventas || 0),
    totalPedidos: parseInt(resumen?.total_pedidos || '0'),
    porDia, topClientes, topModelos,
  }
}
