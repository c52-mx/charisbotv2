// Búsqueda sin distinguir mayúsculas ni acentos. ILIKE solo ignora mayúsculas,
// y además un nombre guardado con la tilde descompuesta (i + ´) no coincidía
// con lo que se teclea ("audífonos" no encontraba "Audífonos").

// Normaliza el término que llega del usuario.
export function normBusqueda(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

// Mismo tratamiento del lado SQL para una columna de texto.
export function sqlNorm(col: string): string {
  return `regexp_replace(translate(lower(${col}), 'áéíóúüñ', 'aeiouun'), '[\u0300-\u036f]', '', 'g')`
}

// Condición `col LIKE $n` normalizada para varias columnas.
export function condBusqueda(cols: string[], paramIdx: number): string {
  return `(${cols.map(c => `${sqlNorm(`COALESCE(${c}::text, '')`)} LIKE $${paramIdx}`).join(' OR ')})`
}
