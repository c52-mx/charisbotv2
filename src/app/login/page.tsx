'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Isotipo Charis (igual que landing) ────────────────────────────────
function CharisIsotipo({ size = 40 }: { size?: number }) {
  const s = size
  return (
    <svg width={s} height={s * 1.1} viewBox="0 0 80 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(18, 0)">
        <rect x="2" y="2" width="46" height="62" rx="10" stroke="#4baef0" strokeWidth="3.5" fill="none"/>
        <rect x="17" y="5" width="12" height="3.5" rx="1.75" fill="#4baef0" opacity="0.7"/>
        <rect x="-1" y="18" width="3" height="8" rx="1.5" fill="#4baef0" opacity="0.6"/>
        <rect x="-1" y="28" width="3" height="8" rx="1.5" fill="#4baef0" opacity="0.6"/>
        <rect x="49" y="22" width="3" height="12" rx="1.5" fill="#4baef0" opacity="0.6"/>
      </g>
      <g transform="translate(0, 14)">
        <rect x="2" y="2" width="46" height="62" rx="10" stroke="#1565c0" strokeWidth="3.5" fill="none"/>
        <rect x="17" y="5" width="12" height="3.5" rx="1.75" fill="#1565c0" opacity="0.7"/>
        <rect x="-1" y="18" width="3" height="8" rx="1.5" fill="#1565c0" opacity="0.7"/>
        <rect x="-1" y="28" width="3" height="8" rx="1.5" fill="#1565c0" opacity="0.7"/>
        <rect x="49" y="22" width="3" height="12" rx="1.5" fill="#1565c0" opacity="0.7"/>
        <text x="25" y="42" fontFamily="Arial Black, sans-serif" fontSize="22" fontWeight="900" fill="#1565c0" textAnchor="middle" dominantBaseline="middle" letterSpacing="-1">CH</text>
      </g>
    </svg>
  )
}

function CharisLogotipo({ height = 36 }: { height?: number }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <CharisIsotipo size={height * 0.85} />
      <div style={{ lineHeight:1.1 }}>
        <div style={{ fontFamily:'Arial Black, system-ui, sans-serif', fontWeight:900, fontSize:height * 0.55, color:'white', letterSpacing:'0.04em' }}>CHARIS</div>
        <div style={{ fontSize:height * 0.22, color:'rgba(255,255,255,0.65)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase' as const }}>Distribuidor Mayorista</div>
      </div>
    </div>
  )
}

// ── Forgot password modal ─────────────────────────────────────────────
function ForgotModal({ onClose }: { onClose: () => void }) {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Simular envío — en producción conectar al API real
    await new Promise(r => setTimeout(r, 1200))
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:400, boxShadow:'0 24px 60px rgba(0,0,0,0.25)' }}>
        {!sent ? (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <h2 style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:19, color:'var(--txt)', marginBottom:4 }}>Recuperar contraseña</h2>
                <p style={{ fontSize:14, color:'var(--txt2)' }}>Te enviaremos un enlace de acceso</p>
              </div>
              <button onClick={onClose} style={{ background:'var(--bg)', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:16, color:'var(--txt2)', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:700, color:'var(--txt2)', marginBottom:6, letterSpacing:'.05em' }}>CORREO ELECTRÓNICO</label>
                <input
                  type="email" required placeholder="tu@correo.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width:'100%', padding:'11px 14px', background:'var(--field-bg)', border:'1.5px solid var(--field-border)', borderRadius:10, fontSize:15, color:'var(--txt)', fontFamily:'inherit', outline:'none', transition:'border-color .18s' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--blue)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--field-border)'}
                />
              </div>
              <button type="submit" disabled={loading} style={{ padding:'13px', background:'var(--blue)', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, fontFamily:'inherit', cursor:'pointer', transition:'all .18s', opacity:loading ? 0.7 : 1 }}>
                {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
              </button>
            </form>
            <p style={{ marginTop:14, textAlign:'center', fontSize:13, color:'var(--txt3)' }}>
              ¿Recuerdas tu contraseña?{' '}
              <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--blue)', fontWeight:600, cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>Iniciar sesión</button>
            </p>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
            <h2 style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:19, color:'var(--txt)', marginBottom:10 }}>¡Revisa tu correo!</h2>
            <p style={{ fontSize:15, color:'var(--txt2)', lineHeight:1.6, marginBottom:20 }}>
              Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.
            </p>
            <button onClick={onClose} style={{ padding:'12px 26px', background:'var(--blue)', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, fontFamily:'inherit', cursor:'pointer' }}>
              Volver al login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── CSS ───────────────────────────────────────────────────────────────
const CSS = `
  /* Reset, tokens y componentes base (.input/.btn-primary/.btn-block/.back-btn) viven en globals.css */
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to { transform: rotate(360deg) } }

  .pw-btn {
    position:absolute; right:12px; top:50%; transform:translateY(-50%);
    background:none; border:none; cursor:pointer; color:var(--txt3);
    font-size:16px; padding:4px; transition:color .15s;
  }
  .pw-btn:hover { color:var(--txt2); }

  @media(max-width:768px) { .left-col { display:none !important; } }
`

// ── Page ──────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [forgot,   setForgot]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas')
      if (['ADMIN','VENDEDOR','ALMACEN'].includes(data.rol)) router.push('/admin/orders')
      else router.push('/client')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display:'flex', minHeight:'100dvh', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{CSS}</style>
      {forgot && <ForgotModal onClose={() => setForgot(false)} />}

      {/* ── LEFT PANEL ── */}
      <div className="left-col" style={{
        width: '45%', position: 'relative',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', overflow: 'hidden',
      }}>
        {/* Imagen de fondo — primer plano: iniciando sesión en el dispositivo */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url('https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=900&auto=format&fit=crop&q=80')`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'saturate(1.1)',
        }}/>
        {/* Overlay degradado para legibilidad */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg, rgba(13,33,55,0.82) 0%, rgba(21,101,192,0.75) 100%)' }}/>

        {/* Contenido sobre la imagen */}
        <div style={{ position:'relative', padding:'36px 40px', display:'flex', flexDirection:'column', height:'100%', justifyContent:'space-between' }}>

          {/* Logo + botón volver */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <CharisLogotipo height={38} />
            <Link href="/" className="back-btn">
              ← Volver al inicio
            </Link>
          </div>

          {/* Texto central */}
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:100, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', fontSize:12.5, fontWeight:700, color:'white', marginBottom:18, letterSpacing:'.05em' }}>
              ✦ PORTAL DE CLIENTES B2B
            </div>
            <h2 style={{ fontFamily:'Arial Black, system-ui, sans-serif', fontWeight:900, fontSize:30, color:'white', lineHeight:1.2, marginBottom:14 }}>
              Bienvenido a tu portal<br />de pedidos de Charis
            </h2>
            <p style={{ fontSize:16, color:'rgba(255,255,255,0.7)', lineHeight:1.65, maxWidth:340 }}>
              Gestiona tus pedidos de cases, consulta el catálogo actualizado y da seguimiento en tiempo real.
            </p>
            <div style={{ marginTop:28, display:'flex', flexDirection:'column', gap:10 }}>
              {['📋 Catálogo completo y actualizado','📦 Estado de pedidos en tiempo real','📱 Acceso desde celular o computadora'].map(f => (
                <div key={f} style={{ fontSize:14.5, color:'rgba(255,255,255,0.75)', display:'flex', alignItems:'center', gap:8 }}>{f}</div>
              ))}
            </div>
          </div>

          {/* Footer del panel */}
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>© 2026 Charis · Distribuidor Mayorista</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex:1, background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px' }}>

        {/* Mobile: back button */}
        <div style={{ display:'none', width:'100%', maxWidth:400, marginBottom:20 }} className="mob-back">
          <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:14, color:'var(--blue)', fontWeight:600, textDecoration:'none' }}>
            ← Volver al inicio
          </Link>
        </div>

        <div style={{ width:'100%', maxWidth:400, animation:'fadeUp 0.4s ease-out' }}>

          {/* Mobile logo */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:32, justifyContent:'center' }}>
            <CharisIsotipo size={30} />
            <span style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:17, color:'var(--txt)' }}>CHARIS</span>
          </div>

          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontFamily:'Arial Black, system-ui, sans-serif', fontWeight:900, fontSize:26, color:'var(--txt)', marginBottom:6 }}>Iniciar sesión</h1>
            <p style={{ fontSize:15, color:'var(--txt2)' }}>Accede a tu cuenta para gestionar pedidos</p>
          </div>

          {error && (
            <div style={{ padding:'11px 14px', borderRadius:10, background:'var(--err-bg)', color:'var(--err-text)', border:'1px solid var(--err-border)', fontSize:14, marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ display:'block', fontSize:12.5, fontWeight:700, color:'var(--txt2)', marginBottom:6, letterSpacing:'.05em' }}>CORREO ELECTRÓNICO</label>
              <input className="input" type="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
            </div>

            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <label style={{ fontSize:12.5, fontWeight:700, color:'var(--txt2)', letterSpacing:'.05em' }}>CONTRASEÑA</label>
                <button type="button" onClick={() => setForgot(true)}
                  style={{ background:'none', border:'none', color:'var(--blue)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div style={{ position:'relative' }}>
                <input className="input" type={showPw?'text':'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight:42 }} autoComplete="current-password"/>
                <button type="button" className="pw-btn" onClick={() => setShowPw(s => !s)}>{showPw?'🙈':'👁️'}</button>
              </div>
            </div>

            <div style={{ paddingTop:4 }}>
              <button type="submit" className="btn-primary btn-block" disabled={loading}>
                {loading
                  ? <><div style={{ width:15, height:15, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin .7s linear infinite' }}/> Entrando...</>
                  : 'Entrar →'}
              </button>
            </div>
          </form>

          <div style={{ marginTop:22, display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
            <p style={{ fontSize:15, color:'var(--txt2)' }}>
              ¿No tienes cuenta?{' '}
              <Link href="/register" style={{ color:'var(--blue)', fontWeight:700, textDecoration:'none' }}>Regístrate gratis</Link>
            </p>
            <div style={{ height:1, background:'var(--border)', width:'100%' }}/>

          </div>
        </div>
      </div>
    </div>
  )
}
