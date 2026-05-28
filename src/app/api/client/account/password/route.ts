// src/app/api/client/account/password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { actual, nueva } = await req.json()
  if (!actual || !nueva) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  if (nueva.length < 8) return NextResponse.json({ error: 'Mínimo 8 caracteres' }, { status: 400 })

  const [user] = await query(`SELECT password_hash FROM public.usuarios WHERE id=$1`, [session.sub])
  const ok = await bcrypt.compare(actual, user.password_hash)
  if (!ok) return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })

  const hash = await bcrypt.hash(nueva, 12)
  await query(`UPDATE public.usuarios SET password_hash=$1 WHERE id=$2`, [hash, session.sub])

  return NextResponse.json({ ok: true })
}
