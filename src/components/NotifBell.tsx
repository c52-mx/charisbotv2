'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

interface Notif { id: string; tipo: string; titulo: string; mensaje: string | null; pedido_id: string | null; creado_en: string; leida: boolean }

const ICONO: Record<string, string> = {
  NUEVO_PEDIDO: '🛒', COMPROBANTE: '💳', PENDIENTE_CONFIRMACION: '💳', CONFIRMADO: '✅',
  POR_VALIDAR_SURTIDO: '📋', ENTREGA_FALLIDA: '⚠️', CANCELADO: '❌',
}

function hace(fecha: string) {
  const m = Math.round((Date.now() - new Date(fecha).getTime()) / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  if (m < 1440) return `hace ${Math.round(m / 60)} h`
  return `hace ${Math.round(m / 1440)} d`
}

// Campanita de notificaciones internas. Consulta cada 60 s (y al abrir).
export function NotifBell() {
  const [items, setItems] = useState<Notif[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/notificaciones')
      if (!r.ok) return
      const d = await r.json()
      setItems(d.items || []); setNoLeidas(d.no_leidas || 0)
    } catch { /* sin red: se reintenta en el siguiente ciclo */ }
  }, [])

  useEffect(() => {
    cargar()
    const t = setInterval(() => { if (!document.hidden) cargar() }, 60000)
    return () => clearInterval(t)
  }, [cargar])

  useEffect(() => {
    if (!open) return
    const fuera = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [open])

  async function marcar(body: object) {
    await fetch('/api/notificaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    cargar()
  }

  function abrir(n: Notif) {
    if (!n.leida) marcar({ ids: [n.id] })
    if (n.pedido_id) window.location.href = `/admin/orders?pedido=${n.pedido_id}`
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(o => !o); if (!open) cargar() }} aria-label="Notificaciones"
              style={{ position: 'relative', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 10,
                       width: 38, height: 38, cursor: 'pointer', fontSize: 17, color: 'var(--txt)' }}>
        🔔
        {noLeidas > 0 && (
          <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9,
                         background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: '18px' }}>
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 46, width: 340, maxWidth: 'calc(100vw - 24px)', maxHeight: 420, overflowY: 'auto',
                      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,.35)', zIndex: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <b style={{ fontSize: 13 }}>Notificaciones</b>
            {noLeidas > 0 && <button onClick={() => marcar({ todas: true })} style={{ background: 'none', border: 'none', color: 'var(--blue3)', fontSize: 11, cursor: 'pointer' }}>Marcar todas como leídas</button>}
          </div>
          {items.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--txt2)' }}>Sin notificaciones</div>}
          {items.map(n => (
            <div key={n.id} onClick={() => abrir(n)}
                 style={{ display: 'flex', gap: 10, padding: '10px 14px', cursor: n.pedido_id ? 'pointer' : 'default',
                          borderTop: '1px solid var(--border)', background: n.leida ? 'transparent' : 'rgba(26,143,227,0.08)' }}>
              <span style={{ fontSize: 16 }}>{ICONO[n.tipo] || '🔔'}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: n.leida ? 500 : 700, color: 'var(--txt)' }}>{n.titulo}</div>
                {n.mensaje && <div style={{ fontSize: 11, color: 'var(--txt2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.mensaje}</div>}
                <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>{hace(n.creado_en)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
