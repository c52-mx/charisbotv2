import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSession, can } from '@/lib/auth'
import { listarRolesAsignables } from '@/lib/roles'
import { logAdmin } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req)
  if (!s || !can(s, 'usuarios')) return NextResponse.json({ error:'Sin permiso' }, { status:403 })
  const { nombre, rol, activo, password } = await req.json()

  // Solo un ADMIN puede asignar el rol ADMIN o modificar a un ADMIN existente
  // (evita que quien solo tiene el permiso "usuarios" se escale o tome una cuenta ADMIN).
  const objetivo = await queryOne<{ rol: string }>(`SELECT rol FROM public.usuarios WHERE id = $1`, [params.id])
  if (!objetivo) return NextResponse.json({ error:'Usuario no encontrado' }, { status:404 })
  if ((objetivo.rol === 'ADMIN' || rol === 'ADMIN') && s.rol !== 'ADMIN') {
    return NextResponse.json({ error:'Solo un ADMIN puede modificar cuentas ADMIN' }, { status:403 })
  }
  if (password !== undefined && (typeof password !== 'string' || password.length < 8 || password.length > 72)) {
    return NextResponse.json({ error:'La contraseña debe tener entre 8 y 72 caracteres' }, { status:400 })
  }
  // No dejar el sistema sin ADMIN activo (desactivar o degradar al último)
  if (objetivo.rol === 'ADMIN' && (activo === false || (rol && rol !== 'ADMIN'))) {
    const otros = await queryOne<{count:string}>(
      "SELECT COUNT(*) as count FROM public.usuarios WHERE rol='ADMIN' AND activo=true AND id != $1", [params.id])
    if (parseInt(otros?.count||'0') === 0) return NextResponse.json({ error:'Debe haber al menos un ADMIN activo' }, { status:400 })
  }
  if (rol) {
    const validRols = (await listarRolesAsignables()).map(r => r.clave)
    if (!validRols.includes(rol)) return NextResponse.json({ error:'Rol inválido' }, { status:400 })
  }

  const fields: string[] = []; const vals: any[] = []; let i = 1
  if (nombre   !== undefined) { fields.push(`nombre=$${i++}`);        vals.push(nombre) }
  if (rol      !== undefined) { fields.push(`rol=$${i++}`);           vals.push(rol) }
  if (activo   !== undefined) { fields.push(`activo=$${i++}`);        vals.push(activo) }
  if (password !== undefined) { fields.push(`password_hash=$${i++}`); vals.push(await bcrypt.hash(password,10)) }
  if (!fields.length) return NextResponse.json({ error:'Nada que actualizar' }, { status:400 })
  vals.push(params.id)
  const row = await queryOne<any>(
    `UPDATE public.usuarios SET ${fields.join(',')} WHERE id=$${i} RETURNING id,nombre,email,rol,activo`, vals)
  const cambios: Record<string, any> = {}
  if (nombre   !== undefined) cambios.nombre = nombre
  if (rol      !== undefined) cambios.rol = rol
  if (activo   !== undefined) cambios.activo = activo
  if (password !== undefined) cambios.password = '[cambiado]'
  await logAdmin({ accion: 'USUARIO_EDITAR', entidad: params.id, detalle: cambios, realizado_por: s.sub })
  return NextResponse.json({ ok:true, data:row })
}
