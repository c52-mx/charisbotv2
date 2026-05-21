'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function CharisIsotipo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 80 88" fill="none" xmlns="http://www.w3.org/2000/svg">
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

// ── Simple Math CAPTCHA (no API key needed) ───────────────────────────
function MathCaptcha({ onVerify }: { onVerify: (ok: boolean) => void }) {
  const [a, setA]   = useState(0)
  const [b, setB]   = useState(0)
  const [ans, setAns] = useState('')
  const [ok, setOk]   = useState(false)
  const [err, setErr] = useState(false)

  function refresh() {
    setA(Math.floor(Math.random() * 9) + 1)
    setB(Math.floor(Math.random() * 9) + 1)
    setAns(''); setOk(false); setErr(false)
    onVerify(false)
  }

  useEffect(() => { refresh() }, [])

  function check(val: string) {
    setAns(val)
    if (val === '') { setOk(false); setErr(false); onVerify(false); return }
    const correct = parseInt(val) === a + b
    setOk(correct); setErr(!correct)
    onVerify(correct)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f0f4f8', border:'1.5px solid #d0dde8', borderRadius:10, padding:'8px 14px', fontSize:15, fontWeight:700, color:'#0d2137', fontFamily:'monospace', minWidth:110 }}>
        {a} + {b} = ?
        <button type="button" onClick={refresh} title="Nueva pregunta" style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#8aaac4', marginLeft:4, lineHeight:1 }}>🔄</button>
      </div>
      <div style={{ position:'relative', flex:1, minWidth:80 }}>
        <input
          type="number" placeholder="Resultado"
          value={ans} onChange={e => check(e.target.value)}
          style={{
            width:'100%', padding:'9px 36px 9px 12px',
            background: ok ? '#f0fdf4' : err ? '#fef2f2' : '#f5f8fc',
            border: `1.5px solid ${ok ? '#22c55e' : err ? '#ef4444' : '#d0dde8'}`,
            borderRadius:10, fontSize:14, color:'#0d2137',
            fontFamily:'inherit', outline:'none', transition:'all .18s',
          }}
        />
        {ok  && <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#22c55e', fontSize:16 }}>✓</span>}
        {err && <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#ef4444', fontSize:14 }}>✗</span>}
      </div>
    </div>
  )
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to { transform: rotate(360deg) } }

  .ri {
    width:100%; padding:10px 13px;
    background:#f5f8fc; border:1.5px solid #d0dde8;
    border-radius:9px; color:#0d2137; font-size:13.5px;
    font-family:inherit; outline:none; transition:all .18s;
  }
  .ri:focus { border-color:#1565c0; background:white; box-shadow:0 0 0 3px rgba(21,101,192,0.1); }
  .ri::placeholder { color:#8aaac4; }
  .ri:disabled { opacity:0.5; cursor:not-allowed; }

  .rb {
    width:100%; padding:13px; background:#1565c0; color:white;
    border:none; border-radius:10px; font-size:15px; font-weight:700;
    font-family:'Arial Black', system-ui, sans-serif; cursor:pointer;
    transition:all .18s; display:flex; align-items:center;
    justify-content:center; gap:8px;
    box-shadow:0 4px 20px rgba(21,101,192,0.3);
  }
  .rb:hover:not(:disabled) { background:#1976d2; transform:translateY(-1px); box-shadow:0 6px 28px rgba(21,101,192,0.4); }
  .rb:disabled { opacity:0.55; cursor:not-allowed; transform:none; box-shadow:none; }

  .fl { display:block; font-size:11px; font-weight:700; color:#3a6080; margin-bottom:5px; letter-spacing:.06em; }
  .fl span { color:#8aaac4; font-weight:400; text-transform:none; letter-spacing:0; }

  .sec-title {
    font-size:11px; font-weight:700; color:#1565c0; letter-spacing:.08em;
    text-transform:uppercase; margin-bottom:12px; padding-bottom:6px;
    border-bottom:1.5px solid #e2eaf4; display:flex; align-items:center; gap:6px;
  }

  .pw-strength { height:3px; border-radius:2px; transition:all .3s; margin-top:5px; }

  .back-btn {
    display:inline-flex; align-items:center; gap:7px;
    padding:9px 18px; border-radius:100px;
    background:rgba(255,255,255,0.15); color:white;
    font-size:13px; font-weight:600; text-decoration:none;
    border:1.5px solid rgba(255,255,255,0.35); transition:all .2s;
  }
  .back-btn:hover { background:rgba(255,255,255,0.25); border-color:rgba(255,255,255,0.6); }

  @media(max-width:900px) { .left-col { display:none !important; } }
  @media(max-width:500px) { .g2 { grid-template-columns:1fr !important; } }
`

function pwStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'transparent' }
  let s = 0
  if (pw.length >= 8)  s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { score: s, label: 'Débil', color: '#ef4444' }
  if (s <= 3) return { score: s, label: 'Regular', color: '#f59e0b' }
  return { score: s, label: 'Fuerte', color: '#22c55e' }
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    empresa: '', contacto: '', telefono: '', email: '', password: '', confirm: '',
  })
  const [showPw,    setShowPw]    = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [captchaOk, setCaptchaOk] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const strength = pwStrength(form.password)
  const pwMatch  = form.confirm && form.password === form.confirm
  const pwNoMatch = form.confirm && form.password !== form.confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (!captchaOk) { setError('Por favor completa la verificación de seguridad'); return }

    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:   form.contacto,
          empresa:  form.empresa,
          telefono: form.telefono,
          email:    form.email,
          password: form.password,
        }),
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
    <div style={{ display:'flex', minHeight:'100dvh', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{CSS}</style>

      {/* ── LEFT PANEL ── */}
      <div className="left-col" style={{ width:'38%', position:'relative', display:'flex', flexDirection:'column', justifyContent:'space-between', overflow:'hidden' }}>
        {/* Imagen fondo */}
        <div style={{ position:'absolute', inset:0, backgroundImage:`url('https://images.unsplash.com/photo-1601593346740-925612772716?w=900&auto=format&fit=crop&q=80')`, backgroundSize:'cover', backgroundPosition:'center' }}/>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg, rgba(13,33,55,0.85) 0%, rgba(21,101,192,0.78) 100%)' }}/>

        <div style={{ position:'relative', padding:'36px 40px', display:'flex', flexDirection:'column', height:'100%', justifyContent:'space-between' }}>
          {/* Top */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <CharisIsotipo size={32} />
              <div style={{ lineHeight:1.1 }}>
                <div style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:17, color:'white', letterSpacing:'.04em' }}>CHARIS</div>
                <div style={{ fontSize:8.5, color:'rgba(255,255,255,0.6)', fontWeight:600, letterSpacing:'.08em' }}>DISTRIBUIDOR MAYORISTA</div>
              </div>
            </div>
            <Link href="/" className="back-btn">← Inicio</Link>
          </div>

          {/* Center */}
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:100, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', fontSize:11, fontWeight:700, color:'white', marginBottom:18, letterSpacing:'.05em' }}>
              ✦ NUEVA CUENTA
            </div>
            <h2 style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:26, color:'white', lineHeight:1.2, marginBottom:14 }}>
              Únete al portal<br />de pedidos de Charis
            </h2>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.65)', lineHeight:1.65 }}>
              Crea tu cuenta como distribuidor y accede al catálogo completo con precios mayoristas.
            </p>
            <div style={{ marginTop:24, display:'flex', flexDirection:'column', gap:10 }}>
              {['✓ Registro gratuito, sin compromisos','✓ Acceso inmediato al catálogo','✓ Seguimiento de pedidos en tiempo real'].map(f => (
                <div key={f} style={{ fontSize:13, color:'rgba(255,255,255,0.7)' }}>{f}</div>
              ))}
            </div>
          </div>

          <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>© 2026 Charis · Distribuidor Mayorista</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex:1, background:'#f0f4f8', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 24px', overflowY:'auto' }}>
        <div style={{ width:'100%', maxWidth:480, animation:'fadeUp 0.4s ease-out' }}>

          {/* Mobile logo */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:28, justifyContent:'center' }}>
            <CharisIsotipo size={28} />
            <span style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:16, color:'#0d2137' }}>CHARIS</span>
          </div>

          <div style={{ marginBottom:24 }}>
            <h1 style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:22, color:'#0d2137', marginBottom:5 }}>Crear cuenta</h1>
            <p style={{ fontSize:14, color:'#3a6080' }}>Completa tus datos para empezar a ordenar</p>
          </div>

          {error && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', fontSize:13, marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* SECCIÓN 1: Datos del negocio */}
            <div>
              <p className="sec-title">🏢 Datos del negocio</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label className="fl">NOMBRE DE EMPRESA *</label>
                  <input className="ri" placeholder="Ej: Accesorios García S.A." value={form.empresa} onChange={set('empresa')} required/>
                </div>
                <div>
                  <label className="fl">PERSONA DE CONTACTO *</label>
                  <input className="ri" placeholder="Nombre completo" value={form.contacto} onChange={set('contacto')} required/>
                </div>
                <div>
                  <label className="fl">TELÉFONO WHATSAPP *</label>
                  <input className="ri" placeholder="55 1234 5678" value={form.telefono} onChange={set('telefono')} required type="tel"/>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Acceso */}
            <div>
              <p className="sec-title">🔐 Datos de acceso</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label className="fl">CORREO ELECTRÓNICO *</label>
                  <input className="ri" type="email" placeholder="tu@empresa.com" value={form.email} onChange={set('email')} required/>
                </div>
                <div>
                  <label className="fl">CONTRASEÑA * <span style={{ color:'#8aaac4', fontSize:10 }}>(mín. 8 caracteres)</span></label>
                  <div style={{ position:'relative' }}>
                    <input className="ri" type={showPw?'text':'password'} placeholder="Crea una contraseña segura" value={form.password} onChange={set('password')} required style={{ paddingRight:40 }}/>
                    <button type="button" onClick={() => setShowPw(s=>!s)} style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:15, color:'#8aaac4' }}>{showPw?'🙈':'👁️'}</button>
                  </div>
                  {form.password && (
                    <div style={{ marginTop:6 }}>
                      <div style={{ display:'flex', gap:3, marginBottom:4 }}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className="pw-strength" style={{ flex:1, background: i <= strength.score ? strength.color : '#e2eaf4' }}/>
                        ))}
                      </div>
                      <span style={{ fontSize:11, color:strength.color, fontWeight:600 }}>{strength.label}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="fl">CONFIRMAR CONTRASEÑA *</label>
                  <div style={{ position:'relative' }}>
                    <input className="ri" type={showConf?'text':'password'} placeholder="Repite tu contraseña" value={form.confirm} onChange={set('confirm')} required
                      style={{ paddingRight:40, borderColor: pwMatch ? '#22c55e' : pwNoMatch ? '#ef4444' : '#d0dde8', background: pwMatch ? '#f0fdf4' : pwNoMatch ? '#fef2f2' : '#f5f8fc' }}/>
                    <button type="button" onClick={() => setShowConf(s=>!s)} style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:15, color:'#8aaac4' }}>{showConf?'🙈':'👁️'}</button>
                    {pwMatch   && <span style={{ position:'absolute', right:36, top:'50%', transform:'translateY(-50%)', color:'#22c55e', fontSize:14 }}>✓</span>}
                    {pwNoMatch && <span style={{ position:'absolute', right:36, top:'50%', transform:'translateY(-50%)', color:'#ef4444', fontSize:12 }}>✗ No coinciden</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Verificación */}
            <div>
              <p className="sec-title">🛡️ Verificación de seguridad</p>
              <MathCaptcha onVerify={setCaptchaOk} />
              {!captchaOk && (
                <p style={{ fontSize:11, color:'#8aaac4', marginTop:6 }}>Resuelve la operación para continuar</p>
              )}
            </div>

            {/* Terms */}
            <p style={{ fontSize:12, color:'#8aaac4', lineHeight:1.5 }}>
              Al crear una cuenta aceptas que Charis podrá contactarte para confirmar tu registro como distribuidor.
            </p>

            <button type="submit" className="rb" disabled={loading || !captchaOk}>
              {loading
                ? <><div style={{ width:15, height:15, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin .7s linear infinite' }}/> Creando cuenta...</>
                : 'Crear cuenta →'}
            </button>
          </form>

          <p style={{ marginTop:20, textAlign:'center', fontSize:14, color:'#3a6080' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color:'#1565c0', fontWeight:700, textDecoration:'none' }}>Iniciar sesión</Link>
          </p>

          <div style={{ marginTop:16, textAlign:'center' }}>
            <Link href="/" style={{ fontSize:12, color:'#8aaac4', textDecoration:'none' }}>← Volver al inicio</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
