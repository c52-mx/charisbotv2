import { query } from './db'

// ── Auditoría de sesión (login/logout) ─────────────────────────────────
export async function logSesion(
  usuarioId: string,
  accion: 'LOGIN' | 'LOGOUT',
  ip?: string,
  userAgent?: string
): Promise<void> {
  await query(
    `INSERT INTO public.audit_sesiones (usuario_id, accion, ip, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [usuarioId, accion, ip || null, userAgent || null]
  ).catch((e: any) => {
    console.error('[audit.logSesion]', e?.message)
  })
}

// ── Auditoría de catálogo (altas/bajas/modificaciones de productos) ────
export async function logCatalogo(
  producto_id: string,   // UUID de catalogo_productos
  accion: string,
  detalle?: Record<string, unknown>,
  realizadoPor?: string
): Promise<void> {
  await query(
    `INSERT INTO public.catalogo_cambios (producto_id, accion, detalle, realizado_por)
     VALUES ($1, $2, $3, $4)`,
    [producto_id, accion, detalle ? JSON.stringify(detalle) : null, realizadoPor || null]
  ).catch((e: any) => {
    // catalogo_cambios no existe aún en la DB — falla silenciosa hasta que se cree
    console.error('[audit.logCatalogo]', e?.message)
  })
}

// ── Auditoría de clientes ─────────────────────────────────────────────
export async function logCliente(params: {
  cliente_id?: string
  telefono?: string
  accion: string
  detalle?: Record<string, unknown>
  campos_antes?: Record<string, unknown> | null
  campos_despues?: Record<string, unknown> | null
  realizado_por?: string
}): Promise<void> {
  await query(
    `INSERT INTO public.audit_clientes (cliente_id, telefono, accion, detalle, realizado_por)
     VALUES ($1, $2, $3, $4, $5)`,
    [params.cliente_id || null, params.telefono || null, params.accion,
     params.detalle ? JSON.stringify(params.detalle) : null, params.realizado_por || null]
  ).catch((e: any) => {
    console.error('[audit.logCliente]', e?.message)
  })
}

// ── Auditoría de acciones de administrador ────────────────────────────
export async function logAdmin(params: {
  accion: string
  entidad?: string
  detalle?: Record<string, unknown>
  realizado_por?: string
}): Promise<void> {
  await query(
    `INSERT INTO public.audit_admin (accion, detalle, realizado_por)
     VALUES ($1, $2, $3)`,
    [params.accion, params.detalle ? JSON.stringify(params.detalle) : null, params.realizado_por || null]
  ).catch((e: any) => {
    console.error('[audit.logAdmin]', e?.message)
  })
}

// ── Auditoría de pedidos (cambios de estado) ──────────────────────────
export async function logPedido(
  pedidoId: string,
  accion: string,
  detalle?: Record<string, unknown>,
  realizadoPor?: string
): Promise<void> {
  await query(
    `INSERT INTO public.pedido_timeline (pedido_id, tipo_evento, detalle, realizado_por)
     VALUES ($1, $2, $3, $4)`,
    [pedidoId, accion, detalle ? JSON.stringify(detalle) : null, realizadoPor || null]
  ).catch((e: any) => {
    console.error('[audit.logPedido]', e?.message)
  })
}
