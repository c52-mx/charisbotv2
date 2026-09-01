// src/app/api/client/cart/reserve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { resolveProductoId, reservarCarrito, liberarCarritoItem, getConfigMinutos } from '@/lib/stock'

export const dynamic = 'force-dynamic'

// ── POST: apartar/actualizar cantidad en el carrito ─────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  // Aceptar tanto los nombres nuevos como los viejos (compat transición frontend)
  const serie    = body.serie    ?? body.tipo_case
  const { modelo, color, cantidad } = body
  if (!serie || !modelo || !color || !cantidad || cantidad <= 0) {
    return NextResponse.json({ error: 'serie, modelo, color y cantidad son requeridos' }, { status: 400 })
  }

  const productoId = await resolveProductoId(serie.toUpperCase().trim(), modelo.toUpperCase().trim(), (color || '').toUpperCase().trim() || 'NEGRO')
  if (!productoId) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  const [prodRow] = await query<{ precio: number }>(`SELECT precio FROM public.catalogo_productos WHERE producto_id = $1`, [productoId])
  const precio = Number(prodRow?.precio ?? 0)

  const ttlMin = await getConfigMinutos('tiempo_reserva_carrito_min', 30)
  const result = await reservarCarrito(productoId, session.email, cantidad, ttlMin)

  if (!result.ok) {
    return NextResponse.json({ error: 'Stock insuficiente', disponible: result.disponible, precio }, { status: 409 })
  }
  return NextResponse.json({ ok: true, disponible: result.disponible, precio })
}

// ── DELETE: liberar un producto del carrito ─────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const serie  = body.serie  ?? body.tipo_case
  const { modelo, color } = body
  if (!serie || !modelo || !color) {
    return NextResponse.json({ error: 'serie, modelo y color son requeridos' }, { status: 400 })
  }

  const productoId = await resolveProductoId(serie.toUpperCase().trim(), modelo.toUpperCase().trim(), (color || '').toUpperCase().trim() || 'NEGRO')
  if (productoId) await liberarCarritoItem(productoId, session.email)

  return NextResponse.json({ ok: true })
}
