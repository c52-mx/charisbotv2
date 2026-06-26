// src/app/api/admin/config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, can } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// ── GET /api/admin/config ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const rows = await query<{ clave: string; valor: string }>(
    `SELECT clave, valor FROM public.config_portal ORDER BY clave`, []
  )
  const config: Record<string, string> = {}
  for (const r of rows) config[r.clave] = r.valor

  return NextResponse.json({
    config,
    // Solo informa si las credenciales existen, nunca expone su valor.
    pagos_env: {
      stripe_configurado:      !!process.env.STRIPE_SECRET_KEY,
      mercadopago_configurado: !!process.env.MP_ACCESS_TOKEN,
    },
  })
}

// ── PATCH /api/admin/config ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'config_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json() as Record<string, string>
  const entries = Object.entries(body)
  if (!entries.length) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  for (const [clave, valor] of entries) {
    await query(
      `INSERT INTO public.config_portal (clave, valor, actualizado_en)
       VALUES ($1, $2, NOW())
       ON CONFLICT (clave) DO UPDATE SET valor = $2, actualizado_en = NOW()`,
      [clave, String(valor ?? '')]
    )
  }

  return NextResponse.json({ ok: true })
}
