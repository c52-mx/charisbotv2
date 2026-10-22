// POST /api/upload/catalog-photo — sube la foto de un producto del catálogo.
// Guarda en public/uploads/catalog/ — cubierto por el volumen Dokploy /app/public/uploads.
// Se sirve vía /api/files/catalog/{filename}.
import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { validarImagen } from '@/lib/uploads'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 4 * 1024 * 1024  // 4 MB

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  const v = await validarImagen(file, ['png', 'jpg', 'jpeg', 'webp', 'gif'], MAX_BYTES)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const dir = path.join(process.cwd(), 'public', 'uploads', 'catalog')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, v.fname), v.buffer)

  return NextResponse.json({ url: `/api/files/catalog/${v.fname}` })
}
