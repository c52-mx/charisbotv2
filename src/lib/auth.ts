// ── auth.ts ─────────────────────────────────────────────────────
// Solo para Server Components, API Routes y Middleware.
// NO importar desde Client Components ('use client').
// ────────────────────────────────────────────────────────────────
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// Re-export everything from auth-shared so server files only need one import
export type { UserRol, Permiso } from './auth-shared'
export { PERMISOS, can, signTrackLink, verifyTrackLink, buildTrackUrl } from './auth-shared'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_change_in_prod'
)

export interface JWTPayload {
  sub: string; email: string; nombre: string
  rol: import('./auth-shared').UserRol
  iat?: number; exp?: number
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as JWTPayload
  } catch { return null }
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
  return verifyToken(token)
}
