import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/landing-promos — público, sin auth, solo activos ordenados.
// Consumido por el landing ('use client') para pintar el carrusel.
export async function GET() {
  try {
    const rows = await query(
      `SELECT id, imagen_url, titulo, subtitulo, cta_label, cta_href
       FROM public.landing_promos WHERE activo = true ORDER BY orden, creado_en`,
      []
    )
    return NextResponse.json({ items: rows })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
