'use client'
import { useEffect, useState, useCallback, useContext } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { SHARED_CSS, getThemeVars } from '@/components/shared'
import { ThemeContext } from '@/lib/theme-context'

const BADGE: Record<string,string> = {
  CONFIRMADO:'badge-ok',PENDIENTE_CONFIRMACION:'badge-warn',PENDIENTE:'badge-warn',
  EN_PROCESO:'badge-blue',COMPLETADO:'badge-purple',CANCELADO:'badge-red',
}

function avatarColor(str:string) {
  let h=0; for(let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))&0xFFFFFF
  const colors=['#1a8fe3','#818cf8','#4ade80','#fbbf24','#f87171','#a78bfa','#34d399','#60a5fa']
  return colors[Math.abs(h)%colors.length]
}

export default function ClientsPage() {
  const { dark } = useContext(ThemeContext)
  const tv = getThemeVars(dark)
  const [clients,  setClients]  = useState<any[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [q,        setQ]        = useState('')
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [clientOrders, setClientOrders] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page:String(page), limit:'20' })
    if (q) params.set('q', q)
    const r = await fetch(`/api/clients?${params}`)
    const d = await r.json()
    setClients(d.data||[]); setTotal(d.total||0); setLoading(false)
  }, [page, q])

  useEffect(() => { load() }, [load])

  async function loadDetail(client: any) {
    setSelected(client)
    const r = await fetch(`/api/orders?telefono=${encodeURIComponent(client.telefono)}&limit=8`)
    const d = await r.json()
    setClientOrders(d.data||[])
  }

  const pages = Math.ceil(total/20)

  return (
    <div className="page-anim" style={{ ...Object.fromEntries(Object.entries(tv)) as any, color:'var(--txt)', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{SHARED_CSS}</style>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,system-ui,sans-serif',fontSize:26,fontWeight:700,color:'var(--txt)',margin:0 }}>Clientes</h1>
          <p style={{ fontSize:13,color:'var(--txt2)',marginTop:3 }}>{total} clientes registrados</p>
        </div>
        <button className="cbtn cbtn-primary" onClick={()=>setShowForm(true)}>+ Nuevo cliente</button>
      </div>

      {/* Search */}
      <div className="ccard" style={{ padding:'14px 16px',marginBottom:14 }}>
        <input className="cinput" placeholder="Buscar por nombre, teléfono o email..."
               value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} />
      </div>

      {/* Table */}
      <div className="table-wrap" style={{ marginBottom:14 }}>
        {loading ? (
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:48 }}>
            <div style={{ width:24,height:24,borderRadius:'50%',border:'2.5px solid var(--border)',borderTopColor:'var(--blue)',animation:'spin 0.7s linear infinite' }}/>
          </div>
        ) : clients.length===0 ? (
          <div style={{ padding:48,textAlign:'center',color:'var(--txt2)',fontSize:13 }}>Sin clientes registrados</div>
        ) : (
          <table className="ctable rtable">
            <thead><tr><th>Cliente</th><th>Teléfono</th><th>Email</th><th>Pedidos</th><th>Último contacto</th><th>Acciones</th></tr></thead>
            <tbody>
              {clients.map(c => {
                const initial = (c.nombre||c.telefono||'?')[0].toUpperCase()
                const bg = avatarColor(c.telefono||c.id)
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        <div style={{ width:32,height:32,borderRadius:8,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'white',flexShrink:0 }}>
                          {initial}
                        </div>
                        <span style={{ fontWeight:500 }}>{c.nombre||<span style={{color:'var(--txt3)',fontStyle:'italic'}}>Sin nombre</span>}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily:'monospace',fontSize:12 }}>{c.telefono}</td>
                    <td style={{ fontSize:12,color:'var(--txt2)' }}>{c.email||'—'}</td>
                    <td>
                      <span className="badge badge-blue">{c.pedidos_count||0}</span>
                    </td>
                    <td style={{ fontSize:12,color:'var(--txt2)' }}>
                      {c.actualizado_en ? format(new Date(c.actualizado_en),'dd MMM yyyy',{locale:es}) : '—'}
                    </td>
                    <td>
                      <div style={{ display:'flex',gap:6 }}>
                        <button className="cbtn cbtn-secondary cbtn-sm" onClick={()=>loadDetail(c)}>Historial</button>
                        <button className="cbtn cbtn-ghost cbtn-sm" onClick={()=>setEditClient(c)}>Editar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {pages>1 && (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:12,color:'var(--txt2)' }}>
          <span>Página {page} de {pages} · {total} clientes</span>
          <div style={{ display:'flex',gap:8 }}>
            <button className="cbtn cbtn-ghost" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Anterior</button>
            <button className="cbtn cbtn-ghost" onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="modal-mask" onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
          <div className="modal-box" style={{ maxWidth:540 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px 14px',borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:40,height:40,borderRadius:10,background:avatarColor(selected.telefono||selected.id),display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'white' }}>
                  {(selected.nombre||selected.telefono||'?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:'var(--txt)' }}>{selected.nombre||'Sin nombre'}</div>
                  <div style={{ fontSize:11,color:'var(--txt2)',marginTop:2 }}>{selected.telefono}</div>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ width:30,height:30,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--txt2)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
            </div>
            <div style={{ padding:'18px 22px 22px' }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16 }}>
                {[['Email',selected.email||'—'],['Notas',selected.notas||'—']].map(([l,v])=>(
                  <div key={l}>
                    <div style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:13,color:'var(--txt)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8 }}>
                Últimos pedidos ({clientOrders.length})
              </div>
              {clientOrders.length===0 ? (
                <div style={{ padding:'16px',textAlign:'center',color:'var(--txt3)',fontSize:12,borderRadius:10,border:'1px solid var(--border)' }}>Sin pedidos registrados</div>
              ) : (
                <div style={{ borderRadius:10,overflow:'hidden',border:'1px solid var(--border)' }}>
                  {clientOrders.map((o:any,i:number)=>(
                    <div key={o.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',fontSize:12,borderTop:i>0?'1px solid var(--border)':'none' }}>
                      <div>
                        <span style={{ fontFamily:'monospace',fontSize:10,color:'var(--txt3)' }}>#{o.id.slice(0,8).toUpperCase()}</span>
                        <span style={{ marginLeft:8,fontWeight:500 }}>{o.tipo_case}</span>
                      </div>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <span style={{ color:'var(--txt2)' }}>{format(new Date(o.creado_en),'dd MMM',{locale:es})}</span>
                        <span className={`badge ${BADGE[o.estado]||'badge-warn'}`} style={{ fontSize:10 }}>{o.estado.replace(/_CONFIRMACION/,'').replace(/_/g,' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && <ClientForm dark={dark} onClose={()=>setShowForm(false)} onSaved={load} />}
      {editClient && <EditClientForm dark={dark} client={editClient} onClose={()=>setEditClient(null)} onSaved={()=>{ load(); setEditClient(null) }} />}
    </div>
  )
}

// ── CLIENT FORM (crear) ───────────────────────────────────────────────────────
function ClientForm({ dark, onClose, onSaved }: { dark:boolean; onClose:()=>void; onSaved:()=>void }) {
  const tv = getThemeVars(dark)
  const [form, setForm] = useState({ nombre:'', telefono:'', email:'', notas:'' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const r = await fetch('/api/clients', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      if (!r.ok) throw new Error((await r.json()).error)
      onSaved(); onClose()
    } catch(err:any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-mask" style={{ ...Object.fromEntries(Object.entries(tv)) as any }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <style>{SHARED_CSS}</style>
      <div className="modal-box" style={{ maxWidth:400 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px 14px',borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--txt)' }}>Nuevo cliente</div>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--txt2)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ padding:'18px 22px 22px' }}>
          {error && <div style={{ padding:'9px 12px',borderRadius:8,background:'rgba(239,68,68,0.1)',color:'#f87171',border:'1px solid rgba(239,68,68,0.2)',fontSize:13,marginBottom:14 }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {[
                { l:'Nombre', f:'nombre', t:'text', p:'Nombre del cliente', req:false },
                { l:'Teléfono *', f:'telefono', t:'text', p:'521234567890', req:true },
                { l:'Email', f:'email', t:'email', p:'cliente@email.com', req:false },
              ].map(({l,f,t,p,req})=>(
                <div key={f}>
                  <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>{l}</label>
                  <input className="cinput" type={t} placeholder={p} required={req}
                         value={(form as any)[f]} onChange={e=>setForm(fr=>({...fr,[f]:e.target.value}))} />
                </div>
              ))}
              <div>
                <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>Notas</label>
                <textarea className="cinput" placeholder="Notas adicionales..." value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} style={{ minHeight:60 }}/>
              </div>
            </div>
            <div style={{ display:'flex',gap:10,marginTop:20 }}>
              <button type="button" className="cbtn cbtn-secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</button>
              <button type="submit" className="cbtn cbtn-primary" style={{ flex:1 }} disabled={loading}>{loading?'Guardando...':'Crear cliente'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── EDIT CLIENT FORM ──────────────────────────────────────────────────────────
function EditClientForm({ dark, client, onClose, onSaved }: { dark:boolean; client:any; onClose:()=>void; onSaved:()=>void }) {
  const tv = getThemeVars(dark)
  const [form, setForm] = useState({ nombre: client.nombre||'', email: client.email||'', notas: client.notas||'' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const r = await fetch(`/api/clients/${client.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form)
      })
      if (!r.ok) throw new Error((await r.json()).error)
      onSaved()
    } catch(err:any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-mask" style={{ ...Object.fromEntries(Object.entries(tv)) as any }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <style>{SHARED_CSS}</style>
      <div className="modal-box" style={{ maxWidth:400 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px 14px',borderBottom:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--txt)' }}>Editar cliente</div>
            <div style={{ fontSize:11,color:'var(--txt2)',marginTop:2,fontFamily:'monospace' }}>{client.telefono}</div>
          </div>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--txt2)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ padding:'18px 22px 22px' }}>
          {error && <div style={{ padding:'9px 12px',borderRadius:8,background:'rgba(239,68,68,0.1)',color:'#f87171',border:'1px solid rgba(239,68,68,0.2)',fontSize:13,marginBottom:14 }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div>
                <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>Nombre</label>
                <input className="cinput" type="text" placeholder="Nombre del cliente"
                       value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>Email</label>
                <input className="cinput" type="email" placeholder="cliente@email.com"
                       value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>Notas</label>
                <textarea className="cinput" placeholder="Notas adicionales..." value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} style={{ minHeight:60 }}/>
              </div>
            </div>
            <div style={{ display:'flex',gap:10,marginTop:20 }}>
              <button type="button" className="cbtn cbtn-secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</button>
              <button type="submit" className="cbtn cbtn-primary" style={{ flex:1 }} disabled={loading}>{loading?'Guardando...':'Guardar cambios'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
