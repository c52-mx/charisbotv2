// src/app/api/client/catalog/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo   = searchParams.get('tipo')   || ''
  const search = searchParams.get('search') || ''
  const marca  = searchParams.get('marca')  || ''

  try {
    // Series con config (imagen, descripción) + conteo en vivo
    const series = await query(`
      SELECT
        c.tipo_case,
        COUNT(DISTINCT c.modelo) AS total_modelos,
        COUNT(DISTINCT c.color)  AS total_colores,
        COUNT(DISTINCT c.marca)  AS total_marcas,
        COALESCE(sc.foto_url, MAX(c.foto_url)) AS foto_url,
        sc.descripcion,
        sc.orden
      FROM public.catalogo_cases c
      LEFT JOIN public.series_config sc ON sc.tipo_case = c.tipo_case
      WHERE c.activo = true
      GROUP BY c.tipo_case, sc.foto_url, sc.descripcion, sc.orden
      ORDER BY COALESCE(sc.orden, 99), c.tipo_case
    `, [])

    // Modelos para tabla "Nuevos modelos" con marca
    const conds: string[] = ['c.activo = true']
    const params: any[]   = []
    let   idx = 1

    if (tipo)   { conds.push(`c.tipo_case = $${idx++}`); params.push(tipo) }
    if (marca)  { conds.push(`c.marca = $${idx++}`);     params.push(marca.toUpperCase()) }
    if (search) {
      conds.push(`(c.modelo ILIKE $${idx} OR c.marca ILIKE $${idx})`)
      params.push(`%${search}%`); idx++
    }

    const where = conds.join(' AND ')

    const nuevos = await query(`
      SELECT
        c.tipo_case,
        c.marca,
        c.modelo,
        array_agg(DISTINCT c.color ORDER BY c.color) AS colores,
        MAX(c.foto_url) AS foto_url,
        MAX(c.creado_en) AS creado_en
      FROM public.catalogo_cases c
      WHERE ${where}
      GROUP BY c.tipo_case, c.marca, c.modelo
      ORDER BY c.marca, c.modelo
      LIMIT 100
    `, params)

    // Marcas disponibles (para filtro)
    const marcas = await query(`
      SELECT DISTINCT marca
      FROM public.catalogo_cases
      WHERE activo = true AND marca IS NOT NULL
      ORDER BY marca
    `, [])

    return NextResponse.json({
      series,
      nuevos,
      marcas: marcas.map((r: any) => r.marca),
    })
  } catch (e: any) {
    console.error('[GET /api/client/catalog]', e)
    return NextResponse.json({ series: [], nuevos: [], marcas: [] })
  }
}
