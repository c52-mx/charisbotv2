'use client'
import { useState, useEffect, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'

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

// ── Phone validator ──────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+52', flag: '🇲🇽', name: 'México',     digits: 10 },
  { code: '+1',  flag: '🇺🇸', name: 'EE.UU./CA', digits: 10 },
  { code: '+34', flag: '🇪🇸', name: 'España',     digits: 9  },
  { code: '+57', flag: '🇨🇴', name: 'Colombia',   digits: 10 },
  { code: '+54', flag: '🇦🇷', name: 'Argentina',  digits: 10 },
  { code: '+56', flag: '🇨🇱', name: 'Chile',      digits: 9  },
  { code: '+51', flag: '🇵🇪', name: 'Perú',       digits: 9  },
]

function formatMX(raw: string): string {
  const d = raw.replace(/\D/g,'').slice(0,10)
  if (d.length <= 2) return d
  if (d.length <= 6) return d.slice(0,2)+' '+d.slice(2)
  return d.slice(0,2)+' '+d.slice(2,6)+' '+d.slice(6)
}
function formatUS(raw: string): string {
  const d = raw.replace(/\D/g,'').slice(0,10)
  if (d.length <= 3) return d
  if (d.length <= 6) return '('+d.slice(0,3)+') '+d.slice(3)
  return '('+d.slice(0,3)+') '+d.slice(3,6)+'-'+d.slice(6)
}
function formatGeneric(raw: string, max: number): string {
  return raw.replace(/\D/g,'').slice(0,max)
}

interface PhoneInputProps { value: string; onChange: (v: string) => void }
function PhoneInput({ value, onChange }: PhoneInputProps) {
  const [country, setCountry] = useState(COUNTRY_CODES[0])
  const [local,   setLocal]   = useState('')
  const [open,    setOpen]    = useState(false)

  const digits  = local.replace(/\D/g,'')
  const valid   = digits.length === country.digits
  const invalid = local.length > 0 && !valid
  const hint    = `${country.digits} dígitos requeridos${country.code==='+52' ? ' · lada + número' : ''}`

  function handleLocal(raw: string) {
    let fmt = ''
    if (country.code === '+52') fmt = formatMX(raw)
    else if (country.code === '+1') fmt = formatUS(raw)
    else fmt = formatGeneric(raw, country.digits)
    setLocal(fmt)
    const d = fmt.replace(/\D/g,'')
    onChange(d.length === country.digits ? `${country.code}${d}` : '')
  }

  function pick(cc: typeof COUNTRY_CODES[0]) {
    setCountry(cc); setLocal(''); onChange(''); setOpen(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ display:'flex', gap:0, position:'relative' }}>
        {/* Country selector */}
        <div style={{ position:'relative' }}>
          <button type="button" onClick={() => setOpen(o=>!o)}
            style={{ height:44, padding:'0 11px', background:'var(--field-bg)', border:'1.5px solid var(--field-border)', borderRight:'none', borderRadius:'9px 0 0 9px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:14.5, color:'var(--txt)', fontFamily:'inherit', whiteSpace:'nowrap', transition:'border-color .18s' }}>
            <span style={{ fontSize:18 }}>{country.flag}</span>
            <span style={{ fontWeight:600 }}>{country.code}</span>
            <span style={{ fontSize:9, color:'var(--txt3)' }}>▼</span>
          </button>
          {open && (
            <div style={{ position:'absolute', top:'100%', left:0, zIndex:200, background:'white', border:'1.5px solid var(--field-border)', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', minWidth:200, marginTop:3, overflow:'hidden' }}>
              {COUNTRY_CODES.map(cc => (
                <button key={cc.code} type="button" onClick={() => pick(cc)}
                  style={{ width:'100%', padding:'10px 14px', textAlign:'left', background: cc.code===country.code ? 'var(--bg)' : 'white', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:14, color:'var(--txt)', fontFamily:'inherit', transition:'background .12s' }}
                  onMouseEnter={e => { if(cc.code!==country.code)(e.currentTarget as HTMLElement).style.background='var(--field-bg)' }}
                  onMouseLeave={e => { if(cc.code!==country.code)(e.currentTarget as HTMLElement).style.background='white' }}>
                  <span style={{ fontSize:18 }}>{cc.flag}</span>
                  <span style={{ fontWeight:600 }}>{cc.code}</span>
                  <span style={{ color:'var(--txt2)', fontSize:13 }}>{cc.name}</span>
                  <span style={{ marginLeft:'auto', color:'var(--txt3)', fontSize:12 }}>{cc.digits} díg.</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Number input */}
        <input
          type="tel" placeholder={country.code==='+52' ? '55 1234 5678' : country.code==='+1' ? '(555) 000-0000' : `${country.digits} dígitos`}
          value={local}
          onChange={e => handleLocal(e.target.value)}
          style={{ flex:1, padding:'11px 36px 11px 13px', background: valid ? 'var(--ok-bg)' : invalid ? 'var(--err-bg)' : 'var(--field-bg)', border:`1.5px solid ${valid ? 'var(--ok)' : invalid ? 'var(--err)' : 'var(--field-border)'}`, borderRadius:'0 9px 9px 0', fontSize:15, color:'var(--txt)', fontFamily:'monospace', outline:'none', transition:'all .18s' }}
        />
        {valid   && <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--ok)', fontSize:16 }}>✓</span>}
        {invalid && <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--err)', fontSize:14 }}>✗</span>}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:12, color: invalid ? 'var(--err)' : 'var(--txt3)' }}>{hint}</span>
        {country.code==='+52' && (
          <span style={{ fontSize:11, color:'#aaa' }}>CDMX: 55 · MTY: 81 · GDL: 33 · SON: 662/631</span>
        )}
      </div>
    </div>
  )
}

// ── Email validator ───────────────────────────────────────────────────
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

interface EmailInputProps { value: string; onChange: (v: string) => void }
function EmailInput({ value, onChange }: EmailInputProps) {
  const [touched, setTouched] = useState(false)
  const valid   = EMAIL_RE.test(value)
  const invalid = touched && value.length > 0 && !valid
  const ok      = touched && valid

  return (
    <div>
      <div style={{ position:'relative' }}>
        <input
          type="text" inputMode="email" autoComplete="email"
          placeholder="tu@empresa.com"
          value={value}
          onChange={e => onChange(e.target.value.trim())}
          onBlur={() => setTouched(true)}
          style={{ width:'100%', padding:'11px 36px 11px 14px', background: ok ? 'var(--ok-bg)' : invalid ? 'var(--err-bg)' : 'var(--field-bg)', border:`1.5px solid ${ok ? 'var(--ok)' : invalid ? 'var(--err)' : 'var(--field-border)'}`, borderRadius:9, fontSize:15, color:'var(--txt)', fontFamily:'inherit', outline:'none', transition:'all .18s' }}
          onFocus={e => { e.currentTarget.style.borderColor = ok ? 'var(--ok)' : invalid ? 'var(--err)' : 'var(--blue)'; e.currentTarget.style.background = ok ? 'var(--ok-bg)' : invalid ? 'var(--err-bg)' : 'white' }}
        />
        {ok      && <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--ok)', fontSize:16 }}>✓</span>}
        {invalid && <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--err)', fontSize:13 }}>✗</span>}
      </div>
      {invalid && <span style={{ fontSize:12, color:'var(--err)', marginTop:4, display:'block' }}>Correo inválido — verifica que tenga @ y dominio</span>}
    </div>
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
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg)', border:'1.5px solid var(--field-border)', borderRadius:10, padding:'9px 14px', fontSize:16, fontWeight:700, color:'var(--txt)', fontFamily:'monospace', minWidth:110 }}>
        {a} + {b} = ?
        <button type="button" onClick={refresh} title="Nueva pregunta" style={{ background:'none', border:'none', cursor:'pointer', fontSize:15, color:'var(--txt3)', marginLeft:4, lineHeight:1 }}>🔄</button>
      </div>
      <div style={{ position:'relative', flex:1, minWidth:80 }}>
        <input
          type="number" placeholder="Resultado"
          value={ans} onChange={e => check(e.target.value)}
          style={{
            width:'100%', padding:'10px 36px 10px 13px',
            background: ok ? 'var(--ok-bg)' : err ? 'var(--err-bg)' : 'var(--field-bg)',
            border: `1.5px solid ${ok ? 'var(--ok)' : err ? 'var(--err)' : 'var(--field-border)'}`,
            borderRadius:10, fontSize:15, color:'var(--txt)',
            fontFamily:'inherit', outline:'none', transition:'all .18s',
          }}
        />
        {ok  && <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--ok)', fontSize:16 }}>✓</span>}
        {err && <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--err)', fontSize:14 }}>✗</span>}
      </div>
    </div>
  )
}

const CSS = `
  /* Reset, scroll suave, antialiasing y tokens viven en globals.css */
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to { transform: rotate(360deg) } }

  /* Inputs (.input), botones (.btn-primary/.btn-block), label (.field-label) y .back-btn viven en globals.css */
  .sec-title {
    font-size:13px; font-weight:700; color:var(--blue); letter-spacing:.08em;
    text-transform:uppercase; margin-bottom:14px; padding-bottom:7px;
    border-bottom:1.5px solid var(--border); display:flex; align-items:center; gap:6px;
  }

  .pw-strength { height:3px; border-radius:2px; transition:all .3s; margin-top:5px; }

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
  if (s <= 1) return { score: s, label: 'Débil', color: 'var(--err)' }
  if (s <= 3) return { score: s, label: 'Regular', color: '#f59e0b' }
  return { score: s, label: 'Fuerte', color: 'var(--ok)' }
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    empresa: '', contacto: '', telefono: '', email: '', password: '', confirm: '',
  })
  const [showPw,    setShowPw]    = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [hcaptchaToken, setHcaptchaToken] = useState('')
  const captchaRef = useRef<HCaptcha>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const strength = pwStrength(form.password)
  const pwMatch  = form.confirm && form.password === form.confirm
  const pwNoMatch = form.confirm && form.password !== form.confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.telefono && !form.email) { setError('Ingresa tu correo electrónico o número de WhatsApp (al menos uno)'); return }
    if (form.email && !EMAIL_RE.test(form.email)) { setError('El correo electrónico no es válido'); return }
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (!hcaptchaToken) { setError('Por favor completa la verificación de seguridad'); return }

    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hcaptchaToken,
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
        <div style={{ position:'absolute', inset:0, backgroundImage:`url('https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=900&auto=format&fit=crop&q=80')`, backgroundSize:'cover', backgroundPosition:'center' }}/>
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
            {/* <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:100, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', fontSize:11, fontWeight:700, color:'white', marginBottom:18, letterSpacing:'.05em' }}>
              ✦ NUEVA CUENTA
            </div> */}
            <h1 style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:26, color:'white', lineHeight:1.2, marginBottom:14 }}>
              Únete al portal<br />de pedidos de Charis
            </h1>
            <p style={{ fontSize:18, color:'rgba(255,255,255,0.65)', lineHeight:1.65 }}>
              Crea tu cuenta como distribuidor y accede al catálogo completo con precios mayoristas.
            </p>
            <div style={{ marginTop:24, display:'flex', flexDirection:'column', gap:10 }}>
              {['✓ Registro gratuito, sin compromisos','✓ Acceso inmediato al catálogo','✓ Seguimiento de pedidos en tiempo real'].map(f => (
                <div key={f} style={{ fontSize:15, color:'rgba(255,255,255,0.7)' }}>{f}</div>
              ))}
            </div>
          </div>

          <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>© 2026 Charis · Distribuidor Mayorista</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex:1, background:'var(--bg)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 24px', overflowY:'auto' }}>
        <div style={{ width:'100%', maxWidth:480, animation:'fadeUp 0.4s ease-out' }}>

          {/* Mobile logo */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:28, justifyContent:'center' }}>
            <CharisIsotipo size={28} />
            <span style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:16, color:'var(--txt)' }}>CHARIS</span>
          </div>

          <div style={{ marginBottom:24 }}>
            <h1 style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:25, color:'var(--txt)', marginBottom:6 }}>Crear cuenta</h1>
            <p style={{ fontSize:15, color:'var(--txt2)' }}>Completa tus datos para empezar a ordenar</p>
          </div>

          {error && (
            <div style={{ padding:'11px 14px', borderRadius:10, background:'var(--err-bg)', color:'var(--err-text)', border:'1px solid var(--err-border)', fontSize:14, marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* SECCIÓN 1: Datos del negocio */}
            <div>
              <p className="sec-title">🏢 Datos del negocio</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label className="field-label">NOMBRE DE EMPRESA *</label>
                  <input className="input" placeholder="Ej: Accesorios García S.A." value={form.empresa} onChange={set('empresa')} required/>
                </div>
                <div>
                  <label className="field-label">PERSONA DE CONTACTO *</label>
                  <input className="input" placeholder="Nombre completo" value={form.contacto} onChange={set('contacto')} required/>
                </div>
                <div>
                  <label className="field-label" style={{ display:'flex', alignItems:'center', gap:6 }}><WhatsAppIcon size={13} color="#25D366"/> TELÉFONO WHATSAPP <span style={{ color:'var(--txt3)', fontWeight:400 }}>(opcional si tienes correo)</span></label>
                  <PhoneInput value={form.telefono} onChange={v => setForm(f => ({ ...f, telefono: v }))} />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Acceso */}
            <div>
              <p className="sec-title">🔐 Datos de acceso</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label className="field-label">CORREO ELECTRÓNICO <span style={{ color:'var(--txt3)', fontWeight:400 }}>(opcional si tienes WhatsApp)</span></label>
                  <EmailInput value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
                  {form.email && <p style={{ fontSize:11, color:'var(--txt3)', marginTop:3 }}>Recibirás notificaciones de tus pedidos en este correo</p>}
                  {!form.email && form.telefono && <p style={{ fontSize:11, color:'var(--ok)', marginTop:3 }}>✓ Las notificaciones llegarán a tu WhatsApp</p>}
                </div>
                <div>
                  <label className="field-label">CONTRASEÑA * <span style={{ color:'var(--txt3)', fontSize:11 }}>(mín. 8 caracteres)</span></label>
                  <div style={{ position:'relative' }}>
                    <input className="input" type={showPw?'text':'password'} placeholder="Crea una contraseña segura" value={form.password} onChange={set('password')} required style={{ paddingRight:40 }}/>
                    <button type="button" onClick={() => setShowPw(s=>!s)} style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:15, color:'var(--txt3)' }}>{showPw?'🙈':'👁️'}</button>
                  </div>
                  {form.password && (
                    <div style={{ marginTop:6 }}>
                      <div style={{ display:'flex', gap:3, marginBottom:4 }}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className="pw-strength" style={{ flex:1, background: i <= strength.score ? strength.color : 'var(--border)' }}/>
                        ))}
                      </div>
                      <span style={{ fontSize:12, color:strength.color, fontWeight:600 }}>{strength.label}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="field-label">CONFIRMAR CONTRASEÑA *</label>
                  <div style={{ position:'relative' }}>
                    <input className="input" type={showConf?'text':'password'} placeholder="Repite tu contraseña" value={form.confirm} onChange={set('confirm')} required
                      style={{ paddingRight:40, borderColor: pwMatch ? 'var(--ok)' : pwNoMatch ? 'var(--err)' : 'var(--field-border)', background: pwMatch ? 'var(--ok-bg)' : pwNoMatch ? 'var(--err-bg)' : 'var(--field-bg)' }}/>
                    <button type="button" onClick={() => setShowConf(s=>!s)} style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:15, color:'var(--txt3)' }}>{showConf?'🙈':'👁️'}</button>
                    {pwMatch   && <span style={{ position:'absolute', right:36, top:'50%', transform:'translateY(-50%)', color:'var(--ok)', fontSize:14 }}>✓</span>}
                    {pwNoMatch && <span style={{ position:'absolute', right:36, top:'50%', transform:'translateY(-50%)', color:'var(--err)', fontSize:13 }}>✗ No coinciden</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Verificación */}
            <div>
              <p className="sec-title">🛡️ Verificación de seguridad</p>
              <HCaptcha
                ref={captchaRef}
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || ''}
                onVerify={token => setHcaptchaToken(token)}
                onExpire={() => setHcaptchaToken('')}
                theme="light"
              />
              {!hcaptchaToken && (
                <p style={{ fontSize:12, color:'var(--txt3)', marginTop:6 }}>Completa la verificación para continuar</p>
              )}
            </div>

            {/* Terms */}
            <p style={{ fontSize:13, color:'var(--txt3)', lineHeight:1.5 }}>
              Al crear una cuenta aceptas que Charis podrá contactarte para confirmar tu registro como distribuidor.
            </p>

            <button type="submit" className="btn-primary btn-block" disabled={loading || !hcaptchaToken}>
              {loading
                ? <><div style={{ width:15, height:15, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin .7s linear infinite' }}/> Creando cuenta...</>
                : 'Crear cuenta →'}
            </button>
          </form>

          <p style={{ marginTop:20, textAlign:'center', fontSize:15, color:'var(--txt2)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color:'var(--blue)', fontWeight:700, textDecoration:'none' }}>Iniciar sesión</Link>
          </p>

          <div style={{ marginTop:16, textAlign:'center' }}>
            <Link href="/" style={{ fontSize:13, color:'var(--txt3)', textDecoration:'none' }}>← Volver al inicio</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
