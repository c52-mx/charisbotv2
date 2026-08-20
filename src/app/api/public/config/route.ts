// GET /api/public/config — config pública sin datos sensibles.
// Sin auth: accesible para visitantes sin sesión (home, landing).
// Solo devuelve campos seguros: paqueterías y puntos de recolección.
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

const PUBLIC_KEYS = ['paqueterias', 'puntos_recoleccion']

export async function GET() {
  try {
    const rows = await query(
      `SELECT clave, valor FROM public.config_portal WHERE clave = ANY($1)`,
      [PUBLIC_KEYS]
    )
    const config = Object.fromEntries(rows.map((r: any) => [r.clave, r.valor]))
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({})
  }
}
