import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function ownsAddress(id: string, usuarioId: string): Promise<boolean> {
  const row = await queryOne<{ usuario_id: string }>(`SELECT usuario_id FROM public.direcciones_cliente WHERE id = $1`, [id])
  return row?.usuario_id === usuarioId
}

// PATCH /api/client/addresses/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || session.rol !== 'CLIENTE') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  if (!(await ownsAddress(params.id, session.sub))) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  }

  const body = await req.json()
  const { nombre_contacto, telefono_contacto, calle, colonia, ciudad, estado_mx, cp, instrucciones_entrega, predeterminada } = body

  if (predeterminada === true) {
    await query(`UPDATE public.direcciones_cliente SET predeterminada = false WHERE usuario_id = $1`, [session.sub])
  }

  const sets: string[] = []
  const vals: any[] = []
  let idx = 1
  const setIf = (key: string, val: any, transform: (v: any) => any = v => v) => {
    if (val !== undefined) { sets.push(`${key} = $${idx++}`); vals.push(transform(val)) }
  }
  setIf('nombre_contacto', nombre_contacto, v => v.trim())
  setIf('telefono_contacto', telefono_contacto, v => v.trim())
  setIf('calle', calle, v => v.trim())
  setIf('colonia', colonia, v => v.trim())
  setIf('ciudad', ciudad, v => v.trim())
  setIf('estado_mx', estado_mx, v => v.trim())
  setIf('cp', cp, v => v.trim())
  setIf('instrucciones_entrega', instrucciones_entrega, v => v?.trim() || null)
  setIf('predeterminada', predeterminada)

  if (!sets.length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  vals.push(params.id)
  const rows = await query(
    `UPDATE public.direcciones_cliente SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    vals
  )
  return NextResponse.json(rows[0])
}

// DELETE /api/client/addresses/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || session.rol !== 'CLIENTE') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  if (!(await ownsAddress(params.id, session.sub))) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  }
  await query(`DELETE FROM public.direcciones_cliente WHERE id = $1`, [params.id])
  return NextResponse.json({ ok: true })
}
