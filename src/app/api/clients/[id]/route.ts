import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logCliente } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { nombre, email, notas } = await req.json()

  const antes = await queryOne<any>(
    `SELECT id, nombre, email, notas, telefono FROM public.clientes WHERE id = $1`,
    [params.id]
  )
  if (!antes) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const row = await queryOne<any>(
    `UPDATE public.clientes SET nombre = $1, email = $2, notas = $3, actualizado_en = NOW()
     WHERE id = $4 RETURNING *`,
    [nombre ?? antes.nombre, email ?? antes.email, notas ?? antes.notas, params.id]
  )

  await logCliente({
    cliente_id: params.id,
    telefono: antes.telefono,
    accion: 'EDITAR',
    campos_antes:   { nombre: antes.nombre,  email: antes.email,  notas: antes.notas  },
    campos_despues: { nombre: row?.nombre,   email: row?.email,   notas: row?.notas   },
    realizado_por: session.sub,
  })

  return NextResponse.json({ ok: true, data: row })
}
