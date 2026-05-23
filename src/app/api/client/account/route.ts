// src/app/api/client/account/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { nombre, empresa, telefono } = await req.json()

  await query(`
    UPDATE public.usuarios SET nombre=$1, empresa=$2, telefono=$3 WHERE id=$4
  `, [nombre, empresa || null, telefono, session.id])

  return NextResponse.json({ ok: true })
}
