// POST /api/upload/logo — sube el logo de una paquetería.
// Guarda en public/uploads/logos/ — cubierto por el volumen Dokploy /app/public/uploads.
// Se sirve vía GET /api/files/logos/{filename} porque Next.js standalone no sirve
// archivos escritos en public/ después del build.
import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { validarImagen } from '@/lib/uploads'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !(session.rol === 'ADMIN' || can(session, 'config_editar'))) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  // SVG ya no se acepta: puede contener scripts y se serviría desde nuestro origen.
  const v = await validarImagen(file, ['png', 'jpg', 'jpeg', 'webp'])
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const dir = path.join(process.cwd(), 'public', 'uploads', 'logos')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, v.fname), v.buffer)

  return NextResponse.json({ url: `/api/files/logos/${v.fname}` })
}
