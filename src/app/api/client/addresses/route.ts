import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/client/addresses — direcciones guardadas del cliente autenticado
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.rol !== 'CLIENTE') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  const rows = await query(
    `SELECT * FROM public.direcciones_cliente WHERE usuario_id = $1 ORDER BY predeterminada DESC, creado_en DESC`,
    [session.sub]
  )
  return NextResponse.json({ items: rows })
}

// POST /api/client/addresses — agregar dirección nueva
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.rol !== 'CLIENTE') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { nombre_contacto, telefono_contacto, calle, colonia, ciudad, estado_mx, cp, instrucciones_entrega, predeterminada } = await req.json()
  if (!nombre_contacto || !telefono_contacto || !calle || !colonia || !ciudad || !estado_mx || !cp) {
    return NextResponse.json({ error: 'Faltan datos de la dirección' }, { status: 400 })
  }

  const [{ count }] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM public.direcciones_cliente WHERE usuario_id = $1`, [session.sub]
  )
  const esPrimera = parseInt(count) === 0
  const marcarPredeterminada = esPrimera || !!predeterminada

  if (marcarPredeterminada) {
    await query(`UPDATE public.direcciones_cliente SET predeterminada = false WHERE usuario_id = $1`, [session.sub])
  }

  const rows = await query(
    `INSERT INTO public.direcciones_cliente
       (usuario_id, nombre_contacto, telefono_contacto, calle, colonia, ciudad, estado_mx, cp, instrucciones_entrega, predeterminada)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [session.sub, nombre_contacto.trim(), telefono_contacto.trim(), calle.trim(), colonia.trim(), ciudad.trim(), estado_mx.trim(), cp.trim(), instrucciones_entrega?.trim() || null, marcarPredeterminada]
  )
  return NextResponse.json(rows[0], { status: 201 })
}
