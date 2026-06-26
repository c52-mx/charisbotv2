'use client'
import { useState, useEffect } from 'react'
import { SHARED_CSS, getThemeVars } from '@/components/shared'

const GRUPOS: { titulo: string; claves: string[] }[] = [
  { titulo: 'General',   claves: ['dashboard'] },
  { titulo: 'Pedidos',   claves: ['pedidos_ver', 'pedidos_crear', 'pedidos_estado', 'pedidos_solo_confirmados', 'pagos_confirmar'] },
  { titulo: 'Catálogo',  claves: ['catalogo_ver', 'catalogo_editar', 'catalogo_crear'] },
  { titulo: 'Clientes',  claves: ['clientes_ver', 'clientes_crear'] },
  { titulo: 'Administración', claves: ['usuarios', 'roles_editar', 'config_editar', 'reportes_ver', 'landing_editar'] },
]

const PERMISO_LABEL: Record<string,string> = {
  dashboard: 'Ver dashboard',
  pedidos_ver: 'Ver pedidos', pedidos_crear: 'Crear pedidos', pedidos_estado: 'Cambiar estado de pedidos',
  pedidos_solo_confirmados: 'Solo ve pedidos confirmados o posteriores', pagos_confirmar: 'Confirmar pago manual y validar surtido',
  catalogo_ver: 'Ver catálogo', catalogo_editar: 'Editar catálogo', catalogo_crear: 'Crear productos',
  clientes_ver: 'Ver clientes', clientes_crear: 'Crear clientes',
  usuarios: 'Gestionar usuarios', roles_editar: 'Administrar roles y permisos',
  config_editar: 'Editar configuración', reportes_ver: 'Ver reportes', landing_editar: 'Editar landing',
}

interface Rol {
  id: string; clave: string; nombre: string; tipo: string; sistema: boolean
  usuarios: number; permisos: Record<string, boolean>
}

export default function RolesPage() {
  const [dark] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('charis-theme') !== 'light' : true)
  const tv = getThemeVars(dark)
  const [roles, setRoles] = useState<Rol[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Rol | null>(null)
  const [editPermisos, setEditPermisos] = useState<Record<string, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [nuevaClave, setNuevaClave] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/roles')
    const d = await r.json()
    setRoles(d.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openRol(r: Rol) {
    setSelected(r); setEditPermisos({ ...r.permisos }); setErr('')
  }

  async function guardarPermisos() {
    if (!selected) return
    setSaving(true); setErr('')
    try {
      const res = await fetch(`/api/admin/roles/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permisos: editPermisos }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Error')
      await load(); setSelected(null)
    } catch (e: any) { setErr(e.message) }
    finally { setSaving(false) }
  }

  async function eliminarRol(r: Rol) {
    if (!confirm(`¿Eliminar el rol "${r.nombre}"?`)) return
    const res = await fetch(`/api/admin/roles/${r.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { alert(d.error); return }
    await load()
  }

  async function crearRol(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: nuevaClave, nombre: nuevoNombre }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Error')
      setShowCreate(false); setNuevaClave(''); setNuevoNombre(''); await load()
    } catch (e: any) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', background:'var(--bg4)', border:'1px solid var(--border)', borderRadius:8, color:'var(--txt)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }
  const lbl: React.CSSProperties = { display:'block', fontSize:11, fontWeight:600, color:'var(--txt2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }

  return (
    <div style={{ ...Object.fromEntries(Object.entries(tv)) as any }}>
      <style>{SHARED_CSS}</style>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:8, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'var(--txt)', margin:0 }}>Roles y permisos</h1>
          <p style={{ fontSize:13, color:'var(--txt2)', marginTop:3 }}>Quién puede hacer qué dentro del panel</p>
        </div>
        <button className="cbtn cbtn-primary" onClick={() => { setShowCreate(true); setErr('') }}>+ Nuevo rol</button>
      </div>
      <p style={{ fontSize:12, color:'var(--txt3)', marginBottom:16 }}>
        ⏳ Los cambios de permisos aplican la próxima vez que ese usuario inicie sesión.
      </p>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
          <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid rgba(26,143,227,0.2)', borderTopColor:'var(--blue)', animation:'spin .7s linear infinite' }} />
        </div>
      ) : (
        <div className="tw">
          <table className="rtable">
            <thead><tr><th>Nombre</th><th>Clave</th><th>Usuarios</th><th>Acciones</th></tr></thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight:600 }}>
                    {r.nombre} {r.sistema && <span className="badge badge-blue" style={{ marginLeft:6, fontSize:10 }}>Sistema</span>}
                  </td>
                  <td><span style={{ fontFamily:'monospace', fontSize:12, color:'var(--txt2)' }}>{r.clave}</span></td>
                  <td>{r.usuarios}</td>
                  <td style={{ display:'flex', gap:6 }}>
                    <button className="cbtn cbtn-ghost" onClick={() => openRol(r)}>
                      {r.clave === 'ADMIN' ? 'Ver' : 'Editar permisos'}
                    </button>
                    {!r.sistema && (
                      <button className="cbtn cbtn-ghost" disabled={r.usuarios > 0} title={r.usuarios > 0 ? 'Tiene usuarios asignados' : undefined} onClick={() => eliminarRol(r)}>
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor de permisos */}
      {selected && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="modal-box" style={{ maxWidth:560 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'var(--txt)', margin:0 }}>
                Permisos — {selected.nombre}
              </h2>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'var(--txt2)', fontSize:20, cursor:'pointer', lineHeight:1 }}>✕</button>
            </div>

            {selected.clave === 'ADMIN' && (
              <div style={{ padding:'9px 12px', borderRadius:8, background:'rgba(245,158,11,0.1)', color:'#f59e0b', fontSize:12, marginBottom:14 }}>
                Los permisos de ADMIN no son editables — evita quedar sin acceso al panel.
              </div>
            )}
            {err && <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,0.1)', color:'#f87171', fontSize:13, marginBottom:14 }}>{err}</div>}

            <div style={{ display:'flex', flexDirection:'column', gap:14, maxHeight:420, overflowY:'auto' }}>
              {GRUPOS.map(g => (
                <div key={g.titulo}>
                  <div style={{ ...lbl, marginBottom:8 }}>{g.titulo}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {g.claves.map(clave => (
                      <label key={clave} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--txt)', cursor: selected.clave==='ADMIN' ? 'default' : 'pointer' }}>
                        <input type="checkbox" disabled={selected.clave === 'ADMIN'}
                               checked={!!editPermisos[clave]}
                               onChange={e => setEditPermisos(p => ({ ...p, [clave]: e.target.checked }))}
                               style={{ width:16, height:16, accentColor:'var(--blue)', cursor: selected.clave==='ADMIN' ? 'default' : 'pointer' }} />
                        {PERMISO_LABEL[clave] || clave}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
              <button className="cbtn cbtn-secondary" onClick={() => setSelected(null)}>Cerrar</button>
              {selected.clave !== 'ADMIN' && (
                <button className="cbtn cbtn-primary" onClick={guardarPermisos} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Crear rol */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="modal-box">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'var(--txt)', margin:0 }}>Nuevo rol</h2>
              <button onClick={() => setShowCreate(false)} style={{ background:'none', border:'none', color:'var(--txt2)', fontSize:20, cursor:'pointer', lineHeight:1 }}>✕</button>
            </div>
            {err && <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,0.1)', color:'#f87171', fontSize:13, marginBottom:14 }}>{err}</div>}
            <form onSubmit={crearRol}>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label style={lbl}>Nombre *</label>
                  <input style={inp} value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="ej. Supervisor" required />
                </div>
                <div>
                  <label style={lbl}>Clave * <span style={{ fontWeight:400, textTransform:'none' }}>— interna, sin espacios, no se puede cambiar después</span></label>
                  <input style={{ ...inp, fontFamily:'monospace' }} value={nuevaClave} onChange={e => setNuevaClave(e.target.value)} placeholder="ej. SUPERVISOR" required />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
                <button type="button" className="cbtn cbtn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="cbtn cbtn-primary" disabled={saving}>
                  {saving ? 'Creando...' : 'Crear rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
