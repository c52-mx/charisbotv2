import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

// ── Rate limiting en memoria ────────────────────────────────────────────
// Suficiente para una sola instancia (el despliegue actual). Si se escala a
// varias réplicas, cada una cuenta por separado: habría que moverlo a Redis/BD.
const buckets = new Map<string, { n: number; reset: number }>()

export function limitar(clave: string, max: number, ventanaMs: number): { ok: boolean; reintentarEn: number } {
  const ahora = Date.now()
  if (buckets.size > 20000) {
    for (const [k, b] of buckets) if (b.reset < ahora) buckets.delete(k)
    if (buckets.size > 20000) buckets.clear()
  }
  const b = buckets.get(clave)
  if (!b || b.reset < ahora) {
    buckets.set(clave, { n: 1, reset: ahora + ventanaMs })
    return { ok: true, reintentarEn: 0 }
  }
  b.n++
  return b.n > max ? { ok: false, reintentarEn: Math.ceil((b.reset - ahora) / 1000) } : { ok: true, reintentarEn: 0 }
}

// IP del cliente detrás del proxy (Traefik/Dokploy): el proxy AGREGA la IP real al
// final de X-Forwarded-For, así que la entrada de más a la derecha es la confiable
// (las de la izquierda las puede inventar el cliente).
export function ipCliente(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const partes = xff.split(',').map(s => s.trim()).filter(Boolean)
    if (partes.length) return partes[partes.length - 1]
  }
  return req.headers.get('x-real-ip') || 'desconocida'
}

// Aplica uno o más límites; devuelve la respuesta 429 si alguno se excede, o null.
export function aplicarLimites(
  req: NextRequest, nombre: string, reglas: { por?: string; max: number; ventanaMs: number }[]
): NextResponse | null {
  const ip = ipCliente(req)
  for (const r of reglas) {
    const res = limitar(`${nombre}:${r.por ?? ip}`, r.max, r.ventanaMs)
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
        { status: 429, headers: { 'Retry-After': String(res.reintentarEn) } }
      )
    }
  }
  return null
}

// ── Tokens de un solo uso ───────────────────────────────────────────────
// En la BD se guarda solo el hash: un volcado de la tabla no da enlaces válidos.
export function hashToken(t: string): string {
  return createHash('sha256').update(t).digest('hex')
}

// Comparación de secretos en tiempo constante.
export function igualSeguro(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}
