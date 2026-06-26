import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession, can } from '@/lib/auth'
import { excelResponse, addSheet } from '@/lib/excel'

export const dynamic = 'force-dynamic'

// GET /api/orders/[id]/picking — genera la orden de surtido en .xlsx.
// Exportarla es la señal de que almacén ya empezó: si el pedido está en
// CONFIRMADO, lo pasa a EN_PREPARACION automáticamente.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session, 'pedidos_estado')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const pedido = await queryOne<{ id: string; numero_pedido: string | null; estado: string }>(
    `SELECT id, numero_pedido, estado FROM public.pedidos WHERE id = $1`, [params.id]
  )
  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const items = await query<{ modelo: string; tipo_case: string; color: string; cantidad: number }>(
    `SELECT pi.modelo, pi.tipo_case, pi.color, pi.cantidad
     FROM public.pedido_items pi WHERE pi.pedido_id = $1 ORDER BY pi.tipo_case, pi.modelo`,
    [params.id]
  )

  const ubicaciones = await query<{ tipo_case: string; modelo: string; color: string; ubicacion: string | null }>(
    `SELECT tipo_case, modelo, color, ubicacion FROM public.catalogo_cases
     WHERE (tipo_case, modelo, color) IN (${items.map((_, i) => `($${i*3+1},$${i*3+2},$${i*3+3})`).join(',') || "('','','')"})`,
    items.flatMap(it => [it.tipo_case, it.modelo, it.color])
  )
  const ubicacionMap = new Map(ubicaciones.map(u => [`${u.tipo_case}__${u.modelo}__${u.color}`, u.ubicacion]))

  if (pedido.estado === 'CONFIRMADO') {
    await query(`UPDATE public.pedidos SET estado='EN_PREPARACION', actualizado_en=NOW() WHERE id=$1`, [params.id])
    await query(
      `INSERT INTO public.pedido_timeline (pedido_id, estado, nota, realizado_por)
       VALUES ($1, 'EN_PREPARACION', 'Orden de surtido exportada', $2)`,
      [params.id, session.sub]
    )
  }

  const numero = (pedido.numero_pedido || pedido.id.slice(0, 8)).toUpperCase()
  return excelResponse(`surtido-${numero}.xlsx`, wb => {
    addSheet(wb, 'Surtido', ['Modelo', 'Tipo', 'Color', 'Cantidad', 'Ubicación'],
      items.map(it => [it.modelo, it.tipo_case, it.color, it.cantidad, ubicacionMap.get(`${it.tipo_case}__${it.modelo}__${it.color}`) || '']))
  })
}
