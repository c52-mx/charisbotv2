// Endpoint temporal para aplicar migración 011 en producción.
// ELIMINAR este archivo después de aplicar la migración.
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo Admin' }, { status: 403 })
  }

  const results: string[] = []
  try {
    await query(`ALTER TABLE public.usuarios ALTER COLUMN email DROP NOT NULL`, [])
    results.push('✓ email DROP NOT NULL')
  } catch(e: any) { results.push('~ email ya era nullable: ' + e.message.slice(0,60)) }

  try {
    await query(`ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key`, [])
    results.push('✓ drop old unique constraint')
  } catch(e: any) { results.push('~ ' + e.message.slice(0,60)) }

  try {
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_notnull_unique
        ON public.usuarios(email)
        WHERE email IS NOT NULL AND email <> ''
    `, [])
    results.push('✓ partial unique index')
  } catch(e: any) { results.push('~ ' + e.message.slice(0,60)) }

  try {
    await query(`ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS notas_cliente TEXT`, [])
    results.push('✓ notas_cliente column')
  } catch(e: any) { results.push('~ ' + e.message.slice(0,60)) }

  return NextResponse.json({ ok: true, results })
}
