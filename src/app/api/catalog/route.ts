import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession, can } from '@/lib/auth'

// GET /api/catalog - listar catálogo con filtros
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')
  const modelo = searchParams.get('modelo')
  const activo = searchParams.get('activo') ?? 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []
  let idx = 1

  if (tipo) { conditions.push(`tipo_case = $${idx++}`); params.push(tipo) }
  if (modelo) { conditions.push(`modelo ILIKE $${idx++}`); params.push(`%${modelo}%`) }
  if (activo !== 'all') { conditions.push(`activo = $${idx++}`); params.push(activo === 'true') }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [rows, countRow] = await Promise.all([
    query(
      `SELECT case_id, tipo_case, modelo, color, precio, stock, activo, imagen_url, creado_en
       FROM public.catalogo_cases ${where}
       ORDER BY tipo_case, modelo, color
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM public.catalogo_cases ${where}`,
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

// POST /api/catalog - crear item
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  const { tipo_case, modelo, color, precio, stock, imagen_url } = body

  if (!tipo_case || !modelo || !color) {
    return NextResponse.json({ error: 'tipo_case, modelo y color son requeridos' }, { status: 400 })
  }

  const row = await queryOne(
    `INSERT INTO public.catalogo_cases (tipo_case, modelo, color, precio, stock, imagen_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tipo_case, modelo, color) 
     DO UPDATE SET precio = EXCLUDED.precio, stock = EXCLUDED.stock, activo = true
     RETURNING *`,
    [
      tipo_case.toUpperCase(),
      modelo.toUpperCase().trim(),
      color.toUpperCase().trim(),
      precio || 0,
      stock || 0,
      imagen_url || null,
    ]
  )

  return NextResponse.json({ ok: true, data: row }, { status: 201 })
}
