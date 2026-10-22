import { NextRequest, NextResponse } from 'next/server'
import { getSession, can, tipoSesion, type JWTPayload } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { UUID_RE, validarImagen } from '@/lib/uploads'

export const dynamic = 'force-dynamic'

// Llaves de pedido_json donde se permite guardar URLs, y quién puede escribir en cada una.
const TIPOS_CLIENTE    = ['comprobante_pago']
const TIPOS_INTERNO    = ['evidencias', 'comprobante_pago']
const TIPOS_REPARTIDOR = ['evidencia_entrega']

// Devuelve el error si la sesión no puede operar sobre ese pedido/tipo, o null si puede.
async function autorizar(
  session: JWTPayload, pedidoId: string, tipo: string, escritura: boolean
): Promise<{ status: number; error: string } | null> {
  const pedido = await queryOne<{ telefono: string; asignado_a: string | null }>(
    `SELECT telefono, asignado_a FROM public.pedidos WHERE id = $1`, [pedidoId]
  )
  if (!pedido) return { status: 404, error: 'Pedido no encontrado' }

  const kind = tipoSesion(session)
  if (kind === 'CLIENTE') {
    if (pedido.telefono !== session.email) return { status: 403, error: 'Sin acceso' }
    if (escritura && !TIPOS_CLIENTE.includes(tipo)) return { status: 403, error: 'Tipo no permitido' }
  } else if (kind === 'REPARTIDOR') {
    if (pedido.asignado_a !== session.sub) return { status: 403, error: 'Sin acceso' }
    if (escritura && !TIPOS_REPARTIDOR.includes(tipo)) return { status: 403, error: 'Tipo no permitido' }
  } else {
    if (!can(session, 'pedidos_ver')) return { status: 403, error: 'Sin acceso' }
    if (escritura && (!can(session, 'pedidos_estado') || !TIPOS_INTERNO.includes(tipo))) {
      return { status: 403, error: 'Sin acceso' }
    }
  }
  return null
}

// POST /api/upload - sube imágenes a un pedido (evidencias del admin,
// comprobante de pago del cliente, etc. — distinguido por `tipo`)
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const formData = await req.formData()
  const pedidoId = String(formData.get('pedido_id') || '')
  const tipo     = String(formData.get('tipo') || 'evidencias')
  const files    = formData.getAll('files').filter((f): f is File => typeof f !== 'string')

  if (!UUID_RE.test(pedidoId)) return NextResponse.json({ error: 'pedido_id inválido' }, { status: 400 })
  if (!files.length) return NextResponse.json({ error: 'Sin archivos' }, { status: 400 })
  if (files.length > 3) return NextResponse.json({ error: 'Máximo 3 imágenes' }, { status: 400 })

  const denegado = await autorizar(session, pedidoId, tipo, true)
  if (denegado) return NextResponse.json({ error: denegado.error }, { status: denegado.status })

  // Validar todo antes de escribir nada
  const validados = []
  for (const file of files) {
    const v = await validarImagen(file)
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
    validados.push(v)
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'orders', pedidoId)
  await mkdir(uploadDir, { recursive: true })

  const savedUrls: string[] = []
  for (const v of validados) {
    await writeFile(path.join(uploadDir, v.fname), v.buffer)
    savedUrls.push(`/api/files/orders/${pedidoId}/${v.fname}`)
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
  const pedidoId = searchParams.get('pedido_id') || ''
  const tipo     = searchParams.get('tipo') || 'evidencias'
  if (!UUID_RE.test(pedidoId)) return NextResponse.json({ error: 'pedido_id inválido' }, { status: 400 })

  const denegado = await autorizar(session, pedidoId, tipo, false)
  if (denegado) return NextResponse.json({ error: denegado.error }, { status: denegado.status })

  const row = await queryOne<any>('SELECT pedido_json FROM public.pedidos WHERE id = $1', [pedidoId])
  const urls = row?.pedido_json?.[tipo] || []
  return NextResponse.json({ urls })
}
