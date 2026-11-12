// Etiquetas de estado de pedido para el portal interno, en sentence case y con acentos.
// Fuente única: el admin muestra "En preparación", nunca "EN PREPARACION".
const ESTADO_LABEL: Record<string, string> = {
  CONFIRMADO: 'Confirmado',
  PENDIENTE_CONFIRMACION: 'Pendiente',
  PENDIENTE_PAGO: 'Pendiente de pago',
  PENDIENTE: 'Pendiente',
  EN_PREPARACION: 'En preparación',
  POR_VALIDAR_SURTIDO: 'Por validar surtido',
  EN_REPARTO: 'En reparto',
  LISTO_PARA_RECOGER: 'Listo para recoger',
  ENTREGA_FALLIDA: 'Entrega fallida',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  EN_PROCESO: 'En proceso',
  COMPLETADO: 'Completado',
}

export function labelEstado(estado: string): string {
  if (!estado) return ''
  return ESTADO_LABEL[estado] || estado.replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase())
}
