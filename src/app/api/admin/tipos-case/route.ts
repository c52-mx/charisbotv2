import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, can } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/tipos-case — todos (activos e inactivos), para el CRUD
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session.rol as any, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  const rows = await query(`SELECT * FROM public.tipos_case ORDER BY orden, nombre`, [])
  return NextResponse.json({ items: rows })
}

// POST /api/admin/tipos-case — crear tipo nuevo
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session.rol as any, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { nombre, emoji, orden } = await req.json()
  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const rows = await query(
    `INSERT INTO public.tipos_case (nombre, emoji, orden)
     VALUES ($1, $2, $3)
     ON CONFLICT (nombre) DO NOTHING
     RETURNING *`,
    [nombre.toUpperCase().trim(), emoji?.trim() || '📦', orden ?? 0]
  )

  if (!rows.length) {
    return NextResponse.json({ error: 'Ya existe un tipo de case con ese nombre' }, { status: 409 })
  }
  return NextResponse.json(rows[0], { status: 201 })
}
