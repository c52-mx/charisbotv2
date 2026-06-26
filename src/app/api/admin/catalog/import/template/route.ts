import { NextRequest, NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth'
import { excelResponse, addSheet } from '@/lib/excel'

export const dynamic = 'force-dynamic'

// GET /api/admin/catalog/import/template — plantilla vacía para que el
// cliente llene su inventario real sin adivinar el formato esperado.
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !can(session, 'catalogo_editar')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  return excelResponse('plantilla-inventario.xlsx', wb => {
    addSheet(wb, 'Inventario', ['tipo_case', 'modelo', 'color', 'stock', 'identificador', 'ubicacion'], [
      ['3 EN 1', 'IPHONE 15', 'NEGRO', 50, 'SKU-001', 'A1-03'],
    ])
  })
}
