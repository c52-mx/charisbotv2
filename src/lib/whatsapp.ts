const WA_BASE = `https://graph.facebook.com/${process.env.WA_API_VERSION || 'v22.0'}`
const PHONE_ID = process.env.WA_PHONE_NUMBER_ID
const TOKEN = process.env.WA_ACCESS_TOKEN

function cleanPhone(phone: string): string {
  let num = phone.toString().replace(/\D/g, '')
  if (/^521\d{10}$/.test(num)) num = '52' + num.slice(3)
  return '+' + num
}

export async function sendTextMessage(telefono: string, texto: string) {
  const res = await fetch(`${WA_BASE}/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone(telefono),
      type: 'text',
      text: { body: texto },
    }),
  })
  return res.json()
}

export async function notificarConfirmacion(pedido: {
  id: string
  telefono: string
  resumen: string
  tipo_case: string
}) {
  const mensaje = `✅ *Pedido confirmado* #${pedido.id.slice(0, 8).toUpperCase()}

📦 *Tipo:* ${pedido.tipo_case}
📋 *Resumen:* ${pedido.resumen}

Tu pedido fue registrado y está en proceso. Te notificaremos cuando esté listo. 🎉`

  return sendTextMessage(pedido.telefono, mensaje)
}

export async function notificarCambioEstatus(pedido: {
  id: string
  telefono: string
  estado: string
  resumen?: string
}) {
  const statusEmoji: Record<string, string> = {
    EN_PROCESO: '⚙️',
    COMPLETADO: '✅',
    CANCELADO: '❌',
    PENDIENTE: '⏳',
  }

  const emoji = statusEmoji[pedido.estado] || '📋'
  const mensaje = `${emoji} *Actualización de pedido* #${pedido.id.slice(0, 8).toUpperCase()}

*Estado:* ${pedido.estado.replace(/_/g, ' ')}
${pedido.resumen ? `📋 ${pedido.resumen}` : ''}

¿Tienes alguna pregunta? Escríbenos aquí mismo 💬`

  return sendTextMessage(pedido.telefono, mensaje)
}
