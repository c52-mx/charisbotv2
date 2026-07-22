import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, can } from '@/lib/auth'
import { logAdmin } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// GET /api/admin/descuentos — todas las franjas (activas e inactivas), para el CRUD
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  const rows = await query(`SELECT * FROM public.descuentos_volumen ORDER BY piezas_minimas`, [])
  return NextResponse.json({ items: rows })
}

// POST /api/admin/descuentos — crear franja nueva
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { piezas_minimas, porcentaje } = await req.json()
  const piezas = parseInt(piezas_minimas)
  const pct = parseFloat(porcentaje)
  if (!Number.isFinite(piezas) || piezas <= 0 || !Number.isFinite(pct) || pct < 0 || pct > 100) {
    return NextResponse.json({ error: 'Piezas mínimas y porcentaje deben ser válidos' }, { status: 400 })
  }

  const rows = await query(
    `INSERT INTO public.descuentos_volumen (piezas_minimas, porcentaje)
     VALUES ($1, $2)
     ON CONFLICT (piezas_minimas) DO NOTHING
     RETURNING *`,
    [piezas, pct]
  )
  if (!rows.length) {
    return NextResponse.json({ error: 'Ya existe una franja con ese mínimo de piezas' }, { status: 409 })
  }
  await logAdmin({ accion: 'DESCUENTO_CREAR', entidad: String(piezas), detalle: { piezas_minimas: piezas, porcentaje: pct }, realizado_por: session.sub })
  return NextResponse.json(rows[0], { status: 201 })
}
