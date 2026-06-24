import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const params: any[] = []
  let where = ''
  if (q) {
    where = `WHERE c.nombre ILIKE $1 OR c.telefono ILIKE $1 OR c.email ILIKE $1`
    params.push(`%${q}%`)
  }

  const [rows, countRow] = await Promise.all([
    query(
      `SELECT c.*, COUNT(p.id) as pedidos_count
       FROM public.clientes c
       LEFT JOIN public.pedidos p ON p.telefono = c.telefono
       ${where}
       GROUP BY c.id
       ORDER BY c.actualizado_en DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM public.clientes c ${where}`,
      params
    ),
  ])

  return NextResponse.json({
    data: rows,
    total: parseInt(countRow?.count || '0'),
    page,
    limit,
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { nombre, telefono, email, notas } = await req.json()
  if (!telefono) return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 })

  const row = await queryOne(
    `INSERT INTO public.clientes (nombre, telefono, email, notas)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (telefono) DO UPDATE
       SET nombre = EXCLUDED.nombre,
           email  = EXCLUDED.email,
           notas  = EXCLUDED.notas,
           actualizado_en = NOW()
     RETURNING *`,
    [nombre || null, telefono, email || null, notas || null]
  )

  return NextResponse.json({ ok: true, data: row }, { status: 201 })
}
