'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function CharisLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#rg)"/>
      <rect x="12" y="7" width="16" height="26" rx="3" stroke="white" strokeWidth="2" fill="none" opacity="0.3"/>
      <rect x="10" y="9" width="20" height="22" rx="4" stroke="white" strokeWidth="1.5" fill="none" opacity="0.8"/>
      <rect x="14" y="11" width="12" height="16" rx="1.5" fill="white" opacity="0.12"/>
      <text x="20" y="22.5" fontFamily="Arial Black, sans-serif" fontSize="12" fontWeight="900" fill="white" textAnchor="middle" dominantBaseline="middle">C</text>
      <circle cx="20" cy="30" r="1.5" fill="white" opacity="0.5"/>
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a8fe3"/>
          <stop offset="100%" stopColor="#0d5fa3"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to { transform: rotate(360deg) } }
  .ri {
    width:100%; padding:10px 13px;
    background:rgba(255,255,255,0.05); border:1.5px solid rgba(75,174,240,0.2);
    border-radius:9px; color:white; font-size:13.5px;
    font-family:inherit; outline:none; transition:all .18s;
  }
  .ri:focus { border-color:#1a8fe3; background:rgba(26,143,227,0.08); box-shadow:0 0 0 3px rgba(26,143,227,0.12); }
  .ri::placeholder { color:rgba(255,255,255,0.2); }
  .rb {
    width:100%; padding:13px; background:#1a8fe3; color:white;
    border:none; border-radius:10px; font-size:14px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:all .18s;
    display:flex; align-items:center; justify-content:center; gap:8px;
    box-shadow:0 4px 20px rgba(26,143,227,0.35);
  }
  .rb:hover:not(:disabled) { background:#2299f0; transform:translateY(-1px); }
  .rb:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
  .fl { display:block; font-size:11px; font-weight:700; color:rgba(255,255,255,0.35); margin-bottom:5px; letter-spacing:.06em; }
  @media(max-width:768px) { .left-col { display:none !important; } }
`

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nombre:'', empresa:'', telefono:'', email:'', password:'', codigo:'' })
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.password) { setError('Nombre, correo y contraseña son obligatorios'); return }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (!form.telefono) { setError('El teléfono de WhatsApp es obligatorio'); return }
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/auth/register', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear cuenta')
      router.push('/client')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display:'flex', minHeight:'100dvh', fontFamily:"'DM Sans', system-ui, sans-serif", background:'#07111f' }}>
      <style>{CSS}</style>

      {/* LEFT */}
      <div className="left-col" style={{ width:'38%', background:'linear-gradient(160deg, #0d1e38 0%, #07111f 100%)', borderRight:'1px solid rgba(75,174,240,0.1)', display:'flex', flexDirection:'column', justifyContent:'center', padding:'48px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-80, right:-60, width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle, rgba(26,143,227,0.1) 0%, transparent 70%)', pointerEvents:'none' }}/>

        <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:48, textDecoration:'none', position:'relative' }}>
          <CharisLogo size={34} />
          <span style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:18, color:'white' }}>Charis</span>
        </Link>

        <div style={{ position:'relative' }}>
          <h2 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:28, color:'white', lineHeight:1.2, marginBottom:12 }}>
            Crea tu cuenta<br />de cliente
          </h2>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.45)', lineHeight:1.65 }}>
            Accede al catálogo y haz pedidos directo desde el portal.
          </p>
          <div style={{ marginTop:28, display:'flex', flexDirection:'column', gap:10 }}>
            {['✓ Sin costo, tu cuenta es gratuita','✓ Historial de pedidos completo','✓ Seguimiento en tiempo real'].map(f => (
              <div key={f} style={{ fontSize:13, color:'rgba(255,255,255,0.45)' }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 24px', overflowY:'auto' }}>
        <div style={{ width:'100%', maxWidth:440, animation:'fadeUp 0.4s ease-out', padding:'10px 0' }}>
          <div style={{ marginBottom:26 }}>
            <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:22, color:'white', marginBottom:5 }}>Crear cuenta nueva</h1>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.35)' }}>Rellena los datos para empezar a ordenar</p>
          </div>

          {error && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.1)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)', fontSize:13, marginBottom:16 }}>⚠ {error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label className="fl">NOMBRE *</label>
                <input className="ri" placeholder="Tu nombre" value={form.nombre} onChange={set('nombre')} required/>
              </div>
              <div>
                <label className="fl">EMPRESA</label>
                <input className="ri" placeholder="Nombre del negocio" value={form.empresa} onChange={set('empresa')}/>
              </div>
            </div>
            <div>
              <label className="fl">TELÉFONO WHATSAPP *</label>
              <input className="ri" placeholder="55 1234 5678" value={form.telefono} onChange={set('telefono')} required type="tel"/>
            </div>
            <div>
              <label className="fl">CORREO ELECTRÓNICO *</label>
              <input className="ri" type="email" placeholder="tu@correo.com" value={form.email} onChange={set('email')} required/>
            </div>
            <div>
              <label className="fl">CONTRASEÑA *</label>
              <div style={{ position:'relative' }}>
                <input className="ri" type={showPw?'text':'password'} placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} required style={{ paddingRight:40 }}/>
                <button type="button" onClick={() => setShowPw(s => !s)} style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'rgba(255,255,255,0.3)' }}>
                  {showPw?'🙈':'👁️'}
                </button>
              </div>
            </div>
            <div>
              <label className="fl">CÓDIGO DE EMPLEADO <span style={{ color:'rgba(255,255,255,0.2)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(opcional)</span></label>
              <input className="ri" placeholder="Si te lo proporcionaron" value={form.codigo} onChange={set('codigo')}/>
            </div>
            <div style={{ paddingTop:4 }}>
              <button type="submit" className="rb" disabled={loading}>
                {loading
                  ? <><div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin .7s linear infinite' }}/> Creando cuenta...</>
                  : 'Crear cuenta →'}
              </button>
            </div>
          </form>

          <p style={{ marginTop:20, textAlign:'center', fontSize:14, color:'rgba(255,255,255,0.35)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color:'#4baef0', fontWeight:600, textDecoration:'none' }}>Iniciar sesión</Link>
          </p>

          <div style={{ marginTop:20, paddingTop:18, borderTop:'1px solid rgba(75,174,240,0.1)', textAlign:'center' }}>
            <Link href="/" style={{ fontSize:12, color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>← Volver al inicio</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
