// src/app/api/client/catalog/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getDisponibilidad } from '@/lib/stock'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const productoId = params.id

  try {
    const producto = await queryOne<any>(`
      SELECT p.*,
             COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo = 'SALIDA'), 0)::int AS vendidos
      FROM public.catalogo_productos p
      LEFT JOIN public.movimientos_stock m ON m.producto_id = p.producto_id
      WHERE p.producto_id = $1 AND p.activo = true
      GROUP BY p.producto_id
    `, [productoId])

    if (!producto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const disponibilidadMap = await getDisponibilidad([productoId])
    const disponible = disponibilidadMap[productoId] ?? 0

    // Variantes de color: misma serie + marca + modelo, diferente color
    const variantes = (producto.serie && producto.modelo) ? await query<any>(`
      SELECT v.producto_id, v.color, v.foto_url, v.precio
      FROM public.catalogo_productos v
      WHERE v.activo = true
        AND v.serie = $1
        AND v.modelo = $2
        AND (v.marca IS NOT DISTINCT FROM $3)
        AND v.producto_id != $4
      ORDER BY v.color
    `, [producto.serie, producto.modelo, producto.marca || null, productoId]) : []

    // Obtener disponibilidad de variantes en una sola query
    const varianteIds = variantes.map((v: any) => v.producto_id)
    const variantesDisp = varianteIds.length ? await getDisponibilidad(varianteIds) : {}
    const variantesConDisp = variantes.map((v: any) => ({
      ...v,
      disponible: variantesDisp[v.producto_id] ?? 0,
    }))

    // Modelos relacionados: misma serie + marca, diferente modelo
    const modelosRel = (producto.serie) ? await query<any>(`
      SELECT
        p.modelo,
        MIN(p.producto_id) AS producto_id,
        MIN(p.foto_url) AS foto_url,
        MIN(p.precio) AS precio_min,
        COUNT(DISTINCT p.color) AS num_colores
      FROM public.catalogo_productos p
      WHERE p.activo = true
        AND p.serie = $1
        AND (p.marca IS NOT DISTINCT FROM $2)
        AND p.modelo IS NOT NULL
        AND p.modelo != $3
      GROUP BY p.modelo
      ORDER BY p.modelo
      LIMIT 12
    `, [producto.serie, producto.marca || null, producto.modelo || '']) : []

    // Productos relacionados: misma categoría
    const relacionados = await query<any>(`
      SELECT producto_id, nombre, serie, modelo, color, foto_url, precio, stock, categoria, vendidos
      FROM (
        SELECT p.producto_id, p.nombre, p.serie, p.modelo, p.color, p.foto_url, p.precio, p.stock, p.categoria,
               COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo = 'SALIDA'), 0)::int AS vendidos
        FROM public.catalogo_productos p
        LEFT JOIN public.movimientos_stock m ON m.producto_id = p.producto_id
        WHERE p.activo = true AND p.categoria = $1 AND p.producto_id != $2 AND p.stock > 0
        GROUP BY p.producto_id
        ORDER BY RANDOM()
        LIMIT 8
      ) t
    `, [producto.categoria, productoId])

    return NextResponse.json({ producto, disponible, variantes: variantesConDisp, modelosRel, relacionados })
  } catch (e: any) {
    console.error('[GET /api/client/catalog/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
