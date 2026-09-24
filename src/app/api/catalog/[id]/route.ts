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
  // Aceptar tanto los nombres nuevos como los viejos (compat transición)
  const serie        = body.serie        ?? body.tipo_case
  const { modelo, color, activo, identificador, ubicacion, stock, precio,
          categoria, nombre, marca, foto_url, atributos } = body

  if (serie !== undefined) {
    const tipoValido = await query(
      `SELECT 1 FROM public.tipos_case WHERE nombre = $1 AND activo = true`,
      [serie.toUpperCase().trim()]
    )
    if (!tipoValido.length) {
      return NextResponse.json({ error: 'Serie/tipo de case inválido o inactivo' }, { status: 400 })
    }
  }

  const sets: string[]  = []
  const vals: any[]     = []
  let   idx = 1

  if (serie        !== undefined) { sets.push(`serie         = $${idx++}`); vals.push(serie.toUpperCase().trim()) }
  if (modelo       !== undefined) { sets.push(`modelo        = $${idx++}`); vals.push(modelo.toUpperCase().trim()) }
  if (color        !== undefined) { sets.push(`color         = $${idx++}`); vals.push(color.toUpperCase().trim()) }
  if (activo       !== undefined) { sets.push(`activo        = $${idx++}`); vals.push(activo) }
  if (identificador !== undefined) { sets.push(`identificador = $${idx++}`); vals.push(identificador?.trim() || null) }
  if (ubicacion    !== undefined) { sets.push(`ubicacion     = $${idx++}`); vals.push(ubicacion?.trim() || null) }
  if (stock        !== undefined) { sets.push(`stock         = $${idx++}`); vals.push(Math.max(0, parseInt(stock) || 0)) }
  if (precio       !== undefined) { sets.push(`precio        = $${idx++}`); vals.push(Math.max(0, parseFloat(precio) || 0)) }
  if (categoria    !== undefined) { sets.push(`categoria     = $${idx++}`); vals.push(categoria) }
  if (nombre       !== undefined) { sets.push(`nombre        = $${idx++}`); vals.push(nombre) }
  if (marca        !== undefined) { sets.push(`marca         = $${idx++}`); vals.push(marca?.trim() || null) }
  if (foto_url     !== undefined) { sets.push(`foto_url      = $${idx++}`); vals.push(foto_url?.trim() || null) }
  if (atributos    !== undefined) { sets.push(`atributos     = $${idx++}`); vals.push(JSON.stringify(atributos)) }

  if (!sets.length) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  // Leer valores actuales antes del update para detectar cambios
  const current = await queryOne<any>(
    `SELECT serie, modelo, color, activo, identificador, ubicacion, stock, precio, categoria, nombre
     FROM public.catalogo_productos WHERE producto_id = $1`,
    [params.id]
  )

  vals.push(params.id)
  const rows = await query(
    `UPDATE public.catalogo_productos SET ${sets.join(', ')} WHERE producto_id = $${idx} RETURNING *`,
    vals
  )

  if (!rows.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Movimiento de stock si cambió
  if (current && stock !== undefined && current.stock !== rows[0].stock) {
    const delta = rows[0].stock - current.stock
    await registrarMovimiento({
      producto_id: params.id, tipo: 'AJUSTE', cantidad: delta, stock_resultante: rows[0].stock,
      motivo: 'Ajuste manual desde catálogo', realizado_por: session.sub,
    })
  }

  // Bitácora de catálogo: un registro por cada campo que cambió
  if (current) {
    const camposAudit = ['serie', 'modelo', 'color', 'activo', 'identificador', 'ubicacion', 'stock', 'precio', 'categoria', 'nombre', 'marca', 'foto_url'] as const
    for (const campo of camposAudit) {
      const bodyVal = campo === 'serie' ? serie : body[campo]
      if (bodyVal === undefined) continue
      const prev = current[campo]
      const next = rows[0][campo]
      if (String(prev ?? '') !== String(next ?? '')) {
        await logCatalogo(params.id, 'EDITAR', { campo, valor_anterior: prev, valor_nuevo: next }, session.sub)
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

  await logCatalogo(params.id, 'ELIMINAR', undefined, session.sub)
  await query(`DELETE FROM public.catalogo_productos WHERE producto_id = $1`, [params.id])
  return NextResponse.json({ ok: true })
}
