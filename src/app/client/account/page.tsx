'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  .input-field {
    width:100%; padding:10px 14px; background:#f5f8fc;
    border:1.5px solid #d0dde8; border-radius:9px;
    color:#0d2137; font-size:14px; font-family:inherit;
    outline:none; transition:all .18s; box-sizing:border-box;
  }
  .input-field:focus { border-color:#1565c0; background:white; box-shadow:0 0 0 3px rgba(21,101,192,0.1); }
  .input-field:disabled { opacity:.6; cursor:not-allowed; }
  .input-field::placeholder { color:#8aaac4; }
  .save-btn {
    padding:11px 24px; background:#1565c0; color:white; border:none;
    border-radius:9px; font-size:14px; font-weight:700; font-family:inherit;
    cursor:pointer; transition:all .18s; display:flex; align-items:center; gap:7px;
  }
  .save-btn:hover:not(:disabled) { background:#1976d2; transform:translateY(-1px); }
  .save-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
  .section-card { background:white; border-radius:14px; border:1px solid #e2eaf4; padding:20px; margin-bottom:16px; }
  .section-title { fontFamily:Arial Black,sans-serif; font-weight:900; font-size:15px; color:#0d2137; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
  .field-label { font-size:11px; font-weight:700; color:#3a6080; letter-spacing:.06em; margin-bottom:5px; display:block; }
`

export default function AccountPage() {
  const router = useRouter()
  const [user,    setUser]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [tab,     setTab]     = useState<'perfil'|'seguridad'>('perfil')

  const [form, setForm] = useState({ nombre:'', empresa:'', telefono:'', email:'' })
  const [pwForm, setPwForm] = useState({ actual:'', nueva:'', confirmar:'' })
  const [showPw, setShowPw] = useState({ actual:false, nueva:false, confirmar:false })

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
      <div style={{ width:28,height:28,borderRadius:'50%',border:'3px solid #e2eaf4',borderTopColor:'#1565c0',animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const initials = user?.nombre?.split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase() || '?'

  return (
    <>
      <style>{CSS}</style>

      <div style={{ marginBottom:24, animation:'fadeUp .3s ease-out' }}>
        <h1 style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:'clamp(18px,4vw,24px)', color:'#0d2137', marginBottom:4 }}>
          👤 Mi cuenta
        </h1>
      </div>

      {/* Avatar + info */}
      <div className="section-card" style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16, animation:'fadeUp .3s ease-out .05s both' }}>
        <div style={{ width:60, height:60, borderRadius:'50%', background:'linear-gradient(135deg,#1565c0,#4baef0)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:22, flexShrink:0 }}>
          {initials}
        </div>
        <div>
          <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:17, color:'#0d2137', marginBottom:2 }}>{user?.nombre}</p>
          <p style={{ fontSize:13, color:'#8aaac4' }}>{user?.email}</p>
          {user?.empresa && <p style={{ fontSize:12, color:'#4baef0', marginTop:2 }}>🏢 {user.empresa}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, background:'#f0f4f8', padding:4, borderRadius:10, width:'fit-content' }}>
        {(['perfil','seguridad'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setMsg('') }}
            style={{ padding:'7px 18px', borderRadius:8, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', background:tab===t?'white':'transparent', color:tab===t?'#1565c0':'#3a6080', boxShadow:tab===t?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all .15s', textTransform:'capitalize' }}>
            {t === 'perfil' ? '📋 Perfil' : '🔐 Seguridad'}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:10, background: msg.startsWith('✓')?'#f0fdf4':'#fef2f2', color: msg.startsWith('✓')?'#15803d':'#dc2626', border:`1px solid ${msg.startsWith('✓')?'#bbf7d0':'#fecaca'}`, fontSize:13, marginBottom:16 }}>
          {msg}
        </div>
      )}

      {tab === 'perfil' && (
        <form onSubmit={savePerfil} className="section-card" style={{ animation:'fadeUp .3s ease-out' }}>
          <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:15, color:'#0d2137', marginBottom:16 }}>
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
              <label className="field-label">TELÉFONO WHATSAPP</label>
              <input className="input-field" value={form.telefono} onChange={set('telefono')}/>
            </div>
            <div>
              <label className="field-label">CORREO ELECTRÓNICO</label>
              <input className="input-field" value={form.email} disabled style={{ opacity:.6, cursor:'not-allowed' }}/>
              <p style={{ fontSize:11, color:'#8aaac4', marginTop:3 }}>El correo no se puede cambiar desde aquí.</p>
            </div>
          </div>
          <div style={{ marginTop:18 }}>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? <><div style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',animation:'spin .7s linear infinite' }}/> Guardando...</> : '💾 Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      {tab === 'seguridad' && (
        <form onSubmit={savePassword} className="section-card" style={{ animation:'fadeUp .3s ease-out' }}>
          <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:15, color:'#0d2137', marginBottom:16 }}>
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
                    style={{ position:'absolute',right:11,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:15,color:'#8aaac4' }}>
                    {showPw[k]?'🙈':'👁️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:18 }}>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Guardando...' : '🔐 Actualizar contraseña'}
            </button>
          </div>
        </form>
      )}
    </>
  )
}
