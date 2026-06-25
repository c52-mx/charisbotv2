'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { AddressForm, type AddressFormValues } from '@/components/AddressForm'

interface Address extends AddressFormValues { id: string; predeterminada: boolean }

const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  .input-field {
    width:100%; padding:10px 14px; background:var(--field-bg);
    border:1.5px solid var(--field-border); border-radius:9px;
    color:var(--txt); font-size:14px; font-family:inherit;
    outline:none; transition:all .18s; box-sizing:border-box;
  }
  .input-field:focus { border-color:var(--blue); background:white; box-shadow:0 0 0 3px rgba(21,101,192,0.1); }
  .input-field:disabled { opacity:.6; cursor:not-allowed; }
  .input-field::placeholder { color:var(--txt3); }
  .section-card { background:white; border-radius:14px; border:1px solid var(--border); padding:20px; margin-bottom:16px; }
  .section-title { fontFamily:Arial Black,sans-serif; font-weight:900; font-size:15px; color:var(--txt); margin-bottom:16px; display:flex; align-items:center; gap:8px; }
  .field-label { font-size:11px; font-weight:700; color:var(--txt2); letter-spacing:.06em; margin-bottom:5px; display:block; }
`

export default function AccountPage() {
  const router = useRouter()
  const [user,    setUser]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [tab,     setTab]     = useState<'perfil'|'direcciones'|'seguridad'>('perfil')

  const [form, setForm] = useState({ nombre:'', empresa:'', telefono:'', email:'' })
  const [pwForm, setPwForm] = useState({ actual:'', nueva:'', confirmar:'' })
  const [showPw, setShowPw] = useState({ actual:false, nueva:false, confirmar:false })

  const [addresses, setAddresses] = useState<Address[]>([])
  const [addrLoading, setAddrLoading] = useState(true)
  const [addrModal, setAddrModal] = useState<'create'|string|null>(null)
  const [addrSaving, setAddrSaving] = useState(false)

  function loadAddresses() {
    setAddrLoading(true)
    fetch('/api/client/addresses').then(r => r.json()).then(d => { setAddresses(d.items || []); setAddrLoading(false) })
  }
  useEffect(() => { loadAddresses() }, [])

  async function saveAddress(values: AddressFormValues) {
    setAddrSaving(true)
    try {
      const isEdit = addrModal && addrModal !== 'create'
      const res = await fetch(isEdit ? `/api/client/addresses/${addrModal}` : '/api/client/addresses', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setAddrModal(null)
      loadAddresses()
    } catch (e: any) { setMsg('⚠ ' + e.message) }
    finally { setAddrSaving(false) }
  }

  async function deleteAddress(id: string) {
    if (!confirm('¿Eliminar esta dirección?')) return
    await fetch(`/api/client/addresses/${id}`, { method: 'DELETE' })
    loadAddresses()
  }

  async function setDefaultAddress(id: string) {
    await fetch(`/api/client/addresses/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ predeterminada: true }),
    })
    loadAddresses()
  }

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) { router.push('/login'); return }
      setUser(d.user)
      setForm({
        nombre:   d.user.nombre   || '',
        empresa:  d.user.empresa  || '',
        telefono: d.user.telefono || '',
        email:    d.user.email    || '',
      })
      setLoading(false)
    })
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function savePerfil(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/client/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre, empresa: form.empresa, telefono: form.telefono }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg('✓ Cambios guardados correctamente')
      setTimeout(() => setMsg(''), 3000)
    } catch (e: any) { setMsg('⚠ ' + e.message) }
    finally { setSaving(false) }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.nueva !== pwForm.confirmar) { setMsg('⚠ Las contraseñas no coinciden'); return }
    if (pwForm.nueva.length < 8) { setMsg('⚠ La contraseña debe tener al menos 8 caracteres'); return }
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/client/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual: pwForm.actual, nueva: pwForm.nueva }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg('✓ Contraseña actualizada')
      setPwForm({ actual:'', nueva:'', confirmar:'' })
      setTimeout(() => setMsg(''), 3000)
    } catch (e: any) { setMsg('⚠ ' + e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:28,height:28,borderRadius:'50%',border:'3px solid var(--border)',borderTopColor:'var(--blue)',animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const initials = user?.nombre?.split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase() || '?'

  return (
    <>
      <style>{CSS}</style>

      <div style={{ marginBottom:24, animation:'fadeUp .3s ease-out' }}>
        <h1 style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:'clamp(18px,4vw,24px)', color:'var(--txt)', marginBottom:4 }}>
          👤 Mi cuenta
        </h1>
      </div>

      {/* Avatar + info */}
      <div className="section-card" style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16, animation:'fadeUp .3s ease-out .05s both' }}>
        <div style={{ width:60, height:60, borderRadius:'50%', background:'linear-gradient(135deg,var(--blue),var(--blue2))', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:22, flexShrink:0 }}>
          {initials}
        </div>
        <div>
          <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:17, color:'var(--txt)', marginBottom:2 }}>{user?.nombre}</p>
          <p style={{ fontSize:13, color:'var(--txt3)' }}>{user?.email}</p>
          {user?.empresa && <p style={{ fontSize:12, color:'var(--blue2)', marginTop:2 }}>🏢 {user.empresa}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, background:'var(--bg)', padding:4, borderRadius:10, width:'fit-content' }}>
        {(['perfil','direcciones','seguridad'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setMsg('') }}
            style={{ padding:'7px 18px', borderRadius:8, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', background:tab===t?'white':'transparent', color:tab===t?'var(--blue)':'var(--txt2)', boxShadow:tab===t?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all .15s', textTransform:'capitalize' }}>
            {t === 'perfil' ? '📋 Perfil' : t === 'direcciones' ? '📍 Direcciones' : '🔐 Seguridad'}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:10, background: msg.startsWith('✓')?'var(--ok-bg)':'var(--err-bg)', color: msg.startsWith('✓')?'#15803d':'var(--err-text)', border:`1px solid ${msg.startsWith('✓')?'#bbf7d0':'var(--err-border)'}`, fontSize:13, marginBottom:16 }}>
          {msg}
        </div>
      )}

      {tab === 'perfil' && (
        <form onSubmit={savePerfil} className="section-card" style={{ animation:'fadeUp .3s ease-out' }}>
          <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:15, color:'var(--txt)', marginBottom:16 }}>
            📋 Datos del perfil
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label className="field-label">NOMBRE COMPLETO</label>
                <input className="input-field" value={form.nombre} onChange={set('nombre')} required/>
              </div>
              <div>
                <label className="field-label">EMPRESA</label>
                <input className="input-field" placeholder="Nombre del negocio" value={form.empresa} onChange={set('empresa')}/>
              </div>
            </div>
            <div>
              <label className="field-label" style={{ display:'inline-flex', alignItems:'center', gap:6 }}><WhatsAppIcon size={13} color="var(--wa)"/> TELÉFONO WHATSAPP</label>
              <input className="input-field" value={form.telefono} onChange={set('telefono')}/>
            </div>
            <div>
              <label className="field-label">CORREO ELECTRÓNICO</label>
              <input className="input-field" value={form.email} disabled style={{ opacity:.6, cursor:'not-allowed' }}/>
              <p style={{ fontSize:11, color:'var(--txt3)', marginTop:3 }}>El correo no se puede cambiar desde aquí.</p>
            </div>
          </div>
          <div style={{ marginTop:18 }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><div style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',animation:'spin .7s linear infinite' }}/> Guardando...</> : '💾 Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      {tab === 'direcciones' && (
        <div className="section-card" style={{ animation:'fadeUp .3s ease-out' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:15, color:'var(--txt)' }}>
              📍 Mis direcciones
            </p>
            {addrModal === null && (
              <button type="button" className="btn-sm" onClick={() => setAddrModal('create')}>+ Nueva dirección</button>
            )}
          </div>

          {addrModal !== null && (
            <div style={{ background:'var(--field-bg)', borderRadius:10, padding:16, marginBottom:16 }}>
              <AddressForm
                initial={addrModal === 'create' ? undefined : addresses.find(a => a.id === addrModal)}
                saving={addrSaving}
                onSave={saveAddress}
                onCancel={() => setAddrModal(null)}
              />
            </div>
          )}

          {addrLoading ? (
            <p style={{ fontSize:13, color:'var(--txt3)' }}>Cargando…</p>
          ) : addresses.length === 0 && addrModal === null ? (
            <p style={{ fontSize:13, color:'var(--txt3)' }}>Aún no tienes direcciones guardadas.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {addresses.map(a => (
                <div key={a.id} style={{ padding:'12px 14px', background:'var(--field-bg)', borderRadius:10, border: a.predeterminada ? '1.5px solid var(--blue)' : '1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, color:'var(--txt)' }}>
                        {a.nombre_contacto} {a.predeterminada && <span style={{ fontSize:11, color:'var(--blue)', fontWeight:700 }}>· Predeterminada</span>}
                      </p>
                      <p style={{ fontSize:12, color:'var(--txt2)', marginTop:2 }}>{a.telefono_contacto}</p>
                      <p style={{ fontSize:12, color:'var(--txt2)', marginTop:2 }}>{a.calle}, {a.colonia}, {a.ciudad}, {a.estado_mx} {a.cp}</p>
                      {a.instrucciones_entrega && <p style={{ fontSize:11, color:'var(--txt3)', marginTop:2 }}>ℹ️ {a.instrucciones_entrega}</p>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:10 }}>
                    <button type="button" className="btn-sm-ghost" onClick={() => setAddrModal(a.id)}>Editar</button>
                    {!a.predeterminada && (
                      <button type="button" className="btn-sm-ghost" onClick={() => setDefaultAddress(a.id)}>Hacer predeterminada</button>
                    )}
                    <button type="button" onClick={() => deleteAddress(a.id)}
                      style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--txt3)', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit' }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'seguridad' && (
        <form onSubmit={savePassword} className="section-card" style={{ animation:'fadeUp .3s ease-out' }}>
          <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:15, color:'var(--txt)', marginBottom:16 }}>
            🔐 Cambiar contraseña
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {(['actual','nueva','confirmar'] as const).map(k => (
              <div key={k}>
                <label className="field-label">
                  {k==='actual'?'CONTRASEÑA ACTUAL':k==='nueva'?'NUEVA CONTRASEÑA':'CONFIRMAR NUEVA CONTRASEÑA'}
                </label>
                <div style={{ position:'relative' }}>
                  <input className="input-field"
                    type={showPw[k] ? 'text' : 'password'}
                    placeholder={k==='actual'?'Tu contraseña actual':'••••••••'}
                    value={pwForm[k]}
                    onChange={e => setPwForm(f => ({...f,[k]:e.target.value}))}
                    required style={{ paddingRight:42 }}
                  />
                  <button type="button" onClick={() => setShowPw(s => ({...s,[k]:!s[k]}))}
                    style={{ position:'absolute',right:11,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:15,color:'var(--txt3)' }}>
                    {showPw[k]?'🙈':'👁️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:18 }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : '🔐 Actualizar contraseña'}
            </button>
          </div>
        </form>
      )}
    </>
  )
}
