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

  await query(`
    UPDATE public.usuarios SET nombre=$1, empresa=$2, telefono=$3 WHERE id=$4
  `, [nombre, empresa || null, telefono, session.sub])

  return NextResponse.json({ ok: true })
}
