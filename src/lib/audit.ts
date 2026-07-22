import { query } from './db'

export async function logSesion(params: {
  usuario_id: string
  email: string
  ip?: string | null
  user_agent?: string | null
}): Promise<void> {
  await query(
    `INSERT INTO public.sesiones (usuario_id, email, ip, user_agent) VALUES ($1, $2, $3, $4)`,
    [params.usuario_id, params.email, params.ip ?? null, params.user_agent ?? null]
  ).catch(() => {}) // nunca bloquear el login
}

export async function logAdmin(params: {
  accion: string
  entidad?: string | null
  detalle?: Record<string, any> | null
  realizado_por?: string | null
}): Promise<void> {
  await query(
    `INSERT INTO public.admin_log (accion, entidad, detalle, realizado_por) VALUES ($1, $2, $3, $4)`,
    [
      params.accion,
      params.entidad ?? null,
      params.detalle ? JSON.stringify(params.detalle) : null,
      params.realizado_por ?? null,
    ]
  ).catch(e => console.error('[audit admin_log]', e))
}

export async function logCatalogo(params: {
  case_id: string   // UUID de catalogo_cases
  accion: string
  campo?: string | null
  valor_anterior?: string | number | boolean | null
  valor_nuevo?: string | number | boolean | null
  realizado_por?: string | null
}): Promise<void> {
  await query(
    `INSERT INTO public.catalogo_cambios (case_id, accion, campo, valor_anterior, valor_nuevo, realizado_por)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.case_id,
      params.accion,
      params.campo ?? null,
      params.valor_anterior != null ? String(params.valor_anterior) : null,
      params.valor_nuevo != null ? String(params.valor_nuevo) : null,
      params.realizado_por ?? null,
    ]
  ).catch(e => console.error('[audit catalogo_cambios]', e))
}

export async function logCliente(params: {
  cliente_id?: string | null
  telefono: string
  accion: string
  campos_antes?: Record<string, any> | null
  campos_despues?: Record<string, any> | null
  realizado_por?: string | null
}): Promise<void> {
  await query(
    `INSERT INTO public.clientes_log (cliente_id, telefono, accion, campos_antes, campos_despues, realizado_por)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.cliente_id ?? null,
      params.telefono,
      params.accion,
      params.campos_antes ? JSON.stringify(params.campos_antes) : null,
      params.campos_despues ? JSON.stringify(params.campos_despues) : null,
      params.realizado_por ?? null,
    ]
  ).catch(e => console.error('[audit clientes_log]', e))
}
