import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSession, can } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session.rol as any,'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  const { tipo_case, modelo, color, precio, stock, activo, imagen_url } = body

  // Build dynamic update - allow editing ALL fields
  const sets: string[] = []
  const vals: any[]    = []
  let idx = 1

  if (tipo_case   !== undefined) { sets.push(`tipo_case = $${idx++}`);   vals.push(tipo_case.toUpperCase()) }
  if (modelo      !== undefined) { sets.push(`modelo = $${idx++}`);      vals.push(modelo.toUpperCase().trim()) }
  if (color       !== undefined) { sets.push(`color = $${idx++}`);       vals.push(color.toUpperCase().trim()) }
  if (precio      !== undefined) { sets.push(`precio = $${idx++}`);      vals.push(precio) }
  if (stock       !== undefined) { sets.push(`stock = $${idx++}`);       vals.push(stock) }
  if (activo      !== undefined) { sets.push(`activo = $${idx++}`);      vals.push(activo) }
  if (imagen_url  !== undefined) { sets.push(`imagen_url = $${idx++}`);  vals.push(imagen_url) }

  sets.push(`actualizado_en = NOW()`)

  if (sets.length === 1) return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 })

  vals.push(params.id)

  const row = await queryOne(
    `UPDATE public.catalogo_cases SET ${sets.join(', ')} WHERE case_id = $${idx} RETURNING *`,
    vals
  )

  if (!row) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true, data: row })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session.rol as any,'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  await queryOne('UPDATE public.catalogo_cases SET activo = false WHERE case_id = $1', [params.id])
  return NextResponse.json({ ok: true })
}
