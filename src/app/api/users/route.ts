import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// GET /api/users
export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'ADMIN') return NextResponse.json({ error:'Sin permiso' }, { status:403 })
  const rows = await query(
    `SELECT id, nombre, email, rol, activo, creado_en, ultimo_acceso
     FROM public.usuarios ORDER BY creado_en DESC`
  )
  return NextResponse.json({ data: rows })
}

// POST /api/users
export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'ADMIN') return NextResponse.json({ error:'Sin permiso' }, { status:403 })
  const { nombre, email, password, rol } = await req.json()
  if (!email?.trim() || !password?.trim() || !rol) return NextResponse.json({ error:'nombre, email, password y rol son requeridos' }, { status:400 })
  const valid = ['ADMIN','VENDEDOR','ALMACEN']
  if (!valid.includes(rol)) return NextResponse.json({ error:'Rol inválido' }, { status:400 })
  try {
    const hash = await bcrypt.hash(password, 10)
    const row = await queryOne<any>(
      `INSERT INTO public.usuarios (nombre, email, password_hash, rol, activo)
       VALUES ($1, $2, $3, $4, true) RETURNING id, nombre, email, rol, activo`,
      [nombre?.trim()||email, email.toLowerCase().trim(), hash, rol]
    )
    return NextResponse.json({ ok:true, data:row }, { status:201 })
  } catch(e:any) {
    if (e.code==='23505') return NextResponse.json({ error:'Ese email ya existe' }, { status:409 })
    return NextResponse.json({ error:e.message }, { status:500 })
  }
}
