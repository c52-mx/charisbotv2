// POST /api/upload/catalog-photo — sube la foto de un producto del catálogo.
// Guarda en public/uploads/catalog/ — cubierto por el volumen Dokploy /app/public/uploads.
// Se sirve vía /api/files/catalog/{filename}.
import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ALLOWED_EXT   = ['png', 'jpg', 'jpeg', 'webp', 'gif']
const MAX_BYTES     = 4 * 1024 * 1024  // 4 MB

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: 'Formato no permitido. Usa PNG, JPG, WEBP o GIF.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen no puede superar 4 MB.' }, { status: 400 })
  }

  const fname = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const dir   = path.join(process.cwd(), 'public', 'uploads', 'catalog')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, fname), buffer)

  return NextResponse.json({ url: `/api/files/catalog/${fname}` })
}
