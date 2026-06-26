import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { listarRepartidores } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// GET /api/admin/repartidores — usuarios con rol de tipo REPARTIDOR,
// para el selector de asignación en /admin/orders.
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'pedidos_estado')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  const data = await listarRepartidores()
  return NextResponse.json({ data })
}
