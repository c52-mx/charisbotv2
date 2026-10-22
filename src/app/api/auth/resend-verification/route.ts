import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { sendEmail, emailVerificacion } from '@/lib/email'
import crypto from 'crypto'
import { aplicarLimites, hashToken } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const limitado = aplicarLimites(req, 'resend', [{ por: session.sub, max: 3, ventanaMs: 60 * 60_000 }])
    if (limitado) return limitado

    const user = await queryOne<{ id: string; nombre: string; email: string; verificado: boolean }>(
      `SELECT id, nombre, email, verificado FROM public.usuarios WHERE id = $1 AND activo = true LIMIT 1`,
      [session.sub]
    )

    if (!user)        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if (!user.email)  return NextResponse.json({ error: 'La cuenta no tiene correo registrado' }, { status: 400 })
    if (user.verificado) return NextResponse.json({ ok: true, ya_verificado: true })

    const token  = crypto.randomBytes(32).toString('hex')
    const expira = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await query(
      `UPDATE public.usuarios SET verificacion_token = $1, verificacion_token_expira = $2 WHERE id = $3`,
      [hashToken(token), expira, user.id]
    )

    sendEmail({
      to:      user.email,
      subject: 'Verifica tu correo — Charis Portal',
      html:    emailVerificacion(user.nombre, token),
    }).catch(e => console.error('[resend-verification]', e))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[POST /api/auth/resend-verification]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
