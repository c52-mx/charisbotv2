import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { sendEmail, emailRecuperacion } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email?.trim())
      return NextResponse.json({ ok: true }) // never enumerate

    const emailLower = email.toLowerCase().trim()
    const rows = await query<{ id: string; nombre: string }>(
      `SELECT id, nombre FROM public.usuarios WHERE email = $1 AND activo = true LIMIT 1`,
      [emailLower]
    )

    if (rows[0]) {
      const token  = crypto.randomBytes(32).toString('hex')
      const expira = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

      await query(
        `UPDATE public.usuarios
         SET reset_password_token = $1, reset_password_token_expira = $2
         WHERE id = $3`,
        [token, expira, rows[0].id]
      )

      sendEmail({
        to:      emailLower,
        subject: 'Restablecer contraseña — Charis Portal',
        html:    emailRecuperacion(rows[0].nombre, token),
      }).catch(e => console.error('[forgot-password] email error:', e))
    }

    // Siempre ok para no enumerar usuarios
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[POST /api/auth/forgot-password]', e)
    return NextResponse.json({ ok: true })
  }
}
