// src/app/api/webhooks/mercadopago/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verificarFirmaMercadoPago, obtenerPagoMercadoPago } from '@/lib/payments/mercadopago'
import { confirmarPagoPedido } from '@/lib/payments/confirm'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const dataId = body?.data?.id ? String(body.data.id) : null

  // Ignorar eventos que no son de pago (merchant_order, etc.)
  if (!dataId || body?.type !== 'payment') {
    return NextResponse.json({ received: true })
  }

  if (process.env.MP_WEBHOOK_SECRET) {
    const valido = verificarFirmaMercadoPago({
      xSignature: req.headers.get('x-signature'),
      xRequestId: req.headers.get('x-request-id'),
      dataId,
    })
    if (!valido) {
      console.error('[webhook mercadopago] firma inválida')
      return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
    }
  }

  try {
    const payment = await obtenerPagoMercadoPago(dataId) as any
    const pedidoId = payment.external_reference
    if (payment.status === 'approved' && pedidoId) {
      await confirmarPagoPedido(pedidoId, dataId, 'MERCADOPAGO')
    }
  } catch (e) {
    console.error('[webhook mercadopago]', e)
  }

  return NextResponse.json({ received: true })
}
