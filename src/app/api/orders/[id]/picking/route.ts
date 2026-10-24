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

  // Clave y ubicación salen del producto ligado al artículo; en pedidos históricos, por serie+modelo+color.
  const items = await query<{ clave: string | null; nombre: string | null; categoria: string | null; modelo: string; serie: string | null; color: string; cantidad: number; ubicacion: string | null }>(
    `SELECT COALESCE(cp.identificador, c2.identificador) AS clave,
            COALESCE(pi.nombre_producto, pi.modelo) AS nombre,
            pi.categoria, pi.modelo, pi.serie, pi.color, pi.cantidad,
            COALESCE(cp.ubicacion, c2.ubicacion) AS ubicacion
     FROM public.pedido_items pi
     LEFT JOIN public.catalogo_productos cp ON cp.producto_id = pi.producto_id
     LEFT JOIN LATERAL (
       SELECT identificador, ubicacion FROM public.catalogo_productos c
       WHERE c.producto_id IS DISTINCT FROM pi.producto_id AND pi.producto_id IS NULL
         AND COALESCE(c.serie,'') = COALESCE(pi.serie,'') AND c.modelo = pi.modelo AND c.color = pi.color
       LIMIT 1
     ) c2 ON true
     WHERE pi.pedido_id = $1
     ORDER BY pi.serie, pi.modelo`,
    [params.id]
  )

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
    addSheet(wb, 'Surtido', ['Clave', 'Producto', 'Tipo', 'Modelo', 'Serie', 'Color', 'Cantidad', 'Ubicación'],
      items.map(it => [it.clave || '', it.nombre || it.modelo, it.categoria || '', it.modelo, it.serie || '', it.color, it.cantidad, it.ubicacion || '']))
  })
}
