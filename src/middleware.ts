import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('charis_token')?.value

  const isAdmin  = pathname.startsWith('/admin')
  const isClient = pathname.startsWith('/client')
  const isApi    = pathname.startsWith('/api/') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/track')
                    && pathname !== '/api/landing-promos' && pathname !== '/api/internal/cron'
  const isTrack  = pathname.startsWith('/track')

  // /track y /api/landing-promos son públicos — no requieren auth
  // (landing-promos alimenta el carrusel del home, visible sin sesión).
  // /api/internal/cron tiene su propia auth por secreto compartido (lo
  // llama src/instrumentation.ts desde el mismo proceso, sin cookie).
  if (isTrack || pathname === '/api/landing-promos' || pathname === '/api/internal/cron') return NextResponse.next()
  if (!isAdmin && !isClient && !isApi) return NextResponse.next()

  if (!token) {
    if (isApi) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    return NextResponse.redirect(new URL('/', req.url))
  }

  const session = await verifyToken(token)
  if (!session) {
    if (isApi) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    const r = NextResponse.redirect(new URL('/', req.url))
    r.cookies.delete('charis_token')
    return r
  }

  // Solo roles internos pueden entrar a /admin
  const portalRoles = ['ADMIN','VENDEDOR','ALMACEN']
  if (isAdmin && !portalRoles.includes(session.rol)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Solo CLIENTE puede entrar a /client
  if (isClient && session.rol !== 'CLIENTE') {
    return NextResponse.redirect(new URL('/admin/orders', req.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*', '/client/:path*', '/api/:path*', '/track'] }
