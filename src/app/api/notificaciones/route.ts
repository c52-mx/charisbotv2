import { NextRequest, NextResponse } from 'next/server'
import { getSession, can, tipoSesion } from '@/lib/auth'
import { PERMISO_KEYS } from '@/lib/auth-shared'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/notificaciones — últimas 30 días de las que el usuario puede ver (por permiso), con flag leída.
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || tipoSesion(session) !== 'INTERNO') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const permisos = PERMISO_KEYS.filter(p => can(session, p))
  const rows = await query(
    `SELECT n.id, n.tipo, n.titulo, n.mensaje, n.pedido_id, n.creado_en, (l.usuario_id IS NOT NULL) AS leida
       FROM public.notificaciones n
       LEFT JOIN public.notificaciones_leidas l ON l.notificacion_id = n.id AND l.usuario_id = $1
      WHERE n.permiso = ANY($2::text[]) AND n.creado_en > NOW() - INTERVAL '30 days'
      ORDER BY n.creado_en DESC
      LIMIT 40`,
    [session.sub, permisos]
  )
  return NextResponse.json({ items: rows, no_leidas: rows.filter((r: any) => !r.leida).length })
}

// POST /api/notificaciones — marca como leídas: { ids: string[] } o { todas: true }
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || tipoSesion(session) !== 'INTERNO') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const permisos = PERMISO_KEYS.filter(p => can(session, p))
  const ids: string[] | null = Array.isArray(body.ids) ? body.ids.filter((i: unknown) => typeof i === 'string') : null
  if (!body.todas && !ids?.length) return NextResponse.json({ error: 'Nada que marcar' }, { status: 400 })

  await query(
    `INSERT INTO public.notificaciones_leidas (usuario_id, notificacion_id)
     SELECT $1, n.id FROM public.notificaciones n
      WHERE n.permiso = ANY($2::text[]) AND n.creado_en > NOW() - INTERVAL '30 days'
        AND ($3::uuid[] IS NULL OR n.id = ANY($3::uuid[]))
     ON CONFLICT DO NOTHING`,
    [session.sub, permisos, body.todas ? null : ids]
  )
  return NextResponse.json({ ok: true })
}
