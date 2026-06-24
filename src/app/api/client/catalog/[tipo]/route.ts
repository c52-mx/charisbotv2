// src/app/api/client/catalog/[tipo]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getDisponibilidad } from '@/lib/stock'

export async function GET(
  req: NextRequest,
  { params }: { params: { tipo: string } }
) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const tipo = decodeURIComponent(params.tipo).toUpperCase()

  try {
    // Config de la serie
    const [config] = await query(`
      SELECT tipo_case, descripcion, foto_url
      FROM public.series_config WHERE tipo_case = $1
    `, [tipo])

    // Modelos agrupados por marca → modelo → colores
    const rows = await query(`
      SELECT case_id, marca, modelo, color, foto_url, identificador
      FROM public.catalogo_cases
      WHERE activo = true AND tipo_case = $1
      ORDER BY marca, modelo, color
    `, [tipo])

    const disponibilidad = await getDisponibilidad((rows as any[]).map(r => r.case_id))

    // Estructurar: { marca: { modelo: { colores[], foto_url, stockPorColor } } }
    const byMarca: Record<string, Record<string, { colores: string[]; foto_url: string|null; identificador: string|null; stockPorColor: Record<string, number> }>> = {}

    for (const r of rows as any[]) {
      const m = r.marca || 'OTROS'
      const mod = r.modelo
      if (!byMarca[m]) byMarca[m] = {}
      if (!byMarca[m][mod]) byMarca[m][mod] = { colores: [], foto_url: r.foto_url, identificador: r.identificador, stockPorColor: {} }
      byMarca[m][mod].colores.push(r.color)
      byMarca[m][mod].stockPorColor[r.color] = disponibilidad[r.case_id] ?? 0
    }

    // Fotos de la serie (máx 4 únicas, de distintos modelos)
    const fotos = Array.from(new Set(
      (rows as any[]).map(r => r.foto_url).filter(Boolean)
    )).slice(0, 4)

    return NextResponse.json({
      tipo_case: tipo,
      config:    config || null,
      byMarca,
      fotos,
      total_modelos: Object.values(byMarca).reduce((s, m) => s + Object.keys(m).length, 0),
    })
  } catch (e: any) {
    console.error('[GET /api/client/catalog/[tipo]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
