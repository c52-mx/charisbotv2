import { query } from './db'

export interface RangoFechas {
  desde?: string
  hasta?: string
}

// ── Reporte de pedidos ──────────────────────────────────────────────────
export interface FiltrosPedidos extends RangoFechas {
  estado?: string
  telefono?: string
  tipo_case?: string   // campo legado en tabla pedidos (flujo n8n) — se mantiene
  origen?: string
  cliente_nombre?: string
}

export async function getReportePedidos(f: FiltrosPedidos) {
  const conditions: string[] = []
  const params: any[] = []
  let idx = 1

  if (f.desde)          { conditions.push(`p.creado_en >= $${idx++}`);             params.push(f.desde) }
  if (f.hasta)          { conditions.push(`p.creado_en <= $${idx++}`);             params.push(f.hasta) }
  if (f.estado)         { conditions.push(`p.estado = $${idx++}`);                 params.push(f.estado) }
  if (f.telefono)       { conditions.push(`p.telefono ILIKE $${idx++}`);           params.push(`%${f.telefono}%`) }
  if (f.tipo_case)      { conditions.push(`p.tipo_case = $${idx++}`);              params.push(f.tipo_case) }
  if (f.origen)         { conditions.push(`p.origen = $${idx++}`);                 params.push(f.origen) }
  if (f.cliente_nombre) { conditions.push(`c.nombre ILIKE $${idx++}`);             params.push(`%${f.cliente_nombre}%`) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query(
    `SELECT p.id, p.numero_pedido, p.telefono, c.nombre as cliente_nombre,
            p.tipo_case, p.estado, p.origen, p.monto_total, p.creado_en,
            p.paqueteria, p.envio_costo,
            COALESCE(SUM(pi.cantidad), 0) as total_piezas,
            COALESCE(
              (SELECT pt.detalle->>'vendedor_nuevo_nombre'
               FROM public.pedido_timeline pt
               WHERE pt.pedido_id = p.id AND pt.tipo_evento = 'VENDEDOR'
               ORDER BY pt.creado_en DESC LIMIT 1),
              u_creador.nombre
            ) as vendedor_nombre
     FROM public.pedidos p
     LEFT JOIN public.clientes c ON c.telefono = p.telefono
     LEFT JOIN public.pedido_items pi ON pi.pedido_id = p.id
     LEFT JOIN public.usuarios u_creador ON u_creador.id = p.creado_por
     ${where}
     GROUP BY p.id, c.nombre, u_creador.nombre
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
  categoria?: string   // agrupación de alto nivel: FUNDA, ACCESORIO, CARGADOR…
  serie?: string       // línea/tipo: 3 EN 1, ESCUDO, BLINDAJE… (antes tipo_case)
  modelo?: string
  color?: string
  ubicacion?: string
  soloStockBajo?: boolean
}

export async function getReporteInventario(f: FiltrosInventario) {
  const condStock: string[] = []
  const paramsStock: any[] = []
  let idx = 1
  if (f.categoria)  { condStock.push(`categoria = $${idx++}`);  paramsStock.push(f.categoria) }
  if (f.serie)      { condStock.push(`serie = $${idx++}`);      paramsStock.push(f.serie) }
  if (f.modelo)     { condStock.push(`modelo = $${idx++}`);     paramsStock.push(f.modelo) }
  if (f.color)      { condStock.push(`color = $${idx++}`);      paramsStock.push(f.color) }
  if (f.ubicacion)  { condStock.push(`ubicacion = $${idx++}`);  paramsStock.push(f.ubicacion) }

  const umbralRow = await query<{ valor: string }>(`SELECT valor FROM public.config_portal WHERE clave='stock_bajo_umbral'`, [])
  const umbral = parseInt(umbralRow[0]?.valor || '10')
  if (f.soloStockBajo) { condStock.push(`stock <= $${idx++}`); paramsStock.push(umbral) }

  const whereStock = condStock.length ? `WHERE ${condStock.join(' AND ')}` : ''
  const stock = await query(
    `SELECT producto_id, categoria, serie, modelo, color, nombre, stock, ubicacion
     FROM public.catalogo_productos ${whereStock}
     ORDER BY categoria, serie, modelo, color`,
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
            c.nombre as producto_nombre, c.categoria, c.serie, c.modelo, c.color,
            p.numero_pedido, u.nombre as realizado_por_nombre
     FROM public.movimientos_stock m
     LEFT JOIN public.catalogo_productos c ON c.producto_id = m.producto_id
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

  // Top productos con costo y ganancia
  const topProductos = await query(
    `SELECT
       COALESCE(pi.nombre_producto, CONCAT_WS(' ', pi.serie, pi.modelo)) AS producto,
       pi.categoria,
       SUM(pi.cantidad)                                         AS total_piezas,
       SUM(pi.cantidad * pi.precio_unitario)                   AS ingresos,
       SUM(pi.cantidad * COALESCE(cp.precio_compra, 0))        AS costo_total,
       SUM(pi.cantidad * (pi.precio_unitario - COALESCE(cp.precio_compra, 0))) AS ganancia
     FROM public.pedido_items pi
     JOIN public.pedidos p ON p.id = pi.pedido_id
     LEFT JOIN public.catalogo_productos cp ON cp.producto_id = pi.producto_id
     ${where}
     GROUP BY producto, pi.categoria
     ORDER BY total_piezas DESC LIMIT 10`,
    params
  )

  // Resumen de costos y ganancias del período
  const resumenCostos = await query(
    `SELECT
       COALESCE(SUM(pi.cantidad * pi.precio_unitario), 0)                            AS total_ingresos,
       COALESCE(SUM(pi.cantidad * COALESCE(cp.precio_compra, 0)), 0)                AS total_costos,
       COALESCE(SUM(pi.cantidad * (pi.precio_unitario - COALESCE(cp.precio_compra, 0))), 0) AS total_ganancia
     FROM public.pedido_items pi
     JOIN public.pedidos p ON p.id = pi.pedido_id
     LEFT JOIN public.catalogo_productos cp ON cp.producto_id = pi.producto_id
     ${where}`,
    params
  )

  return {
    totalVentas:   Number(resumen?.total_ventas || 0),
    totalPedidos:  parseInt(resumen?.total_pedidos || '0'),
    totalIngresos: Number(resumenCostos[0]?.total_ingresos || 0),
    totalCostos:   Number(resumenCostos[0]?.total_costos || 0),
    totalGanancia: Number(resumenCostos[0]?.total_ganancia || 0),
    porDia, topClientes,
    topModelos: topProductos,
  }
}
