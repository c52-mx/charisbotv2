// Cron en proceso: el servidor de este portal corre standalone (Node de
// larga duración, no funciones serverless), así que un setInterval en el
// arranque es suficiente — no requiere infraestructura de cron externa.
// register() lo llama Next.js una sola vez al iniciar el servidor.
//
// Se hace vía un fetch interno a /api/internal/cron (en vez de importar
// lib/db/lib/stock directamente) porque instrumentation.ts también se
// empaqueta para el runtime "edge", y 'pg' usa módulos de Node (fs, path)
// que no existen ahí — esto evita arrastrar esa dependencia al bundle edge.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

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
