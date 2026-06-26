import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, can } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/landing-promos/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { imagen_url, titulo, subtitulo, cta_label, cta_href, orden, activo } = await req.json()
  const sets: string[] = []
  const vals: any[] = []
  let idx = 1

  if (imagen_url !== undefined) { sets.push(`imagen_url = $${idx++}`); vals.push(imagen_url.trim()) }
  if (titulo     !== undefined) { sets.push(`titulo     = $${idx++}`); vals.push(titulo?.trim() || null) }
  if (subtitulo  !== undefined) { sets.push(`subtitulo  = $${idx++}`); vals.push(subtitulo?.trim() || null) }
  if (cta_label  !== undefined) { sets.push(`cta_label  = $${idx++}`); vals.push(cta_label?.trim() || null) }
  if (cta_href   !== undefined) { sets.push(`cta_href   = $${idx++}`); vals.push(cta_href?.trim() || null) }
  if (orden      !== undefined) { sets.push(`orden      = $${idx++}`); vals.push(orden) }
  if (activo     !== undefined) { sets.push(`activo     = $${idx++}`); vals.push(activo) }

  if (!sets.length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  vals.push(params.id)
  const rows = await query(
    `UPDATE public.landing_promos SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    vals
  )
  if (!rows.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(rows[0])
}

// DELETE /api/admin/landing-promos/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  await query(`DELETE FROM public.landing_promos WHERE id = $1`, [params.id])
  return NextResponse.json({ ok: true })
}
