import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSession, can } from '@/lib/auth'
import { listarRolesInternos } from '@/lib/roles'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req)
  if (!s || !can(s, 'usuarios')) return NextResponse.json({ error:'Sin permiso' }, { status:403 })
  const { nombre, rol, activo, password } = await req.json()
  if (rol) {
    const validRols = (await listarRolesInternos()).map(r => r.clave)
    if (!validRols.includes(rol)) return NextResponse.json({ error:'Rol inválido' }, { status:400 })
  }

  if (rol && rol !== 'ADMIN') {
    const count = await queryOne<{count:string}>(
      "SELECT COUNT(*) as count FROM public.usuarios WHERE rol='ADMIN' AND activo=true AND id != $1", [params.id])
    if (parseInt(count?.count||'0') === 0) return NextResponse.json({ error:'Debe haber al menos un ADMIN activo' }, { status:400 })
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
  return NextResponse.json({ ok:true, data:row })
}
