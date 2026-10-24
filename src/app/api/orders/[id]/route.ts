import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession, can, tipoSesion } from '@/lib/auth'
import { UUID_RE, urlSegura } from '@/lib/uploads'
import { notificarCliente } from '@/lib/notify'
import { finalizarPedido, liberarPedido, restaurarStockPedido } from '@/lib/stock'

export const dynamic = 'force-dynamic'

// El stock se descuenta al pasar de un estado "sin pagar" a cualquiera posterior
// (aunque se salten CONFIRMADO). finalizarPedido es idempotente, así que repetir
// la llamada no descuenta dos veces.
const ESTADOS_SIN_STOCK_DESCONTADO = ['PENDIENTE_PAGO', 'PENDIENTE_CONFIRMACION']
const ESTADOS_FINALES = ['CONFIRMADO','EN_PREPARACION','POR_VALIDAR_SURTIDO','EN_REPARTO','LISTO_PARA_RECOGER','ENTREGADO']

// GET /api/orders/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const kind = tipoSesion(session)
  if (kind === 'REPARTIDOR' || (kind === 'INTERNO' && !can(session, 'pedidos_ver'))) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const pedido = await queryOne<any>(
    `SELECT p.*, c.nombre as cliente_nombre, u.nombre as creado_por_nombre
     FROM public.pedidos p
     LEFT JOIN public.clientes c ON c.telefono = p.telefono
     LEFT JOIN public.usuarios u ON u.id = p.creado_por
     WHERE p.id = $1`,
    [params.id]
  )

  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Un cliente solo ve sus propios pedidos
  if (kind === 'CLIENTE' && pedido.telefono !== session.email) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  // La clave (identificador del catálogo) se toma del producto ligado o, en pedidos históricos, por serie+modelo+color.
  const items = await query(
    `SELECT pi.*,
            COALESCE(cp.identificador,
              (SELECT c2.identificador FROM public.catalogo_productos c2
               WHERE COALESCE(c2.serie,'') = COALESCE(pi.serie,'') AND c2.modelo = pi.modelo AND c2.color = pi.color LIMIT 1)) AS clave
     FROM public.pedido_items pi
     LEFT JOIN public.catalogo_productos cp ON cp.producto_id = pi.producto_id
     WHERE pi.pedido_id = $1
     ORDER BY pi.creado_en`,
    [params.id]
  )

  const timeline = await query(
    `SELECT t.id, t.estado, t.tipo_evento, t.nota, t.detalle, t.creado_en, u.nombre as realizado_por_nombre
     FROM public.pedido_timeline t
     LEFT JOIN public.usuarios u ON u.id = t.realizado_por
     WHERE t.pedido_id = $1
     ORDER BY t.creado_en`,
    [params.id]
  )

  // Extraer evidencias guardadas en pedido_json
  const evidencias: string[] = pedido.pedido_json?.evidencias || []

  return NextResponse.json({ ...pedido, items, timeline, evidencias })
}

// PATCH /api/orders/[id] - cambiar estado
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session, 'pedidos_estado')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()
  const { estado, notas, notas_cliente, monto_total, motivo_monto, items_surtido, motivo_cancelacion, motivo_rechazo_surtido, ubicacion_fisica, asignado_a,
          tipo_evento, nota_evento, detalle: detalleEvento,
          envio_guia, envio_costo, envio_rastreo_url, envio_observaciones, envio_archivo_url } = body

  // ── Actualización de datos de guía/envío (sin cambiar estado) ─────────
  if (envio_guia !== undefined || envio_costo !== undefined || envio_rastreo_url !== undefined ||
      envio_observaciones !== undefined || envio_archivo_url !== undefined) {
    // Las URLs guardadas se muestran como links: solo http(s) o rutas internas (nada de javascript:)
    for (const u of [envio_rastreo_url, envio_archivo_url]) {
      if (u !== undefined && u !== null && u !== '' && !urlSegura(u)) {
        return NextResponse.json({ error: 'URL inválida (solo http/https)' }, { status: 400 })
      }
    }
    await query(
      `UPDATE public.pedidos SET
         envio_guia          = COALESCE($1, envio_guia),
         envio_costo         = COALESCE($2::numeric, envio_costo),
         envio_rastreo_url   = COALESCE($3, envio_rastreo_url),
         envio_observaciones = COALESCE($4, envio_observaciones),
         envio_archivo_url   = COALESCE($5, envio_archivo_url),
         actualizado_en = NOW()
       WHERE id = $6`,
      [envio_guia ?? null, envio_costo ?? null, envio_rastreo_url ?? null,
       envio_observaciones ?? null, envio_archivo_url ?? null, params.id]
    )
    if (!estado && !tipo_evento) return NextResponse.json({ ok: true })
  }

  // ── Eventos de bitácora (no cambian estado) ──────────────────────────────
  // tipo_evento: 'VENDEDOR' | 'NOTA' | 'PICKUP'
  if (tipo_evento && tipo_evento !== 'ESTADO') {
    const TIPOS_VALIDOS = ['VENDEDOR', 'NOTA', 'PICKUP']
    if (!TIPOS_VALIDOS.includes(tipo_evento)) {
      return NextResponse.json({ error: 'tipo_evento inválido' }, { status: 400 })
    }
    // Para PICKUP, también actualiza direccion_entrega en el pedido
    if (tipo_evento === 'PICKUP' && detalleEvento?.pickup_nuevo && typeof detalleEvento.pickup_nuevo === 'string') {
      await queryOne(
        `UPDATE public.pedidos
         SET direccion_entrega = jsonb_build_object('tipo','pickup','nombre',$1::text),
             actualizado_en = NOW()
         WHERE id = $2`,
        [detalleEvento.pickup_nuevo, params.id]
      )
    }
    await query(
      `INSERT INTO public.pedido_timeline (pedido_id, estado, tipo_evento, nota, detalle, realizado_por)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.id,
        tipo_evento,           // reutiliza la col estado como discriminador legible
        tipo_evento,
        nota_evento || null,
        detalleEvento ? JSON.stringify(detalleEvento) : null,
        session.sub,
      ]
    )
    return NextResponse.json({ ok: true })
  }

  // ── Avance de surtido por artículo (sin cambiar estado) ──────────────────
  if (Array.isArray(items_surtido)) {
    const actual = await queryOne<{ estado: string }>(`SELECT estado FROM public.pedidos WHERE id = $1`, [params.id])
    if (!actual) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (!['CONFIRMADO', 'EN_PREPARACION', 'POR_VALIDAR_SURTIDO'].includes(actual.estado)) {
      return NextResponse.json({ error: 'Solo se captura el surtido de pedidos confirmados en preparación' }, { status: 400 })
    }
    for (const it of items_surtido.slice(0, 200)) {
      if (!UUID_RE.test(String(it?.id))) return NextResponse.json({ error: 'Artículo inválido' }, { status: 400 })
      const cant = Number(it.cantidad_surtida)
      if (!Number.isInteger(cant) || cant < 0) return NextResponse.json({ error: 'Cantidad surtida inválida' }, { status: 400 })
      const row = await queryOne<{ cantidad: number }>(
        `SELECT cantidad FROM public.pedido_items WHERE id = $1 AND pedido_id = $2`, [it.id, params.id]
      )
      if (!row) return NextResponse.json({ error: 'Artículo no pertenece al pedido' }, { status: 400 })
      if (cant > Number(row.cantidad)) return NextResponse.json({ error: `No puedes surtir más de lo pedido (${row.cantidad})` }, { status: 400 })
      const motivo = String(it.motivo || '').trim().slice(0, 300)
      if (cant < Number(row.cantidad) && !motivo) {
        return NextResponse.json({ error: 'Indica el motivo cuando un artículo no se surte completo' }, { status: 400 })
      }
      await query(
        `UPDATE public.pedido_items SET cantidad_surtida = $1, motivo_surtido = $2 WHERE id = $3`,
        [cant, cant < Number(row.cantidad) ? motivo : null, it.id]
      )
    }
    await query(
      `INSERT INTO public.pedido_timeline (pedido_id, estado, tipo_evento, nota, realizado_por)
       VALUES ($1, $2, 'NOTA', 'Avance de surtido actualizado', $3)`,
      [params.id, actual.estado, session.sub]
    )
    return NextResponse.json({ ok: true })
  }

  // Solo permitir actualizar el monto a cobrar, la ubicación física y/o el
  // repartidor asignado, sin cambiar de estado (reasignación libre).
  if (estado === undefined && (monto_total !== undefined || ubicacion_fisica !== undefined || asignado_a !== undefined)) {
    const actual = await queryOne<{ estado: string; monto_total: string | null; ubicacion_fisica: string | null }>(
      `SELECT estado, monto_total, ubicacion_fisica FROM public.pedidos WHERE id = $1`, [params.id]
    )
    if (!actual) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    // Un pedido entregado solo lo modifica el admin.
    if (actual.estado === 'ENTREGADO' && session.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Un pedido entregado solo puede modificarlo el administrador' }, { status: 403 })
    }

    // El monto a cobrar es dinero: solo quien valida pagos (ventas/admin), con motivo y queda en bitácora.
    const montoNuevo = monto_total === null || monto_total === '' ? null : Number(monto_total)
    const cambiaMonto = monto_total !== undefined && montoNuevo !== (actual.monto_total === null ? null : Number(actual.monto_total))
    if (monto_total !== undefined) {
      if (!can(session, 'pagos_confirmar')) {
        return NextResponse.json({ error: 'Sin permiso para modificar el monto a cobrar' }, { status: 403 })
      }
      if (montoNuevo !== null && (!Number.isFinite(montoNuevo) || montoNuevo < 0)) {
        return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
      }
      if (cambiaMonto && !String(motivo_monto || '').trim()) {
        return NextResponse.json({ error: 'El motivo del cambio de monto es obligatorio' }, { status: 400 })
      }
    }

    const updated = await queryOne<any>(
      `UPDATE public.pedidos
       SET monto_total = CASE WHEN $1::text IS NOT NULL THEN $2::numeric ELSE monto_total END,
           ubicacion_fisica = CASE WHEN $3::text IS NOT NULL THEN $4 ELSE ubicacion_fisica END,
           asignado_a = CASE WHEN $6::text IS NOT NULL THEN $7::uuid ELSE asignado_a END,
           asignado_en = CASE WHEN $6::text IS NOT NULL THEN NOW() ELSE asignado_en END,
           actualizado_en = NOW()
       WHERE id = $5
       RETURNING id, monto_total, ubicacion_fisica, asignado_a`,
      [
        monto_total !== undefined ? 'set' : null,
        montoNuevo,
        ubicacion_fisica !== undefined ? 'set' : null,
        ubicacion_fisica || null,
        params.id,
        asignado_a !== undefined ? 'set' : null,
        asignado_a || null,
      ]
    )
    if (!updated) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    if (cambiaMonto) {
      await query(
        `INSERT INTO public.pedido_timeline (pedido_id, estado, tipo_evento, nota, detalle, realizado_por)
         VALUES ($1, $2, 'MONTO', $3, $4, $5)`,
        [params.id, actual.estado,
         `Monto a cobrar: $${actual.monto_total ?? '—'} → $${montoNuevo ?? '—'}. Motivo: ${String(motivo_monto).trim()}`,
         JSON.stringify({ monto_anterior: actual.monto_total, monto_nuevo: montoNuevo, motivo: String(motivo_monto).trim() }),
         session.sub]
      )
    }
    if (ubicacion_fisica !== undefined && (ubicacion_fisica || null) !== (actual.ubicacion_fisica || null)) {
      await query(
        `INSERT INTO public.pedido_timeline (pedido_id, estado, tipo_evento, nota, realizado_por)
         VALUES ($1, $2, 'UBICACION', $3, $4)`,
        [params.id, actual.estado, `Ubicación física: ${actual.ubicacion_fisica || '—'} → ${ubicacion_fisica || '—'}`, session.sub]
      )
    }
    return NextResponse.json({ ok: true, data: updated })
  }

  const validStates = [
    'PENDIENTE_PAGO', 'PENDIENTE_CONFIRMACION', 'CONFIRMADO',
    'EN_PREPARACION', 'POR_VALIDAR_SURTIDO', 'EN_REPARTO', 'LISTO_PARA_RECOGER', 'ENTREGADO', 'CANCELADO',
  ]
  if (!validStates.includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }
  if (estado === 'CANCELADO' && !motivo_cancelacion?.trim()) {
    return NextResponse.json({ error: 'El motivo de cancelación es obligatorio' }, { status: 400 })
  }

  const before = await queryOne<{ estado: string; metodo_pago: string; metodo_entrega: string }>(
    `SELECT estado, metodo_pago, metodo_entrega FROM public.pedidos WHERE id = $1`, [params.id]
  )
  if (!before) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // CANCELADO y ENTREGADO son terminales aquí (reactivar tiene su propia ruta, solo ADMIN).
  // Un pedido ENTREGADO solo lo puede corregir el administrador.
  if (before.estado === 'CANCELADO' && estado !== before.estado) {
    return NextResponse.json({ error: 'Un pedido cancelado ya no puede cambiar de estado' }, { status: 400 })
  }
  if (before.estado === 'ENTREGADO' && estado !== before.estado && session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Un pedido entregado solo puede modificarlo el administrador' }, { status: 403 })
  }

  // Confirmar pago manual (PENDIENTE_PAGO→CONFIRMADO) y validar/rechazar surtido
  // (POR_VALIDAR_SURTIDO→EN_REPARTO/LISTO_PARA_RECOGER o →EN_PREPARACION)
  // requieren el visto bueno de ventas/admin — almacén no puede
  // autoconfirmarse estos pasos.
  const esConfirmacionPago = before.estado === 'PENDIENTE_PAGO' && estado === 'CONFIRMADO'
  const esValidacionSurtido = before.estado === 'POR_VALIDAR_SURTIDO'
    && (estado === 'EN_REPARTO' || estado === 'LISTO_PARA_RECOGER' || estado === 'EN_PREPARACION')
  if ((esConfirmacionPago || esValidacionSurtido) && !can(session, 'pagos_confirmar')) {
    return NextResponse.json({ error: 'Sin permiso para confirmar pago o validar surtido' }, { status: 403 })
  }
  if (estado === 'POR_VALIDAR_SURTIDO' && before.estado !== 'EN_PREPARACION') {
    return NextResponse.json({ error: 'Solo se puede pasar a "por validar" desde "en preparación"' }, { status: 400 })
  }
  // Pickup nunca pasa por reparto, y envío nunca pasa por "listo para
  // recoger" — cada metodo_entrega tiene un único destino válido al salir
  // de la validación de surtido.
  if (esValidacionSurtido && estado !== 'EN_PREPARACION') {
    const destinoEsperado = before.metodo_entrega === 'pickup' ? 'LISTO_PARA_RECOGER' : 'EN_REPARTO'
    if (estado !== destinoEsperado) {
      return NextResponse.json({ error: `Este pedido (${before.metodo_entrega}) debe pasar a "${destinoEsperado}"` }, { status: 400 })
    }
  }
  const esRechazoSurtido = before.estado === 'POR_VALIDAR_SURTIDO' && estado === 'EN_PREPARACION'
  if (esRechazoSurtido && !motivo_rechazo_surtido?.trim()) {
    return NextResponse.json({ error: 'El motivo de rechazo es obligatorio' }, { status: 400 })
  }

  // EN_REPARTO = pedido entregado a paquetería. El campo asignado_a es
  // opcional (se usa si en el futuro se reactiva el módulo de repartidor).
  // Por ahora no se valida — la nota de cliente puede incluir la guía.

  const updated = await queryOne<any>(
    `UPDATE public.pedidos
     SET estado = $1,
         resumen = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE resumen END,
         notas_cliente = CASE WHEN $8::text IS NOT NULL THEN $8 ELSE notas_cliente END,
         monto_total = CASE WHEN $4::numeric IS NOT NULL THEN $4 ELSE monto_total END,
         motivo_cancelacion = CASE WHEN $1 = 'CANCELADO' THEN $5 ELSE motivo_cancelacion END,
         cancelado_en = CASE WHEN $1 = 'CANCELADO' THEN NOW() ELSE cancelado_en END,
         confirmado_en = CASE WHEN $1 = 'CONFIRMADO' AND confirmado_en IS NULL THEN NOW() ELSE confirmado_en END,
         motivo_rechazo_surtido = CASE WHEN $1 = 'EN_PREPARACION' THEN $6 ELSE NULL END,
         asignado_a = CASE WHEN $7::uuid IS NOT NULL THEN $7::uuid ELSE asignado_a END,
         actualizado_en = NOW()
     WHERE id = $3
     RETURNING id, telefono, estado, resumen, numero_pedido, notas_cliente`,
    [
      estado, notas || null, params.id,
      null, // el monto solo cambia por la rama dedicada (permiso + motivo + bitácora)
      motivo_cancelacion || null,
      motivo_rechazo_surtido || null,
      asignado_a || null,
      notas_cliente || null,
    ]
  )

  if (!updated) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await query(
    `INSERT INTO public.pedido_timeline (pedido_id, estado, nota, realizado_por)
     VALUES ($1, $2, $3, $4)`,
    [params.id, estado, estado === 'CANCELADO' ? motivo_cancelacion : (esRechazoSurtido ? `Surtido rechazado: ${motivo_rechazo_surtido}` : (notas || null)), session.sub]
  )

  // Confirmado/pagado por primera vez → descuenta stock definitivo y libera la reserva.
  // Cancelado → libera reservas; si ya estaba confirmado (stock descontado), lo restaura.
  if (ESTADOS_FINALES.includes(estado) && ESTADOS_SIN_STOCK_DESCONTADO.includes(before.estado)) {
    await finalizarPedido(params.id, session.sub).catch(e => console.error('[finalizarPedido]', e))
  } else if (estado === 'CANCELADO' && before.estado !== 'CANCELADO') {
    await liberarPedido(params.id).catch(e => console.error('[liberarPedido]', e))
    // Si el pedido ya tenía stock descontado (CONFIRMADO o etapas posteriores), revertirlo
    const ESTADOS_CON_STOCK_DESCONTADO = ['CONFIRMADO','EN_PREPARACION','POR_VALIDAR_SURTIDO','EN_REPARTO','LISTO_PARA_RECOGER','ENTREGA_FALLIDA']
    if (ESTADOS_CON_STOCK_DESCONTADO.includes(before.estado)) {
      await restaurarStockPedido(params.id, session.sub).catch(e => console.error('[restaurarStock]', e))
    }
  }

  // Notificar al cliente — "por validar surtido" es un estado interno, no se
  // le notifica (de cara al cliente nada cambió, sigue viendo "en preparación").
  // notificarCliente envía WhatsApp siempre + email si el cliente tiene correo.
  if (estado !== 'POR_VALIDAR_SURTIDO') {
    // La guía de paquetería (si hay archivo cargado) viaja adjunta en el correo al salir a reparto.
    const guia = estado === 'EN_REPARTO'
      ? await queryOne<{ envio_archivo_url: string | null }>(`SELECT envio_archivo_url FROM public.pedidos WHERE id = $1`, [params.id])
      : null
    await notificarCliente({
      adjuntoUrl: guia?.envio_archivo_url,
      id: updated.id,
      telefono: updated.telefono,
      estado: updated.estado,
      resumen: updated.resumen,
      numero_pedido: updated.numero_pedido,
      nota: notas_cliente || notas || undefined,
    })
  }

  return NextResponse.json({ ok: true, data: updated })
}
