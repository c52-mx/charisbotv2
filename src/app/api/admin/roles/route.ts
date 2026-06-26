import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession, can } from '@/lib/auth'
import { PERMISO_KEYS } from '@/lib/auth-shared'

export const dynamic = 'force-dynamic'

// GET /api/admin/roles — roles + su matriz de permisos + cuántos usuarios tienen cada uno.
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'roles_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const roles = await query<{ id: string; clave: string; nombre: string; tipo: string; sistema: boolean }>(
    `SELECT id, clave, nombre, tipo, sistema FROM public.roles ORDER BY sistema DESC, nombre`
  )
  const permisos = await query<{ rol_id: string; permiso: string; valor: boolean }>(
    `SELECT rol_id, permiso, valor FROM public.permisos_rol`
  )
  const usuariosPorRol = await query<{ rol: string; count: string }>(
    `SELECT rol, COUNT(*) as count FROM public.usuarios GROUP BY rol`
  )
  const usuariosMap = new Map(usuariosPorRol.map(u => [u.rol, parseInt(u.count)]))

  const data = roles.map(r => ({
    ...r,
    usuarios: usuariosMap.get(r.clave) || 0,
    permisos: Object.fromEntries(
      permisos.filter(p => p.rol_id === r.id).map(p => [p.permiso, p.valor])
    ),
  }))

  return NextResponse.json({ data, permisoKeys: PERMISO_KEYS })
}

// POST /api/admin/roles — crea un rol interno nuevo, permisos en false por defecto.
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'roles_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { clave, nombre } = await req.json()
  const claveNorm = (clave || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  if (!claveNorm || !nombre?.trim()) {
    return NextResponse.json({ error: 'Clave y nombre son requeridos' }, { status: 400 })
  }

  try {
    const rol = await queryOne<{ id: string }>(
      `INSERT INTO public.roles (clave, nombre, tipo, sistema) VALUES ($1, $2, 'INTERNO', false) RETURNING id`,
      [claveNorm, nombre.trim()]
    )
    if (!rol) return NextResponse.json({ error: 'No se pudo crear el rol' }, { status: 500 })

    for (const permiso of PERMISO_KEYS) {
      await query(
        `INSERT INTO public.permisos_rol (rol_id, permiso, valor) VALUES ($1, $2, false)`,
        [rol.id, permiso]
      )
    }
    return NextResponse.json({ ok: true, id: rol.id }, { status: 201 })
  } catch (e: any) {
    if (e.code === '23505') return NextResponse.json({ error: 'Ya existe un rol con esa clave' }, { status: 409 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
