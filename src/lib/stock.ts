import { query, queryOne, withTransaction } from './db'

export class InsufficientStockError extends Error {
  faltantes: { case_id: string; disponible: number }[]
  constructor(faltantes: { case_id: string; disponible: number }[]) {
    super('Stock insuficiente')
    this.faltantes = faltantes
  }
}

// Limpia reservas vencidas. Se llama de forma oportunista antes de leer
// disponibilidad — no requiere cron, basta con que cada lectura purgue.
export async function purgeExpiredReservas(): Promise<void> {
  await query(`DELETE FROM public.stock_reservas WHERE expira_en <= NOW()`, [])
}

// Disponible = stock físico - reservas activas (CARRITO + PEDIDO) no vencidas.
export async function getDisponibilidad(caseIds: string[]): Promise<Record<string, number>> {
  if (!caseIds.length) return {}
  await purgeExpiredReservas()

  const rows = await query<{ case_id: string; disponible: number }>(
    `SELECT c.case_id,
            (c.stock - COALESCE(SUM(r.cantidad), 0))::int AS disponible
     FROM public.catalogo_cases c
     LEFT JOIN public.stock_reservas r
       ON r.case_id = c.case_id AND r.expira_en > NOW()
     WHERE c.case_id = ANY($1::uuid[])
     GROUP BY c.case_id, c.stock`,
    [caseIds]
  )

  const map: Record<string, number> = {}
  for (const r of rows) map[r.case_id] = Math.max(0, Number(r.disponible))
  return map
}

export async function resolveCaseId(tipo_case: string, modelo: string, color: string): Promise<string | null> {
  const row = await queryOne<{ case_id: string }>(
    `SELECT case_id FROM public.catalogo_cases WHERE tipo_case = $1 AND modelo = $2 AND color = $3`,
    [tipo_case, modelo, color]
  )
  return row?.case_id ?? null
}

export async function getConfigMinutos(clave: string, def: number): Promise<number> {
  const row = await queryOne<{ valor: string }>(`SELECT valor FROM public.config_portal WHERE clave = $1`, [clave])
  const n = parseInt(row?.valor || '')
  return Number.isFinite(n) && n > 0 ? n : def
}

// ── Reserva de carrito (CARRITO) ────────────────────────────────────────
// referencia = identificador del cliente (en este portal, su email/sesión).
export async function reservarCarrito(
  caseId: string, referencia: string, cantidad: number, ttlMin: number
): Promise<{ ok: boolean; disponible: number }> {
  await purgeExpiredReservas()

  const row = await queryOne<{ disponible: number }>(
    `SELECT (c.stock - COALESCE(SUM(r.cantidad) FILTER (
              WHERE NOT (r.origen = 'CARRITO' AND r.referencia = $2)
            ), 0))::int AS disponible
     FROM public.catalogo_cases c
     LEFT JOIN public.stock_reservas r ON r.case_id = c.case_id AND r.expira_en > NOW()
     WHERE c.case_id = $1
     GROUP BY c.case_id, c.stock`,
    [caseId, referencia]
  )
  const disponible = Math.max(0, Number(row?.disponible ?? 0))
  if (cantidad > disponible) return { ok: false, disponible }

  const expiraEn = new Date(Date.now() + ttlMin * 60_000)
  await query(
    `INSERT INTO public.stock_reservas (case_id, origen, referencia, cantidad, expira_en)
     VALUES ($1, 'CARRITO', $2, $3, $4)
     ON CONFLICT (case_id, origen, referencia) DO UPDATE SET cantidad = $3, expira_en = $4`,
    [caseId, referencia, cantidad, expiraEn]
  )
  return { ok: true, disponible }
}

export async function liberarCarritoItem(caseId: string, referencia: string): Promise<void> {
  await query(
    `DELETE FROM public.stock_reservas WHERE case_id = $1 AND origen = 'CARRITO' AND referencia = $2`,
    [caseId, referencia]
  )
}

export async function liberarCarritoTodo(referencia: string): Promise<void> {
  await query(`DELETE FROM public.stock_reservas WHERE origen = 'CARRITO' AND referencia = $1`, [referencia])
}

// ── Conversión carrito → pedido (al crear el pedido) ────────────────────
export async function convertirCarritoAPedido(
  referenciaCarrito: string,
  pedidoId: string,
  items: { case_id: string; cantidad: number }[],
  ttlMinPago: number
): Promise<void> {
  if (!items.length) return

  await withTransaction(async (tx) => {
    await tx(`DELETE FROM public.stock_reservas WHERE expira_en <= NOW()`, [])

    const faltantes: { case_id: string; disponible: number }[] = []
    for (const it of items) {
      const [row] = await tx<{ disponible: number }>(
        `SELECT (c.stock - COALESCE(SUM(r.cantidad) FILTER (
                  WHERE NOT (r.origen = 'CARRITO' AND r.referencia = $2)
                ), 0))::int AS disponible
         FROM public.catalogo_cases c
         LEFT JOIN public.stock_reservas r ON r.case_id = c.case_id AND r.expira_en > NOW()
         WHERE c.case_id = $1
         GROUP BY c.case_id, c.stock`,
        [it.case_id, referenciaCarrito]
      )
      const disponible = Math.max(0, Number(row?.disponible ?? 0))
      if (it.cantidad > disponible) faltantes.push({ case_id: it.case_id, disponible })
    }
    if (faltantes.length) throw new InsufficientStockError(faltantes)

    const expiraEn = new Date(Date.now() + ttlMinPago * 60_000)
    for (const it of items) {
      await tx(
        `DELETE FROM public.stock_reservas WHERE case_id = $1 AND origen = 'CARRITO' AND referencia = $2`,
        [it.case_id, referenciaCarrito]
      )
      await tx(
        `INSERT INTO public.stock_reservas (case_id, origen, referencia, cantidad, expira_en)
         VALUES ($1, 'PEDIDO', $2, $3, $4)
         ON CONFLICT (case_id, origen, referencia) DO UPDATE SET cantidad = $3, expira_en = $4`,
        [it.case_id, pedidoId, it.cantidad, expiraEn]
      )
    }
  })
}

// ── Cierre del pedido ────────────────────────────────────────────────────
// Confirmado/pagado: descuenta stock físico definitivamente y libera la reserva.
export async function finalizarPedido(pedidoId: string): Promise<void> {
  await withTransaction(async (tx) => {
    const rows = await tx<{ case_id: string; cantidad: number }>(
      `SELECT case_id, cantidad FROM public.stock_reservas WHERE origen = 'PEDIDO' AND referencia = $1`,
      [pedidoId]
    )
    for (const r of rows) {
      await tx(`UPDATE public.catalogo_cases SET stock = GREATEST(0, stock - $1) WHERE case_id = $2`, [r.cantidad, r.case_id])
    }
    await tx(`DELETE FROM public.stock_reservas WHERE origen = 'PEDIDO' AND referencia = $1`, [pedidoId])
  })
}

// Cancelado o vencido sin pago: libera la reserva sin tocar el stock físico.
export async function liberarPedido(pedidoId: string): Promise<void> {
  await query(`DELETE FROM public.stock_reservas WHERE origen = 'PEDIDO' AND referencia = $1`, [pedidoId])
}

// Auto-cancela pedidos PENDIENTE_PAGO cuya ventana de pago ya venció.
// Lazy: se llama al listar pedidos, sin necesidad de cron.
export async function liberarPedidosVencidos(): Promise<void> {
  const vencidos = await query<{ id: string }>(
    `SELECT id FROM public.pedidos
     WHERE estado = 'PENDIENTE_PAGO' AND reserva_expira_en IS NOT NULL AND reserva_expira_en <= NOW()`,
    []
  )
  for (const p of vencidos) {
    await liberarPedido(p.id)
    await query(`UPDATE public.pedidos SET estado = 'CANCELADO', cancelado_en = NOW() WHERE id = $1`, [p.id])
    await query(
      `INSERT INTO public.pedido_timeline (pedido_id, estado, nota)
       VALUES ($1, 'CANCELADO', 'Cancelado automáticamente: tiempo de pago vencido')`,
      [p.id]
    )
  }
}
