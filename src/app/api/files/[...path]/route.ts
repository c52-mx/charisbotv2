// GET /api/files/[...path] — sirve archivos subidos en runtime (logos, etc.)
// Next.js standalone NO sirve archivos escritos en public/ después del build,
// así que este route los lee del filesystem y los devuelve con el Content-Type correcto.
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg:  'image/svg+xml',
  gif:  'image/gif',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Bloquear path traversal
  const segments = (params.path || []).map(s => s.replace(/\.\./g, ''))
  if (segments.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const filePath = path.join(process.cwd(), 'uploads', ...segments)

  try {
    const buf = await readFile(filePath)
    const ext = (segments[segments.length - 1].split('.').pop() || '').toLowerCase()
    const contentType = MIME[ext] || 'application/octet-stream'

    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
