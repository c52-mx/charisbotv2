// src/app/api/client/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { sendEmail, emailNuevoPedido } from '@/lib/email'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const rows = await query(`
      SELECT
        p.id, p.numero_pedido, p.estado, p.tipo_case,
        p.resumen, p.creado_en, p.metodo_pago, p.referencia_pago,
        p.pedido_json,
        COALESCE(
          (SELECT SUM(pi.cantidad) FROM public.pedido_items pi WHERE pi.pedido_id = p.id),
          0
        ) AS total_piezas
      FROM public.pedidos p
      WHERE p.telefono = $1 OR p.conversacion_id IN (
        SELECT id FROM public.conversaciones WHERE telefono = $1
      )
      ORDER BY p.creado_en DESC
      LIMIT 50
    `, [session.telefono || session.email])

    return NextResponse.json({ items: rows })
  } catch (e: any) {
    console.error('[GET /api/client/orders]', e)
    return NextResponse.json({ items: [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const { items, metodo_pago, referencia_pago, direccion_entrega, notas_cliente } = body

    if (!items?.length) return NextResponse.json({ error: 'El pedido está vacío' }, { status: 400 })

    const totalPiezas = items.reduce((s: number, i: any) => s + (i.cantidad || 0), 0)

    // Verificar mínimo de pedido
    const [cfg] = await query(`SELECT valor FROM public.config_portal WHERE clave = 'minimo_pedido_piezas'`, []).catch(() => [null])
    const minimo = parseInt(cfg?.valor || '1')
    if (totalPiezas < minimo) {
      return NextResponse.json({ error: `El mínimo de pedido es ${minimo} piezas` }, { status: 400 })
    }

    // Obtener o crear conversacion
    const [conv] = await query(`
      INSERT INTO public.conversaciones (telefono, actualizada_en)
      VALUES ($1, NOW())
      ON CONFLICT (telefono) DO UPDATE SET actualizada_en = NOW()
      RETURNING id
    `, [session.telefono || session.email])

    const tipos = [...new Set(items.map((i: any) => i.tipo_case))]
    const tipo  = tipos.length === 1 ? tipos[0] : 'MIXTO'
    const resumen = `${items.length} modelos, ${totalPiezas} piezas`

    const pedidoJson = { items, direccion_entrega }

    const [pedido] = await query(`
      INSERT INTO public.pedidos (
        conversacion_id, telefono, tipo_case, estado,
        requiere_firma, resumen, pedido_json,
        metodo_pago, referencia_pago, direccion_entrega, notas_cliente,
        creado_en
      ) VALUES ($1, $2, $3, 'PENDIENTE_PAGO', false, $4, $5::jsonb, $6, $7, $8::jsonb, $9, NOW())
      RETURNING id, numero_pedido
    `, [
      conv.id, session.telefono || session.email, tipo, resumen,
      JSON.stringify(pedidoJson), metodo_pago || 'transferencia',
      referencia_pago || null, JSON.stringify(direccion_entrega || {}),
      notas_cliente || null,
    ])

    // Insert items
    if (items.length > 0) {
      await query(`
        INSERT INTO public.pedido_items (pedido_id, modelo, tipo_case, color, cantidad)
        SELECT $1::uuid, x.modelo, x.tipo_case, COALESCE(NULLIF(x.color,''),'NEGRO'), x.cantidad
        FROM jsonb_to_recordset($2::jsonb) AS x(modelo text, tipo_case text, color text, cantidad int)
        WHERE COALESCE(x.modelo,'') <> '' AND COALESCE(x.cantidad,0) > 0
      `, [pedido.id, JSON.stringify(items)])
    }

    // Timeline inicial
    await query(`
      INSERT INTO public.pedido_timeline (pedido_id, estado, nota)
      VALUES ($1, 'PENDIENTE_PAGO', 'Pedido creado por el cliente')
    `, [pedido.id])

    // Notificar al equipo de ventas (no bloqueante)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
    if (adminEmail) {
      sendEmail({
        to:      adminEmail,
        subject: `Nuevo pedido #${(pedido.numero_pedido||pedido.id.slice(0,8)).toUpperCase()}`,
        html:    emailNuevoPedido(
          pedido.numero_pedido || pedido.id.slice(0,8),
          session.nombre || session.email,
          totalPiezas
        ),
      }).catch(() => {})
    }

    return NextResponse.json({ id: pedido.id, numero_pedido: pedido.numero_pedido, ok: true })
  } catch (e: any) {
    console.error('[POST /api/client/orders]', e)
    return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 })
  }
}
