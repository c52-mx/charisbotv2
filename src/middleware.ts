import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('charis_token')?.value

  const isAdmin  = pathname.startsWith('/admin')
  const isClient = pathname.startsWith('/client')
  const isApi    = pathname.startsWith('/api/') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/track')
  const isTrack  = pathname.startsWith('/track')

  // /track es público — no requiere auth
  if (isTrack) return NextResponse.next()
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
