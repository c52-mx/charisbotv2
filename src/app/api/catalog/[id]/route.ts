// src/app/api/catalog/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, can } from '@/lib/auth'

// ── PATCH /api/catalog/[id] ───────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session.rol as any, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  const { tipo_case, modelo, color, activo, identificador, ubicacion, stock } = body

  const sets: string[]  = []
  const vals: any[]     = []
  let   idx = 1

  if (tipo_case   !== undefined) { sets.push(`tipo_case     = $${idx++}`); vals.push(tipo_case.toUpperCase().trim()) }
  if (modelo      !== undefined) { sets.push(`modelo        = $${idx++}`); vals.push(modelo.toUpperCase().trim()) }
  if (color       !== undefined) { sets.push(`color         = $${idx++}`); vals.push(color.toUpperCase().trim()) }
  if (activo      !== undefined) { sets.push(`activo        = $${idx++}`); vals.push(activo) }
  if (identificador !== undefined) { sets.push(`identificador = $${idx++}`); vals.push(identificador?.trim() || null) }
  if (ubicacion   !== undefined) { sets.push(`ubicacion     = $${idx++}`); vals.push(ubicacion?.trim() || null) }
  if (stock       !== undefined) { sets.push(`stock         = $${idx++}`); vals.push(Math.max(0, parseInt(stock) || 0)) }

  if (!sets.length) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  vals.push(params.id)
  const rows = await query(
    `UPDATE public.catalogo_cases SET ${sets.join(', ')} WHERE case_id = $${idx} RETURNING *`,
    vals
  )

  if (!rows.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(rows[0])
}

// ── DELETE /api/catalog/[id] ──────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session.rol as any, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  await query(`DELETE FROM public.catalogo_cases WHERE case_id = $1`, [params.id])
  return NextResponse.json({ ok: true })
}
