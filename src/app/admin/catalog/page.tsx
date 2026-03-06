'use client'
import { useEffect, useState, useCallback, useContext } from 'react'
import { Combo, NumInput, ColorsManager, SHARED_CSS, getThemeVars } from '@/components/shared'
import { ThemeContext } from '@/lib/theme-context'

const TIPOS = ['3 EN 1','BLINDAJE','ESCUDO','ANILLO','MIXTO']
const TIPO_COLOR: Record<string,{bg:string,color:string}> = {
  '3 EN 1':   {bg:'rgba(26,143,227,0.1)',   color:'#4baef0'},
  'BLINDAJE':  {bg:'rgba(129,140,248,0.1)',  color:'#a5b4fc'},
  'ESCUDO':    {bg:'rgba(34,197,94,0.1)',    color:'#4ade80'},
  'ANILLO':    {bg:'rgba(245,158,11,0.1)',   color:'#fbbf24'},
  'MIXTO':     {bg:'rgba(156,163,175,0.1)', color:'#9ca3af'},
}

export default function CatalogPage() {
  const { dark } = useContext(ThemeContext)
  const tv = getThemeVars(dark)
  const [items,    setItems]    = useState<any[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<any>(null)
  const [showColors, setShowColors] = useState(false)
  const [filters,  setFilters]  = useState({ tipo:'', modelo:'', activo:'true' })

  const load = useCallback(async () => {
    setLoading(true)
    const q = new URLSearchParams({ page: String(page), limit:'30' })
    if (filters.tipo)              q.set('tipo',   filters.tipo)
    if (filters.modelo)            q.set('modelo', filters.modelo)
    if (filters.activo !== 'all')  q.set('activo', filters.activo)
    const r = await fetch(`/api/catalog?${q}`)
    const d = await r.json()
    setItems(d.data||[]); setTotal(d.total||0); setLoading(false)
  }, [page, filters])

  useEffect(() => { load() }, [load])

  async function toggleActivo(id:string, activo:boolean) {
    await fetch(`/api/catalog/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ activo:!activo }) })
    load()
  }

  const countByTipo = TIPOS.reduce((acc,t) => ({ ...acc, [t]: items.filter(i=>i.tipo_case===t).length }), {} as Record<string,number>)
  const pages = Math.ceil(total/30)

  return (
    <div className="page-anim" style={{ ...Object.fromEntries(Object.entries(tv)) as any, color:'var(--txt)', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{SHARED_CSS}</style>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,system-ui,sans-serif',fontSize:26,fontWeight:700,color:'var(--txt)',margin:0 }}>Catálogo</h1>
          <p style={{ fontSize:13,color:'var(--txt2)',marginTop:3 }}>{total} productos registrados</p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button className="cbtn cbtn-secondary" onClick={() => setShowColors(true)} style={{ fontSize:12 }}>🎨 Colores</button>
          <button className="cbtn cbtn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ Agregar producto</button>
        </div>
      </div>

      {/* Filters */}
      <div className="ccard" style={{ padding:'14px 16px',marginBottom:12,display:'flex',flexWrap:'wrap',gap:10 }}>
        <input className="cinput" style={{ flex:1,minWidth:160 }} placeholder="Buscar modelo..."
               value={filters.modelo} onChange={e => setFilters(f=>({...f,modelo:e.target.value}))} />
        <select className="cinput" style={{ width:160 }} value={filters.tipo} onChange={e=>setFilters(f=>({...f,tipo:e.target.value}))}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t=><option key={t}>{t}</option>)}
        </select>
        <select className="cinput" style={{ width:130 }} value={filters.activo} onChange={e=>setFilters(f=>({...f,activo:e.target.value}))}>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      {/* Type chips */}
      <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:12 }}>
        {TIPOS.filter(t=>countByTipo[t]>0).map(t => {
          const c = TIPO_COLOR[t]||{bg:'var(--bg4)',color:'var(--txt2)'}
          const active = filters.tipo===t
          return (
            <button key={t} onClick={()=>setFilters(f=>({...f,tipo:f.tipo===t?'':t}))}
                    style={{ padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',
                      background:active?c.color:c.bg, color:active?'#070c14':c.color, border:`1px solid ${c.color}40` }}>
              {t} ({countByTipo[t]})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="table-wrap" style={{ marginBottom:14 }}>
        {loading ? (
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:48 }}>
            <div style={{ width:24,height:24,borderRadius:'50%',border:'2.5px solid var(--border)',borderTopColor:'var(--blue)',animation:'spin 0.7s linear infinite' }}/>
          </div>
        ) : items.length===0 ? (
          <div style={{ padding:48,textAlign:'center',color:'var(--txt2)',fontSize:13 }}>Sin productos que coincidan</div>
        ) : (
          <table className="ctable">
            <thead><tr><th>Tipo</th><th>Modelo</th><th>Color</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {items.map(item=>{
                const tc = TIPO_COLOR[item.tipo_case]||{bg:'var(--bg4)',color:'var(--txt2)'}
                return (
                  <tr key={item.case_id}>
                    <td><span style={{ fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:600,background:tc.bg,color:tc.color }}>{item.tipo_case}</span></td>
                    <td style={{ fontWeight:500 }}>{item.modelo}</td>
                    <td style={{ fontSize:12,color:'var(--txt2)' }}>{item.color}</td>
                    <td style={{ fontFamily:'monospace',fontWeight:600,color:'var(--blue3)' }}>${Number(item.precio).toFixed(2)}</td>
                    <td><span style={{ fontWeight:600,color:item.stock<10?'#f87171':'var(--txt)' }}>{item.stock}</span></td>
                    <td>
                      <button onClick={()=>toggleActivo(item.case_id,item.activo)}
                              className={`badge ${item.activo?'badge-ok':'badge-red'}`}
                              style={{ cursor:'pointer',border:'none',fontFamily:'inherit' }}>
                        {item.activo?'● Activo':'● Inactivo'}
                      </button>
                    </td>
                    <td>
                      <button className="cbtn cbtn-secondary cbtn-sm" onClick={()=>{setEditing(item);setShowForm(true)}}>Editar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages>1 && (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:12,color:'var(--txt2)' }}>
          <span>Página {page} de {pages} · {total} productos</span>
          <div style={{ display:'flex',gap:8 }}>
            <button className="cbtn cbtn-ghost" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Ant</button>
            <button className="cbtn cbtn-ghost" onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}>Sig →</button>
          </div>
        </div>
      )}

      {showForm    && <CatalogForm dark={dark} item={editing} onClose={()=>{setShowForm(false);setEditing(null)}} onSaved={load} />}
      {showColors  && <ColorsManager onClose={()=>{setShowColors(false)}} />}
    </div>
  )
}

// ── CATALOG FORM ──────────────────────────────────────────────────────────────
function CatalogForm({ dark, item, onClose, onSaved }: { dark:boolean; item?:any; onClose:()=>void; onSaved:()=>void }) {
  const tv = getThemeVars(dark)
  const [colorOpts, setColorOpts] = useState<{value:string}[]>([])
  const [form, setForm] = useState({
    tipo_case: item?.tipo_case || '3 EN 1',
    modelo:    item?.modelo    || '',
    color:     item?.color     || 'NEGRO',
    precio:    item?.precio    || 0,
    stock:     item?.stock     || 0,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('/api/colors').then(r=>r.json()).then(d=>{
      const list = (d.data||[]).map((c:any)=>({value:c.nombre}))
      setColorOpts([{value:'N/A'},...list])
    })
  },[])

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const url    = item ? `/api/catalog/${item.case_id}` : '/api/catalog'
      const method = item ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      if (!r.ok) throw new Error((await r.json()).error)
      onSaved(); onClose()
    } catch(err:any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" style={{ ...Object.fromEntries(Object.entries(tv)) as any }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <style>{SHARED_CSS}</style>
      <div className="modal-box" style={{ maxWidth:440 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px 14px',borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--txt)' }}>{item?'Editar producto':'Nuevo producto'}</div>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--txt2)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ padding:'18px 22px 22px' }}>
          {error && <div style={{ padding:'9px 12px',borderRadius:8,background:'rgba(239,68,68,0.1)',color:'#f87171',border:'1px solid rgba(239,68,68,0.2)',fontSize:13,marginBottom:14 }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {/* Tipo */}
              <div>
                <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>Tipo de case</label>
                <select className="cinput" value={form.tipo_case}
                        onChange={e=>setForm(f=>({...f,tipo_case:e.target.value}))}
                        disabled={!!item}>
                  {TIPOS.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              {/* Modelo */}
              <div>
                <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>Modelo</label>
                <input className="cinput" placeholder="SAMSUNG A04E 4G" value={form.modelo}
                       onChange={e=>setForm(f=>({...f,modelo:e.target.value.toUpperCase()}))}
                       disabled={!!item} required />
              </div>
              {/* Color — combo, editable incluso en modo edición */}
              <div>
                <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>Color</label>
                <Combo
                  value={form.color}
                  onChange={v=>setForm(f=>({...f,color:v}))}
                  options={colorOpts}
                  placeholder="Seleccionar color..."
                  allowNew
                />
              </div>
              {/* Precio + Stock */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                <div>
                  <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>Precio ($)</label>
                  <NumInput value={form.precio} onChange={v=>setForm(f=>({...f,precio:v}))} min={0} />
                </div>
                <div>
                  <label style={{ fontSize:10,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:5 }}>Stock</label>
                  <NumInput value={form.stock} onChange={v=>setForm(f=>({...f,stock:Math.round(v)}))} min={0} />
                </div>
              </div>
            </div>
            <div style={{ display:'flex',gap:10,marginTop:20 }}>
              <button type="button" className="cbtn cbtn-secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</button>
              <button type="submit" className="cbtn cbtn-primary" style={{ flex:1 }} disabled={loading}>
                {loading ? 'Guardando...' : item ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
