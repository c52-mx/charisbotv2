import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

// Helper compartido para los reportes exportables, la orden de surtido y
// la plantilla de importación de inventario — todos generan un .xlsx.
export async function excelResponse(filename: string, build: (wb: ExcelJS.Workbook) => void): Promise<NextResponse> {
  const wb = new ExcelJS.Workbook()
  build(wb)
  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export function addSheet(wb: ExcelJS.Workbook, name: string, headers: string[], rows: (string | number | null)[][]) {
  const sheet = wb.addWorksheet(name)
  const headerRow = sheet.addRow(headers)
  headerRow.font = { bold: true }
  rows.forEach(r => sheet.addRow(r))
  sheet.columns.forEach(col => { col.width = 20 })
  return sheet
}
