// src/app/api/client/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { sendEmail, emailNuevoPedido, emailOrdenCompra } from '@/lib/email'
import { resolveCaseId, convertirCarritoAPedidoTx, getConfigMinutos, InsufficientStockError, liberarPedidosVencidos } from '@/lib/stock'
import { calcularTotal } from '@/lib/pricing'
import { generarOrdenCompraPdf } from '@/lib/purchaseOrderPdf'

const METODO_CONFIG_KEY: Record<string, string> = {
  efectivo: 'pago_efectivo_habilitado',
  transferencia: 'pago_transferencia_habilitado',
  stripe: 'pago_stripe_habilitado',
  mercadopago: 'pago_mercadopago_habilitado',
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    await liberarPedidosVencidos().catch(() => {})

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
    `, [session.email])

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
    const { items, metodo_pago, referencia_pago, metodo_entrega, direccion_id, notas_cliente } = body

    if (!items?.length) return NextResponse.json({ error: 'El pedido está vacío' }, { status: 400 })

    // Resolver la dirección elegida (o pickup) — la dirección guardada se
    // copia como foto fija al pedido, no se referencia en vivo.
    const entrega = metodo_entrega === 'pickup' ? 'pickup' : 'envio'
    let direccion_entrega: any = { tipo: 'pickup' }
    if (entrega === 'envio') {
      if (!direccion_id) return NextResponse.json({ error: 'Selecciona una dirección de envío' }, { status: 400 })
      const [addr] = await query<any>(
        `SELECT * FROM public.direcciones_cliente WHERE id = $1 AND usuario_id = $2`,
        [direccion_id, session.sub]
      )
      if (!addr) return NextResponse.json({ error: 'Dirección no encontrada' }, { status: 404 })
      direccion_entrega = { tipo: 'envio', ...addr }
    }

    const totalPiezas = items.reduce((s: number, i: any) => s + (i.cantidad || 0), 0)

    // Verificar mínimo de pedido
    const [cfg] = await query(`SELECT valor FROM public.config_portal WHERE clave = 'minimo_pedido_piezas'`, []).catch(() => [null])
    const minimo = parseInt(cfg?.valor || '1')
    if (totalPiezas < minimo) {
      return NextResponse.json({ error: `El mínimo de pedido es ${minimo} piezas` }, { status: 400 })
    }

    // Verificar que el método de pago elegido esté habilitado
    const metodoKey = METODO_CONFIG_KEY[metodo_pago || 'transferencia']
    if (!metodoKey) {
      return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 })
    }
    const [metodoCfg] = await query(`SELECT valor FROM public.config_portal WHERE clave = $1`, [metodoKey]).catch(() => [null])
    if (metodoCfg?.valor !== 'true') {
      return NextResponse.json({ error: 'Ese método de pago no está disponible' }, { status: 400 })
    }

    // Resolver precio vigente por artículo (catálogo, no lo que mande el cliente)
    const colorNorm = (c: string) => (c || '').trim().toUpperCase() || 'NEGRO'
    const preciosRows = await query<{ case_id: string; tipo_case: string; modelo: string; color: string; precio: number }>(
      `SELECT case_id, tipo_case, modelo, color, precio FROM public.catalogo_cases
       WHERE (tipo_case, modelo, color) IN (${items.map((_: any, i: number) => `($${i*3+1},$${i*3+2},$${i*3+3})`).join(',')})`,
      items.flatMap((it: any) => [it.tipo_case, it.modelo, colorNorm(it.color)])
    )
    const precioMap = new Map(preciosRows.map(r => [`${r.tipo_case}__${r.modelo}__${r.color}`, Number(r.precio)]))
    const itemsConPrecio = items.map((it: any) => ({
      ...it,
      precio: precioMap.get(`${it.tipo_case}__${it.modelo}__${colorNorm(it.color)}`) ?? 0,
    }))

    const tiers = await query<{ piezas_minimas: number; porcentaje: number }>(
      `SELECT piezas_minimas, porcentaje FROM public.descuentos_volumen WHERE activo = true`, []
    )
    const { total: montoTotal, subtotal: montoSubtotal, descuentoPct: montoDescuentoPct } = calcularTotal(itemsConPrecio, tiers)

    // Obtener o crear conversacion
    const [conv] = await query(`
      INSERT INTO public.conversaciones (telefono, actualizada_en)
      VALUES ($1, NOW())
      ON CONFLICT (telefono) DO UPDATE SET actualizada_en = NOW()
      RETURNING id
    `, [session.email])

    const tipos = [...new Set(items.map((i: any) => i.tipo_case))]
    const tipo  = tipos.length === 1 ? tipos[0] : 'MIXTO'
    const resumen = `${items.length} modelos, ${totalPiezas} piezas`

    const pedidoJson = { items: itemsConPrecio, direccion_entrega }

    const itemsConCaseId = (await Promise.all(
      items.map(async (i: any) => {
        const caseId = await resolveCaseId(i.tipo_case, i.modelo, i.color)
        return caseId ? { case_id: caseId, cantidad: i.cantidad } : null
      })
    )).filter(Boolean) as { case_id: string; cantidad: number }[]

    const ttlPago = await getConfigMinutos('tiempo_reserva_pago_min', 1440)

    // Todo en una sola transacción: si falta stock, se revierte completo y
    // el pedido nunca llega a existir (sin registros CANCELADO fantasma).
    let pedido: { id: string; numero_pedido: string }
    try {
      pedido = await withTransaction(async (tx) => {
        const [p] = await tx<{ id: string; numero_pedido: string }>(`
          INSERT INTO public.pedidos (
            conversacion_id, telefono, tipo_case, estado,
            requiere_firma, resumen, pedido_json,
            metodo_pago, referencia_pago, direccion_entrega, notas_cliente,
            monto_total, metodo_entrega, creado_en
          ) VALUES ($1, $2, $3, 'PENDIENTE_PAGO', false, $4, $5::jsonb, $6, $7, $8::jsonb, $9, $10, $11, NOW())
          RETURNING id, numero_pedido
        `, [
          conv.id, session.email, tipo, resumen,
          JSON.stringify(pedidoJson), metodo_pago || 'transferencia',
          referencia_pago || null, JSON.stringify(direccion_entrega || {}),
          notas_cliente || null, montoTotal, entrega,
        ])

        if (itemsConPrecio.length > 0) {
          await tx(`
            INSERT INTO public.pedido_items (pedido_id, modelo, tipo_case, color, cantidad, precio_unitario)
            SELECT $1::uuid, x.modelo, x.tipo_case, COALESCE(NULLIF(x.color,''),'NEGRO'), x.cantidad, x.precio
            FROM jsonb_to_recordset($2::jsonb) AS x(modelo text, tipo_case text, color text, cantidad int, precio numeric)
            WHERE COALESCE(x.modelo,'') <> '' AND COALESCE(x.cantidad,0) > 0
          `, [p.id, JSON.stringify(itemsConPrecio)])
        }

        await tx(`
          INSERT INTO public.pedido_timeline (pedido_id, estado, nota)
          VALUES ($1, 'PENDIENTE_PAGO', 'Pedido creado por el cliente')
        `, [p.id])

        await convertirCarritoAPedidoTx(tx, session.email, p.id, itemsConCaseId, ttlPago)

        await tx(
          `UPDATE public.pedidos SET reserva_expira_en = NOW() + ($1::int * INTERVAL '1 minute') WHERE id = $2`,
          [ttlPago, p.id]
        )

        return p
      })
    } catch (e) {
      if (e instanceof InsufficientStockError) {
        return NextResponse.json(
          { error: 'Algunos artículos ya no tienen stock suficiente', faltantes: e.faltantes },
          { status: 409 }
        )
      }
      throw e
    }

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

      const ventaImportante = await getConfigMinutos('venta_importante_piezas', 100)
      if (totalPiezas >= ventaImportante) {
        sendEmail({
          to:      adminEmail,
          subject: `🔥 Venta importante — #${(pedido.numero_pedido||pedido.id.slice(0,8)).toUpperCase()}`,
          html:    emailNuevoPedido(
            pedido.numero_pedido || pedido.id.slice(0,8),
            session.nombre || session.email,
            totalPiezas
          ),
        }).catch(() => {})
      }
    }

    // Orden de compra en PDF al cliente (best-effort, no bloquea la respuesta)
    ;(async () => {
      try {
        const negocioRows = await query<{ clave: string; valor: string }>(
          `SELECT clave, valor FROM public.config_portal WHERE clave IN ('negocio_nombre','negocio_direccion')`, []
        )
        const negocio = Object.fromEntries(negocioRows.map(r => [r.clave, r.valor]))
        const pdf = await generarOrdenCompraPdf({
          numeroPedido: pedido.numero_pedido || pedido.id.slice(0, 8),
          fecha: new Date(),
          cliente: session.nombre || session.email,
          metodoPago: metodo_pago || 'transferencia',
          metodoEntrega: entrega,
          direccion: entrega === 'envio' ? direccion_entrega : undefined,
          negocioNombre: negocio.negocio_nombre,
          negocioDireccion: negocio.negocio_direccion,
          items: itemsConPrecio.map((it: any) => ({ modelo: it.modelo, tipo_case: it.tipo_case, color: colorNorm(it.color), cantidad: it.cantidad, precio: it.precio })),
          subtotal: montoSubtotal,
          descuentoPct: montoDescuentoPct,
          total: montoTotal,
        })
        await sendEmail({
          to: session.email,
          subject: `Orden de compra #${(pedido.numero_pedido || pedido.id.slice(0, 8)).toUpperCase()}`,
          html: emailOrdenCompra(session.nombre || session.email, pedido.numero_pedido || pedido.id.slice(0, 8)),
          attachments: [{ filename: `orden-${(pedido.numero_pedido || pedido.id.slice(0, 8)).toUpperCase()}.pdf`, content: pdf }],
        })
      } catch (e) {
        console.error('[POST /api/client/orders] orden de compra PDF', e)
      }
    })()

    return NextResponse.json({ id: pedido.id, numero_pedido: pedido.numero_pedido, ok: true })
  } catch (e: any) {
    console.error('[POST /api/client/orders]', e)
    return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 })
  }
}
