'use client'
import { useState, useEffect, useRef, useContext } from 'react'
import { SHARED_CSS, getThemeVars } from '@/components/shared'
import { ThemeContext } from '@/lib/theme-context'

interface Promo {
  id: string
  imagen_url: string
  titulo: string | null
  subtitulo: string | null
  cta_label: string | null
  cta_href: string | null
  orden: number
  activo: boolean
}

const EMPTY = { imagen_url: '', titulo: '', subtitulo: '', cta_label: '', cta_href: '', orden: '0' }

export default function LandingPage() {
  const { dark }  = useContext(ThemeContext)
  const tv        = getThemeVars(dark)
  const [items,   setItems]   = useState<Promo[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<'create'|'edit'|null>(null)
  const [editId,  setEditId]  = useState<string|null>(null)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error,   setError]   = useState('')
  const [msg,     setMsg]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    setLoading(true)
    fetch('/api/admin/landing-promos').then(r => r.json()).then(d => {
      setItems(d.items || []); setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  function openCreate() { setForm(EMPTY); setEditId(null); setError(''); setModal('create') }
  function openEdit(p: Promo) {
    setForm({
      imagen_url: p.imagen_url, titulo: p.titulo||'', subtitulo: p.subtitulo||'',
      cta_label: p.cta_label||'', cta_href: p.cta_href||'', orden: String(p.orden),
    })
    setEditId(p.id); setError(''); setModal('edit')
  }

  async function handleFile(file: File) {
    setUploading(true); setError('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/admin/landing-promos/upload', { method:'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir la imagen')
      setForm(f => ({ ...f, imagen_url: data.url }))
    } catch (e: any) { setError(e.message) }
    finally { setUploading(false) }
  }

  async function toggleActivo(p: Promo) {
    await fetch(`/api/admin/landing-promos/${p.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ activo: !p.activo }),
    })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta promo?')) return
    await fetch(`/api/admin/landing-promos/${id}`, { method:'DELETE' })
    load()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const body = { ...form, orden: parseInt(form.orden) || 0 }
      const url = modal === 'edit' ? `/api/admin/landing-promos/${editId}` : '/api/admin/landing-promos'
      const method = modal === 'edit' ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      setModal(null)
      setMsg('✓ Promo guardada'); setTimeout(() => setMsg(''), 3000)
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
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'var(--txt)', margin:0 }}>Landing</h1>
          <p style={{ fontSize:13, color:'var(--txt2)', marginTop:3 }}>Promociones e imágenes del carrusel principal del sitio</p>
        </div>
        <button className="cbtn cbtn-primary" onClick={openCreate}>+ Nueva promo</button>
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
            <thead><tr><th>Imagen</th><th>Título</th><th>Orden</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id}>
                  <td><img src={p.imagen_url} alt="" style={{ width:60, height:36, objectFit:'cover', borderRadius:6 }} /></td>
                  <td>{p.titulo || <span style={{ color:'var(--txt3)' }}>—</span>}</td>
                  <td>{p.orden}</td>
                  <td><span className={`badge ${p.activo ? 'badge-ok' : 'badge-red'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="cbtn cbtn-secondary cbtn-sm" onClick={() => openEdit(p)}>Editar</button>
                      <button className="cbtn cbtn-secondary cbtn-sm" onClick={() => toggleActivo(p)}>{p.activo?'Desactivar':'Activar'}</button>
                      <button className="cbtn cbtn-secondary cbtn-sm" onClick={() => handleDelete(p.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:32, color:'var(--txt2)' }}>Sin promos registradas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-mask" onClick={e => { if (e.target===e.currentTarget) setModal(null) }}>
          <div className="modal-box" style={{ maxWidth:460 }}>
            <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'var(--txt)' }}>
                {modal === 'edit' ? 'Editar promo' : 'Nueva promo'}
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ padding:'18px 22px 22px' }}>
                {error && <div style={{ padding:'9px 12px', borderRadius:8, background:'rgba(239,68,68,0.1)', color:'#f87171', fontSize:13, marginBottom:14 }}>{error}</div>}

                <div style={{ marginBottom:12 }}>
                  <label style={lbl}>Imagen *</label>
                  {form.imagen_url && <img src={form.imagen_url} alt="" style={{ width:'100%', maxHeight:120, objectFit:'cover', borderRadius:8, marginBottom:8 }} />}
                  <input ref={fileRef} type="file" accept="image/*" style={inp}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                  {uploading && <p style={{ fontSize:11, color:'var(--txt3)', marginTop:4 }}>Subiendo…</p>}
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={lbl}>Título</label>
                  <input className="cinput" style={inp} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={lbl}>Subtítulo</label>
                  <input className="cinput" style={inp} value={form.subtitulo} onChange={e => setForm(f => ({ ...f, subtitulo: e.target.value }))} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  <div>
                    <label style={lbl}>Texto del botón</label>
                    <input className="cinput" style={inp} value={form.cta_label} onChange={e => setForm(f => ({ ...f, cta_label: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Link del botón</label>
                    <input className="cinput" style={inp} value={form.cta_href} onChange={e => setForm(f => ({ ...f, cta_href: e.target.value }))} placeholder="/client/catalog" />
                  </div>
                </div>
                <div style={{ marginBottom:18 }}>
                  <label style={lbl}>Orden</label>
                  <input type="number" className="cinput" style={inp} value={form.orden} onChange={e => setForm(f => ({ ...f, orden: e.target.value }))} />
                </div>

                <div style={{ display:'flex', gap:10 }}>
                  <button type="button" className="cbtn cbtn-secondary" style={{ flex:1 }} onClick={() => setModal(null)}>Cancelar</button>
                  <button type="submit" className="cbtn cbtn-primary" style={{ flex:1 }} disabled={saving || !form.imagen_url || uploading}>
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
