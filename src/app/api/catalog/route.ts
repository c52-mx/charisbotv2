// src/app/api/catalog/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, can } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// ── GET /api/catalog ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search   = searchParams.get('search')   || ''
  const tipo     = searchParams.get('tipo')      || ''
  const activo   = searchParams.get('activo')    || ''
  const page     = parseInt(searchParams.get('page')  || '1')
  const pageSize = parseInt(searchParams.get('size')  || '50')
  const offset   = (page - 1) * pageSize

  const conditions: string[] = []
  const params: any[]        = []
  let   idx = 1

  if (search) {
    conditions.push(`(modelo ILIKE $${idx} OR color ILIKE $${idx} OR identificador ILIKE $${idx} OR ubicacion ILIKE $${idx})`)
    params.push(`%${search}%`); idx++
  }
  if (tipo)   { conditions.push(`tipo_case = $${idx}`);    params.push(tipo);   idx++ }
  if (activo !== '') { conditions.push(`activo = $${idx}`); params.push(activo === 'true'); idx++ }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

  // Detectar si las columnas nuevas ya existen (migración 006)
  let hasNewCols = true
  try {
    await query(`SELECT identificador FROM public.catalogo_cases LIMIT 0`, [])
  } catch {
    hasNewCols = false
  }

  const selectCols = hasNewCols
    ? 'case_id, tipo_case, modelo, color, activo, identificador, ubicacion, stock, creado_en'
    : 'case_id, tipo_case, modelo, color, activo, stock, creado_en'

  const [rows, countRow] = await Promise.all([
    query(
      `SELECT ${selectCols}
       FROM public.catalogo_cases ${where}
       ORDER BY tipo_case, modelo, color
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, pageSize, offset]
    ),
    query(
      `SELECT COUNT(*) as total FROM public.catalogo_cases ${where}`,
      params
    )
  ])

  // Normalizar filas para que siempre tengan los campos (aunque no existan en DB aún)
  const normalizedRows = rows.map((r: any) => ({
    ...r,
    identificador: r.identificador ?? null,
    ubicacion:     r.ubicacion     ?? null,
  }))

  return NextResponse.json({
    items: normalizedRows,
    total: parseInt(countRow[0]?.total || '0'),
    page,
    pageSize
  })
}

// Cache para no hacer el check de columnas en cada request
let _colsChecked: boolean | null = null
async function hasNewColumns(): Promise<boolean> {
  if (_colsChecked !== null) return _colsChecked
  try {
    await query(`SELECT identificador FROM public.catalogo_cases LIMIT 0`, [])
    _colsChecked = true
  } catch {
    _colsChecked = false
  }
  return _colsChecked
}

// ── POST /api/catalog ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session.rol as any, 'catalogo_crear')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { tipo_case, modelo, color, activo = true, identificador, ubicacion, stock = 0 } = await req.json()

  if (!tipo_case || !modelo || !color) {
    return NextResponse.json({ error: 'tipo_case, modelo y color son requeridos' }, { status: 400 })
  }

  const tipoValido = await query(
    `SELECT 1 FROM public.tipos_case WHERE nombre = $1 AND activo = true`,
    [tipo_case.toUpperCase().trim()]
  )
  if (!tipoValido.length) {
    return NextResponse.json({ error: 'Tipo de case inválido o inactivo' }, { status: 400 })
  }

  const newCols = await hasNewColumns()
  const stockVal = Math.max(0, parseInt(stock) || 0)

  let rows: any[]
  if (newCols) {
    rows = await query(
      `INSERT INTO public.catalogo_cases (tipo_case, modelo, color, activo, identificador, ubicacion, stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tipo_case, modelo, color) DO NOTHING
       RETURNING *`,
      [
        tipo_case.toUpperCase().trim(),
        modelo.toUpperCase().trim(),
        color.toUpperCase().trim(),
        activo,
        identificador?.trim() || null,
        ubicacion?.trim()     || null,
        stockVal,
      ]
    )
  } else {
    rows = await query(
      `INSERT INTO public.catalogo_cases (tipo_case, modelo, color, activo, stock)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tipo_case, modelo, color) DO NOTHING
       RETURNING *`,
      [
        tipo_case.toUpperCase().trim(),
        modelo.toUpperCase().trim(),
        color.toUpperCase().trim(),
        activo,
        stockVal,
      ]
    )
  }

  if (!rows.length) {
    return NextResponse.json({ error: 'Ya existe un producto con ese tipo, modelo y color' }, { status: 409 })
  }

  return NextResponse.json({
    ...rows[0],
    identificador: rows[0].identificador ?? null,
    ubicacion:     rows[0].ubicacion     ?? null,
  }, { status: 201 })
}