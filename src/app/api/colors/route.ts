import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Asegurar que la tabla exista
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS public.colores_catalogo (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(50) NOT NULL UNIQUE,
      creado_en TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  // Insertar colores base si tabla está vacía
  const count = await queryOne<{count:string}>('SELECT COUNT(*) as count FROM public.colores_catalogo')
  if (parseInt(count?.count || '0') === 0) {
    await query(`
      INSERT INTO public.colores_catalogo (nombre) VALUES
        ('NEGRO'), ('BLANCO'), ('AZUL'), ('ROJO'), ('VERDE'),
        ('MORADO'), ('ROSA'), ('GRIS'), ('DORADO'), ('PLATEADO'),
        ('NARANJA'), ('CAFE'), ('TRANSPARENTE'), ('N/A')
      ON CONFLICT DO NOTHING
    `)
  }
}

// GET /api/colors
export async function GET(req: NextRequest) {
  await ensureTable()
  const rows = await query('SELECT id, nombre FROM public.colores_catalogo ORDER BY nombre')
  return NextResponse.json({ data: rows })
}

// POST /api/colors - agregar color
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  await ensureTable()
  const { nombre } = await req.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  try {
    const row = await queryOne(
      'INSERT INTO public.colores_catalogo (nombre) VALUES ($1) ON CONFLICT DO NOTHING RETURNING *',
      [nombre.toUpperCase().trim()]
    )
    return NextResponse.json({ ok: true, data: row }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// DELETE /api/colors?nombre=ROJO
export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  const nombre = new URL(req.url).searchParams.get('nombre')
  if (!nombre) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })
  await query('DELETE FROM public.colores_catalogo WHERE nombre = $1', [nombre])
  return NextResponse.json({ ok: true })
}
