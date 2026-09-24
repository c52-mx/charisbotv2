// src/app/api/catalog/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, can } from '@/lib/auth'
import { registrarMovimiento } from '@/lib/stock'
import { logCatalogo, logAdmin } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// ── GET /api/catalog ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search    = searchParams.get('search')    || ''
  const serie     = searchParams.get('serie')     || searchParams.get('tipo') || ''
  const categoria = searchParams.get('categoria') || ''
  const activo    = searchParams.get('activo')    || ''
  const page      = parseInt(searchParams.get('page') || '1')
  const pageSize  = parseInt(searchParams.get('size') || '50')
  const offset    = (page - 1) * pageSize

  const conditions: string[] = []
  const params: any[]        = []
  let   idx = 1

  if (search) {
    conditions.push(`(nombre ILIKE $${idx} OR modelo ILIKE $${idx} OR color ILIKE $${idx} OR identificador ILIKE $${idx} OR ubicacion ILIKE $${idx})`)
    params.push(`%${search}%`); idx++
  }
  if (serie)     { conditions.push(`serie     = $${idx++}`);    params.push(serie.toUpperCase()) }
  if (categoria) { conditions.push(`categoria = $${idx++}`);    params.push(categoria) }
  if (activo !== '') { conditions.push(`activo = $${idx++}`);   params.push(activo === 'true') }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

  const [rows, countRow] = await Promise.all([
    query(
      `SELECT producto_id, categoria, serie, modelo, color, nombre, marca, foto_url, atributos,
              descripcion, precio_compra,
              activo, identificador, ubicacion, stock, precio, creado_en
       FROM public.catalogo_productos ${where}
       ORDER BY categoria, serie, modelo, color
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, pageSize, offset]
    ),
    query(
      `SELECT COUNT(*) as total FROM public.catalogo_productos ${where}`,
      params
    )
  ])

  return NextResponse.json({
    items: rows,
    total: parseInt(countRow[0]?.total || '0'),
    page,
    pageSize
  })
}

// ── POST /api/catalog ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'catalogo_crear')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  // Aceptar tanto los nombres nuevos como los viejos (compat transición)
  const serie        = (body.serie ?? body.tipo_case)
  const { modelo, color, activo = true, identificador, ubicacion, stock = 0, precio = 0,
          categoria = 'FUNDA', nombre, marca, foto_url, atributos,
          descripcion, precio_compra } = body

  // Para fundas clásicas (categoria FUNDA), serie+modelo+color siguen siendo el key natural.
  // Para accesorios/cargadores, al menos nombre es suficiente.
  if (categoria === 'FUNDA' && (!serie || !modelo || !color)) {
    return NextResponse.json({ error: 'Para fundas, serie, modelo y color son requeridos' }, { status: 400 })
  }

  // Validar serie si se proporciona
  if (serie) {
    const tipoValido = await query(
      `SELECT 1 FROM public.tipos_case WHERE nombre = $1 AND activo = true`,
      [serie.toUpperCase().trim()]
    )
    if (!tipoValido.length) {
      return NextResponse.json({ error: 'Serie/tipo inválido o inactivo' }, { status: 400 })
    }
  }

  const stockVal  = Math.max(0, parseInt(stock)  || 0)
  const precioVal = Math.max(0, parseFloat(precio) || 0)
  const serieNorm = serie ? serie.toUpperCase().trim() : null
  const modeloNorm = modelo ? modelo.toUpperCase().trim() : null
  const colorNorm  = color  ? color.toUpperCase().trim()  : null
  // nombre: explícito o generado a partir de serie+modelo+color
  const nombreFinal = (nombre ?? [serieNorm, modeloNorm, colorNorm].filter(Boolean).join(' ')).trim()

  const precioCompraVal = precio_compra !== undefined ? Math.max(0, parseFloat(precio_compra) || 0) : null

  const rows = await query(
    `INSERT INTO public.catalogo_productos
       (categoria, serie, modelo, color, nombre, marca, foto_url, atributos,
        descripcion, precio_compra,
        activo, identificador, ubicacion, stock, precio)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [
      categoria,
      serieNorm,
      modeloNorm,
      colorNorm,
      nombreFinal,
      marca?.trim()         || null,
      foto_url?.trim()      || null,
      atributos ? JSON.stringify(atributos) : null,
      descripcion?.trim()   || null,
      precioCompraVal,
      activo,
      identificador?.trim() || null,
      ubicacion?.trim()     || null,
      stockVal,
      precioVal,
    ]
  )

  if (!rows.length) {
    return NextResponse.json({ error: 'Ya existe un producto con esa combinación' }, { status: 409 })
  }

  if (stockVal > 0) {
    await registrarMovimiento({
      producto_id: rows[0].producto_id, tipo: 'ENTRADA', cantidad: stockVal, stock_resultante: stockVal,
      motivo: 'Alta de producto', realizado_por: session.sub,
    })
  }

  await logCatalogo(rows[0].producto_id, 'CREAR', { precio: precioVal, stock: stockVal, categoria }, session.sub)

  return NextResponse.json(rows[0], { status: 201 })
}

// ── DELETE /api/catalog — borra TODOS los items del catálogo ──────────
// Requiere el header X-Confirm: BORRAR_TODO para evitar accidentes.
export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const confirm = req.headers.get('x-confirm')
  if (confirm !== 'BORRAR_TODO') {
    return NextResponse.json({ error: 'Confirmación requerida' }, { status: 400 })
  }

  const rows = await query(`SELECT COUNT(*) as total FROM public.catalogo_productos`, [])
  const total = parseInt(rows[0]?.total || '0')

  await query(`DELETE FROM public.catalogo_productos`, [])

  await logAdmin({
    accion: 'CATALOGO_BORRAR_TODO',
    detalle: { total_eliminados: total },
    realizado_por: session.sub,
  })

  return NextResponse.json({ ok: true, eliminados: total })
}
