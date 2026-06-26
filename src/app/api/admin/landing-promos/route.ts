import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, can } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/landing-promos — todas (activas e inactivas), para el CRUD
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  const rows = await query(`SELECT * FROM public.landing_promos ORDER BY orden, creado_en`, [])
  return NextResponse.json({ items: rows })
}

// POST /api/admin/landing-promos — crear promo
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { imagen_url, titulo, subtitulo, cta_label, cta_href, orden } = await req.json()
  if (!imagen_url?.trim()) {
    return NextResponse.json({ error: 'La imagen es requerida' }, { status: 400 })
  }

  const rows = await query(
    `INSERT INTO public.landing_promos (imagen_url, titulo, subtitulo, cta_label, cta_href, orden)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [imagen_url.trim(), titulo?.trim() || null, subtitulo?.trim() || null, cta_label?.trim() || null, cta_href?.trim() || null, orden ?? 0]
  )
  return NextResponse.json(rows[0], { status: 201 })
}
