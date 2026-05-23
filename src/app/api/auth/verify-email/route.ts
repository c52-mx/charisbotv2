// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/login?error=token_invalido', req.url))

  try {
    // Verificar token (guardado en tabla usuarios como verificacion_token)
    const [user] = await query(`
      SELECT id, verificacion_token_expira
      FROM public.usuarios
      WHERE verificacion_token = $1 AND verificado = false
      LIMIT 1
    `, [token])

    if (!user) return NextResponse.redirect(new URL('/login?error=token_invalido', req.url))

    if (new Date(user.verificacion_token_expira) < new Date()) {
      return NextResponse.redirect(new URL('/login?error=token_expirado', req.url))
    }

    await query(`
      UPDATE public.usuarios
      SET verificado = true, verificacion_token = NULL, verificacion_token_expira = NULL
      WHERE id = $1
    `, [user.id])

    return NextResponse.redirect(new URL('/client?verificado=1', req.url))
  } catch (e) {
    console.error('[verify-email]', e)
    return NextResponse.redirect(new URL('/login?error=error_interno', req.url))
  }
}
