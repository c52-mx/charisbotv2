'use client'
import { useState, useEffect } from 'react'
import { SHARED_CSS, getThemeVars } from '@/components/shared'

interface TipoCase {
  id: string
  nombre: string
  emoji: string
  orden: number
  activo: boolean
}

const EMPTY = { nombre: '', emoji: '📦', orden: '0' }

export default function TiposCasePage() {
  const [dark]    = useState(() => typeof window !== 'undefined' ? localStorage.getItem('charis-theme') !== 'light' : true)
  const tv        = getThemeVars(dark)
  const [items,   setItems]   = useState<TipoCase[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [msg,     setMsg]     = useState('')

  function load() {
    setLoading(true)
    fetch('/api/admin/tipos-case').then(r => r.json()).then(d => {
      setItems(d.items || []); setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  async function toggleActivo(t: TipoCase) {
    await fetch(`/api/admin/tipos-case/${t.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !t.activo }),
    })
    load()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/tipos-case', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre, emoji: form.emoji, orden: parseInt(form.orden) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear')
      setModal(false); setForm(EMPTY)
      setMsg('✓ Tipo de case creado'); setTimeout(() => setMsg(''), 3000)
      load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const lbl: React.CSSProperties = { display:'block', fontSize:11, fontWeight:600, color:'var(--txt2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', background:'var(--bg4)', border:'1px solid var(--border)', borderRadius:8, color:'var(--txt)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ ...Object.fromEntries(Object.entries(tv)) as any }}>
      <style>{SHARED_CSS}</style>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'var(--txt)', margin:0 }}>Tipos de case</h1>
          <p style={{ fontSize:13, color:'var(--txt2)', marginTop:3 }}>Categorías disponibles para el catálogo (3 en 1, Escudo, Blindaje, Anillo, etc.)</p>
        </div>
        <button className="cbtn cbtn-primary" onClick={() => { setForm(EMPTY); setError(''); setModal(true) }}>+ Nuevo tipo</button>
      </div>

      {msg && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:300, padding:'14px 20px', borderRadius:12, minWidth:220, background:'#16a34a', color:'white', boxShadow:'0 10px 30px rgba(0,0,0,.25)', fontSize:14, fontWeight:600 }}>
          {msg}
        </div>
      )}

      <div className="table-wrap">
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
            <div style={{ width:24, height:24, borderRadius:'50%', border:'2.5px solid var(--border)', borderTopColor:'var(--blue)', animation:'spin 0.7s linear infinite' }} />
          </div>
        ) : (
          <table className="ctable rtable">
            <thead><tr><th>Emoji</th><th>Nombre</th><th>Orden</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {items.map(t => (
                <tr key={t.id}>
                  <td style={{ fontSize:18 }}>{t.emoji}</td>
                  <td style={{ fontWeight:600 }}>{t.nombre}</td>
                  <td>{t.orden}</td>
                  <td><span className={`badge ${t.activo ? 'badge-ok' : 'badge-red'}`}>{t.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <button className="cbtn cbtn-secondary cbtn-sm" onClick={() => toggleActivo(t)}>
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:32, color:'var(--txt2)' }}>Sin tipos registrados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-mask" onClick={e => { if (e.target===e.currentTarget) setModal(false) }}>
          <div className="modal-box" style={{ maxWidth:380 }}>
            <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'var(--txt)' }}>Nuevo tipo de case</div>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ padding:'18px 22px 22px' }}>
                {error && <div style={{ padding:'9px 12px', borderRadius:8, background:'rgba(239,68,68,0.1)', color:'#f87171', fontSize:13, marginBottom:14 }}>{error}</div>}
                <div style={{ marginBottom:12 }}>
                  <label style={lbl}>Nombre *</label>
                  <input className="cinput" style={inp} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej. FUNDA TRANSPARENTE" required />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
                  <div>
                    <label style={lbl}>Emoji</label>
                    <input className="cinput" style={inp} value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} maxLength={4} />
                  </div>
                  <div>
                    <label style={lbl}>Orden</label>
                    <input type="number" className="cinput" style={inp} value={form.orden} onChange={e => setForm(f => ({ ...f, orden: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button type="button" className="cbtn cbtn-secondary" style={{ flex:1 }} onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="cbtn cbtn-primary" style={{ flex:1 }} disabled={saving}>{saving ? 'Creando…' : 'Crear'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
