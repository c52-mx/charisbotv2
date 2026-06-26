// ── auth-shared.ts ──────────────────────────────────────────────
// Importable tanto en Server como en Client Components.
// SIN imports de next/headers ni next/server.
// ────────────────────────────────────────────────────────────────
import { createHmac } from 'crypto'

// Los roles ya no son un conjunto fijo — son administrables desde
// /admin/roles (Fase C.5), así que cualquier string es válido.
export type UserRol = string

// Conjunto fijo de claves de permiso: cada una corresponde a un
// can(session, 'x') real en algún archivo del código. Lo que se
// volvió administrable es qué ROLES existen y qué VALOR tiene cada
// permiso para cada rol (tabla roles/permisos_rol en la BD) — la
// lista de claves en sí sigue viviendo en código.
export const PERMISO_KEYS = [
  'dashboard', 'pedidos_ver', 'pedidos_crear', 'pedidos_estado', 'pedidos_solo_confirmados',
  'pagos_confirmar', 'catalogo_ver', 'catalogo_editar', 'catalogo_crear',
  'clientes_ver', 'clientes_crear', 'usuarios', 'config_editar',
  'reportes_ver', 'landing_editar', 'roles_editar',
] as const

export type Permiso = typeof PERMISO_KEYS[number]

// Fallback usado solo cuando una sesión no trae el claim `permisos`
// (tokens emitidos antes de la Fase C.5, o el rol no existe en la BD).
// Misma matriz que antes vivía como única fuente de verdad.
export const PERMISOS_DEFAULT: Record<string, Partial<Record<Permiso, boolean>>> = {
  ADMIN:   { dashboard:true,  pedidos_ver:true,  pedidos_crear:true,  pedidos_estado:true, pedidos_solo_confirmados:false, pagos_confirmar:true,  catalogo_ver:true,  catalogo_editar:true,  catalogo_crear:true,  clientes_ver:true,  clientes_crear:true,  usuarios:true,  config_editar:true,  reportes_ver:true,  landing_editar:true,  roles_editar:true  },
  VENDEDOR:{ dashboard:false, pedidos_ver:true,  pedidos_crear:true,  pedidos_estado:true, pedidos_solo_confirmados:false, pagos_confirmar:true,  catalogo_ver:true,  catalogo_editar:false, catalogo_crear:false, clientes_ver:true,  clientes_crear:false, usuarios:false, config_editar:false, reportes_ver:false, landing_editar:false, roles_editar:false },
  ALMACEN: { dashboard:false, pedidos_ver:true,  pedidos_crear:false, pedidos_estado:true, pedidos_solo_confirmados:true,  pagos_confirmar:false, catalogo_ver:true,  catalogo_editar:true,  catalogo_crear:true,  clientes_ver:false, clientes_crear:false, usuarios:false, config_editar:false, reportes_ver:false, landing_editar:false, roles_editar:false },
  CLIENTE: { dashboard:false, pedidos_ver:false, pedidos_crear:false, pedidos_estado:false, pedidos_solo_confirmados:false, pagos_confirmar:false, catalogo_ver:false, catalogo_editar:false, catalogo_crear:false, clientes_ver:false, clientes_crear:false, usuarios:false, config_editar:false, reportes_ver:false, landing_editar:false, roles_editar:false },
}

export interface SessionLike {
  rol?: string | null
  permisos?: Partial<Record<Permiso, boolean>> | null
}

export function can(session: SessionLike | null | undefined, perm: Permiso): boolean {
  if (session?.permisos) return !!session.permisos[perm]
  if (session?.rol) return !!PERMISOS_DEFAULT[session.rol]?.[perm]
  return false
}

// ── HMAC track links (no requiere next/headers) ──────────────────
const HMAC_SECRET =
  (typeof process !== 'undefined' && process.env?.TRACK_HMAC_SECRET) ||
  'track_hmac_secret_change_in_prod'

export function signTrackLink(tel: string): string {
  return createHmac('sha256', HMAC_SECRET).update(tel).digest('hex').slice(0, 16)
}

export function verifyTrackLink(tel: string, sig: string): boolean {
  const exp = signTrackLink(tel)
  if (exp.length !== sig.length) return false
  let d = 0
  for (let i = 0; i < exp.length; i++) d |= exp.charCodeAt(i) ^ sig.charCodeAt(i)
  return d === 0
}

export function buildTrackUrl(tel: string, base = ''): string {
  return `${base}/track?tel=${encodeURIComponent(tel)}&sig=${signTrackLink(tel)}`
}