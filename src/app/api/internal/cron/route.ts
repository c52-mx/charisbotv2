import { NextRequest, NextResponse } from 'next/server'
import { liberarPedidosVencidos, avisarPedidosPorVencer, avisarSurtidoTardio } from '@/lib/stock'

export const dynamic = 'force-dynamic'

// POST /api/internal/cron — llamado únicamente por src/instrumentation.ts
// (mismo proceso, no expuesto a usuarios). Autenticado por secreto
// compartido en vez de sesión, ya que no hay un usuario detrás.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.JWT_SECRET || ''
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  await liberarPedidosVencidos().catch(e => console.error('[cron] liberarPedidosVencidos', e))
  await avisarPedidosPorVencer().catch(e => console.error('[cron] avisarPedidosPorVencer', e))
  await avisarSurtidoTardio().catch(e => console.error('[cron] avisarSurtidoTardio', e))

  return NextResponse.json({ ok: true })
}
