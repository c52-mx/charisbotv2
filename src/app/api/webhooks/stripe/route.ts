// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verificarWebhookStripe } from '@/lib/payments/stripe'
import { confirmarPagoPedido } from '@/lib/payments/confirm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Falta firma' }, { status: 400 })

  const rawBody = await req.text()

  let event
  try {
    event = verificarWebhookStripe(rawBody, signature)
  } catch (e: any) {
    console.error('[webhook stripe] firma inválida:', e.message)
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const pedidoId = session.metadata?.pedido_id
    if (pedidoId) {
      await confirmarPagoPedido(pedidoId, session.id, 'STRIPE').catch(e =>
        console.error('[webhook stripe] confirmarPagoPedido', e)
      )
    }
  }

  return NextResponse.json({ received: true })
}
