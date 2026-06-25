import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { registrarMovimiento } from '@/lib/stock'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

// POST /api/admin/catalog/import — carga masiva de inventario desde .xlsx
// (migración del inventario existente). El stock del archivo REMPLAZA el
// stock actual de cada producto (no se suma) — es una foto real, no un
// ajuste incremental.
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session.rol as any, 'catalogo_editar')) {
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

  for (const col of ['tipo_case', 'modelo', 'color']) {
    if (!colIndex[col]) return NextResponse.json({ error: `Falta la columna "${col}"` }, { status: 400 })
  }

  const tiposActivos = await query<{ nombre: string }>(`SELECT nombre FROM public.tipos_case WHERE activo = true`, [])
  const tiposSet = new Set(tiposActivos.map(t => t.nombre))

  let creados = 0, actualizados = 0
  const errores: { fila: number; motivo: string }[] = []

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i)
    const get = (col: string) => colIndex[col] ? row.getCell(colIndex[col]).value : null
    const tipo_case = String(get('tipo_case') || '').toUpperCase().trim()
    const modelo    = String(get('modelo') || '').toUpperCase().trim()
    const color     = String(get('color') || '').toUpperCase().trim()
    const stockRaw  = get('stock')
    const identificador = String(get('identificador') || '').trim() || null
    const ubicacion     = String(get('ubicacion') || '').trim() || null

    if (!tipo_case && !modelo && !color) continue // fila vacía
    if (!tipo_case || !modelo || !color) { errores.push({ fila: i, motivo: 'tipo_case, modelo y color son requeridos' }); continue }
    if (!tiposSet.has(tipo_case)) { errores.push({ fila: i, motivo: `Tipo de case "${tipo_case}" inválido o inactivo` }); continue }

    const stockVal = Math.max(0, parseInt(String(stockRaw ?? '0')) || 0)

    const existing = await queryOne<{ case_id: string; stock: number }>(
      `SELECT case_id, stock FROM public.catalogo_cases WHERE tipo_case=$1 AND modelo=$2 AND color=$3`,
      [tipo_case, modelo, color]
    )

    if (existing) {
      await query(
        `UPDATE public.catalogo_cases SET stock=$1, identificador=COALESCE($2,identificador), ubicacion=COALESCE($3,ubicacion) WHERE case_id=$4`,
        [stockVal, identificador, ubicacion, existing.case_id]
      )
      if (stockVal !== existing.stock) {
        await registrarMovimiento({
          case_id: existing.case_id, tipo: 'AJUSTE', cantidad: stockVal - existing.stock, stock_resultante: stockVal,
          motivo: 'Importación masiva', realizado_por: session.sub,
        })
      }
      actualizados++
    } else {
      const [created] = await query<{ case_id: string }>(
        `INSERT INTO public.catalogo_cases (tipo_case, modelo, color, activo, identificador, ubicacion, stock)
         VALUES ($1,$2,$3,true,$4,$5,$6) RETURNING case_id`,
        [tipo_case, modelo, color, identificador, ubicacion, stockVal]
      )
      if (stockVal > 0) {
        await registrarMovimiento({
          case_id: created.case_id, tipo: 'ENTRADA', cantidad: stockVal, stock_resultante: stockVal,
          motivo: 'Importación masiva', realizado_por: session.sub,
        })
      }
      creados++
    }
  }

  return NextResponse.json({ creados, actualizados, errores })
}
