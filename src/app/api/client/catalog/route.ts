// src/app/api/client/catalog/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search       = searchParams.get('search')          || ''
  const categoria    = searchParams.get('categoria')        || ''
  const serie        = searchParams.get('serie') || searchParams.get('tipo') || ''
  const color        = searchParams.get('color')            || ''
  const minPrecio    = parseFloat(searchParams.get('min_precio') || '0')   || 0
  const maxPrecio    = parseFloat(searchParams.get('max_precio') || '0')   || 0
  const soloDisp     = searchParams.get('solo_disponibles') === 'true'
  const sortBy       = searchParams.get('sort')             || 'relevance'
  const page         = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize     = Math.min(48, Math.max(12, parseInt(searchParams.get('size') || '24')))
  const offset       = (page - 1) * pageSize

  try {
    const conds: string[] = ['p.activo = true']
    const params: any[]   = []
    let   idx = 1

    if (search) {
      conds.push(`to_tsvector('spanish', p.nombre) @@ plainto_tsquery('spanish', $${idx++})`)
      params.push(search)
    }
    if (categoria) { conds.push(`p.categoria = $${idx++}`); params.push(categoria) }
    if (serie)     { conds.push(`p.serie = $${idx++}`);     params.push(serie.toUpperCase()) }
    if (color)     { conds.push(`p.color = $${idx++}`);     params.push(color.toUpperCase()) }
    if (minPrecio) { conds.push(`p.precio >= $${idx++}`);   params.push(minPrecio) }
    if (maxPrecio) { conds.push(`p.precio <= $${idx++}`);   params.push(maxPrecio) }
    if (soloDisp)  { conds.push(`p.stock > 0`) }

    const where = conds.join(' AND ')

    const orderMap: Record<string, string> = {
      relevance:    'p.creado_en DESC',
      precio_asc:   'p.precio ASC',
      precio_desc:  'p.precio DESC',
      vendidos:     'vendidos DESC NULLS LAST',
      nombre:       'p.nombre ASC',
    }
    const orderClause = orderMap[sortBy] || orderMap['relevance']

    // Productos con conteo de vendidos
    const [items, countRow] = await Promise.all([
      query(`
        SELECT
          p.producto_id,
          p.categoria,
          p.serie,
          p.modelo,
          p.color,
          p.nombre,
          p.foto_url,
          p.marca,
          p.precio,
          p.stock,
          p.atributos,
          p.creado_en,
          COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo = 'SALIDA'), 0)::int AS vendidos
        FROM public.catalogo_productos p
        LEFT JOIN public.movimientos_stock m ON m.producto_id = p.producto_id
        WHERE ${where}
        GROUP BY p.producto_id
        ORDER BY ${orderClause}
        LIMIT $${idx++} OFFSET $${idx}
      `, [...params, pageSize, offset]),

      query(`
        SELECT COUNT(*) as total
        FROM public.catalogo_productos p
        WHERE ${where}
      `, params),
    ])

    // Opciones de filtro (sobre TODO el catálogo activo)
    const filterRows = await query(`
      SELECT
        ARRAY_AGG(DISTINCT categoria ORDER BY categoria) FILTER (WHERE categoria IS NOT NULL) AS categorias,
        ARRAY_AGG(DISTINCT serie     ORDER BY serie)     FILTER (WHERE serie     IS NOT NULL) AS series,
        ARRAY_AGG(DISTINCT color     ORDER BY color)     FILTER (WHERE color     IS NOT NULL) AS colores,
        MIN(precio)::float AS precio_min,
        MAX(precio)::float AS precio_max
      FROM public.catalogo_productos
      WHERE activo = true
    `, [])

    return NextResponse.json({
      items,
      total:    parseInt(countRow[0]?.total || '0'),
      page,
      pageSize,
      filters:  filterRows[0] || { categorias: [], series: [], colores: [], precio_min: 0, precio_max: 0 },
    })
  } catch (e: any) {
    console.error('[GET /api/client/catalog]', e)
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize, filters: {} })
  }
}
