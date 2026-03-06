import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('charis_token')?.value

  const isAdmin  = pathname.startsWith('/admin')
  const isApi    = pathname.startsWith('/api/') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/track')
  const isTrack  = pathname.startsWith('/track')

  // /track es público — no requiere auth
  if (isTrack) return NextResponse.next()
  if (!isAdmin && !isApi) return NextResponse.next()

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

  // Todos los roles ADMIN/VENDEDOR/ALMACEN pueden entrar a /admin
  const portalRoles = ['ADMIN','VENDEDOR','ALMACEN']
  if (isAdmin && !portalRoles.includes(session.rol)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*', '/api/:path*', '/track'] }
