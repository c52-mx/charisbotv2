// POST /api/upload/logo — sube el logo de una paquetería u otro asset genérico.
// No requiere pedido_id; solo acceso autenticado con rol admin.
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

  const ext   = file.name.split('.').pop()?.toLowerCase() || 'png'
  const fname = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const dir   = path.join(process.cwd(), 'public', 'uploads', 'logos')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, fname), Buffer.from(await file.arrayBuffer()))

  return NextResponse.json({ url: `/uploads/logos/${fname}` })
}
