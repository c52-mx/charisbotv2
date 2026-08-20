import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { getReportePedidos } from '@/lib/reports'
import { excelResponse, addSheet } from '@/lib/excel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'pedidos_ver')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const filtros = {
    desde:          searchParams.get('desde')          || undefined,
    hasta:          searchParams.get('hasta')           || undefined,
    estado:         searchParams.get('estado')          || undefined,
    telefono:       searchParams.get('telefono')        || undefined,
    tipo_case:      searchParams.get('tipo_case')       || undefined,
    origen:         searchParams.get('origen')          || undefined,
    cliente_nombre: searchParams.get('cliente_nombre')  || undefined,
  }
  const { rows, totales } = await getReportePedidos(filtros)

  if (searchParams.get('format') === 'xlsx') {
    return excelResponse('reporte-pedidos.xlsx', wb => {
      addSheet(wb, 'Pedidos', ['Pedido', 'Teléfono', 'Cliente', 'Tipo', 'Estado', 'Origen', 'Vendedor', 'Paquetería', 'Costo Envío', 'Piezas', 'Monto', 'Fecha'],
        rows.map((r: any) => [
          (r.numero_pedido || r.id.slice(0, 8)).toUpperCase(), r.telefono, r.cliente_nombre || '',
          r.tipo_case, r.estado, r.origen, r.vendedor_nombre || '',
          r.paqueteria || '', r.envio_costo ? Number(r.envio_costo) : null,
          Number(r.total_piezas), r.monto_total ? Number(r.monto_total) : null,
          new Date(r.creado_en).toLocaleString('es-MX'),
        ]))
    })
  }

  return NextResponse.json({ rows, totales })
}
