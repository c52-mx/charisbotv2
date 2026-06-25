import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession, can } from '@/lib/auth'
import { notificarConfirmacion } from '@/lib/whatsapp'
import { resolveCaseId, liberarPedidosVencidos, checkStockBajoYNotificar, registrarMovimiento } from '@/lib/stock'

export const dynamic = 'force-dynamic'

// GET /api/orders
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await liberarPedidosVencidos().catch(() => {})

  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const origen = searchParams.get('origen')
  const telefono = searchParams.get('telefono')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []
  let idx = 1

  // ALMACEN solo ve pedidos CONFIRMADO o superior
  if (session.rol === 'ALMACEN') {
    conditions.push(`p.estado = ANY(ARRAY['CONFIRMADO','EN_PREPARACION','EN_REPARTO','ENTREGADO','EN_PROCESO','COMPLETADO','CANCELADO'])`)
  }

  // Clientes solo ven sus pedidos
  if (session.rol === 'CLIENTE') {
    const cliente = await queryOne<any>(
      'SELECT telefono FROM public.usuarios WHERE id = $1',
      [session.sub]
    )
    if (cliente?.telefono) {
      conditions.push(`p.telefono = $${idx++}`)
      params.push(cliente.telefono)
    }
  } else {
    if (telefono) { conditions.push(`p.telefono ILIKE $${idx++}`); params.push(`%${telefono}%`) }
  }

  if (estado) { conditions.push(`p.estado = $${idx++}`); params.push(estado) }
  if (origen) { conditions.push(`p.origen = $${idx++}`); params.push(origen) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [rows, countRow] = await Promise.all([
    query(
      `SELECT p.id, p.telefono, c.nombre as cliente_nombre, p.tipo_case,
              p.estado, p.origen, p.requiere_firma, p.resumen,
              p.creado_en, p.actualizado_en, p.confirmado_en,
              COUNT(pi.id) as total_modelos,
              COALESCE(SUM(pi.cantidad), 0) as total_piezas
       FROM public.pedidos p
       LEFT JOIN public.clientes c ON c.telefono = p.telefono
       LEFT JOIN public.pedido_items pi ON pi.pedido_id = p.id
       ${where}
       GROUP BY p.id, c.nombre
       ORDER BY p.creado_en DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM public.pedidos p ${where}`,
      params
    ),
  ])

  return NextResponse.json({
    data: rows,
    total: parseInt(countRow?.count || '0'),
    page,
    limit,
  })
}

// POST /api/orders - crear pedido manual desde portal
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const { telefono, items, tipo_case, requiere_firma, notas } = body

  if (!telefono || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'telefono e items son requeridos' }, { status: 400 })
  }

  // Obtener o crear conversación
  const conv = await queryOne<any>(
    `INSERT INTO public.conversaciones (telefono) VALUES ($1)
     ON CONFLICT (telefono) DO UPDATE SET actualizada_en = NOW()
     RETURNING id`,
    [telefono]
  )

  const totalPiezas = items.reduce((s: number, it: any) => s + (it.cantidad || 0), 0)
  const tipos = Array.from(new Set(items.map((it: any) => it.tipo_case).filter(Boolean)))
  const tipoPred = tipos.length === 1 ? tipos[0] : 'MIXTO'
  const resumen = `${items.length} modelos, ${totalPiezas} piezas${notas ? ` · ${notas}` : ''}`

  const pedido = await queryOne<any>(
    `INSERT INTO public.pedidos
       (conversacion_id, telefono, tipo_case, estado, requiere_firma, resumen, pedido_json, origen, confirmado_en)
     VALUES ($1, $2, $3, 'CONFIRMADO', $4, $5, $6, 'PORTAL', NOW())
     RETURNING id`,
    [
      conv?.id,
      telefono,
      tipo_case || tipoPred,
      requiere_firma ?? false,
      resumen,
      JSON.stringify({ items }),
    ]
  )

  // Insertar items
  const stockNotifyCaseIds: string[] = []
  for (const item of items) {
    const tipoCaseItem = (item.tipo_case || tipoPred).toUpperCase()
    const modeloItem   = (item.modelo || '').toUpperCase().trim()
    const colorItem    = (item.color || 'NEGRO').toUpperCase()
    const cantidadItem = item.cantidad || 0

    await queryOne(
      `INSERT INTO public.pedido_items (pedido_id, modelo, tipo_case, color, cantidad)
       VALUES ($1, $2, $3, $4, $5)`,
      [pedido!.id, modeloItem, tipoCaseItem, colorItem, cantidadItem]
    )

    // Pedido manual: ya nace CONFIRMADO, así que el stock se descuenta directo (sin reserva).
    const caseId = await resolveCaseId(tipoCaseItem, modeloItem, colorItem)
    if (caseId && cantidadItem > 0) {
      const [updatedCase] = await query<{ stock: number }>(
        `UPDATE public.catalogo_cases SET stock = GREATEST(0, stock - $1) WHERE case_id = $2 RETURNING stock`,
        [cantidadItem, caseId]
      )
      await registrarMovimiento({
        case_id: caseId, tipo: 'SALIDA', cantidad: cantidadItem, stock_resultante: updatedCase.stock,
        motivo: 'Pedido manual', pedido_id: pedido!.id, realizado_por: session.sub,
      })
      stockNotifyCaseIds.push(caseId)
    }
  }
  await checkStockBajoYNotificar(stockNotifyCaseIds)

  // Notificar por WhatsApp
  try {
    await notificarConfirmacion({
      id: pedido!.id,
      telefono,
      resumen,
      tipo_case: tipo_case || tipoPred,
    })
  } catch (e) {
    console.warn('[WhatsApp notification failed]', e)
  }

  return NextResponse.json({ ok: true, id: pedido!.id }, { status: 201 })
}
