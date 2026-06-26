import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession, can } from '@/lib/auth'
import { PERMISO_KEYS, type Permiso } from '@/lib/auth-shared'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/roles/[id] — renombra y/o actualiza la matriz de permisos.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session, 'roles_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const rol = await queryOne<{ id: string; clave: string }>(
    `SELECT id, clave FROM public.roles WHERE id = $1`, [params.id]
  )
  if (!rol) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { nombre, permisos } = await req.json()

  if (permisos && rol.clave === 'ADMIN') {
    return NextResponse.json(
      { error: 'No se pueden editar los permisos de ADMIN — quedaría sin acceso al panel' },
      { status: 400 }
    )
  }

  if (nombre !== undefined) {
    await query(`UPDATE public.roles SET nombre = $1 WHERE id = $2`, [nombre.trim(), params.id])
  }

  if (permisos) {
    for (const permiso of PERMISO_KEYS) {
      if (!(permiso in permisos)) continue
      await query(
        `INSERT INTO public.permisos_rol (rol_id, permiso, valor) VALUES ($1, $2, $3)
         ON CONFLICT (rol_id, permiso) DO UPDATE SET valor = EXCLUDED.valor`,
        [params.id, permiso as Permiso, !!permisos[permiso]]
      )
    }
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/roles/[id] — solo roles no-sistema y sin usuarios asignados.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session, 'roles_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const rol = await queryOne<{ id: string; clave: string; sistema: boolean }>(
    `SELECT id, clave, sistema FROM public.roles WHERE id = $1`, [params.id]
  )
  if (!rol) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (rol.sistema) return NextResponse.json({ error: 'No se puede eliminar un rol de sistema' }, { status: 400 })

  const usuario = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM public.usuarios WHERE rol = $1`, [rol.clave]
  )
  const count = parseInt(usuario?.count || '0')
  if (count > 0) {
    return NextResponse.json({ error: `Hay ${count} usuario(s) con este rol — reasígnalos antes de eliminarlo` }, { status: 409 })
  }

  await query(`DELETE FROM public.roles WHERE id = $1`, [params.id])
  return NextResponse.json({ ok: true })
}
