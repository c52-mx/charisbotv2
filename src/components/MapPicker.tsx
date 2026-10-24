'use client'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'

// Selector de punto exacto con OpenStreetMap (Leaflet + Nominatim). Sin API key.
// - "Buscar en el mapa" ubica la dirección escrita en el formulario.
// - El pin se puede arrastrar, o tocar el mapa para moverlo.
const CENTRO_DEFAULT: [number, number] = [19.4326, -99.1332] // CDMX

export function MapPicker({ lat, lng, direccion, onChange }: {
  lat: number | null
  lng: number | null
  direccion: string
  onChange: (lat: number | null, lng: number | null) => void
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const LRef = useRef<any>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState('')

  function colocar(la: number, ln: number, centrar = true) {
    const L = LRef.current, map = mapRef.current
    if (!L || !map) return
    if (markerRef.current) markerRef.current.setLatLng([la, ln])
    else {
      const icon = L.divIcon({ className: '', html: '<div style="font-size:30px;line-height:30px;transform:translate(-15px,-30px)">📍</div>', iconSize: [0, 0] })
      markerRef.current = L.marker([la, ln], { draggable: true, icon }).addTo(map)
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng()
        onChangeRef.current(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)))
      })
    }
    if (centrar) map.setView([la, ln], Math.max(map.getZoom(), 17))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !divRef.current || mapRef.current) return
      LRef.current = L
      const map = L.map(divRef.current).setView(lat != null && lng != null ? [lat, lng] : CENTRO_DEFAULT, lat != null ? 17 : 11)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      }).addTo(map)
      map.on('click', (e: any) => {
        const la = Number(e.latlng.lat.toFixed(6)), ln = Number(e.latlng.lng.toFixed(6))
        colocar(la, ln, false); onChangeRef.current(la, ln)
      })
      mapRef.current = map
      if (lat != null && lng != null) colocar(lat, lng, false)
      setTimeout(() => map.invalidateSize(), 100)
    })()
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function buscar() {
    if (!direccion.trim()) { setAviso('Escribe primero la dirección en los campos de arriba.'); return }
    setBuscando(true); setAviso('')
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=mx&q=${encodeURIComponent(direccion)}`, { headers: { 'Accept-Language': 'es' } })
      const d = await r.json()
      if (!Array.isArray(d) || !d.length) { setAviso('No encontramos esa dirección; mueve el pin a mano en el mapa.'); return }
      const la = Number(Number(d[0].lat).toFixed(6)), ln = Number(Number(d[0].lon).toFixed(6))
      colocar(la, ln); onChange(la, ln)
      setAviso('Ubicamos la dirección. Ajusta el pin si no es el punto exacto.')
    } catch {
      setAviso('No se pudo consultar el mapa; mueve el pin a mano.')
    } finally { setBuscando(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
        <button type="button" className="btn-ghost" onClick={buscar} disabled={buscando}>
          {buscando ? 'Buscando…' : '🔎 Buscar esta dirección en el mapa'}
        </button>
        {lat != null && lng != null && (
          <button type="button" className="btn-ghost" onClick={() => {
            markerRef.current?.remove(); markerRef.current = null; onChange(null, null); setAviso('')
          }}>Quitar pin</button>
        )}
      </div>
      <div ref={divRef} style={{ height: 240, borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', zIndex: 0 }} />
      <p style={{ fontSize: 11, color: 'var(--txt3)', margin: '6px 0 0' }}>
        {aviso || (lat != null ? `Punto marcado: ${lat}, ${lng}` : 'Opcional: toca el mapa o arrastra el pin para marcar el punto exacto de entrega.')}
      </p>
    </div>
  )
}
