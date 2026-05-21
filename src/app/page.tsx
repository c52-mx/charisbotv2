'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Logo replicado del imagotipo real de Charis ──────────────────────
// Dos cases apiladas formando "CH", azul claro + azul oscuro
function CharisIsotipo({ size = 40 }: { size?: number }) {
  const s = size
  return (
    <svg width={s} height={s * 1.1} viewBox="0 0 80 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Case trasera (azul claro, desplazada arriba-derecha) */}
      <g transform="translate(18, 0)">
        <rect x="2" y="2" width="46" height="62" rx="10" stroke="#4baef0" strokeWidth="3.5" fill="none"/>
        {/* Speaker top */}
        <rect x="17" y="5" width="12" height="3.5" rx="1.75" fill="#4baef0" opacity="0.7"/>
        {/* Botones laterales */}
        <rect x="-1" y="18" width="3" height="8" rx="1.5" fill="#4baef0" opacity="0.6"/>
        <rect x="-1" y="28" width="3" height="8" rx="1.5" fill="#4baef0" opacity="0.6"/>
        <rect x="49" y="22" width="3" height="12" rx="1.5" fill="#4baef0" opacity="0.6"/>
      </g>
      {/* Case delantera (azul oscuro, desplazada abajo-izquierda) */}
      <g transform="translate(0, 14)">
        <rect x="2" y="2" width="46" height="62" rx="10" stroke="#1565c0" strokeWidth="3.5" fill="white" fillOpacity="0.05"/>
        <rect x="2" y="2" width="46" height="62" rx="10" stroke="#1565c0" strokeWidth="3.5" fill="none"/>
        {/* Speaker top */}
        <rect x="17" y="5" width="12" height="3.5" rx="1.75" fill="#1565c0" opacity="0.7"/>
        {/* Botones */}
        <rect x="-1" y="18" width="3" height="8" rx="1.5" fill="#1565c0" opacity="0.7"/>
        <rect x="-1" y="28" width="3" height="8" rx="1.5" fill="#1565c0" opacity="0.7"/>
        <rect x="49" y="22" width="3" height="12" rx="1.5" fill="#1565c0" opacity="0.7"/>
        {/* Letras CH dentro de la case */}
        <text x="25" y="42" fontFamily="Arial Black, sans-serif" fontSize="22" fontWeight="900" fill="#1565c0" textAnchor="middle" dominantBaseline="middle" letterSpacing="-1">CH</text>
      </g>
    </svg>
  )
}

function CharisLogotipo({ height = 36 }: { height?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <CharisIsotipo size={height * 0.85} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{
          fontFamily: 'Arial Black, system-ui, sans-serif',
          fontWeight: 900, fontSize: height * 0.55,
          color: '#1565c0', letterSpacing: '0.04em',
        }}>CHARIS</span>
        <span style={{
          fontSize: height * 0.22, color: '#4baef0',
          fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
        }}>Distribuidor Mayorista</span>
      </div>
    </div>
  )
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeUp { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

  .btn-primary {
    display:inline-flex; align-items:center; gap:8px;
    padding:12px 28px; border-radius:100px;
    background:#1565c0; color:white;
    font-size:15px; font-weight:700;
    border:none; cursor:pointer; text-decoration:none;
    transition:all .2s; font-family:inherit;
    box-shadow:0 4px 20px rgba(21,101,192,0.3);
  }
  .btn-primary:hover { background:#1976d2; transform:translateY(-2px); box-shadow:0 8px 32px rgba(21,101,192,0.4); }

  .btn-ghost {
    display:inline-flex; align-items:center; gap:8px;
    padding:12px 28px; border-radius:100px;
    background:transparent; color:#1565c0;
    font-size:15px; font-weight:600;
    border:2px solid #4baef0; cursor:pointer;
    text-decoration:none; transition:all .2s; font-family:inherit;
  }
  .btn-ghost:hover { background:#1565c0; color:white; border-color:#1565c0; }

  .feature-card {
    background:white; border-radius:18px; padding:28px 24px;
    border:1px solid #e2eaf4; transition:all .22s;
  }
  .feature-card:hover {
    transform:translateY(-4px);
    box-shadow:0 16px 48px rgba(21,101,192,0.1);
    border-color:#4baef0;
  }

  .step-card {
    display:flex; gap:16px; padding:22px 24px;
    background:white; border-radius:16px;
    border:1px solid #e2eaf4; align-items:flex-start; transition:all .2s;
  }
  .step-card:hover { border-color:#4baef0; box-shadow:0 8px 24px rgba(21,101,192,0.08); }
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

    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '0 6%', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(240,244,248,0.95)' : '#f0f4f8',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid #d0dde8' : '1px solid transparent',
        transition: 'all .3s',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <CharisLogotipo height={38} />
        </Link>
        <Link href="/login" className="btn-primary" style={{ padding:'9px 22px', fontSize:14 }}>
          Iniciar sesión →
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding:'clamp(60px,10vw,100px) 6% 80px', textAlign:'center', background:'#f0f4f8', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-100, left:'50%', transform:'translateX(-50%)', width:800, height:400, background:'radial-gradient(ellipse, rgba(75,174,240,0.12) 0%, transparent 70%)', pointerEvents:'none' }}/>

        <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 16px', borderRadius:100, background:'rgba(21,101,192,0.08)', border:'1px solid rgba(21,101,192,0.2)', fontSize:12, fontWeight:700, color:'#1565c0', marginBottom:24, animation:'fadeIn 0.5s ease-out', letterSpacing:'.04em' }}>
          ✦ PORTAL B2B · DISTRIBUIDORES
        </div>

        <h1 style={{ fontFamily:'Arial Black, system-ui, sans-serif', fontWeight:900, fontSize:'clamp(34px,6vw,62px)', lineHeight:1.08, color:'#0d2137', maxWidth:720, margin:'0 auto', animation:'fadeUp 0.55s ease-out 0.1s both', letterSpacing:'-0.01em' }}>
          Haz tus pedidos<br />
          <span style={{ color:'#1565c0' }}>rápido y sin errores</span>
        </h1>

        <p style={{ fontSize:18, color:'#3a6080', maxWidth:500, lineHeight:1.65, margin:'20px auto 36px', animation:'fadeUp 0.55s ease-out 0.2s both' }}>
          Catálogo completo de cases, sincronización en tiempo real
          y seguimiento de pedidos desde cualquier dispositivo.
        </p>

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', animation:'fadeUp 0.55s ease-out 0.3s both' }}>
          <Link href="/login" className="btn-primary">Entrar a mi cuenta →</Link>
          <Link href="/register" className="btn-ghost">Crear cuenta nueva</Link>
        </div>

        {/* Preview mockup */}
        <div style={{ marginTop:60, maxWidth:780, margin:'60px auto 0', background:'white', borderRadius:20, border:'1px solid #d0dde8', boxShadow:'0 24px 80px rgba(21,101,192,0.1)', overflow:'hidden', animation:'fadeUp 0.6s ease-out 0.4s both' }}>
          {/* Browser bar */}
          <div style={{ background:'#f0f4f8', borderBottom:'1px solid #e2eaf4', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', gap:5 }}>
              {['#f87171','#fbbf24','#34d399'].map(c => <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }}/>)}
            </div>
            <div style={{ flex:1, background:'#e2eaf4', borderRadius:6, height:22, maxWidth:260, margin:'0 auto', display:'flex', alignItems:'center', paddingLeft:10, fontSize:11, color:'#8aaac4' }}>
              portal.charis.com.mx
            </div>
          </div>
          {/* Content preview */}
          <div style={{ padding:20, background:'#f5f8fc' }}>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {['Nuevos modelos','Series','Mis pedidos'].map((t,i) => (
                <div key={t} style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:i===0?'#1565c0':'#e2eaf4', color:i===0?'white':'#3a6080' }}>{t}</div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {[{tipo:'3 EN 1',modelo:'Samsung A07'},{tipo:'ESCUDO',modelo:'iPhone 15 Pro'},{tipo:'BLINDAJE',modelo:'Moto G56 5G'}].map(it => (
                <div key={it.modelo} style={{ background:'white', borderRadius:10, padding:12, border:'1px solid #e2eaf4' }}>
                  <div style={{ height:52, borderRadius:8, background:'#f0f4f8', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📱</div>
                  <div style={{ fontSize:9, fontWeight:700, color:'#1565c0', background:'rgba(21,101,192,0.08)', padding:'2px 6px', borderRadius:4, display:'inline-block', marginBottom:4 }}>NUEVO</div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#0d2137' }}>{it.modelo}</div>
                  <div style={{ fontSize:10, color:'#8aaac4', marginTop:2 }}>{it.tipo}</div>
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
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#4baef0', marginBottom:10 }}>FUNCIONES</p>
            <h2 style={{ fontFamily:'Arial Black, system-ui, sans-serif', fontWeight:900, fontSize:'clamp(24px,4vw,36px)', color:'#0d2137' }}>
              Todo lo que necesitas para ordenar<br />sin complicaciones
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:14 }}>
            {[
              { icon:'🛒', title:'Pedidos en línea', desc:'Navega el catálogo, agrega al carrito y confirma en segundos. Sin llamadas ni mensajes.' },
              { icon:'📊', title:'Estado en tiempo real', desc:'Consulta el estatus de cada pedido. Sabrás exactamente en qué etapa está.' },
              { icon:'📅', title:'Historial completo', desc:'Accede a todos tus pedidos anteriores y repite cualquiera con un clic.' },
              { icon:'📋', title:'Catálogo actualizado', desc:'Modelos disponibles con stock al día. Sin sorpresas al hacer el pedido.' },
              { icon:'📱', title:'Desde cualquier dispositivo', desc:'Celular, tablet o computadora. Haz tu pedido desde donde estés.' },
              { icon:'🔒', title:'Acceso seguro', desc:'Tu cuenta y pedidos protegidos. Cada usuario accede solo a su información.' },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ width:46, height:46, borderRadius:12, background:'rgba(21,101,192,0.07)', border:'1px solid rgba(21,101,192,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:14 }}>{f.icon}</div>
                <h3 style={{ fontFamily:'Arial Black, system-ui, sans-serif', fontWeight:900, fontSize:14, color:'#0d2137', marginBottom:8 }}>{f.title}</h3>
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
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#4baef0', marginBottom:10 }}>CÓMO FUNCIONA</p>
            <h2 style={{ fontFamily:'Arial Black, system-ui, sans-serif', fontWeight:900, fontSize:'clamp(24px,4vw,34px)', color:'#0d2137' }}>
              Tres pasos para hacer<br />tu pedido
            </h2>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { n:'1', title:'Entra a tu cuenta', desc:'Inicia sesión con tu correo y contraseña. Si es tu primera vez, crea tu cuenta gratis.' },
              { n:'2', title:'Elige tus productos', desc:'Navega el catálogo por series, selecciona modelo, color y cantidad. Agrega todo al carrito.' },
              { n:'3', title:'Confirma y da seguimiento', desc:'Revisa el resumen, confirma tu pedido y recibe actualizaciones en tiempo real.' },
            ].map(s => (
              <div key={s.n} className="step-card">
                <div style={{ width:34, height:34, borderRadius:'50%', background:'#1565c0', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, flexShrink:0, boxShadow:'0 4px 12px rgba(21,101,192,0.3)', fontFamily:'Arial Black, sans-serif' }}>{s.n}</div>
                <div>
                  <h3 style={{ fontFamily:'Arial Black, system-ui, sans-serif', fontWeight:900, fontSize:14, color:'#0d2137', marginBottom:5 }}>{s.title}</h3>
                  <p style={{ fontSize:13.5, color:'#3a6080', lineHeight:1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:'80px 6%', textAlign:'center', background:'#1565c0' }}>
        <h2 style={{ fontFamily:'Arial Black, system-ui, sans-serif', fontWeight:900, fontSize:'clamp(24px,4vw,38px)', color:'white', marginBottom:14 }}>
          ¿Listo para ordenar más fácil?
        </h2>
        <p style={{ fontSize:16, color:'rgba(255,255,255,0.7)', marginBottom:36, maxWidth:400, margin:'0 auto 36px' }}>
          Accede al catálogo completo y gestiona tus pedidos desde el portal.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Link href="/register" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 28px', borderRadius:100, background:'white', color:'#1565c0', fontSize:15, fontWeight:700, textDecoration:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.15)', transition:'all .2s' }}>
            Crear cuenta gratuita →
          </Link>
          <Link href="/login" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 28px', borderRadius:100, background:'transparent', color:'white', fontSize:15, fontWeight:600, border:'2px solid rgba(255,255,255,0.5)', textDecoration:'none', transition:'all .2s' }}>
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:'28px 6%', background:'#0d2137', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <CharisLogotipo height={30} />
        <div style={{ display:'flex', gap:20 }}>
          {['Catálogo','Mis pedidos','Mi cuenta'].map(l => (
            <Link key={l} href="/login" style={{ fontSize:13, color:'rgba(255,255,255,0.35)', textDecoration:'none' }}>{l}</Link>
          ))}
        </div>
        <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>© 2026 Charis · Distribuidor Mayorista</p>
      </footer>
    </>
  )
}
