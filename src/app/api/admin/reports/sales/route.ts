import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { getReporteVentas } from '@/lib/reports'
import { excelResponse, addSheet } from '@/lib/excel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'dashboard')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const filtros = {
    desde: searchParams.get('desde') || undefined,
    hasta: searchParams.get('hasta') || undefined,
  }
  const reporte = await getReporteVentas(filtros)

  if (searchParams.get('format') === 'xlsx') {
    return excelResponse('reporte-ventas.xlsx', wb => {
      addSheet(wb, 'Resumen',
        ['Total ventas', 'Total pedidos', 'Total ingresos', 'Total costos', 'Ganancia bruta'],
        [[reporte.totalVentas, reporte.totalPedidos,
          reporte.totalIngresos, reporte.totalCostos, reporte.totalGanancia]])
      addSheet(wb, 'Por día', ['Fecha', 'Total'],
        reporte.porDia.map((d: any) => [new Date(d.fecha).toLocaleDateString('es-MX'), Number(d.total)]))
      addSheet(wb, 'Top clientes', ['Teléfono', 'Cliente', 'Total', 'Pedidos'],
        reporte.topClientes.map((c: any) => [c.telefono, c.cliente_nombre || '', Number(c.total), Number(c.pedidos)]))
      addSheet(wb, 'Top productos', ['Producto', 'Categoría', 'Piezas', 'Ingresos', 'Costo', 'Ganancia'],
        reporte.topModelos.map((m: any) => [
          m.producto, m.categoria || '', Number(m.total_piezas),
          Number(m.ingresos || 0), Number(m.costo_total || 0), Number(m.ganancia || 0),
        ]))
    })
  }

  return NextResponse.json(reporte)
}
