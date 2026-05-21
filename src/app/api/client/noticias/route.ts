// src/app/api/client/noticias/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const rows = await query(
      `SELECT id, tipo, titulo, cuerpo, imagen_url, link_texto, link_url, destacado, creado_en
       FROM public.noticias
       WHERE activo = true
       ORDER BY destacado DESC, creado_en DESC
       LIMIT 6`,
      []
    )
    return NextResponse.json({ items: rows })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
