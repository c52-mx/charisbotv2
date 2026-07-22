// src/app/api/catalog/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession, can } from '@/lib/auth'
import { registrarMovimiento } from '@/lib/stock'
import { logCatalogo } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// ── PATCH /api/catalog/[id] ───────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  const { tipo_case, modelo, color, activo, identificador, ubicacion, stock, precio } = body

  if (tipo_case !== undefined) {
    const tipoValido = await query(
      `SELECT 1 FROM public.tipos_case WHERE nombre = $1 AND activo = true`,
      [tipo_case.toUpperCase().trim()]
    )
    if (!tipoValido.length) {
      return NextResponse.json({ error: 'Tipo de case inválido o inactivo' }, { status: 400 })
    }
  }

  const sets: string[]  = []
  const vals: any[]     = []
  let   idx = 1

  if (tipo_case   !== undefined) { sets.push(`tipo_case     = $${idx++}`); vals.push(tipo_case.toUpperCase().trim()) }
  if (modelo      !== undefined) { sets.push(`modelo        = $${idx++}`); vals.push(modelo.toUpperCase().trim()) }
  if (color       !== undefined) { sets.push(`color         = $${idx++}`); vals.push(color.toUpperCase().trim()) }
  if (activo      !== undefined) { sets.push(`activo        = $${idx++}`); vals.push(activo) }
  if (identificador !== undefined) { sets.push(`identificador = $${idx++}`); vals.push(identificador?.trim() || null) }
  if (ubicacion   !== undefined) { sets.push(`ubicacion     = $${idx++}`); vals.push(ubicacion?.trim() || null) }
  if (stock       !== undefined) { sets.push(`stock         = $${idx++}`); vals.push(Math.max(0, parseInt(stock) || 0)) }
  if (precio      !== undefined) { sets.push(`precio        = $${idx++}`); vals.push(Math.max(0, parseFloat(precio) || 0)) }

  if (!sets.length) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  // Leer valores actuales antes del update para detectar cambios
  const current = await queryOne<any>(
    `SELECT tipo_case, modelo, color, activo, identificador, ubicacion, stock, precio
     FROM public.catalogo_cases WHERE case_id = $1`,
    [params.id]
  )

  vals.push(params.id)
  const rows = await query(
    `UPDATE public.catalogo_cases SET ${sets.join(', ')} WHERE case_id = $${idx} RETURNING *`,
    vals
  )

  if (!rows.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Movimiento de stock si cambió
  if (current && stock !== undefined && current.stock !== rows[0].stock) {
    const delta = rows[0].stock - current.stock
    await registrarMovimiento({
      case_id: params.id, tipo: 'AJUSTE', cantidad: delta, stock_resultante: rows[0].stock,
      motivo: 'Ajuste manual desde catálogo', realizado_por: session.sub,
    })
  }

  // Bitácora de catálogo: un registro por cada campo que cambió
  if (current) {
    const camposAudit = ['tipo_case', 'modelo', 'color', 'activo', 'identificador', 'ubicacion', 'stock', 'precio'] as const
    for (const campo of camposAudit) {
      if (body[campo] === undefined) continue
      const prev = current[campo]
      const next = rows[0][campo]
      if (String(prev ?? '') !== String(next ?? '')) {
        await logCatalogo({ case_id: params.id, accion: 'EDITAR', campo, valor_anterior: prev, valor_nuevo: next, realizado_por: session.sub })
      }
    }
  }

  return NextResponse.json(rows[0])
}

// ── DELETE /api/catalog/[id] ──────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || !can(session, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  await logCatalogo({ case_id: params.id, accion: 'ELIMINAR', realizado_por: session.sub })
  await query(`DELETE FROM public.catalogo_cases WHERE case_id = $1`, [params.id])
  return NextResponse.json({ ok: true })
}
