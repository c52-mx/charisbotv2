// POST /api/upload/logo — sube el logo de una paquetería.
// Guarda en ./uploads/logos/ (fuera de public/) y se sirve vía GET /api/files/logos/{filename}.
// El directorio debe montarse como volumen en Dokploy: /app/uploads → volumen persistente.
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  const ALLOWED_EXT   = ['png', 'jpg', 'jpeg', 'webp', 'svg']
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: 'Formato no permitido. Usa PNG, JPG, WEBP o SVG.' }, { status: 400 })
  }

  const fname = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const dir   = path.join(process.cwd(), 'uploads', 'logos')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, fname), Buffer.from(await file.arrayBuffer()))

  // Servido por /api/files/logos/{fname} — independiente del static file server de Next.js
  return NextResponse.json({ url: `/api/files/logos/${fname}` })
}
