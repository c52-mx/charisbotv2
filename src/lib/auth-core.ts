// ── auth-core.ts ────────────────────────────────────────────────
// Núcleo de JWT sin dependencias de Node/BD: lo usan el middleware (Edge)
// y auth.ts. El secreto se lee de forma perezosa (al primer uso, no al
// importar) para que `next build` no exija variables de entorno.
// ────────────────────────────────────────────────────────────────
import { SignJWT, jwtVerify } from 'jose'

export interface JWTPayload {
  sub: string; email: string; nombre: string
  rol: import('./auth-shared').UserRol
  // Resueltos una sola vez al iniciar sesión (ver lib/roles.ts) y
  // embebidos en el token — así can() y el middleware no dependen de
  // la base de datos en cada request. Ausentes en tokens emitidos
  // antes de la Fase C.5 (can() cae al fallback por rol en ese caso).
  permisos?: Partial<Record<import('./auth-shared').Permiso, boolean>>
  rolTipo?: 'INTERNO' | 'CLIENTE' | 'REPARTIDOR'
  iat?: number; exp?: number
}

let _secret: Uint8Array | null = null
function secret(): Uint8Array {
  if (_secret) return _secret
  const v = process.env.JWT_SECRET
  if (!v) {
    // Sin secreto no hay forma segura de firmar: en producción nunca se usa un valor por defecto.
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET no está configurado')
    _secret = new TextEncoder().encode('dev-only-jwt-secret-not-for-production')
  } else {
    _secret = new TextEncoder().encode(v)
  }
  return _secret
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
    return payload as unknown as JWTPayload
  } catch { return null }
}

// Tipo de portal de la sesión; tokens viejos sin claim se tratan como siempre.
export function tipoSesion(s: Pick<JWTPayload, 'rol' | 'rolTipo'>): 'INTERNO' | 'CLIENTE' | 'REPARTIDOR' {
  return s.rolTipo || (s.rol === 'CLIENTE' ? 'CLIENTE' : 'INTERNO')
}
