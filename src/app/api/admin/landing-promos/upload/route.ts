import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { validarImagen } from '@/lib/uploads'

export const dynamic = 'force-dynamic'

// POST /api/admin/landing-promos/upload - sube una imagen de promo del landing
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  const v = await validarImagen(file)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'landing')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, v.fname), v.buffer)

  return NextResponse.json({ ok: true, url: `/api/files/landing/${v.fname}` })
}
