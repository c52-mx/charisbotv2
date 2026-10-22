// src/app/api/client/account/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rows = await query<{ verificado: boolean; email: string | null }>(
    `SELECT verificado, email FROM public.usuarios WHERE id = $1 LIMIT 1`,
    [session.sub]
  )
  const u = rows[0]
  if (!u) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json({ verificado: u.verificado, email: u.email })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { nombre, empresa, telefono } = await req.json()

  if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 100)
    return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })
  const tel = typeof telefono === 'string' ? telefono.trim() : ''
  if (tel && !/^\+?\d{8,15}$/.test(tel.replace(/[\s-]/g, '')))
    return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 })

  // El teléfono sirve para iniciar sesión: no puede coincidir con el de otra cuenta.
  if (tel) {
    const [dup] = await query(
      `SELECT 1 FROM public.usuarios WHERE telefono = $1 AND id <> $2 LIMIT 1`, [tel, session.sub]
    )
    if (dup) return NextResponse.json({ error: 'Ese teléfono ya está asociado a otra cuenta' }, { status: 409 })
  }

  await query(`
    UPDATE public.usuarios SET nombre=$1, empresa=$2, telefono=$3 WHERE id=$4
  `, [nombre.trim(), empresa || null, tel || null, session.sub])

  return NextResponse.json({ ok: true })
}
