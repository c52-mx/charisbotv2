import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, can } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/descuentos/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { piezas_minimas, porcentaje, activo } = await req.json()
  const sets: string[] = []
  const vals: any[] = []
  let idx = 1

  if (piezas_minimas !== undefined) { sets.push(`piezas_minimas = $${idx++}`); vals.push(parseInt(piezas_minimas)) }
  if (porcentaje     !== undefined) { sets.push(`porcentaje     = $${idx++}`); vals.push(parseFloat(porcentaje)) }
  if (activo         !== undefined) { sets.push(`activo         = $${idx++}`); vals.push(activo) }

  if (!sets.length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  vals.push(params.id)
  const rows = await query(
    `UPDATE public.descuentos_volumen SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    vals
  )
  if (!rows.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(rows[0])
}

// DELETE /api/admin/descuentos/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  await query(`DELETE FROM public.descuentos_volumen WHERE id = $1`, [params.id])
  return NextResponse.json({ ok: true })
}
