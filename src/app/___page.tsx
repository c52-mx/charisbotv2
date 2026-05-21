'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Inline SVG logo (avoids hydration issues with img tags) ──
function CharisLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#cg)"/>
      <rect x="12" y="7" width="16" height="26" rx="3" stroke="white" strokeWidth="2" fill="none" opacity="0.3"/>
      <rect x="10" y="9" width="20" height="22" rx="4" stroke="white" strokeWidth="1.5" fill="none" opacity="0.8"/>
      <rect x="14" y="11" width="12" height="16" rx="1.5" fill="white" opacity="0.12"/>
      <text x="20" y="22.5" fontFamily="Arial Black, sans-serif" fontSize="12" fontWeight="900" fill="white" textAnchor="middle" dominantBaseline="middle">C</text>
      <circle cx="20" cy="30" r="1.5" fill="white" opacity="0.5"/>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a8fe3"/>
          <stop offset="100%" stopColor="#0d5fa3"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }

  .nav-pill {
    display:inline-flex; align-items:center; gap:6px;
    padding:7px 16px; border-radius:100px;
    font-size:13px; font-weight:500;
    background:transparent; border:1.5px solid transparent;
    color:rgba(255,255,255,0.7); cursor:pointer; transition:all .18s;
    text-decoration:none;
  }
  .nav-pill:hover { color:white; border-color:rgba(255,255,255,0.25); background:rgba(255,255,255,0.08); }

  .btn-primary {
    display:inline-flex; align-items:center; gap:8px;
    padding:13px 28px; border-radius:100px;
    background:#1a8fe3; color:white;
    font-size:15px; font-weight:600;
    border:none; cursor:pointer; text-decoration:none;
    transition:all .2s; font-family:inherit;
    box-shadow:0 4px 20px rgba(26,143,227,0.35);
  }
  .btn-primary:hover { background:#2299f0; transform:translateY(-2px); box-shadow:0 8px 32px rgba(26,143,227,0.45); }

  .btn-secondary {
    display:inline-flex; align-items:center; gap:8px;
    padding:13px 28px; border-radius:100px;
    background:rgba(255,255,255,0.08); color:white;
    font-size:15px; font-weight:600;
    border:1.5px solid rgba(255,255,255,0.2); cursor:pointer;
    text-decoration:none; transition:all .2s; font-family:inherit;
  }
  .btn-secondary:hover { background:rgba(255,255,255,0.14); border-color:rgba(255,255,255,0.4); }

  .feature-card {
    background:rgba(255,255,255,0.04); border-radius:18px; padding:26px 22px;
    border:1px solid rgba(75,174,240,0.15);
    transition:all .2s;
  }
  .feature-card:hover {
    background:rgba(255,255,255,0.07);
    border-color:rgba(75,174,240,0.35);
    transform:translateY(-3px);
    box-shadow:0 12px 40px rgba(26,143,227,0.15);
  }

  .step-card {
    display:flex; gap:16px; padding:22px 24px;
    background:rgba(255,255,255,0.04); border-radius:16px;
    border:1px solid rgba(75,174,240,0.12);
    align-items:flex-start; transition:all .2s;
  }
  .step-card:hover { background:rgba(255,255,255,0.07); border-color:rgba(75,174,240,0.3); }

  ::-webkit-scrollbar { width:5px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(75,174,240,0.3); border-radius:10px; }
`

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const rol = d.user?.rol
      if (['ADMIN','VENDEDOR','ALMACEN'].includes(rol)) router.push('/admin/orders')
      else if (rol === 'CLIENTE') router.push('/client')
    }).catch(() => {})

    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#07111f', color: 'white', minHeight: '100dvh', overflowY: 'auto' }}>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '0 5%',
        background: scrolled ? 'rgba(7,17,31,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(75,174,240,0.12)' : '1px solid transparent',
        transition: 'all .3s',
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <CharisLogo size={34} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 17, color: 'white' }}>
            Charis
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a href="#features" className="nav-pill">Funciones</a>
          <a href="#como-funciona" className="nav-pill">Cómo funciona</a>
          <Link href="/login" className="btn-primary" style={{ padding: '8px 20px', fontSize: 13, boxShadow: 'none' }}>
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        padding: 'clamp(60px,10vw,100px) 5% 80px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow backgrounds */}
        <div style={{ position:'absolute', top:-120, left:'50%', transform:'translateX(-50%)', width:700, height:400, background:'radial-gradient(ellipse, rgba(26,143,227,0.12) 0%, transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-60, right:'10%', width:300, height:300, background:'radial-gradient(circle, rgba(75,174,240,0.07) 0%, transparent 70%)', pointerEvents:'none' }}/>

        <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 14px', borderRadius:100, background:'rgba(26,143,227,0.15)', border:'1px solid rgba(26,143,227,0.3)', fontSize:12, fontWeight:600, color:'#4baef0', marginBottom:24, animation:'fadeIn 0.5s ease-out' }}>
          ✦ Portal de pedidos B2B
        </div>

        <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:'clamp(36px,6vw,66px)', lineHeight:1.08, color:'white', maxWidth:740, animation:'fadeUp 0.55s ease-out 0.1s both', letterSpacing:'-0.02em' }}>
          Haz tus pedidos<br />
          <span style={{ background:'linear-gradient(90deg, #1a8fe3, #4baef0)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            rápido y sin errores
          </span>
        </h1>

        <p style={{ fontSize:18, color:'rgba(255,255,255,0.6)', maxWidth:520, lineHeight:1.65, marginTop:20, marginBottom:36, animation:'fadeUp 0.55s ease-out 0.2s both' }}>
          Catálogo completo de cases, sincronización en tiempo real
          y seguimiento de tus pedidos desde cualquier dispositivo.
        </p>

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', animation:'fadeUp 0.55s ease-out 0.3s both' }}>
          <Link href="/login" className="btn-primary">Entrar a mi cuenta →</Link>
          <Link href="/register" className="btn-secondary">Crear cuenta nueva</Link>
        </div>

        {/* Mock preview */}
        <div style={{ marginTop:60, width:'100%', maxWidth:780, background:'#0c1928', borderRadius:20, border:'1px solid rgba(75,174,240,0.15)', boxShadow:'0 32px 80px rgba(0,0,0,0.5)', overflow:'hidden', animation:'fadeUp 0.6s ease-out 0.4s both' }}>
          <div style={{ background:'#0b1624', borderBottom:'1px solid rgba(75,174,240,0.1)', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', gap:5 }}>
              {['#f87171','#fbbf24','#34d399'].map(c => <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }}/>)}
            </div>
            <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:6, height:22, maxWidth:260, margin:'0 auto', display:'flex', alignItems:'center', paddingLeft:10, fontSize:11, color:'rgba(255,255,255,0.3)' }}>
              portal.codigo52-crm.cloud
            </div>
          </div>
          <div style={{ padding:'20px', background:'#07111f' }}>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {['Nuevos modelos','Series','Mis pedidos'].map((tab,i) => (
                <div key={tab} style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600, background:i===0?'#1a8fe3':'rgba(255,255,255,0.06)', color:i===0?'white':'rgba(255,255,255,0.4)', cursor:'pointer' }}>{tab}</div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {[
                { tipo:'3 EN 1', modelo:'Samsung A07', badge:'NUEVO' },
                { tipo:'ESCUDO', modelo:'iPhone 15 Pro', badge:'POPULAR' },
                { tipo:'BLINDAJE', modelo:'Moto G56 5G', badge:'NUEVO' },
              ].map(item => (
                <div key={item.modelo} style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:12, border:'1px solid rgba(75,174,240,0.1)' }}>
                  <div style={{ height:52, borderRadius:8, background:'rgba(26,143,227,0.08)', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📱</div>
                  <div style={{ fontSize:9, fontWeight:700, color:'#4baef0', background:'rgba(26,143,227,0.15)', padding:'2px 6px', borderRadius:4, display:'inline-block', marginBottom:4 }}>{item.badge}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:'white' }}>{item.modelo}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{item.tipo}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding:'80px 5%' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <p style={{ fontSize:12, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#4baef0', marginBottom:10 }}>FUNCIONES</p>
            <h2 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:'clamp(26px,4vw,40px)', color:'white' }}>
              Todo lo que necesitas<br />para ordenar sin complicaciones
            </h2>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:14 }}>
            {[
              { icon:'🛒', title:'Pedidos en línea', desc:'Navega el catálogo, agrega al carrito y confirma en segundos. Sin llamadas ni mensajes.' },
              { icon:'📊', title:'Estado en tiempo real', desc:'Consulta el estatus de cada pedido. Sabrás exactamente en qué etapa está.' },
              { icon:'📅', title:'Historial completo', desc:'Accede a todos tus pedidos anteriores. Repite un pedido con un clic.' },
              { icon:'📋', title:'Catálogo actualizado', desc:'Siempre verás los modelos disponibles. Sin sorpresas al hacer el pedido.' },
              { icon:'📱', title:'Desde cualquier dispositivo', desc:'Celular, tablet y computadora. Haz tu pedido desde donde estés.' },
              { icon:'🔒', title:'Acceso seguro', desc:'Tu cuenta y pedidos están protegidos. Cada usuario accede solo a su información.' },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ width:46, height:46, borderRadius:12, background:'rgba(26,143,227,0.15)', border:'1px solid rgba(26,143,227,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:14 }}>{f.icon}</div>
                <h3 style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:15, color:'white', marginBottom:8 }}>{f.title}</h3>
                <p style={{ fontSize:13.5, color:'rgba(255,255,255,0.55)', lineHeight:1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" style={{ padding:'80px 5%', background:'rgba(255,255,255,0.02)', borderTop:'1px solid rgba(75,174,240,0.08)', borderBottom:'1px solid rgba(75,174,240,0.08)' }}>
        <div style={{ maxWidth:660, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <p style={{ fontSize:12, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#4baef0', marginBottom:10 }}>CÓMO FUNCIONA</p>
            <h2 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:'clamp(26px,4vw,38px)', color:'white' }}>
              Tres pasos para hacer<br />tu pedido
            </h2>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { n:'1', title:'Entra a tu cuenta', desc:'Inicia sesión con tu correo y contraseña. Si es tu primera vez, crea tu cuenta gratis.' },
              { n:'2', title:'Elige tus productos', desc:'Navega el catálogo, selecciona modelo, color y cantidad. Agrega todo al carrito.' },
              { n:'3', title:'Confirma y da seguimiento', desc:'Revisa el resumen, confirma tu pedido y recibe actualizaciones en tiempo real.' },
            ].map(s => (
              <div key={s.n} className="step-card">
                <div style={{ width:32, height:32, borderRadius:'50%', background:'#1a8fe3', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0, boxShadow:'0 0 16px rgba(26,143,227,0.4)' }}>{s.n}</div>
                <div>
                  <h3 style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:15, color:'white', marginBottom:5 }}>{s.title}</h3>
                  <p style={{ fontSize:13.5, color:'rgba(255,255,255,0.55)', lineHeight:1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:'80px 5%', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:300, background:'radial-gradient(ellipse, rgba(26,143,227,0.1) 0%, transparent 70%)', pointerEvents:'none' }}/>
        <h2 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:'clamp(26px,4vw,42px)', color:'white', marginBottom:16, position:'relative' }}>
          ¿Listo para ordenar más fácil?
        </h2>
        <p style={{ fontSize:16, color:'rgba(255,255,255,0.55)', marginBottom:36, maxWidth:440, margin:'0 auto 36px', position:'relative' }}>
          Accede al catálogo completo y gestiona tus pedidos desde el portal.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', position:'relative' }}>
          <Link href="/register" className="btn-primary">Crear cuenta gratuita →</Link>
          <Link href="/login" className="btn-secondary">Ya tengo cuenta</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:'28px 5%', borderTop:'1px solid rgba(75,174,240,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <CharisLogo size={26} />
          <span style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:14, color:'white' }}>Charis</span>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>· Portal de pedidos</span>
        </div>
        <div style={{ display:'flex', gap:20 }}>
          {['Catálogo','Mis pedidos','Mi cuenta'].map(l => (
            <Link key={l} href="/login" style={{ fontSize:13, color:'rgba(255,255,255,0.35)', textDecoration:'none' }}>{l}</Link>
          ))}
        </div>
        <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>© 2026 Charis</p>
      </footer>
    </div>
  )
}
