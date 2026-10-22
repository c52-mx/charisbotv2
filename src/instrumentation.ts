// register() lo llama Next.js una sola vez al iniciar el servidor. Todo lo
// que depende de Node (cron en proceso, validación de secretos) vive en
// instrumentation-node.ts y se importa solo en ese runtime, para que no
// entre al bundle "edge".
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { iniciar } = await import('./instrumentation-node')
    iniciar()
  }
}
