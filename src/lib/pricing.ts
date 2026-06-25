// Descuento por volumen y cálculo de totales — centralizado para que
// carrito, checkout y creación de pedido usen exactamente la misma fórmula
// sobre las mismas franjas (administrables desde /admin/config).

export interface DescuentoTier {
  piezas_minimas: number
  porcentaje: number
}

// Recibe las franjas ya cargadas (no pega a la BD) — el caller decide de
// dónde vienen (query directa en server, fetch a /api/descuentos en cliente).
export function descuentoPct(piezas: number, tiers: DescuentoTier[]): number {
  let pct = 0
  for (const t of tiers) {
    if (piezas >= t.piezas_minimas && t.porcentaje > pct) pct = t.porcentaje
  }
  return pct
}

export function calcularTotal(
  items: { cantidad: number; precio: number }[],
  tiers: DescuentoTier[]
): { subtotal: number; descuentoPct: number; total: number; totalPiezas: number } {
  const totalPiezas = items.reduce((s, i) => s + i.cantidad, 0)
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio, 0)
  const pct = descuentoPct(totalPiezas, tiers)
  const total = Math.round(subtotal * (1 - pct / 100) * 100) / 100
  return { subtotal, descuentoPct: pct, total, totalPiezas }
}
