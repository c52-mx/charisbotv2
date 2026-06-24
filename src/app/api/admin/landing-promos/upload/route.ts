import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

// POST /api/admin/landing-promos/upload - sube una imagen de promo del landing
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session.rol as any, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'landing')
  await mkdir(uploadDir, { recursive: true })

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext    = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fname  = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  await writeFile(path.join(uploadDir, fname), buffer)

  return NextResponse.json({ ok: true, url: `/uploads/landing/${fname}` })
}
