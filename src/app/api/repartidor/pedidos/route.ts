import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/repartidor/pedidos — entregas activas asignadas a quien inició
// sesión. Gateado por rolTipo, no por permisos — mismo patrón que usan
// las rutas /api/client/* con session.rol === 'CLIENTE'.
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.rolTipo !== 'REPARTIDOR') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const rows = await query<any>(
    `SELECT p.id, p.numero_pedido, p.telefono, p.metodo_pago, p.monto_total,
            p.direccion_entrega, p.asignado_en, c.nombre as cliente_nombre
     FROM public.pedidos p
     LEFT JOIN public.clientes c ON c.telefono = p.telefono
     WHERE p.asignado_a = $1 AND p.estado = 'EN_REPARTO'
     ORDER BY p.asignado_en ASC NULLS LAST`,
    [session.sub]
  )

  return NextResponse.json({ items: rows })
}
