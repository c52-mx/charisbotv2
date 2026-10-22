import { randomUUID } from 'crypto'

// Validación común para archivos subidos. El tipo se decide por la extensión
// del nombre y se comprueba contra la firma binaria (magic bytes) — nunca se
// confía en file.type, que lo controla el cliente.
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  png:  b => b.length > 8  && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  jpg:  b => b.length > 3  && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  jpeg: b => b.length > 3  && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  gif:  b => b.length > 6  && /^GIF8[79]a$/.test(b.subarray(0, 6).toString('latin1')),
  webp: b => b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
}

export type ImageCheck =
  | { ok: true; ext: string; buffer: Buffer; fname: string }
  | { ok: false; error: string }

export async function validarImagen(
  file: File,
  allowed: string[] = ['png', 'jpg', 'jpeg', 'webp', 'gif'],
  maxBytes = MAX_IMAGE_BYTES,
): Promise<ImageCheck> {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!allowed.includes(ext) || !SIGNATURES[ext]) {
    return { ok: false, error: `Formato no permitido. Usa ${allowed.map(e => e.toUpperCase()).join(', ')}.` }
  }
  if (file.size > maxBytes) {
    return { ok: false, error: `La imagen no puede superar ${Math.round(maxBytes / 1024 / 1024)} MB.` }
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.byteLength > maxBytes) {
    return { ok: false, error: `La imagen no puede superar ${Math.round(maxBytes / 1024 / 1024)} MB.` }
  }
  if (!SIGNATURES[ext](buffer)) {
    return { ok: false, error: 'El contenido del archivo no corresponde a una imagen válida.' }
  }
  return { ok: true, ext, buffer, fname: `${randomUUID()}.${ext}` }
}

// Solo http(s) o rutas internas — evita esquemas como javascript: en links guardados.
export function urlSegura(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null
  if (s.startsWith('/api/files/') && !s.includes('..')) return s
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:' ? s : null
  } catch { return null }
}

// Acota paginación para evitar volcados masivos.
export function acotarPaginacion(pageRaw: string | null, limitRaw: string | null, maxLimit = 100, defLimit = 20) {
  const page  = Math.max(1, parseInt(pageRaw || '1') || 1)
  const limit = Math.min(maxLimit, Math.max(1, parseInt(limitRaw || String(defLimit)) || defLimit))
  return { page, limit, offset: (page - 1) * limit }
}
