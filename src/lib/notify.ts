// src/lib/notify.ts
// Router de notificaciones: si el cliente tiene correo → email + WhatsApp;
// si no tiene correo (registro solo con teléfono) → solo WhatsApp.
import { query } from './db'
import { sendEmail, emailEstadoPedido } from './email'
import { notificarCambioEstatus } from './whatsapp'

interface NotificarParams {
  id: string
  telefono: string
  estado: string
  resumen: string
  numero_pedido?: string
  nota?: string
}

/**
 * Notifica al cliente sobre un cambio de estado en su pedido.
 * Canal 1 (siempre): WhatsApp al teléfono del pedido.
 * Canal 2 (si tiene email): correo electrónico.
 * Fire-and-forget — los errores se loguean pero no se propagan.
 */
export async function notificarCliente(params: NotificarParams): Promise<void> {
  const { id, telefono, estado, resumen, numero_pedido, nota } = params

  // WhatsApp — siempre
  try {
    await notificarCambioEstatus({ id, telefono, estado, resumen })
  } catch (e) {
    console.warn('[notify] WhatsApp falló:', e)
  }

  // Email — solo si tiene correo registrado
  try {
    const rows = await query<{ nombre: string | null; email: string | null }>(
      `SELECT nombre, email FROM public.clientes
       WHERE telefono = $1 AND email IS NOT NULL AND email <> '' LIMIT 1`,
      [telefono]
    )
    const cliente = rows[0]
    if (!cliente?.email) return

    const numeroPedido = numero_pedido || id.slice(0, 8).toUpperCase()
    await sendEmail({
      to: cliente.email,
      subject: `Actualización de tu pedido #${numeroPedido}`,
      html: emailEstadoPedido(cliente.nombre || 'Cliente', numeroPedido, estado, nota),
    })
  } catch (e) {
    console.warn('[notify] Email falló:', e)
  }
}
