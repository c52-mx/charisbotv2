import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/tipos-case — tipos activos, para llenar selects (cualquier sesión)
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rows = await query(
    `SELECT nombre, emoji FROM public.tipos_case WHERE activo = true ORDER BY orden, nombre`,
    []
  )
  return NextResponse.json({ items: rows })
}
