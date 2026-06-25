import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/descuentos — franjas activas, para que cliente/checkout calculen
// el mismo descuento que ve el admin (cualquier sesión autenticada)
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rows = await query(
    `SELECT piezas_minimas, porcentaje FROM public.descuentos_volumen WHERE activo = true ORDER BY piezas_minimas`,
    []
  )
  return NextResponse.json({ items: rows })
}
