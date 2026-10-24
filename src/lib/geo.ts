// lat/lng opcionales (punto exacto del mapa). null/'' = sin pin; 'invalid' = fuera de rango o no numérico.
export function parseCoords(lat: unknown, lng: unknown): { lat: number; lng: number } | null | 'invalid' {
  if ((lat == null || lat === '') && (lng == null || lng === '')) return null
  const la = Number(lat), ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return 'invalid'
  return { lat: la, lng: ln }
}
