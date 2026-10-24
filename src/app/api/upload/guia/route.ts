// POST /api/upload/guia — sube el archivo de guía de paquetería de un pedido (PDF o imagen).
// Guarda en public/uploads/orders/{pedidoId}/ y se sirve vía /api/files/orders/... .
// Ese mismo archivo se adjunta al correo del cliente cuando el pedido pasa a EN_REPARTO.
import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { UUID_RE, validarImagen } from '@/lib/uploads'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'pedidos_estado')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const formData = await req.formData()
  const pedidoId = String(formData.get('pedido_id') || '')
  const file = formData.get('file')
  if (!UUID_RE.test(pedidoId)) return NextResponse.json({ error: 'pedido_id inválido' }, { status: 400 })
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })
  if (!(await queryOne(`SELECT 1 FROM public.pedidos WHERE id = $1`, [pedidoId]))) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  let fname: string
  let buffer: Buffer
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (ext === 'pdf') {
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'El archivo no puede superar 5 MB.' }, { status: 400 })
    buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return NextResponse.json({ error: 'El contenido del archivo no es un PDF válido.' }, { status: 400 })
    }
    fname = `guia-${randomUUID()}.pdf`
  } else {
    const v = await validarImagen(file, ['png', 'jpg', 'jpeg', 'webp'])
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
    buffer = v.buffer
    fname = `guia-${v.fname}`
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', 'orders', pedidoId)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, fname), buffer)

  return NextResponse.json({ url: `/api/files/orders/${pedidoId}/${fname}` })
}
