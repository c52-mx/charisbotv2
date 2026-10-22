// Parte de instrumentation que solo corre en el runtime de Node (ver instrumentation.ts).
import { createHash } from 'crypto'

// SHA-256 de secretos que estuvieron en el historial de git (.env.local commiteado).
// Si producción sigue usando alguno, hay que rotarlo.
const SECRETOS_FILTRADOS: Record<string, string> = {
  JWT_SECRET:         'd8735376dc6fb49b1d3d38d9c7aabc067a0198b3ffb6aad259503f21034c8ca6',
  TRACK_HMAC_SECRET:  '783a3b323981fee458de7e02c5abbc43415098d202a430c174aed59443ec5541',
  N8N_WEBHOOK_SECRET: '155740aa49eba7689187f7d4b3a850458112797561e28ca27811c18470f800ad',
}

function revisarSecretos() {
  if (process.env.NODE_ENV !== 'production') return

  // Sin estos dos la app no puede operar de forma segura: se detiene con un mensaje claro.
  const faltantes = ['JWT_SECRET', 'TRACK_HMAC_SECRET'].filter(k => !process.env[k])
  if (faltantes.length) {
    console.error(`[seguridad] FATAL: faltan variables de entorno obligatorias: ${faltantes.join(', ')}`)
    process.exit(1)
  }

  for (const k of ['JWT_SECRET', 'TRACK_HMAC_SECRET', 'N8N_WEBHOOK_SECRET', 'CRON_SECRET']) {
    const v = process.env[k]
    if (!v) continue
    if (v.length < 32) console.error(`[seguridad] ${k} es demasiado corto (<32 caracteres): genera uno con "openssl rand -hex 32"`)
    const h = createHash('sha256').update(v).digest('hex')
    if (SECRETOS_FILTRADOS[k] === h) console.error(`[seguridad] ${k} coincide con un valor que estuvo en el repositorio — ROTAR YA`)
  }
}

export function iniciar() {
  revisarSecretos()

  // Cron en proceso: el servidor de este portal corre standalone (Node de
  // larga duración, no funciones serverless), así que un setInterval en el
  // arranque es suficiente — no requiere infraestructura de cron externa.
  // Se hace vía un fetch interno a /api/internal/cron (en vez de importar
  // lib/db/lib/stock directamente) para no arrastrar 'pg' al bundle edge.
  const g = globalThis as any
  if (g.__charisCronStarted) return
  g.__charisCronStarted = true

  const port = process.env.PORT || '3000'
  const secret = process.env.CRON_SECRET || process.env.JWT_SECRET || ''

  const tick = async () => {
    try {
      await fetch(`http://127.0.0.1:${port}/api/internal/cron`, {
        method: 'POST',
        headers: { 'x-cron-secret': secret },
      })
    } catch (e) {
      console.error('[cron] tick failed', e)
    }
  }

  setTimeout(tick, 10_000) // espera a que el servidor esté listo para recibir requests
  setInterval(tick, 5 * 60 * 1000)
}
