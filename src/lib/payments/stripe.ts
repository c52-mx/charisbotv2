import Stripe from 'stripe'

export function stripeConfigurado(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY no está configurado')
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' })
  return _stripe
}

interface PedidoPago {
  id: string
  numero_pedido?: string | null
  montoCentavos: number // MXN, en centavos
}

// Crea una sesión de Stripe Checkout y devuelve la URL a la que se redirige al cliente.
export async function crearLinkDePagoStripe(pedido: PedidoPago): Promise<string> {
  const stripe = getStripe()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const folio = (pedido.numero_pedido || pedido.id.slice(0, 8)).toUpperCase()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'mxn',
        product_data: { name: `Pedido #${folio} — CharisBot` },
        unit_amount: pedido.montoCentavos,
      },
      quantity: 1,
    }],
    metadata: { pedido_id: pedido.id },
    success_url: `${baseUrl}/client/orders/${pedido.id}?pago=ok`,
    cancel_url:  `${baseUrl}/client/orders/${pedido.id}?pago=cancelado`,
  })

  if (!session.url) throw new Error('Stripe no devolvió una URL de checkout')
  return session.url
}

// Verifica la firma del webhook y devuelve el evento ya validado.
export function verificarWebhookStripe(rawBody: string, signature: string): Stripe.Event {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET no está configurado')
  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}
