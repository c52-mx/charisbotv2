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
    addSheet(wb, 'Inventario',
      ['categoria', 'serie', 'nombre', 'marca', 'modelo', 'color', 'stock', 'precio', 'identificador', 'ubicacion'],
      [
        // Funda clásica — serie+modelo+color obligatorios
        ['FUNDA',     '3 EN 1',  'Funda 3 en 1 iPhone 15', 'Genérica', 'IPHONE 15',    'NEGRO',  50, 89.00, 'SKU-001', 'A1-03'],
        // Accesorio sin modelo — nombre obligatorio
        ['ACCESORIO', '',        'Cable USB-C 2m negro',    'Anker',    '',             'NEGRO',  20, 59.00, 'SKU-100', 'B2-01'],
        ['CARGADOR',  '',        'Cargador 65W GaN blanco', 'Baseus',   '',             'BLANCO', 15, 149.00,'SKU-200', 'B3-02'],
      ]
    )
  })
}
