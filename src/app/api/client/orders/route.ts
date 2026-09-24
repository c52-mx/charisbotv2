// src/app/api/client/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { sendEmail, emailNuevoPedido, emailOrdenCompra } from '@/lib/email'
import { resolveProductoId, convertirCarritoAPedidoTx, getConfigMinutos, InsufficientStockError, liberarPedidosVencidos } from '@/lib/stock'
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
    const { items, metodo_pago, referencia_pago, metodo_entrega, direccion_id, notas_cliente, punto_pickup, paqueteria } = body

    if (!items?.length) return NextResponse.json({ error: 'El pedido está vacío' }, { status: 400 })

    // Resolver la dirección elegida (o pickup)
    const entrega = metodo_entrega === 'pickup' ? 'pickup' : 'envio'
    let direccion_entrega: any = { tipo: 'pickup', nombre: punto_pickup || undefined }
    if (entrega === 'envio') {
      if (!direccion_id) return NextResponse.json({ error: 'Selecciona una dirección de envío' }, { status: 400 })
      const [addr] = await query<any>(
        `SELECT * FROM public.direcciones_cliente WHERE id = $1 AND usuario_id = $2`,
        [direccion_id, session.sub]
      )
      if (!addr) return NextResponse.json({ error: 'Dirección no encontrada' }, { status: 404 })
      direccion_entrega = { tipo: 'envio', ...addr }
    }

    const colorNorm = (c: string) => (c || '').trim().toUpperCase() || 'NEGRO'
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

    // Aceptar serie o tipo_case del body (compat transición frontend).
    // Para accesorios sin modelo, usar nombre como fallback de modelo.
    const normItem = (it: any) => ({
      ...it,
      serie:     (it.serie ?? it.tipo_case ?? '').toUpperCase().trim(),
      modelo:    (it.modelo || it.nombre || '').toUpperCase().trim(),
      color:     colorNorm(it.color),
      categoria: it.categoria || null,
      nombre:    it.nombre || it.modelo || null,
    })
    const itemsNorm = items.map(normItem)

    // Resolver precio vigente desde catálogo:
    // (1) por (serie, modelo, color) para fundas
    // (2) por producto_id directo para accesorios y otros
    const preciosRows = itemsNorm.length
      ? await query<{ producto_id: string; serie: string; modelo: string; color: string; precio: number }>(
          `SELECT producto_id, serie, modelo, color, precio FROM public.catalogo_productos
           WHERE (serie, modelo, color) IN (${itemsNorm.map((_: any, i: number) => `($${i*3+1},$${i*3+2},$${i*3+3})`).join(',')})`,
          itemsNorm.flatMap((it: any) => [it.serie, it.modelo, it.color])
        )
      : []

    const precioMap     = new Map(preciosRows.map(r => [`${r.serie}__${r.modelo}__${r.color}`, Number(r.precio)]))
    const productoIdMap = new Map(preciosRows.map(r => [`${r.serie}__${r.modelo}__${r.color}`, r.producto_id]))

    // Lookup adicional por producto_id para items que no matchearon por (serie,modelo,color)
    const idsDirectos = itemsNorm
      .filter((it: any) => it.producto_id && !precioMap.has(`${it.serie}__${it.modelo}__${it.color}`))
      .map((it: any) => it.producto_id)
    const precioPorId = new Map<string, number>()
    if (idsDirectos.length) {
      const rows = await query<{ producto_id: string; precio: number }>(
        `SELECT producto_id, precio FROM public.catalogo_productos WHERE producto_id = ANY($1)`,
        [idsDirectos]
      )
      rows.forEach(r => precioPorId.set(r.producto_id, Number(r.precio)))
    }

    const itemsConPrecio = itemsNorm.map((it: any) => ({
      ...it,
      precio: precioMap.get(`${it.serie}__${it.modelo}__${it.color}`)
           ?? (it.producto_id ? precioPorId.get(it.producto_id) : undefined)
           ?? 0,
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

    const tipos = [...new Set(itemsNorm.map((i: any) => i.serie))]
    const tipo  = tipos.length === 1 ? tipos[0] : 'MIXTO'
    const resumen = `${items.length} modelos, ${totalPiezas} piezas`

    const pedidoJson = { items: itemsConPrecio, direccion_entrega }

    // Resolver producto_id para cada item (para reservas de carrito).
    // Usar producto_id del item directamente si ya está presente.
    const itemsConProductoId = (await Promise.all(
      itemsNorm.map(async (i: any) => {
        const productoId = i.producto_id
          ?? productoIdMap.get(`${i.serie}__${i.modelo}__${i.color}`)
          ?? await resolveProductoId(i.serie, i.modelo, i.color)
        return productoId ? { producto_id: productoId, cantidad: i.cantidad } : null
      })
    )).filter(Boolean) as { producto_id: string; cantidad: number }[]

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
            monto_total, metodo_entrega, paqueteria, creado_en, creado_por
          ) VALUES ($1, $2, $3, 'PENDIENTE_PAGO', false, $4, $5::jsonb, $6, $7, $8::jsonb, $9, $10, $11, $12, NOW(), $13)
          RETURNING id, numero_pedido
        `, [
          conv.id, session.email, tipo, resumen,
          JSON.stringify(pedidoJson), metodo_pago || 'transferencia',
          referencia_pago || null, JSON.stringify(direccion_entrega || {}),
          notas_cliente || null, montoTotal, entrega,
          (entrega === 'envio' ? (paqueteria || null) : null), session.sub,
        ])

        if (itemsConPrecio.length > 0) {
          // Insertar items. Pasa categoria y nombre en el JSON para cubrir
          // accesorios que no tienen serie/modelo en el catálogo.
          await tx(`
            INSERT INTO public.pedido_items
              (pedido_id, modelo, serie, color, cantidad, precio_unitario, categoria, nombre_producto)
            SELECT
              $1::uuid,
              COALESCE(NULLIF(x.modelo,''), NULLIF(x.nombre,''), '—'),
              NULLIF(x.serie,''),
              COALESCE(NULLIF(x.color,''),'NEGRO'),
              x.cantidad,
              x.precio,
              COALESCE(
                NULLIF(x.categoria,''),
                (SELECT categoria FROM public.catalogo_productos cp WHERE cp.serie = x.serie AND cp.modelo = x.modelo AND cp.color = COALESCE(NULLIF(x.color,''),'NEGRO') LIMIT 1),
                'FUNDA'
              ),
              COALESCE(
                NULLIF(x.nombre,''),
                (SELECT nombre FROM public.catalogo_productos cp WHERE cp.serie = x.serie AND cp.modelo = x.modelo AND cp.color = COALESCE(NULLIF(x.color,''),'NEGRO') LIMIT 1),
                NULLIF(x.modelo,''),
                '—'
              )
            FROM jsonb_to_recordset($2::jsonb) AS x(modelo text, serie text, color text, cantidad int, precio numeric, categoria text, nombre text)
            WHERE COALESCE(x.cantidad,0) > 0
          `, [p.id, JSON.stringify(itemsConPrecio)])
        }

        await tx(`
          INSERT INTO public.pedido_timeline (pedido_id, estado, nota, realizado_por)
          VALUES ($1, 'PENDIENTE_PAGO', 'Pedido creado por el cliente', $2)
        `, [p.id, session.sub])

        await convertirCarritoAPedidoTx(tx, session.email, p.id, itemsConProductoId, ttlPago)

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
            pedido.numero_pedido || pedido.id.slice(0, 8),
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
          // purchaseOrderPdf aún usa tipo_case en su interfaz; pasamos serie como tipo_case
          items: itemsConPrecio.map((it: any) => ({
            modelo: it.modelo,
            tipo_case: it.serie,
            color: it.color,
            cantidad: it.cantidad,
            precio: it.precio,
          })),
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
