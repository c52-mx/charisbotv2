// src/app/api/client/config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const rows = await query(`SELECT clave, valor FROM public.config_portal`, [])
    const config = Object.fromEntries(rows.map((r: any) => [r.clave, r.valor]))
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({})
  }
}
