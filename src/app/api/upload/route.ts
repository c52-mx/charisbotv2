import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

// POST /api/upload - sube imágenes a un pedido (evidencias del admin,
// comprobante de pago del cliente, etc. — distinguido por `tipo`)
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const formData = await req.formData()
  const pedidoId = formData.get('pedido_id') as string
  const tipo     = (formData.get('tipo') as string) || 'evidencias'
  const files    = formData.getAll('files') as File[]

  if (!pedidoId) return NextResponse.json({ error: 'pedido_id requerido' }, { status: 400 })
  if (!files.length) return NextResponse.json({ error: 'Sin archivos' }, { status: 400 })
  if (files.length > 3) return NextResponse.json({ error: 'Máximo 3 imágenes' }, { status: 400 })

  // Un cliente solo puede subir archivos a sus propios pedidos.
  if (session.rol === 'CLIENTE') {
    const pedido = await queryOne<{ telefono: string }>(`SELECT telefono FROM public.pedidos WHERE id = $1`, [pedidoId])
    if (!pedido || pedido.telefono !== session.email) {
      return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
    }
  }

  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'orders', pedidoId)
  await mkdir(uploadDir, { recursive: true })

  const savedUrls: string[] = []

  for (const file of files) {
    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext    = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fname  = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const fpath  = path.join(uploadDir, fname)
    await writeFile(fpath, buffer)
    const url = `/uploads/orders/${pedidoId}/${fname}`
    savedUrls.push(url)
  }

  // Save URLs to pedidos table (append to existing, bajo la llave `tipo`)
  await queryOne(
    `UPDATE public.pedidos
     SET pedido_json = jsonb_set(
       COALESCE(pedido_json, '{}'::jsonb),
       $3::text[],
       COALESCE(pedido_json->$4, '[]'::jsonb) || $1::jsonb
     )
     WHERE id = $2`,
    [JSON.stringify(savedUrls), pedidoId, [tipo], tipo]
  )

  return NextResponse.json({ ok: true, urls: savedUrls })
}

// GET /api/upload?pedido_id=xxx&tipo=evidencias - lista archivos subidos
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const pedidoId = searchParams.get('pedido_id')
  const tipo     = searchParams.get('tipo') || 'evidencias'
  if (!pedidoId) return NextResponse.json({ error: 'pedido_id requerido' }, { status: 400 })

  const row = await queryOne<any>('SELECT pedido_json, telefono FROM public.pedidos WHERE id = $1', [pedidoId])
  if (session.rol === 'CLIENTE' && row?.telefono !== session.email) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }
  const urls = row?.pedido_json?.[tipo] || []
  return NextResponse.json({ urls })
}
