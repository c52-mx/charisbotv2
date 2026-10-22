// ── auth.ts ─────────────────────────────────────────────────────
// Solo para Server Components, API Routes y Middleware.
// NO importar desde Client Components ('use client').
// El middleware (Edge) importa de auth-core, no de aquí (este archivo usa la BD).
// ────────────────────────────────────────────────────────────────
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { verifyToken } from './auth-core'
import { queryOne } from './db'

// Re-export everything from auth-shared so server files only need one import
export type { UserRol, Permiso, SessionLike } from './auth-shared'
export { PERMISOS_DEFAULT, can, signTrackLink, verifyTrackLink, buildTrackUrl } from './auth-shared'
export { signToken, verifyToken, tipoSesion } from './auth-core'
export type { JWTPayload } from './auth-core'
import type { JWTPayload } from './auth-core'

// ── Revocación de sesiones ──────────────────────────────────────────────
// El JWT dura 7 días y lleva rol/permisos embebidos. Para que desactivar a un
// usuario o cambiarle el rol surta efecto pronto (y no a los 7 días) se
// contrasta contra la BD, con caché corta para no consultar en cada request.
const TTL_MS = 30_000
const cache = new Map<string, { ok: boolean; rol: string; hasta: number }>()

async function sesionVigente(s: JWTPayload): Promise<boolean> {
  const ahora = Date.now()
  let e = cache.get(s.sub)
  if (!e || e.hasta < ahora) {
    try {
      const u = await queryOne<{ activo: boolean; rol: string }>(
        `SELECT activo, rol FROM public.usuarios WHERE id = $1`, [s.sub]
      )
      e = { ok: !!u?.activo, rol: u?.rol ?? '', hasta: ahora + TTL_MS }
    } catch {
      // Si la BD falla no se tira a todos los usuarios: se confía en el token hasta que vuelva.
      return true
    }
    if (cache.size > 5000) cache.clear()
    cache.set(s.sub, e)
  }
  return e.ok && e.rol === s.rol
}

export async function getSession(req?: NextRequest): Promise<JWTPayload | null> {
  let token: string | undefined
  if (req) {
    token = req.cookies.get('charis_token')?.value
  } else {
    const c = cookies()
    token = c.get('charis_token')?.value
  }
  if (!token) return null
  const s = await verifyToken(token)
  if (!s) return null
  return (await sesionVigente(s)) ? s : null
}
