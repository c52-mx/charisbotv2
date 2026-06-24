// src/app/api/client/orders/[id]/pay/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { stripeConfigurado, crearLinkDePagoStripe } from '@/lib/payments/stripe'
import { mercadopagoConfigurado, crearLinkDePagoMercadoPago } from '@/lib/payments/mercadopago'

// ── POST /api/client/orders/[id]/pay ────────────────────────────────────
// Genera el link de pago con la pasarela elegida y lo devuelve para redirigir al cliente.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { gateway } = await req.json() as { gateway: 'STRIPE' | 'MERCADOPAGO' }
  if (!['STRIPE', 'MERCADOPAGO'].includes(gateway)) {
    return NextResponse.json({ error: 'Pasarela inválida' }, { status: 400 })
  }

  const pedido = await queryOne<any>(`SELECT * FROM public.pedidos WHERE id = $1`, [params.id])
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (pedido.telefono !== session.email) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  if (pedido.estado !== 'PENDIENTE_PAGO') {
    return NextResponse.json({ error: 'Este pedido no admite pago en línea en su estado actual' }, { status: 400 })
  }
  if (!pedido.monto_total || Number(pedido.monto_total) <= 0) {
    return NextResponse.json({ error: 'El equipo de ventas aún no define el monto a cobrar para este pedido' }, { status: 400 })
  }

  const cfgRows = await query<{ clave: string; valor: string }>(
    `SELECT clave, valor FROM public.config_portal WHERE clave IN ('pago_stripe_habilitado','pago_mercadopago_habilitado')`, []
  )
  const cfg: Record<string, string> = {}
  for (const r of cfgRows) cfg[r.clave] = r.valor

  try {
    let url: string

    if (gateway === 'STRIPE') {
      if (cfg.pago_stripe_habilitado !== 'true' || !stripeConfigurado()) {
        return NextResponse.json({ error: 'Pago con Stripe no está disponible' }, { status: 400 })
      }
      url = await crearLinkDePagoStripe({
        id: pedido.id,
        numero_pedido: pedido.numero_pedido,
        montoCentavos: Math.round(Number(pedido.monto_total) * 100),
      })
    } else {
      if (cfg.pago_mercadopago_habilitado !== 'true' || !mercadopagoConfigurado()) {
        return NextResponse.json({ error: 'Pago con Mercado Pago no está disponible' }, { status: 400 })
      }
      url = await crearLinkDePagoMercadoPago({
        id: pedido.id,
        numero_pedido: pedido.numero_pedido,
        monto: Number(pedido.monto_total),
      })
    }

    await query(`UPDATE public.pedidos SET pago_gateway = $1 WHERE id = $2`, [gateway, pedido.id])
    return NextResponse.json({ url })
  } catch (e: any) {
    console.error('[POST /api/client/orders/[id]/pay]', e)
    return NextResponse.json({ error: e.message || 'Error al generar el link de pago' }, { status: 500 })
  }
}
