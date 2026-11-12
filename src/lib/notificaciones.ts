// Notificaciones internas (campanita). Fire-and-forget: un fallo aquí nunca debe romper el flujo principal.
import { query } from './db'
import type { Permiso } from './auth-shared'

export async function crearNotificacion(n: {
  permiso: Permiso
  tipo: string
  titulo: string
  mensaje?: string
  pedido_id?: string
}): Promise<void> {
  try {
    await query(
      `INSERT INTO public.notificaciones (permiso, tipo, titulo, mensaje, pedido_id) VALUES ($1,$2,$3,$4,$5)`,
      [n.permiso, n.tipo, n.titulo, n.mensaje ?? null, n.pedido_id ?? null]
    )
  } catch (e) {
    console.warn('[notificaciones]', e)
  }
}

// Evento de cambio de estado → a quién avisar (por permiso) y con qué texto. null = no notifica.
export function notificacionPorEstado(estado: string, numero: string): { permiso: Permiso; titulo: string } | null {
  switch (estado) {
    case 'PENDIENTE_CONFIRMACION': return { permiso: 'pagos_confirmar', titulo: `Pago por confirmar · #${numero}` }
    case 'CONFIRMADO':             return { permiso: 'pedidos_estado',  titulo: `Pedido confirmado, listo para surtir · #${numero}` }
    case 'POR_VALIDAR_SURTIDO':    return { permiso: 'pagos_confirmar', titulo: `Surtido por validar · #${numero}` }
    case 'ENTREGA_FALLIDA':        return { permiso: 'pedidos_estado',  titulo: `Entrega fallida · #${numero}` }
    case 'CANCELADO':              return { permiso: 'pedidos_estado',  titulo: `Pedido cancelado · #${numero}` }
    default: return null
  }
}
