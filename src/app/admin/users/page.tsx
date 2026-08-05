'use client'
import { useState, useEffect, useContext } from 'react'
import { SHARED_CSS, getThemeVars } from '@/components/shared'
import { ThemeContext } from '@/lib/theme-context'

const ROL_STYLE: Record<string,{badgeClass:string}> = {
  ADMIN:     {badgeClass:'badge-blue'},
  VENDEDOR:  {badgeClass:'badge-ok'},
  ALMACEN:   {badgeClass:'badge-warn'},
  REPARTIDOR:{badgeClass:'badge-purple'},
  CLIENTE:   {badgeClass:'badge-gray'},
}
const ROL_DESC: Record<string,string> = {
  ADMIN:      '🛡️ Acceso total: dashboard, pedidos, catálogo, clientes y usuarios.',
  VENDEDOR:   '🛒 Puede crear pedidos, ver catálogo y clientes. Sin acceso a dashboard ni usuarios.',
  ALMACEN:    '📦 Gestiona catálogo (crear/editar/desactivar) y cambia estado de pedidos confirmados. Sin acceso a clientes.',
  REPARTIDOR: '🛵 Entra a su propio portal en /repartidor — solo ve y entrega los pedidos que se le asignen.',
}
const empty = {nombre:'',email:'',password:'',rol:''}

export default function UsersPage() {
  const { dark }       = useContext(ThemeContext)
  const [users,setUsers]       = useState<any[]>([])
  const [roles,setRoles]       = useState<{clave:string;nombre:string}[]>([])
  const [loading,setLoading]   = useState(true)
  const [modal,setModal]       = useState<'create'|'edit'|null>(null)
  const [form,setForm]         = useState<any>(empty)
  const [saving,setSaving]     = useState(false)
  const [err,setErr]           = useState('')
  const [search,setSearch]     = useState('')
  const tv = getThemeVars(dark)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/users'); const d = await r.json()
    setUsers(d.data||[]); setLoading(false)
  }
  useEffect(()=>{ load() },[])
  useEffect(()=>{
    fetch('/api/admin/roles').then(r=>r.json()).then(d=>{
      // REPARTIDOR se oculta del selector — módulo no activo en esta operación
      const asignables = (d.data||[]).filter((r:any)=>r.tipo==='INTERNO')
      setRoles(asignables)
      setForm((f:any)=> f.rol ? f : {...f, rol: asignables[0]?.clave || ''})
    }).catch(()=>{})
  },[])

  function openCreate() { setForm({...empty, rol: roles[0]?.clave || ''}); setErr(''); setModal('create') }
  function openEdit(u:any) { setForm({...u, password:''}); setErr(''); setModal('edit') }

  async function save() {
    setSaving(true); setErr('')
    try {
      const isEdit = modal==='edit'
      const url  = isEdit ? `/api/users/${form.id}` : '/api/users'
      const method = isEdit ? 'PATCH' : 'POST'
      const body: any = { nombre:form.nombre, rol:form.rol }
      if (!isEdit) { body.email = form.email; body.password = form.password }
      if (isEdit && form.password) body.password = form.password
      if (isEdit) body.activo = form.activo
      const res = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const d = await res.json()
      if (!res.ok) throw new Error(d.error||'Error')
      setModal(null); load()
    } catch(e:any){ setErr(e.message) }
    finally { setSaving(false) }
  }

  async function toggleActivo(u:any) {
    await fetch(`/api/users/${u.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({activo:!u.activo})})
    load()
  }

  const filtered = users.filter(u =>
    u.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const inp: React.CSSProperties = {width:'100%',padding:'9px 12px',background:'var(--bg4)',border:'1px solid var(--border)',borderRadius:8,color:'var(--txt)',fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}
  const lbl: React.CSSProperties = {display:'block',fontSize:11,fontWeight:600,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}

  return (
    <div style={{...Object.fromEntries(Object.entries(tv)) as any}}>
      <style>{SHARED_CSS}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'var(--txt)',margin:0}}>Usuarios</h1>
          <p style={{fontSize:13,color:'var(--txt2)',marginTop:3}}>Gestión de accesos y roles del portal</p>
        </div>
        <button className="cbtn cbtn-primary" onClick={openCreate}>+ Nuevo usuario</button>
      </div>

      {/* Search */}
      <div style={{marginBottom:16}}>
        <input style={{...inp,maxWidth:320}} placeholder="Buscar por nombre o email..."
               value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:60}}>
          <div style={{width:24,height:24,borderRadius:'50%',border:'2px solid rgba(26,143,227,0.2)',borderTopColor:'var(--blue)',animation:'spin .7s linear infinite'}}/>
        </div>
      ) : (
        <div className="tw">
          <table className="rtable">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="no-mob">Último acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'var(--txt2)'}}>Sin usuarios</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td style={{fontWeight:600}}>{u.nombre}</td>
                  <td style={{color:'var(--txt2)',fontSize:12}}>{u.email}</td>
                  <td>
                    {ROL_STYLE[u.rol] ? (
                      <span className={`badge ${ROL_STYLE[u.rol].badgeClass}`}>{u.rol}</span>
                    ) : u.rol}
                  </td>
                  <td>
                    <button onClick={()=>toggleActivo(u)} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>
                      <span className={`badge ${u.activo ? 'badge-ok' : 'badge-red'}`}>
                        {u.activo ? '● Activo' : '● Inactivo'}
                      </span>
                    </button>
                  </td>
                  <td className="no-mob" style={{color:'var(--txt2)',fontSize:12}}>
                    {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td>
                    <button className="cbtn cbtn-ghost" onClick={()=>openEdit(u)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="modal-box">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <h2 style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--txt)',margin:0}}>
                {modal==='create' ? 'Nuevo usuario' : 'Editar usuario'}
              </h2>
              <button onClick={()=>setModal(null)} style={{background:'none',border:'none',color:'var(--txt2)',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>
            </div>

            {err && <div style={{padding:'8px 12px',borderRadius:8,background:'rgba(239,68,68,0.1)',color:'#f87171',border:'1px solid rgba(239,68,68,0.2)',fontSize:13,marginBottom:14}}>{err}</div>}

            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={form.nombre} onChange={e=>setForm((f:any)=>({...f,nombre:e.target.value}))} placeholder="Nombre completo"/>
              </div>
              {modal==='create' && (
                <div>
                  <label style={lbl}>Email *</label>
                  <input style={inp} type="email" value={form.email} onChange={e=>setForm((f:any)=>({...f,email:e.target.value}))} placeholder="usuario@charis.com" required/>
                </div>
              )}
              <div>
                <label style={lbl}>{modal==='edit' ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <input style={inp} type="password" value={form.password} onChange={e=>setForm((f:any)=>({...f,password:e.target.value}))} placeholder="••••••••"/>
              </div>
              <div>
                <label style={lbl}>Rol *</label>
                <select style={{...inp,cursor:'pointer'}} value={form.rol} onChange={e=>setForm((f:any)=>({...f,rol:e.target.value}))}>
                  {roles.map(r => <option key={r.clave} value={r.clave}>{r.nombre}</option>)}
                </select>
              </div>
              {modal==='edit' && (
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <label style={{...lbl,marginBottom:0,cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                    <input type="checkbox" checked={form.activo} onChange={e=>setForm((f:any)=>({...f,activo:e.target.checked}))}
                           style={{width:16,height:16,accentColor:'var(--blue)',cursor:'pointer'}}/>
                    Usuario activo
                  </label>
                </div>
              )}

              {/* Rol description */}
              {ROL_DESC[form.rol] && (
                <div style={{padding:'10px 12px',borderRadius:8,background:'var(--bg4)',border:'1px solid var(--border)',fontSize:12,color:'var(--txt2)'}}>
                  {ROL_DESC[form.rol]}
                </div>
              )}

              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4}}>
                <button className="cbtn cbtn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
                <button className="cbtn cbtn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Guardando...' : modal==='create' ? 'Crear usuario' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
