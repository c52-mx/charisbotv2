import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { registrarMovimiento } from '@/lib/stock'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

// POST /api/admin/catalog/import — carga masiva de inventario desde .xlsx
// Acepta columnas nuevas (serie, nombre) y viejas (tipo_case) para compat.
// El stock del archivo REMPLAZA el stock actual de cada producto (no se suma).
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(buffer as any)
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo, asegúrate de que sea un .xlsx válido' }, { status: 400 })
  }

  const sheet = wb.worksheets[0]
  if (!sheet) return NextResponse.json({ error: 'El archivo no tiene hojas' }, { status: 400 })

  const headerRow = sheet.getRow(1)
  const colIndex: Record<string, number> = {}
  headerRow.eachCell((cell, i) => { colIndex[String(cell.value).trim().toLowerCase()] = i })

  // Aceptar tanto columna "serie" (nueva) como "tipo_case" (legado)
  const serieCol = colIndex['serie'] ? 'serie' : 'tipo_case'

  if (!colIndex[serieCol] || !colIndex['modelo'] || !colIndex['color']) {
    return NextResponse.json({ error: 'Faltan columnas: serie (o tipo_case), modelo, color' }, { status: 400 })
  }

  const tiposActivos = await query<{ nombre: string }>(`SELECT nombre FROM public.tipos_case WHERE activo = true`, [])
  const tiposSet = new Set(tiposActivos.map(t => t.nombre))

  let creados = 0, actualizados = 0
  const errores: { fila: number; motivo: string }[] = []

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i)
    const get = (col: string) => colIndex[col] ? row.getCell(colIndex[col]).value : null

    const categoriaRaw  = String(get('categoria') || '').toUpperCase().trim()
    const categoria     = categoriaRaw || 'FUNDA'
    const serie        = String(get(serieCol) || '').toUpperCase().trim()
    const modelo       = String(get('modelo') || '').toUpperCase().trim()
    const color        = String(get('color')  || '').toUpperCase().trim() || 'NEGRO'
    const stockRaw     = get('stock')
    const precioRaw    = get('precio')
    const identificador = String(get('identificador') || '').trim() || null
    const ubicacion     = String(get('ubicacion') || '').trim() || null
    const nombreRaw     = String(get('nombre') || '').trim() || null
    const marcaRaw      = String(get('marca') || '').trim() || null

    // Fila vacía: ignorar
    if (!serie && !modelo && !nombreRaw) continue

    // Validaciones
    if (categoria === 'FUNDA' && (!modelo || !color)) {
      errores.push({ fila: i, motivo: 'Para fundas, modelo y color son requeridos' }); continue
    }
    if (categoria !== 'FUNDA' && !nombreRaw) {
      errores.push({ fila: i, motivo: 'Para accesorios/cargadores, el nombre es requerido' }); continue
    }
    if (serie && !tiposSet.has(serie)) {
      errores.push({ fila: i, motivo: `Serie "${serie}" inválida o inactiva` }); continue
    }

    const stockVal = Math.max(0, parseInt(String(stockRaw ?? '0')) || 0)
    const precioVal = Math.max(0, parseFloat(String(precioRaw ?? '0')) || 0)
    const nombre   = nombreRaw || [serie, modelo, color].filter(Boolean).join(' ')

    // Buscar por serie+modelo+color (fundas) o por nombre (accesorios sin serie)
    const existing = await queryOne<{ producto_id: string; stock: number }>(
      `SELECT producto_id, stock FROM public.catalogo_productos
       WHERE serie IS NOT DISTINCT FROM $1 AND modelo = $2 AND color = $3
       LIMIT 1`,
      [serie || null, modelo, color]
    )

    if (existing) {
      await query(
        `UPDATE public.catalogo_productos
         SET stock=$1,
             identificador=COALESCE($2,identificador),
             ubicacion=COALESCE($3,ubicacion),
             precio=CASE WHEN $4::numeric > 0 THEN $4::numeric ELSE precio END,
             marca=COALESCE($5,marca)
         WHERE producto_id=$6`,
        [stockVal, identificador, ubicacion, precioVal, marcaRaw, existing.producto_id]
      )
      if (stockVal !== existing.stock) {
        await registrarMovimiento({
          producto_id: existing.producto_id, tipo: 'AJUSTE', cantidad: stockVal - existing.stock,
          stock_resultante: stockVal, motivo: 'Importación masiva', realizado_por: session.sub,
        })
      }
      actualizados++
    } else {
      const [created] = await query<{ producto_id: string }>(
        `INSERT INTO public.catalogo_productos
           (categoria, serie, modelo, color, nombre, marca, activo, identificador, ubicacion, stock, precio)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10)
         RETURNING producto_id`,
        [categoria, serie || null, modelo || null, color, nombre, marcaRaw, identificador, ubicacion, stockVal, precioVal]
      )
      if (stockVal > 0) {
        await registrarMovimiento({
          producto_id: created.producto_id, tipo: 'ENTRADA', cantidad: stockVal,
          stock_resultante: stockVal, motivo: 'Importación masiva', realizado_por: session.sub,
        })
      }
      creados++
    }
  }

  return NextResponse.json({ creados, actualizados, errores })
}
