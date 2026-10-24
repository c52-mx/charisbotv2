// GET /api/files/[...path] — sirve archivos subidos en runtime (logos, evidencias, etc.)
// Next.js standalone NO sirve archivos escritos en public/ después del build,
// así que este route los lee del filesystem y los devuelve con el Content-Type correcto.
// Base: public/uploads/ — cubierto por el volumen Dokploy /app/public/uploads.
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg:  'image/svg+xml',   // solo para archivos legados ya subidos; las rutas de subida ya no lo aceptan
  gif:  'image/gif',
  pdf:  'application/pdf',  // guías de paquetería (validadas con firma %PDF- al subir)
}

const BASE = path.resolve(process.cwd(), 'public', 'uploads')

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const segments = params.path || []
  if (segments.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Bloquear path traversal: la ruta resuelta debe quedar dentro de BASE
  const filePath = path.resolve(BASE, ...segments)
  if (!filePath.startsWith(BASE + path.sep)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ext = (path.extname(filePath).slice(1) || '').toLowerCase()
  const contentType = MIME[ext]
  // Solo se sirven tipos de imagen conocidos — nada de html/js/octet-stream.
  if (!contentType) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const buf = await readFile(filePath)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        // Si alguien abre el archivo directamente, no puede ejecutar scripts (SVG legado).
        // (el visor de PDF de Chrome no abre documentos con `sandbox`, y un PDF no ejecuta HTML/JS del sitio)
        'Content-Security-Policy': ext === 'pdf' ? "default-src 'none'" : "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
