import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { createHmac } from 'crypto'

export function mercadopagoConfigurado(): boolean {
  return !!process.env.MP_ACCESS_TOKEN
}

let _config: MercadoPagoConfig | null = null
function getConfig(): MercadoPagoConfig {
  if (!process.env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN no está configurado')
  if (!_config) _config = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  return _config
}

interface PedidoPago {
  id: string
  numero_pedido?: string | null
  monto: number // MXN
}

// Crea una preferencia de Checkout Pro y devuelve la URL (init_point) a la que se redirige al cliente.
export async function crearLinkDePagoMercadoPago(pedido: PedidoPago): Promise<string> {
  const preference = new Preference(getConfig())
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const folio = (pedido.numero_pedido || pedido.id.slice(0, 8)).toUpperCase()

  const res = await preference.create({
    body: {
      items: [{
        id: pedido.id,
        title: `Pedido #${folio} — CharisBot`,
        quantity: 1,
        currency_id: 'MXN',
        unit_price: pedido.monto,
      }],
      external_reference: pedido.id,
      back_urls: {
        success: `${baseUrl}/client/orders/${pedido.id}?pago=ok`,
        failure: `${baseUrl}/client/orders/${pedido.id}?pago=cancelado`,
      },
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    },
  })

  if (!res.init_point) throw new Error('Mercado Pago no devolvió una URL de checkout')
  return res.init_point
}

// Verifica la firma del webhook (header x-signature) según el esquema de Mercado Pago.
export function verificarFirmaMercadoPago(params: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret || !params.xSignature) return false

  const parts = Object.fromEntries(
    params.xSignature.split(',').map(p => p.trim().split('=').map(s => s.trim()))
  ) as Record<string, string>
  const ts = parts['ts']
  const hash = parts['v1']
  if (!ts || !hash) return false

  const manifest = `id:${params.dataId};request-id:${params.xRequestId || ''};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  if (expected.length !== hash.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ hash.charCodeAt(i)
  return diff === 0
}

// Obtiene el detalle de un pago para confirmar su estado real (no confiar solo en el webhook).
export async function obtenerPagoMercadoPago(paymentId: string) {
  const payment = new Payment(getConfig())
  return payment.get({ id: paymentId })
}
