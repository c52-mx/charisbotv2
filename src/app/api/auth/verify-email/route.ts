// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashToken, aplicarLimites } from '@/lib/security'

// Detrás del proxy req.url trae el host interno: se redirige al dominio público.
const base = (req: NextRequest) => process.env.NEXT_PUBLIC_APP_URL || req.url

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const limitado = aplicarLimites(req, 'verify', [{ max: 30, ventanaMs: 60 * 60_000 }])
  if (limitado) return limitado

  const token = req.nextUrl.searchParams.get('token')
  if (!token || token.length > 200) return NextResponse.redirect(new URL('/login?error=token_invalido', base(req)))

  try {
    // Verificar token (guardado en tabla usuarios como verificacion_token)
    const [user] = await query(`
      SELECT id, verificacion_token_expira
      FROM public.usuarios
      WHERE (verificacion_token = $1 OR verificacion_token = $2) AND verificado = false
      LIMIT 1
    `, [hashToken(token), token])

    if (!user) return NextResponse.redirect(new URL('/login?error=token_invalido', base(req)))

    if (new Date(user.verificacion_token_expira) < new Date()) {
      return NextResponse.redirect(new URL('/login?error=token_expirado', base(req)))
    }

    await query(`
      UPDATE public.usuarios
      SET verificado = true, verificacion_token = NULL, verificacion_token_expira = NULL
      WHERE id = $1
    `, [user.id])

    return NextResponse.redirect(new URL('/client?verificado=1', base(req)))
  } catch (e) {
    console.error('[verify-email]', e)
    return NextResponse.redirect(new URL('/login?error=error_interno', base(req)))
  }
}
