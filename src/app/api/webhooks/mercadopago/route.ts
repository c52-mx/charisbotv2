// src/app/api/webhooks/mercadopago/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verificarFirmaMercadoPago, obtenerPagoMercadoPago } from '@/lib/payments/mercadopago'
import { confirmarPagoPedido } from '@/lib/payments/confirm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const dataId = body?.data?.id ? String(body.data.id) : null

  // Ignorar eventos que no son de pago (merchant_order, etc.)
  if (!dataId || body?.type !== 'payment') {
    return NextResponse.json({ received: true })
  }

  // La firma es obligatoria: sin MP_WEBHOOK_SECRET el endpoint no acepta nada (antes se saltaba la verificación).
  if (!process.env.MP_WEBHOOK_SECRET) {
    console.error('[webhook mercadopago] MP_WEBHOOK_SECRET no configurado — notificación rechazada')
    return NextResponse.json({ error: 'No configurado' }, { status: 503 })
  }
  const valido = verificarFirmaMercadoPago({
    xSignature: req.headers.get('x-signature'),
    xRequestId: req.headers.get('x-request-id'),
    dataId,
  })
  if (!valido) {
    console.error('[webhook mercadopago] firma inválida')
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  try {
    const payment = await obtenerPagoMercadoPago(dataId) as any
    const pedidoId = payment.external_reference
    if (payment.status === 'approved' && pedidoId && payment.currency_id === 'MXN') {
      await confirmarPagoPedido(pedidoId, dataId, 'MERCADOPAGO', Number(payment.transaction_amount))
    }
  } catch (e) {
    console.error('[webhook mercadopago]', e)
  }

  return NextResponse.json({ received: true })
}
