// src/app/api/client/cart/reserve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveCaseId, reservarCarrito, liberarCarritoItem, getConfigMinutos } from '@/lib/stock'

export const dynamic = 'force-dynamic'

// ── POST: apartar/actualizar cantidad en el carrito ─────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { tipo_case, modelo, color, cantidad } = await req.json()
  if (!tipo_case || !modelo || !color || !cantidad || cantidad <= 0) {
    return NextResponse.json({ error: 'tipo_case, modelo, color y cantidad son requeridos' }, { status: 400 })
  }

  const caseId = await resolveCaseId(tipo_case, modelo, color)
  if (!caseId) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  const ttlMin = await getConfigMinutos('tiempo_reserva_carrito_min', 30)
  const result = await reservarCarrito(caseId, session.email, cantidad, ttlMin)

  if (!result.ok) {
    return NextResponse.json({ error: 'Stock insuficiente', disponible: result.disponible }, { status: 409 })
  }
  return NextResponse.json({ ok: true, disponible: result.disponible })
}

// ── DELETE: liberar un producto del carrito ─────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { tipo_case, modelo, color } = await req.json()
  if (!tipo_case || !modelo || !color) {
    return NextResponse.json({ error: 'tipo_case, modelo y color son requeridos' }, { status: 400 })
  }

  const caseId = await resolveCaseId(tipo_case, modelo, color)
  if (caseId) await liberarCarritoItem(caseId, session.email)

  return NextResponse.json({ ok: true })
}
