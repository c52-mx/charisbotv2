'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function CharisLogo({ size = 36, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#cgrad)"/>
      <rect x="12" y="7" width="16" height="26" rx="3" stroke="white" strokeWidth="2" fill="none" opacity="0.3"/>
      <rect x="10" y="9" width="20" height="22" rx="4" stroke="white" strokeWidth="1.5" fill="none" opacity="0.8"/>
      <rect x="14" y="11" width="12" height="16" rx="1.5" fill="white" opacity="0.12"/>
      <text x="20" y="22.5" fontFamily="Arial Black, sans-serif" fontSize="12" fontWeight="900" fill="white" textAnchor="middle" dominantBaseline="middle">C</text>
      <circle cx="20" cy="30" r="1.5" fill="white" opacity="0.5"/>
      <defs>
        <linearGradient id="cgrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a8fe3"/>
          <stop offset="100%" stopColor="#0d5fa3"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  @keyframes fadeUp { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

  body { background: #f0f4f8; }

  .nav-link {
    display:inline-flex; align-items:center;
    padding:7px 16px; border-radius:100px;
    font-size:13px; font-weight:500; color:#3a6080;
    cursor:pointer; transition:all .18s;
    text-decoration:none; border:1.5px solid transparent;
  }
  .nav-link:hover { color:#0a1e35; border-color:#d0dde8; background:#e8eef5; }

  .btn-primary {
    display:inline-flex; align-items:center; gap:8px;
    padding:13px 28px; border-radius:100px;
    background:#1a7fd4; color:white;
    font-size:15px; font-weight:600;
    border:none; cursor:pointer; text-decoration:none;
    transition:all .2s; font-family:inherit;
    box-shadow:0 4px 20px rgba(26,127,212,0.28);
  }
  .btn-primary:hover { background:#1a8fe3; transform:translateY(-2px); box-shadow:0 8px 32px rgba(26,127,212,0.38); }

  .btn-ghost {
    display:inline-flex; align-items:center; gap:8px;
    padding:13px 28px; border-radius:100px;
    background:transparent; color:#1a7fd4;
    font-size:15px; font-weight:600;
    border:2px solid #1a7fd4; cursor:pointer;
    text-decoration:none; transition:all .2s; font-family:inherit;
  }
  .btn-ghost:hover { background:#1a7fd4; color:white; }

  .feature-card {
    background:white; border-radius:18px; padding:28px 24px;
    border:1px solid #e2eaf4;
    transition:all .2s; cursor:default;
  }
  .feature-card:hover {
    transform:translateY(-4px);
    box-shadow:0 16px 48px rgba(26,127,212,0.1);
    border-color:#b8d4ed;
  }

  .step-card {
    display:flex; gap:16px; padding:22px 24px;
    background:white; border-radius:16px;
    border:1px solid #e2eaf4; align-items:flex-start;
    transition:all .2s;
  }
  .step-card:hover { border-color:#b8d4ed; box-shadow:0 8px 24px rgba(26,127,212,0.08); }

  ::-webkit-scrollbar { width:5px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#b8d4ed; border-radius:10px; }
`

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
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
    <>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '0 6%',
        background: scrolled ? 'rgba(240,244,248,0.92)' : '#f0f4f8',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid #e2eaf4' : '1px solid transparent',
        transition: 'all .3s',
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
          <CharisLogo size={32} />
          <span style={{ fontFamily:'Syne, system-ui, sans-serif', fontWeight:800, fontSize:17, color:'#0a1e35' }}>Charis</span>
        </Link>

        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <a href="#features" className="nav-link">Funciones</a>
          <a href="#como-funciona" className="nav-link">Cómo funciona</a>
          <Link href="/login" className="btn-primary" style={{ padding:'8px 20px', fontSize:13, boxShadow:'none', marginLeft:4 }}>
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding:'clamp(60px,10vw,100px) 6% 80px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-80, left:'50%', transform:'translateX(-50%)', width:700, height:350, background:'radial-gradient(ellipse, rgba(26,127,212,0.08) 0%, transparent 70%)', pointerEvents:'none' }}/>

        <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 14px', borderRadius:100, background:'rgba(26,127,212,0.1)', border:'1px solid rgba(26,127,212,0.2)', fontSize:12, fontWeight:600, color:'#1a7fd4', marginBottom:24, animation:'fadeIn 0.5s ease-out' }}>
          ✦ Portal de pedidos B2B
        </div>

        <h1 style={{ fontFamily:'Syne, system-ui, sans-serif', fontWeight:800, fontSize:'clamp(36px,6vw,66px)', lineHeight:1.08, color:'#0a1e35', maxWidth:720, margin:'0 auto', animation:'fadeUp 0.55s ease-out 0.1s both', letterSpacing:'-0.02em' }}>
          Haz tus pedidos<br />
          <span style={{ color:'#1a7fd4' }}>rápido y sin errores</span>
        </h1>

        <p style={{ fontSize:18, color:'#3a6080', maxWidth:500, lineHeight:1.65, margin:'20px auto 36px', animation:'fadeUp 0.55s ease-out 0.2s both' }}>
          Catálogo completo de cases, sincronización en tiempo real
          y seguimiento de pedidos desde cualquier dispositivo.
        </p>

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', animation:'fadeUp 0.55s ease-out 0.3s both' }}>
          <Link href="/login" className="btn-primary">Entrar a mi cuenta →</Link>
          <Link href="/register" className="btn-ghost">Crear cuenta nueva</Link>
        </div>

        {/* Mock preview */}
        <div style={{ marginTop:60, width:'100%', maxWidth:780, margin:'60px auto 0', background:'white', borderRadius:20, border:'1px solid #e2eaf4', boxShadow:'0 24px 80px rgba(26,127,212,0.1)', overflow:'hidden', animation:'fadeUp 0.6s ease-out 0.4s both' }}>
          <div style={{ background:'#f0f4f8', borderBottom:'1px solid #e2eaf4', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', gap:5 }}>
              {['#f87171','#fbbf24','#34d399'].map(c => <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }}/>)}
            </div>
            <div style={{ flex:1, background:'#e2eaf4', borderRadius:6, height:22, maxWidth:260, margin:'0 auto', display:'flex', alignItems:'center', paddingLeft:10, fontSize:11, color:'#8aaac4' }}>
              charis.com.mx
            </div>
          </div>
          <div style={{ padding:20, background:'#f5f8fc' }}>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {['Nuevos modelos','Series','Mis pedidos'].map((tab,i) => (
                <div key={tab} style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600, background:i===0?'#1a7fd4':'#e2eaf4', color:i===0?'white':'#3a6080' }}>{tab}</div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {[
                { tipo:'3 EN 1', modelo:'Samsung A07', badge:'NUEVO' },
                { tipo:'ESCUDO', modelo:'iPhone 15 Pro', badge:'POPULAR' },
                { tipo:'BLINDAJE', modelo:'Moto G56 5G', badge:'NUEVO' },
              ].map(item => (
                <div key={item.modelo} style={{ background:'white', borderRadius:10, padding:12, border:'1px solid #e2eaf4' }}>
                  <div style={{ height:52, borderRadius:8, background:'#f0f4f8', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📱</div>
                  <div style={{ fontSize:9, fontWeight:700, color:'#1a7fd4', background:'rgba(26,127,212,0.1)', padding:'2px 6px', borderRadius:4, display:'inline-block', marginBottom:4 }}>{item.badge}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#0a1e35' }}>{item.modelo}</div>
                  <div style={{ fontSize:10, color:'#8aaac4', marginTop:2 }}>{item.tipo}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding:'80px 6%', background:'white', borderTop:'1px solid #e2eaf4' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <p style={{ fontSize:12, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#1a7fd4', marginBottom:10 }}>FUNCIONES</p>
            <h2 style={{ fontFamily:'Syne, system-ui, sans-serif', fontWeight:800, fontSize:'clamp(24px,4vw,38px)', color:'#0a1e35' }}>
              Todo lo que necesitas para ordenar<br />sin complicaciones
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:14 }}>
            {[
              { icon:'🛒', title:'Pedidos en línea', desc:'Navega el catálogo, agrega al carrito y confirma en segundos. Sin llamadas ni mensajes.' },
              { icon:'📊', title:'Estado en tiempo real', desc:'Consulta el estatus de cada pedido en cualquier momento. Sabrás exactamente en qué etapa está.' },
              { icon:'📅', title:'Historial completo', desc:'Accede a todos tus pedidos anteriores y repite cualquiera con un solo clic.' },
              { icon:'📋', title:'Catálogo actualizado', desc:'Modelos disponibles con stock actualizado. Sin sorpresas al hacer el pedido.' },
              { icon:'📱', title:'Desde cualquier dispositivo', desc:'Celular, tablet o computadora. Haz tu pedido desde donde estés.' },
              { icon:'🔒', title:'Acceso seguro', desc:'Tu cuenta y pedidos están protegidos. Cada usuario accede solo a su información.' },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ width:46, height:46, borderRadius:12, background:'rgba(26,127,212,0.08)', border:'1px solid rgba(26,127,212,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:14 }}>{f.icon}</div>
                <h3 style={{ fontFamily:'Syne, system-ui, sans-serif', fontWeight:700, fontSize:15, color:'#0a1e35', marginBottom:8 }}>{f.title}</h3>
                <p style={{ fontSize:13.5, color:'#3a6080', lineHeight:1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" style={{ padding:'80px 6%', background:'#f0f4f8', borderTop:'1px solid #e2eaf4' }}>
        <div style={{ maxWidth:640, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <p style={{ fontSize:12, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#1a7fd4', marginBottom:10 }}>CÓMO FUNCIONA</p>
            <h2 style={{ fontFamily:'Syne, system-ui, sans-serif', fontWeight:800, fontSize:'clamp(24px,4vw,36px)', color:'#0a1e35' }}>
              Tres pasos para hacer<br />tu pedido
            </h2>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { n:'1', title:'Entra a tu cuenta', desc:'Inicia sesión con tu correo y contraseña. Si es tu primera vez, crea tu cuenta gratis en segundos.' },
              { n:'2', title:'Elige tus productos', desc:'Navega el catálogo por series, selecciona modelo, color y cantidad. Agrega todo al carrito.' },
              { n:'3', title:'Confirma y da seguimiento', desc:'Revisa el resumen, confirma tu pedido y recibe actualizaciones en tiempo real sobre su estado.' },
            ].map(s => (
              <div key={s.n} className="step-card">
                <div style={{ width:32, height:32, borderRadius:'50%', background:'#1a7fd4', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0, boxShadow:'0 4px 12px rgba(26,127,212,0.3)' }}>{s.n}</div>
                <div>
                  <h3 style={{ fontFamily:'Syne, system-ui, sans-serif', fontWeight:700, fontSize:15, color:'#0a1e35', marginBottom:5 }}>{s.title}</h3>
                  <p style={{ fontSize:13.5, color:'#3a6080', lineHeight:1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:'80px 6%', textAlign:'center', background:'#1a7fd4' }}>
        <h2 style={{ fontFamily:'Syne, system-ui, sans-serif', fontWeight:800, fontSize:'clamp(24px,4vw,40px)', color:'white', marginBottom:14 }}>
          ¿Listo para ordenar más fácil?
        </h2>
        <p style={{ fontSize:16, color:'rgba(255,255,255,0.75)', marginBottom:36, maxWidth:420, margin:'0 auto 36px' }}>
          Accede al catálogo completo y gestiona tus pedidos desde el portal.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Link href="/register" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 28px', borderRadius:100, background:'white', color:'#1a7fd4', fontSize:15, fontWeight:700, textDecoration:'none', transition:'all .2s', boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }}>
            Crear cuenta gratuita →
          </Link>
          <Link href="/login" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 28px', borderRadius:100, background:'transparent', color:'white', fontSize:15, fontWeight:600, border:'2px solid rgba(255,255,255,0.5)', textDecoration:'none', transition:'all .2s' }}>
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:'28px 6%', background:'#0a1e35', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <CharisLogo size={26} />
          <span style={{ fontFamily:'Syne, system-ui, sans-serif', fontWeight:800, fontSize:14, color:'white' }}>Charis</span>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>· Portal de pedidos</span>
        </div>
        <div style={{ display:'flex', gap:20 }}>
          {['Catálogo','Mis pedidos','Mi cuenta'].map(l => (
            <Link key={l} href="/login" style={{ fontSize:13, color:'rgba(255,255,255,0.35)', textDecoration:'none' }}>{l}</Link>
          ))}
        </div>
        <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>© 2026 Charis</p>
      </footer>
    </>
  )
}
