// src/app/api/admin/series/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, can } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: listar todas las series con su config
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'catalogo_ver')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  const rows = await query(`
    SELECT sc.*, COUNT(DISTINCT c.modelo) as total_modelos
    FROM public.series_config sc
    LEFT JOIN public.catalogo_cases c ON c.tipo_case = sc.tipo_case AND c.activo = true
    GROUP BY sc.tipo_case, sc.descripcion, sc.foto_url, sc.orden, sc.activo
    ORDER BY sc.orden, sc.tipo_case
  `, [])
  return NextResponse.json({ items: rows })
}

// PATCH: actualizar imagen o descripción de una serie
export async function PATCH(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { tipo_case, foto_url, descripcion } = await req.json()
  if (!tipo_case) return NextResponse.json({ error: 'tipo_case requerido' }, { status: 400 })

  const sets: string[]  = []
  const vals: any[]     = []
  let   idx = 1

  if (foto_url   !== undefined) { sets.push(`foto_url    = $${idx++}`); vals.push(foto_url   || null) }
  if (descripcion !== undefined){ sets.push(`descripcion = $${idx++}`); vals.push(descripcion || null) }

  if (!sets.length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  vals.push(tipo_case)
  await query(
    `INSERT INTO public.series_config (tipo_case, ${sets.map((_,i) => ['foto_url','descripcion'][i]).join(',')})
     VALUES ($${idx}, ${vals.slice(0,-1).map((_,i)=>`$${i+1}`).join(',')})
     ON CONFLICT (tipo_case) DO UPDATE SET ${sets.join(', ')}`,
    vals
  )
  return NextResponse.json({ ok: true })
}
