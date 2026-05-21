// src/app/api/client/catalog/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    // Agrupar por tipo_case con conteo de modelos y foto representativa
    const series = await query(
      `SELECT
         tipo_case,
         COUNT(DISTINCT modelo) AS total_modelos,
         COUNT(DISTINCT color)  AS total_colores,
         MAX(foto_url)          AS foto_url
       FROM public.catalogo_cases
       WHERE activo = true
       GROUP BY tipo_case
       ORDER BY tipo_case`,
      []
    )

    // Últimos modelos agregados (para sección "Nuevos modelos")
    const nuevos = await query(
      `SELECT DISTINCT ON (modelo, tipo_case)
         tipo_case, modelo,
         array_agg(color ORDER BY color) AS colores,
         MAX(foto_url) AS foto_url,
         MAX(creado_en) AS creado_en
       FROM public.catalogo_cases
       WHERE activo = true
       GROUP BY tipo_case, modelo
       ORDER BY tipo_case, modelo, MAX(creado_en) DESC
       LIMIT 20`,
      []
    )

    return NextResponse.json({ series, nuevos })
  } catch (e: any) {
    console.error('[GET /api/client/catalog]', e)
    return NextResponse.json({ series: [], nuevos: [] })
  }
}
