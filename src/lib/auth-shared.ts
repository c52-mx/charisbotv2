// ── auth-shared.ts ──────────────────────────────────────────────
// Importable tanto en Server como en Client Components.
// SIN imports de next/headers ni next/server.
// ────────────────────────────────────────────────────────────────
import { createHmac } from 'crypto'

export type UserRol = 'ADMIN' | 'VENDEDOR' | 'ALMACEN'

export const PERMISOS = {
  ADMIN:   { dashboard:true,  pedidos_ver:true,  pedidos_crear:true,  pedidos_estado:true, pedidos_solo_confirmados:false, catalogo_ver:true,  catalogo_editar:true,  catalogo_crear:true,  clientes_ver:true,  clientes_crear:true,  usuarios:true  },
  VENDEDOR:{ dashboard:false, pedidos_ver:true,  pedidos_crear:true,  pedidos_estado:true, pedidos_solo_confirmados:false, catalogo_ver:true,  catalogo_editar:false, catalogo_crear:false, clientes_ver:true,  clientes_crear:false, usuarios:false },
  ALMACEN: { dashboard:false, pedidos_ver:true,  pedidos_crear:false, pedidos_estado:true, pedidos_solo_confirmados:true,  catalogo_ver:true,  catalogo_editar:true,  catalogo_crear:true,  clientes_ver:false, clientes_crear:false, usuarios:false },
} as const

export type Permiso = keyof typeof PERMISOS['ADMIN']

export function can(rol: UserRol, perm: Permiso): boolean {
  return (PERMISOS[rol] as any)?.[perm] ?? false
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
