import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { getReporteInventario } from '@/lib/reports'
import { excelResponse, addSheet } from '@/lib/excel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'dashboard')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const filtros = {
    desde:        searchParams.get('desde')                            || undefined,
    hasta:        searchParams.get('hasta')                            || undefined,
    serie:        searchParams.get('serie') || searchParams.get('tipo_case') || undefined,
    categoria:    searchParams.get('categoria')                        || undefined,
    modelo:       searchParams.get('modelo')                           || undefined,
    color:        searchParams.get('color')                            || undefined,
    ubicacion:    searchParams.get('ubicacion')                        || undefined,
    soloStockBajo: searchParams.get('soloStockBajo') === 'true',
  }
  const { stock, movimientos, umbral } = await getReporteInventario(filtros)

  if (searchParams.get('format') === 'xlsx') {
    return excelResponse('reporte-inventario.xlsx', wb => {
      addSheet(wb, 'Stock actual', ['Categoría', 'Serie', 'Nombre', 'Modelo', 'Color', 'Stock', 'Ubicación'],
        stock.map((r: any) => [r.categoria || '', r.serie || '', r.nombre || '', r.modelo || '', r.color || '', Number(r.stock), r.ubicacion || '']))
      addSheet(wb, 'Movimientos', ['Fecha', 'Tipo', 'Modelo', 'Color', 'Cantidad', 'Stock resultante', 'Motivo', 'Pedido', 'Realizado por'],
        movimientos.map((m: any) => [
          new Date(m.creado_en).toLocaleString('es-MX'), m.tipo, m.modelo || '', m.color || '',
          Number(m.cantidad), Number(m.stock_resultante), m.motivo || '',
          m.numero_pedido ? m.numero_pedido.toUpperCase() : '', m.realizado_por_nombre || 'Sistema',
        ]))
    })
  }

  return NextResponse.json({ stock, movimientos, umbral })
}
