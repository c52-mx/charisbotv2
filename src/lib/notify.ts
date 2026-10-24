// src/lib/notify.ts
// Router de notificaciones: si el cliente tiene correo → email + WhatsApp;
// si no tiene correo (registro solo con teléfono) → solo WhatsApp.
import { readFile } from 'fs/promises'
import path from 'path'
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
  /** URL interna (/api/files/orders/<id>/<archivo>) de un archivo a adjuntar al correo (p. ej. guía de paquetería). */
  adjuntoUrl?: string | null
}

const TIPOS_ADJUNTO = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp'])
const MAX_ADJUNTO = 5 * 1024 * 1024

// Lee del disco un archivo subido a este pedido. Solo acepta rutas /api/files/orders/<pedidoId>/<archivo>.
async function leerAdjunto(pedidoId: string, url: string): Promise<{ filename: string; content: Buffer } | null> {
  const prefix = `/api/files/orders/${pedidoId}/`
  if (!url.startsWith(prefix)) return null
  const fname = url.slice(prefix.length)
  if (!fname || fname !== path.basename(fname) || !TIPOS_ADJUNTO.has(path.extname(fname).toLowerCase())) return null
  try {
    const content = await readFile(path.join(process.cwd(), 'public', 'uploads', 'orders', pedidoId, fname))
    if (content.length > MAX_ADJUNTO) return null
    return { filename: `guia-${fname}`, content }
  } catch {
    return null
  }
}

/**
 * Notifica al cliente sobre un cambio de estado en su pedido.
 * Canal 1 (siempre): WhatsApp al teléfono del pedido.
 * Canal 2 (si tiene email): correo electrónico.
 * Fire-and-forget — los errores se loguean pero no se propagan.
 */
export async function notificarCliente(params: NotificarParams): Promise<void> {
  const { id, telefono, estado, resumen, numero_pedido, nota, adjuntoUrl } = params

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
    const adjunto = adjuntoUrl ? await leerAdjunto(id, adjuntoUrl) : null
    await sendEmail({
      attachments: adjunto ? [adjunto] : undefined,
      to: cliente.email,
      subject: `Actualización de tu pedido #${numeroPedido}`,
      html: emailEstadoPedido(cliente.nombre || 'Cliente', numeroPedido, estado, nota),
    })
  } catch (e) {
    console.warn('[notify] Email falló:', e)
  }
}
