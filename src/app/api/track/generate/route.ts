import { NextRequest, NextResponse } from 'next/server'
import { getSession, buildTrackUrl } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/track/generate
// Genera un link firmado para que el cliente vea sus pedidos sin login
// Usado por: portal admin, n8n (con header x-n8n-secret)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const tel  = (body.telefono || body.tel || '').toString().trim()
  if (!tel) return NextResponse.json({ error: 'telefono requerido' }, { status: 400 })

  // Auth: sesión portal O secret de n8n
  const n8nSecret = req.headers.get('x-n8n-secret')
  const validN8n  = n8nSecret && n8nSecret === (process.env.N8N_WEBHOOK_SECRET || 'n8n_secret_change_me')
  const session   = await getSession(req)
  const isPortal  = session && ['ADMIN','VENDEDOR','ALMACEN'].includes(session.rol)

  if (!isPortal && !validN8n) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || ''
  return NextResponse.json({ ok: true, url: buildTrackUrl(tel, base) })
}
