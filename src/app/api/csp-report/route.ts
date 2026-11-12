// POST /api/csp-report — recibe los reportes de violación de la Content-Security-Policy (modo Report-Only)
// y los deja en el log del servidor (Dokploy) para decidir cuándo pasar la CSP a obligatoria.
// Es público (el navegador lo envía sin cookie), así que: límite de tamaño, rate limit por IP y solo se loguean campos acotados.
import { NextRequest, NextResponse } from 'next/server'
import { limitar, ipCliente } from '@/lib/security'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024

const corto = (v: unknown, n = 200) => (typeof v === 'string' ? v.slice(0, n) : '')

export async function POST(req: NextRequest) {
  if (!limitar(`csp:${ipCliente(req)}`, 60, 60_000).ok) return new NextResponse(null, { status: 429 })

  const texto = await req.text()
  if (texto.length > MAX_BYTES) return new NextResponse(null, { status: 413 })

  try {
    const json = JSON.parse(texto)
    // report-uri: { "csp-report": {...} } · Reporting API: [{ type, body: {...} }]
    const items: any[] = Array.isArray(json) ? json.map(j => j?.body) : [json?.['csp-report']]
    for (const r of items.slice(0, 5)) {
      if (!r) continue
      console.warn('[csp-report]', JSON.stringify({
        directiva: corto(r['violated-directive'] || r['effectiveDirective'] || r['effective-directive']),
        bloqueado: corto(r['blocked-uri'] || r['blockedURL']),
        pagina:    corto(r['document-uri'] || r['documentURL']),
        origen:    corto(r['source-file'] || r['sourceFile']),
        linea:     r['line-number'] ?? r['lineNumber'] ?? undefined,
      }))
    }
  } catch { /* cuerpo no JSON: se ignora */ }

  return new NextResponse(null, { status: 204 })
}
