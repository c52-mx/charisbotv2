import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, can } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/tipos-case/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session.rol as any, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { nombre, emoji, orden, activo } = await req.json()
  const sets: string[] = []
  const vals: any[] = []
  let idx = 1

  if (nombre !== undefined) { sets.push(`nombre = $${idx++}`); vals.push(nombre.toUpperCase().trim()) }
  if (emoji  !== undefined) { sets.push(`emoji  = $${idx++}`); vals.push(emoji?.trim() || '📦') }
  if (orden  !== undefined) { sets.push(`orden  = $${idx++}`); vals.push(orden) }
  if (activo !== undefined) { sets.push(`activo = $${idx++}`); vals.push(activo) }

  if (!sets.length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  vals.push(params.id)
  const rows = await query(
    `UPDATE public.tipos_case SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    vals
  )
  if (!rows.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(rows[0])
}

// DELETE /api/admin/tipos-case/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session.rol as any, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const enUso = await query(`SELECT 1 FROM public.catalogo_cases c JOIN public.tipos_case t ON t.nombre = c.tipo_case WHERE t.id = $1 LIMIT 1`, [params.id])
  if (enUso.length) {
    return NextResponse.json({ error: 'Hay productos del catálogo usando este tipo — desactívalo en vez de borrarlo' }, { status: 409 })
  }

  await query(`DELETE FROM public.tipos_case WHERE id = $1`, [params.id])
  return NextResponse.json({ ok: true })
}
