'use client'
import { useEffect, useState, useCallback, useContext } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Combo, NumInput, ImageUploader, SHARED_CSS, getThemeVars } from '@/components/shared'
import { ThemeContext } from '@/lib/theme-context'
import { can, type UserRol } from '@/lib/auth-shared'

const ESTADOS = ['PENDIENTE','PENDIENTE_CONFIRMACION','CONFIRMADO','EN_PROCESO','COMPLETADO','CANCELADO']
const BADGE: Record<string,string> = {
  CONFIRMADO:'badge-ok',PENDIENTE_CONFIRMACION:'badge-warn',PENDIENTE:'badge-warn',
  EN_PROCESO:'badge-blue',COMPLETADO:'badge-purple',CANCELADO:'badge-red',
}

export default function OrdersPage() {
  const { dark } = useContext(ThemeContext)
  const [userRol, setUserRol] = useState<UserRol>('VENDEDOR')
  useEffect(()=>{ fetch('/api/auth/me').then(r=>r.json()).then(d=>setUserRol(d.user?.rol||'VENDEDOR')) },[])
  const tv = getThemeVars(dark)
  const [orders,   setOrders]   = useState<any[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [filters,  setFilters]  = useState({ estado:'', origen:'', telefono:'' })

  const load = useCallback(async () => {
    setLoading(true)
    const q = new URLSearchParams({ page: String(page), limit:'20' })
    if (filters.estado)   q.set('estado',   filters.estado)
    if (filters.origen)   q.set('origen',   filters.origen)
    if (filters.telefono) q.set('telefono', filters.telefono)
    const r = await fetch(`/api/orders?${q}`)
    const d = await r.json()
    setOrders(d.data || []); setTotal(d.total || 0); setLoading(false)
  }, [page, filters])

  useEffect(() => { load() }, [load])

  async function loadDetail(id: string) {
    const r = await fetch(`/api/orders/${id}`)
    setSelected(await r.json())
  }
  async function updateStatus(id: string, estado: string) {
    setUpdating(true)
    await fetch(`/api/orders/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ estado }) })
    await load()
    if (selected?.id === id) await loadDetail(id)
    setUpdating(false)
  }

  const pages = Math.ceil(total / 20)

  return (
    <div className="page-anim" style={{ ...Object.fromEntries(Object.entries(tv)) as any, color: tv['--txt'], fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{SHARED_CSS}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,system-ui,sans-serif', fontSize:26, fontWeight:700, color:'var(--txt)', margin:0 }}>Pedidos</h1>
          <p style={{ fontSize:13, color:'var(--txt2)', marginTop:3 }}>{total} pedidos en total</p>
        </div>
        {can(userRol,'pedidos_crear') && <button className="cbtn cbtn-primary" onClick={() => setShowCreate(true)}>+ Nuevo pedido</button>}
      </div>

      {/* Filters */}
      <div className="ccard" style={{ padding:'14px 16px', marginBottom:14, display:'flex', flexWrap:'wrap', gap:10 }}>
        <input className="cinput" style={{ flex:1, minWidth:180 }} placeholder="Buscar teléfono..."
               value={filters.telefono} onChange={e => setFilters(f => ({ ...f, telefono: e.target.value }))} />
        <select className="cinput" style={{ width:200 }} value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e.replace(/_/g,' ')}</option>)}
        </select>
        <select className="cinput" style={{ width:160 }} value={filters.origen} onChange={e => setFilters(f => ({ ...f, origen: e.target.value }))}>
          <option value="">Todos los orígenes</option>
          <option value="WHATSAPP">📱 WhatsApp</option>
          <option value="PORTAL">🌐 Portal</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap" style={{ marginBottom:14 }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
            <div style={{ width:24, height:24, borderRadius:'50%', border:'2.5px solid var(--border)', borderTopColor:'var(--blue)', animation:'spin 0.7s linear infinite' }} />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--txt2)', fontSize:13 }}>Sin pedidos que coincidan</div>
        ) : (
          <table className="ctable rtable">
            <thead><tr>
              <th>ID</th><th>Cliente / Teléfono</th><th>Tipo</th>
              <th>Piezas</th><th className="no-mob">Origen</th><th>Estado</th><th className="no-mob">Fecha</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td><span style={{ fontFamily:'monospace', fontSize:11, color:'var(--txt2)' }}>#{o.id.slice(0,8).toUpperCase()}</span></td>
                  <td>
                    {o.cliente_nombre && <div style={{ fontWeight:500 }}>{o.cliente_nombre}</div>}
                    <div style={{ fontSize:11, color:'var(--txt2)', marginTop: o.cliente_nombre ? 2 : 0 }}>{o.telefono}</div>
                  </td>
                  <td><span style={{ fontSize:11, background:'rgba(26,143,227,0.1)', color:'var(--blue3)', padding:'2px 8px', borderRadius:4, fontWeight:500 }}>{o.tipo_case}</span></td>
                  <td style={{ fontWeight:600 }}>{o.total_piezas || 0}</td>
                  <td>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, fontWeight:500,
                      background: o.origen==='PORTAL' ? 'rgba(26,143,227,0.1)' : 'rgba(129,140,248,0.1)',
                      color: o.origen==='PORTAL' ? 'var(--blue3)' : '#a5b4fc' }}>
                      {o.origen==='PORTAL'?'🌐':'📱'} {o.origen}
                    </span>
                  </td>
                  <td><span className={`badge ${BADGE[o.estado]||'badge-warn'}`}>{o.estado.replace(/_CONFIRMACION/,'').replace(/_/g,' ')}</span></td>
                  <td className="no-mob" style={{ fontSize:12, color:'var(--txt2)' }}>{format(new Date(o.creado_en),'dd MMM HH:mm',{locale:es})}</td>
                  <td>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <button className="cbtn cbtn-secondary cbtn-sm" onClick={() => loadDetail(o.id)}>Ver</button>
                      <select className="cinput" style={{ width:'auto', fontSize:11, padding:'4px 6px', borderRadius:6 }}
                              value={o.estado} onChange={e => updateStatus(o.id, e.target.value)} disabled={updating}>
                        {ESTADOS.map(e => <option key={e} value={e}>{e.replace(/_/g,' ')}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12, color:'var(--txt2)' }}>
          <span>Página {page} de {pages} · {total} resultados</span>
          <div style={{ display:'flex', gap:8 }}>
            <button className="cbtn cbtn-ghost" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← Anterior</button>
            <button className="cbtn cbtn-ghost" onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page===pages}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setSelected(null) }}>
          <div className="modal-box" style={{ maxWidth:600 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px 14px', borderBottom:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'var(--txt)' }}>Pedido #{selected.id.slice(0,8).toUpperCase()}</div>
                <div style={{ fontSize:11, color:'var(--txt2)', marginTop:3 }}>{format(new Date(selected.creado_en),"dd 'de' MMMM yyyy · HH:mm",{locale:es})}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ width:30,height:30,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--txt2)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
            </div>
            <div style={{ padding:'18px 22px 22px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                {[['Teléfono',selected.telefono],['Estado',selected.estado.replace(/_/g,' ')],['Origen',selected.origen],['Tipo',selected.tipo_case]].map(([l,v])=>(
                  <div key={l}>
                    <div style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:13,color:'var(--txt)' }}>{v}</div>
                  </div>
                ))}
              </div>
              {selected.resumen && <div style={{ marginBottom:14,padding:'9px 12px',borderRadius:8,background:'var(--bg4)',fontSize:12,color:'var(--txt2)' }}>{selected.resumen}</div>}
              {selected.notas && (
                <div style={{ marginBottom:14, padding:'9px 12px', borderRadius:8, background:'var(--bg4)', fontSize:12, color:'var(--txt2)', borderLeft:`3px solid var(--blue)` }}>
                  📝 {selected.notas}
                </div>
              )}
              {/* Evidencias — siempre visibles, permite agregar */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8 }}>
                  📎 Evidencias {selected.evidencias?.length ? `(${selected.evidencias.length})` : ''}
                </div>
                <ImageUploader
                  pedidoId={selected.id}
                  initialUrls={selected.evidencias || []}
                  onUploaded={urls => setSelected((s:any) => ({ ...s, evidencias: urls }))}
                />
              </div>
              <div style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8 }}>Items ({selected.items?.length||0})</div>
              <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid var(--border)', marginBottom:16 }}>
                {(selected.items||[]).map((it:any,i:number)=>(
                  <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',fontSize:12,borderTop:i>0?'1px solid var(--border)':'none' }}>
                    <div><span style={{ fontWeight:600 }}>{it.modelo}</span><span style={{ marginLeft:8,color:'var(--txt2)' }}>{it.tipo_case}</span></div>
                    <div style={{ textAlign:'right' }}><span style={{ fontWeight:600 }}>{it.cantidad} pzas</span><span style={{ marginLeft:8,color:'var(--txt2)' }}>{it.color}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8 }}>Cambiar estado</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {ESTADOS.map(e => (
                  <button key={e} onClick={() => updateStatus(selected.id, e)} disabled={updating || selected.estado===e}
                          style={{ fontSize:11,padding:'5px 12px',borderRadius:6,cursor:selected.estado===e?'default':'pointer',fontFamily:'inherit',fontWeight:500,transition:'all 0.15s',
                            background:selected.estado===e?'var(--blue)':'var(--bg4)',color:selected.estado===e?'white':'var(--txt2)',
                            border:`1px solid ${selected.estado===e?'var(--blue)':'var(--border)'}`,opacity:updating?0.5:1 }}>
                    {e.replace(/_/g,' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && <CreateModal dark={dark} onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  )
}

// ── CREATE MODAL ─────────────────────────────────────────────────────────────
function CreateModal({ dark, onClose, onCreated }: { dark:boolean; onClose:()=>void; onCreated:()=>void }) {
  const tv = getThemeVars(dark)
  const [telefono, setTelefono] = useState('')
  const [clienteOpts, setClienteOpts] = useState<{value:string,label:string}[]>([])
  // catalogFull: ALL rows (tipo+modelo+color) for filtering colors
  const [catalogFull, setCatalogFull] = useState<{tipo:string,modelo:string,color:string}[]>([])
  const [catalogOpts, setCatalogOpts] = useState<{value:string,label:string,tipo:string}[]>([])
  // items start with empty color so user must pick one
  const [items,    setItems]   = useState([{ tipo_case:'3 EN 1', modelo:'', color:'', cantidad:1 }])
  const [notas,    setNotas]   = useState('')
  const [pedidoId, setPedidoId]= useState<string|null>(null)
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')

  useEffect(() => {
    fetch('/api/clients?limit=200').then(r=>r.json()).then(d=>{
      setClienteOpts((d.data||[]).map((c:any)=>({ value: c.telefono, label: `${c.nombre||'Sin nombre'} — ${c.telefono}` })))
    })
    // Load ALL catalog rows (including color) for dynamic filtering
    fetch('/api/catalog?limit=2000&activo=true').then(r=>r.json()).then(d=>{
      setCatalogFull((d.data||[]).map((c:any)=>({ tipo:c.tipo_case, modelo:c.modelo, color:c.color })))
      // Model options: unique per tipo
      const uniq = new Map<string,{value:string,label:string,tipo:string}>()
      for (const c of (d.data||[])) {
        const key = `${c.tipo_case}__${c.modelo}`
        if (!uniq.has(key)) uniq.set(key, { value:c.modelo, label:`${c.modelo}`, tipo:c.tipo_case })
      }
      setCatalogOpts(Array.from(uniq.values()))
    })
  }, [])

  // Get colors available for a specific tipo+modelo combination
  function colorsForItem(tipo:string, modelo:string): {value:string}[] {
    if (!modelo) {
      // No model selected yet — show all colors for this tipo
      const cols = [...new Set(catalogFull.filter(r=>!tipo||r.tipo===tipo).map(r=>r.color))].sort()
      return cols.map(c=>({value:c}))
    }
    const cols = [...new Set(
      catalogFull.filter(r=>r.tipo===tipo && r.modelo===modelo).map(r=>r.color)
    )].sort()
    // If no exact match (custom model), return empty so user can type freely
    return cols.map(c=>({value:c}))
  }

  function updateItem(i:number, f:string, v:any) {
    setItems(p => p.map((it,idx) => {
      if (idx!==i) return it
      const updated = { ...it, [f]: v }
      // When tipo changes → reset modelo and color
      if (f==='tipo_case') { updated.modelo = ''; updated.color = '' }
      // When modelo changes → auto-set tipo if found, reset color
      if (f==='modelo') {
        const match = catalogOpts.find(o=>o.value===v && o.tipo===it.tipo_case)
             || catalogOpts.find(o=>o.value===v)
        if (match) updated.tipo_case = match.tipo
        updated.color = '' // reset color when model changes
      }
      return updated
    }))
  }

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const r = await fetch('/api/orders', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ telefono, items, notas }) })
      if (!r.ok) throw new Error((await r.json()).error)
      const d = await r.json()
      setPedidoId(d.id || null)
      onCreated()
      if (!d.id) onClose()
    } catch(err:any) { setError(err.message); setLoading(false) }
  }

  // If we have pedidoId, show evidence upload step
  if (pedidoId) return (
    <div className="modal-overlay" style={{ ...Object.fromEntries(Object.entries(tv)) as any }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <style>{SHARED_CSS}</style>
      <div className="modal-box" style={{ maxWidth:440 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px 14px',borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--txt)' }}>📎 Evidencias del pedido</div>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--txt2)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ padding:'18px 22px 22px' }}>
          <p style={{ fontSize:13,color:'var(--txt2)',marginBottom:14 }}>Pedido creado ✅. Puedes adjuntar hasta 3 imágenes de evidencia (capturas, fotos del pedido).</p>
          <ImageUploader pedidoId={pedidoId} />
          <div style={{ marginTop:20 }}>
            <button className="cbtn cbtn-primary" style={{ width:'100%' }} onClick={onClose}>Listo</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" style={{ ...Object.fromEntries(Object.entries(tv)) as any }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <style>{SHARED_CSS + `
        .item-row-grid { display:grid; grid-template-columns:120px 1fr 100px 70px 28px; gap:8px; align-items:center; }
        @media(max-width:500px){
          .item-row-grid {
            grid-template-columns: 1fr 1fr !important;
            padding:10px;
            background:var(--bg3);
            border-radius:8px;
            border:1px solid var(--border);
            row-gap:8px;
          }
          .item-row-grid > *:nth-child(1){ grid-column:1 / -1; }
          .item-row-grid > *:nth-child(2){ grid-column:1; }
          .item-row-grid > *:nth-child(3){ grid-column:2; }
          .item-row-grid > *:nth-child(4){ grid-column:1; }
          .item-row-grid > *:nth-child(5){ grid-column:2; justify-self:end; }
          .item-hdr-row { display:none !important; }
        }
      `}</style>
      <div className="modal-box" style={{ maxWidth:680 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px 14px',borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--txt)' }}>Nuevo Pedido</div>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--txt2)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ padding:'18px 22px 22px' }}>
          {error && <div style={{ padding:'9px 12px',borderRadius:8,background:'rgba(239,68,68,0.1)',color:'#f87171',border:'1px solid rgba(239,68,68,0.2)',fontSize:13,marginBottom:14 }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            {/* Cliente / teléfono */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>Cliente / Teléfono *</label>
              <Combo
                value={telefono}
                onChange={setTelefono}
                options={clienteOpts}
                placeholder="Buscar cliente o escribir número..."
                allowNew
              />
            </div>

            {/* Items */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em' }}>Items del pedido</label>
                <button type="button" className="cbtn cbtn-ghost" onClick={() => setItems(p=>[...p,{tipo_case:'3 EN 1',modelo:'',color:'NEGRO',cantidad:1}])}>+ Fila</button>
              </div>
              {/* Header — hidden on mobile */}
              <div className="item-hdr-row" style={{ display:'grid',gridTemplateColumns:'120px 1fr 100px 70px 28px',gap:8,marginBottom:5 }}>
                {['Tipo','Modelo','Color','Cant.',''].map(h=><div key={h} style={{ fontSize:10,fontWeight:700,color:'var(--txt3)',textTransform:'uppercase' }}>{h}</div>)}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
                {items.map((item,i)=>(
                  <div key={i} className="item-row-grid" style={{ display:'grid', gridTemplateColumns:'120px 1fr 100px 70px 28px', gap:8, alignItems:'center' }}>
                    <select className="cinput" style={{ fontSize:12 }} value={item.tipo_case}
                            onChange={e=>updateItem(i,'tipo_case',e.target.value)}>
                      {['3 EN 1','BLINDAJE','ESCUDO','ANILLO'].map(t=><option key={t}>{t}</option>)}
                    </select>
                    <Combo
                      value={item.modelo}
                      onChange={v=>updateItem(i,'modelo',v)}
                      options={catalogOpts.filter(o=>!item.tipo_case||o.tipo===item.tipo_case)}
                      placeholder="Modelo..."
                      allowNew
                    />
                    <Combo
                      value={item.color}
                      onChange={v=>updateItem(i,'color',v)}
                      options={colorsForItem(item.tipo_case, item.modelo)}
                      placeholder="Color..."
                      allowNew
                    />
                    <NumInput value={item.cantidad} onChange={v=>updateItem(i,'cantidad',v)} min={1} />
                    <button type="button" onClick={()=>setItems(p=>p.filter((_,idx)=>idx!==i))} disabled={items.length===1}
                            style={{ background:'transparent',border:'none',color:'#f87171',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',opacity:items.length===1?0.3:1 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>Notas (opcional)</label>
              <textarea className="cinput" placeholder="Comentarios, referencias del cliente, aclaraciones..." value={notas} onChange={e=>setNotas(e.target.value)} style={{ minHeight:64 }} />
            </div>

            <div style={{ display:'flex',gap:10 }}>
              <button type="button" className="cbtn cbtn-secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</button>
              <button type="submit" className="cbtn cbtn-primary" style={{ flex:1 }} disabled={loading}>
                {loading ? 'Creando...' : '✓ Crear pedido'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
