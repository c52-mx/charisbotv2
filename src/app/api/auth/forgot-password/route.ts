import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { sendEmail, emailRecuperacion } from '@/lib/email'
import crypto from 'crypto'
import { aplicarLimites, hashToken } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (typeof email !== 'string' || !email.trim())
      return NextResponse.json({ ok: true }) // never enumerate

    const emailLower = email.toLowerCase().trim()

    // Evita usar el endpoint para inundar de correos a una persona o agotar la cuota de envío
    const limitado = aplicarLimites(req, 'forgot', [
      { max: 10, ventanaMs: 60 * 60_000 },
      { por: emailLower, max: 3, ventanaMs: 60 * 60_000 },
    ])
    if (limitado) return limitado
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
        [hashToken(token), expira, rows[0].id]
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
