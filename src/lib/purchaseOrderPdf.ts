import PDFDocument from 'pdfkit'

export interface OrdenCompraItem {
  modelo: string
  tipo_case: string
  color: string
  cantidad: number
  precio: number
}

export interface OrdenCompraData {
  numeroPedido: string
  fecha: Date
  cliente: string
  metodoPago: string
  metodoEntrega: 'envio' | 'pickup'
  direccion?: {
    nombre_contacto: string
    calle: string
    colonia: string
    ciudad: string
    estado_mx: string
    cp: string
    instrucciones_entrega?: string | null
  }
  negocioNombre?: string
  negocioDireccion?: string
  items: OrdenCompraItem[]
  subtotal: number
  descuentoPct: number
  total: number
}

const METODO_PAGO_LABEL: Record<string, string> = {
  transferencia: 'Transferencia bancaria', efectivo: 'Efectivo',
  stripe: 'Tarjeta (Stripe)', mercadopago: 'Mercado Pago',
}

// Genera la orden de compra en PDF — sin navegador headless, pdfkit
// dibuja el documento directo en Node (más liviano para el despliegue
// standalone que ya tiene este proyecto).
export function generarOrdenCompraPdf(data: OrdenCompraData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Encabezado
    doc.fontSize(22).fillColor('#1565c0').font('Helvetica-Bold').text('CHARIS', { align: 'left' })
    doc.fontSize(10).fillColor('#666').font('Helvetica').text('Distribuidor Mayorista', { align: 'left' })
    doc.moveDown(1)

    doc.fontSize(16).fillColor('#0d2137').font('Helvetica-Bold').text(`Orden de compra #${data.numeroPedido.toUpperCase()}`)
    doc.fontSize(10).fillColor('#666').font('Helvetica').text(data.fecha.toLocaleString('es-MX'))
    doc.moveDown(1)

    doc.fontSize(11).fillColor('#0d2137').font('Helvetica-Bold').text('Cliente: ', { continued: true }).font('Helvetica').text(data.cliente)
    doc.font('Helvetica-Bold').text('Método de pago: ', { continued: true }).font('Helvetica').text(METODO_PAGO_LABEL[data.metodoPago] || data.metodoPago)
    doc.moveDown(0.5)

    // Entrega
    doc.font('Helvetica-Bold').text(data.metodoEntrega === 'pickup' ? 'Recoger en tienda:' : 'Enviar a:')
    doc.font('Helvetica')
    if (data.metodoEntrega === 'pickup') {
      doc.text(data.negocioNombre || 'Nuestra tienda')
      if (data.negocioDireccion) doc.text(data.negocioDireccion)
    } else if (data.direccion) {
      doc.text(data.direccion.nombre_contacto)
      doc.text(`${data.direccion.calle}, ${data.direccion.colonia}`)
      doc.text(`${data.direccion.ciudad}, ${data.direccion.estado_mx} ${data.direccion.cp}`)
      if (data.direccion.instrucciones_entrega) doc.text(`Instrucciones: ${data.direccion.instrucciones_entrega}`)
    }
    doc.moveDown(1)

    // Tabla de items
    const colX = { modelo: 50, tipo: 220, color: 300, cantidad: 380, precio: 440, subtotal: 500 }
    const rowY0 = doc.y
    doc.font('Helvetica-Bold').fontSize(10)
    doc.text('Modelo', colX.modelo, rowY0)
    doc.text('Tipo', colX.tipo, rowY0)
    doc.text('Color', colX.color, rowY0)
    doc.text('Cant.', colX.cantidad, rowY0)
    doc.text('Precio', colX.precio, rowY0)
    doc.text('Subtotal', colX.subtotal, rowY0)
    doc.moveDown(0.3)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke()
    doc.moveDown(0.3)

    doc.font('Helvetica').fontSize(10)
    for (const it of data.items) {
      const y = doc.y
      const subtotalItem = it.cantidad * it.precio
      doc.text(it.modelo, colX.modelo, y, { width: 165 })
      doc.text(it.tipo_case, colX.tipo, y, { width: 75 })
      doc.text(it.color, colX.color, y, { width: 75 })
      doc.text(String(it.cantidad), colX.cantidad, y, { width: 55 })
      doc.text(`$${it.precio.toFixed(2)}`, colX.precio, y, { width: 55 })
      doc.text(`$${subtotalItem.toFixed(2)}`, colX.subtotal, y, { width: 60 })
      doc.moveDown(0.6)
    }

    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke()
    doc.moveDown(0.5)

    // Totales
    const totalsX = 400
    doc.font('Helvetica').fontSize(11)
    doc.text('Subtotal:', totalsX, doc.y, { continued: true, width: 80 })
    doc.text(`$${data.subtotal.toFixed(2)}`, { align: 'right' })
    if (data.descuentoPct > 0) {
      doc.text(`Descuento (${data.descuentoPct}%):`, totalsX, doc.y, { continued: true, width: 80 })
      doc.text(`-$${(data.subtotal * data.descuentoPct / 100).toFixed(2)}`, { align: 'right' })
    }
    doc.font('Helvetica-Bold').fontSize(13)
    doc.text('Total:', totalsX, doc.y, { continued: true, width: 80 })
    doc.text(`$${data.total.toFixed(2)} MXN`, { align: 'right' })

    doc.end()
  })
}
