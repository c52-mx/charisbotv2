import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password)
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    if (password.length < 8)
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })

    const rows = await query<{ id: string }>(
      `SELECT id FROM public.usuarios
       WHERE reset_password_token = $1
         AND reset_password_token_expira > NOW()
         AND activo = true
       LIMIT 1`,
      [token]
    )

    if (!rows[0])
      return NextResponse.json({ error: 'El enlace no es válido o ya expiró' }, { status: 400 })

    const hash = await bcrypt.hash(password, 12)

    await query(
      `UPDATE public.usuarios
       SET password_hash = $1,
           reset_password_token = NULL,
           reset_password_token_expira = NULL
       WHERE id = $2`,
      [hash, rows[0].id]
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[POST /api/auth/reset-password]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
