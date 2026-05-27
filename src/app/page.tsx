'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CharisLogotipo } from '@/components/CharisLogo'

// ── Tipos ────────────────────────────────────────────────────────────
interface Serie { tipo_case:string; total_modelos:number; total_colores:number; total_marcas:number; foto_url:string|null; descripcion:string|null }
interface Modelo { id:string; tipo_case:string; marca:string; modelo:string; color:string; foto_url:string|null }

// ── Imágenes por categoría (Unsplash, temáticas de accesorios móviles) ─
const SERIE_IMG: Record<string,string> = {
  'BLINDAJE': 'https://images.unsplash.com/photo-1604671368394-2240d0b1bb6c?w=600&q=70',
  '3 EN 1':   'https://images.unsplash.com/photo-1601593346740-925612772716?w=600&q=70',
  'ESCUDO':   'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=600&q=70',
  'ANILLO':   'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=70',
}
const SERIE_EMOJI: Record<string,string> = { 'BLINDAJE':'🔐', '3 EN 1':'🎯', 'ESCUDO':'🛡️', 'ANILLO':'💍' }
const HERO_IMGS = [
  'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=1400&q=70',
  'https://images.unsplash.com/photo-1601593346740-925612772716?w=1400&q=70',
  'https://images.unsplash.com/photo-1604671368394-2240d0b1bb6c?w=1400&q=70',
]

// ── Autoplay hook ────────────────────────────────────────────────────
function useAutoplay(len:number, delay=4500) {
  const [idx, setIdx] = useState(0)
  const t = useRef<ReturnType<typeof setInterval>>()
  const reset = useCallback(()=>{
    clearInterval(t.current)
    t.current = setInterval(()=>setIdx(i=>(i+1)%len), delay)
  },[len,delay])
  useEffect(()=>{ if(len>1){reset();return()=>clearInterval(t.current)} },[len,reset])
  const go=(i:number)=>{setIdx(i);reset()}
  return { idx, go, prev:()=>go((idx-1+len)%len), next:()=>go((idx+1)%len) }
}

// ── CSS ──────────────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');

  :root {
    --blue:   #1565c0;
    --blue2:  #4baef0;
    --navy:   #0d2137;
    --bg:     #f0f4f8;
    --bg2:    #ffffff;
    --border: #e2eaf4;
    --txt:    #0d2137;
    --txt2:   #3a6080;
    --txt3:   #8aaac4;
  }

  body { font-family: 'DM Sans', system-ui, sans-serif; background: var(--bg); color: var(--txt); }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel { background:linear-gradient(90deg,#e2eaf4 25%,#f5f8fc 50%,#e2eaf4 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:12px; }

  /* ── TOPBAR ── */
  .lp-topbar {
    background: var(--navy);
    height: 36px;
    display: flex;
    align-items: center;
    padding: 0 5%;
    gap: 20px;
    font-size: 12px;
  }
  .lp-topbar-item { color: rgba(255,255,255,.65); display:flex; align-items:center; gap:5px; white-space:nowrap; }
  .lp-topbar-sep  { color: rgba(255,255,255,.2); }

  /* ── NAV ── */
  .lp-nav {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.96);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
    height: 64px;
    display: flex;
    align-items: center;
    padding: 0 5%;
    gap: 32px;
    transition: box-shadow .3s;
  }
  .lp-nav.scrolled { box-shadow: 0 4px 24px rgba(13,33,55,.07); }
  .lp-navlinks { display:flex; gap:4px; align-items:center; flex:1; }
  .lp-navlink {
    padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
    color: var(--txt2); text-decoration: none; transition: all .15s; white-space:nowrap;
  }
  .lp-navlink:hover { color: var(--blue); background: rgba(21,101,192,.06); }
  .lp-nav-ctas { display:flex; gap:8px; align-items:center; flex-shrink:0; }

  /* ── BUTTONS ── */
  .btn-primary {
    display:inline-flex; align-items:center; gap:7px;
    padding:10px 22px; border-radius:100px;
    background: var(--blue); color:white;
    font-size:14px; font-weight:700; border:none; cursor:pointer;
    text-decoration:none; transition:all .2s; font-family:inherit;
    box-shadow:0 3px 14px rgba(21,101,192,.3);
  }
  .btn-primary:hover { background:#1976d2; transform:translateY(-1px); box-shadow:0 6px 22px rgba(21,101,192,.38); }
  .btn-ghost {
    display:inline-flex; align-items:center; gap:7px;
    padding:10px 22px; border-radius:100px;
    background:transparent; color: var(--blue);
    font-size:14px; font-weight:600;
    border:1.5px solid var(--blue2); cursor:pointer;
    text-decoration:none; transition:all .2s; font-family:inherit;
  }
  .btn-ghost:hover { background: var(--blue); color:white; border-color: var(--blue); }
  .btn-sm {
    display:inline-flex; align-items:center; gap:5px;
    padding:8px 16px; border-radius:100px; font-size:13px; font-weight:700;
    background: var(--blue); color:white; border:none; cursor:pointer;
    text-decoration:none; transition:all .18s; font-family:inherit;
  }
  .btn-sm:hover { background:#1976d2; }
  .btn-sm-ghost {
    display:inline-flex; align-items:center; gap:5px;
    padding:8px 16px; border-radius:100px; font-size:13px; font-weight:600;
    background:transparent; color: var(--blue); border:1.5px solid var(--border);
    cursor:pointer; text-decoration:none; transition:all .18s; font-family:inherit;
  }
  .btn-sm-ghost:hover { border-color: var(--blue); }

  /* ── HERO CAROUSEL ── */
  .hero-car { position:relative; overflow:hidden; height: clamp(420px, 55vw, 580px); }
  .hero-track { display:flex; height:100%; transition:transform .55s cubic-bezier(.4,0,.2,1); }
  .hero-slide { min-width:100%; height:100%; position:relative; }
  .hero-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .hero-overlay { position:absolute; inset:0; background:linear-gradient(90deg, rgba(13,33,55,.82) 0%, rgba(13,33,55,.4) 60%, transparent 100%); }
  .hero-content { position:relative; z-index:2; height:100%; display:flex; flex-direction:column; justify-content:center; padding:0 7%; }
  .hero-tag { display:inline-flex; align-items:center; gap:6px; padding:5px 14px; border-radius:100px; background:rgba(75,174,240,.2); border:1px solid rgba(75,174,240,.4); font-size:11px; font-weight:700; color: var(--blue2); margin-bottom:18px; letter-spacing:.06em; width:fit-content; }
  .hero-h { font-weight:900; font-size:clamp(28px,5vw,52px); line-height:1.1; color:white; margin-bottom:14px; max-width:560px; }
  .hero-h em { color: var(--blue2); font-style:normal; }
  .hero-p { font-size:clamp(14px,2vw,16px); color:rgba(255,255,255,.75); line-height:1.65; max-width:440px; margin-bottom:28px; }
  .hero-btns { display:flex; gap:10px; flex-wrap:wrap; }
  .hero-dot { width:8px; height:8px; border-radius:50%; cursor:pointer; transition:all .22s; background:rgba(255,255,255,.35); border:none; padding:0; }
  .hero-dot.act { background:white; width:22px; border-radius:4px; }
  .hero-arrow { position:absolute; top:50%; transform:translateY(-50%); background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; color:white; transition:background .15s; z-index:3; }
  .hero-arrow:hover { background:rgba(255,255,255,.24); }

  /* ── SEARCH BAR (debajo del hero) ── */
  .search-section {
    background:white; border-bottom:1px solid var(--border);
    padding:14px 5%;
    display:flex; align-items:center; gap:10px;
  }
  .search-wrap { flex:1; max-width:560px; display:flex; border:2px solid var(--blue); border-radius:8px; overflow:hidden; height:42px; }
  .search-wrap input { flex:1; border:none; padding:0 14px; font-size:13px; outline:none; color: var(--txt); font-family:inherit; }
  .search-wrap input::placeholder { color: var(--txt3); }
  .search-wrap button { background: var(--blue); border:none; padding:0 20px; color:white; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; transition:background .15s; white-space:nowrap; }
  .search-wrap button:hover { background:#1976d2; }
  .search-cats { display:flex; gap:6px; flex-wrap:wrap; }
  .search-cat { padding:5px 12px; border-radius:100px; border:1.5px solid var(--border); font-size:12px; font-weight:600; color: var(--txt2); cursor:pointer; text-decoration:none; transition:all .15s; white-space:nowrap; }
  .search-cat:hover { border-color: var(--blue); color: var(--blue); }

  /* ── SECCIONES GENERALES ── */
  .section { padding:60px 5%; }
  .section-white { background:white; }
  .section-gray  { background: var(--bg); }
  .section-navy  { background: var(--navy); }
  .section-hdr { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:28px; flex-wrap:wrap; gap:10px; }
  .section-title { font-weight:900; font-size:clamp(20px,3vw,26px); color: var(--txt); }
  .section-sub { font-size:13px; color: var(--txt3); margin-top:4px; }
  .see-all { font-size:13px; font-weight:700; color: var(--blue); text-decoration:none; white-space:nowrap; }
  .see-all:hover { text-decoration:underline; }
  .inner { max-width:1200px; margin:0 auto; }

  /* ── PROPUESTA B2B ── */
  .biz-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0; }
  .biz-prop { padding:20px 24px; border-right:1px solid var(--border); display:flex; gap:14px; align-items:flex-start; }
  .biz-prop:last-child { border-right:none; }
  .biz-ico { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
  .biz-t1 { font-size:13px; font-weight:800; color: var(--txt); margin-bottom:3px; }
  .biz-t2 { font-size:11.5px; color: var(--txt3); line-height:1.45; }

  /* ── SERIES GRID ── */
  .series-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(250px,1fr)); gap:16px; }
  .serie-card {
    border-radius:14px; overflow:hidden; text-decoration:none; display:block;
    border:1.5px solid var(--border); background:white;
    transition:transform .22s, box-shadow .22s, border-color .18s;
    box-shadow:0 2px 12px rgba(0,0,0,.05);
  }
  .serie-card:hover { transform:translateY(-4px); box-shadow:0 12px 36px rgba(21,101,192,.13); border-color: var(--blue2); }

  /* ── PRODUCTOS GRID ── */
  .prod-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(170px,1fr)); gap:12px; }
  .prod-card {
    background:white; border-radius:12px; border:1.5px solid var(--border);
    overflow:hidden; transition:all .2s; cursor:pointer;
  }
  .prod-card:hover { border-color: var(--blue2); box-shadow:0 8px 24px rgba(21,101,192,.1); transform:translateY(-2px); }
  .prod-img { height:110px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
  .prod-body { padding:10px 12px; }
  .prod-tipo { font-size:9px; font-weight:700; color: var(--blue); background:rgba(21,101,192,.08); padding:2px 7px; border-radius:4px; display:inline-block; margin-bottom:5px; letter-spacing:.04em; }
  .prod-name { font-size:12px; font-weight:700; color: var(--txt); line-height:1.3; margin-bottom:3px; }
  .prod-marca { font-size:11px; color: var(--txt3); }

  /* ── LOCK OVERLAY ── */
  .lock-overlay {
    position:absolute; inset:0; display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    background:rgba(240,244,248,.88); backdrop-filter:blur(4px);
    -webkit-backdrop-filter:blur(4px);
    gap:8px; opacity:0; transition:opacity .2s;
    border-radius:12px;
  }
  .prod-card:hover .lock-overlay { opacity:1; }
  .lock-text { font-size:11px; font-weight:700; color: var(--blue); text-align:center; }

  /* ── CTA BANNER ── */
  .cta-banner {
    background:linear-gradient(135deg, var(--navy) 0%, #1565c0 100%);
    border-radius:20px; padding:48px 48px; display:flex;
    align-items:center; justify-content:space-between;
    gap:32px; flex-wrap:wrap;
  }

  /* ── FEATURES ── */
  .feat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; }
  .feat-card {
    background:white; border-radius:14px; padding:24px 20px;
    border:1.5px solid var(--border); transition:all .2s;
  }
  .feat-card:hover { border-color: var(--blue2); box-shadow:0 8px 28px rgba(21,101,192,.08); transform:translateY(-2px); }

  /* ── TESTIMONIALS ── */
  .test-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; }
  .test-card { background:white; border-radius:14px; padding:22px 20px; border:1.5px solid var(--border); }

  /* ── FOOTER ── */
  .lp-footer { background: var(--navy); padding:40px 5% 24px; }
  .footer-grid { max-width:1200px; margin:0 auto; display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:40px; margin-bottom:32px; }
  .footer-col-title { font-size:10px; font-weight:700; color:rgba(255,255,255,.35); letter-spacing:.1em; text-transform:uppercase; margin-bottom:12px; }
  .footer-link { display:block; font-size:13px; color:rgba(255,255,255,.45); text-decoration:none; margin-bottom:7px; transition:color .14s; }
  .footer-link:hover { color: var(--blue2); }
  .footer-copy { max-width:1200px; margin:0 auto; padding-top:20px; border-top:1px solid rgba(255,255,255,.07); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }

  /* ── RESPONSIVE ── */
  @media(max-width:900px){
    .biz-grid { grid-template-columns:1fr 1fr; }
    .biz-prop:nth-child(2) { border-right:none; }
    .biz-prop { border-bottom:1px solid var(--border); }
    .biz-prop:nth-child(3), .biz-prop:nth-child(4) { border-bottom:none; }
    .footer-grid { grid-template-columns:1fr 1fr; gap:24px; }
    .lp-navlinks { display:none; }
    .search-section { flex-direction:column; align-items:stretch; }
    .search-wrap { max-width:100%; }
  }
  @media(max-width:600px){
    .lp-topbar { display:none; }
    .hero-content { padding:0 5%; }
    .biz-grid { grid-template-columns:1fr; }
    .biz-prop { border-right:none; border-bottom:1px solid var(--border); }
    .biz-prop:last-child { border-bottom:none; }
    .prod-grid { grid-template-columns:repeat(2,1fr); }
    .cta-banner { padding:32px 24px; }
    .footer-grid { grid-template-columns:1fr; gap:20px; }
    .hero-arrow { display:none; }
  }
`

// ── COMPONENTES PEQUEÑOS ─────────────────────────────────────────────
function LockBadge() {
  return (
    <div className="lock-overlay">
      <span style={{fontSize:20}}>🔒</span>
      <span className="lock-text">Inicia sesión<br/>para ver precio</span>
    </div>
  )
}

// ── PAGE ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router   = useRouter()
  const [scrolled,  setScrolled]  = useState(false)
  const [series,    setSeries]    = useState<Serie[]>([])
  const [modelos,   setModelos]   = useState<Modelo[]>([])
  const [loadingSeries,  setLS]   = useState(true)
  const [loadingModelos, setLM]   = useState(true)
  const [search,    setSearch]    = useState('')
  const hero = useAutoplay(HERO_IMGS.length)

  // Redirigir si ya hay sesión
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const rol = d.user?.rol
      if (['ADMIN','VENDEDOR','ALMACEN'].includes(rol)) router.push('/admin/orders')
      else if (rol === 'CLIENTE') router.push('/client')
    }).catch(() => {})

    // Scroll nav
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive:true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cargar catálogo público
  useEffect(() => {
    fetch('/api/client/catalog')
      .then(r => r.json())
      .then(d => { setSeries(d.series || []); setLS(false) })
      .catch(() => setLS(false))
    fetch('/api/client/catalog?limit=8')
      .then(r => r.json())
      .then(d => { setModelos((d.modelos || d.items || []).slice(0,8)); setLM(false) })
      .catch(() => setLM(false))
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/login?next=/client/catalog${search ? `?search=${encodeURIComponent(search)}` : ''}`)
  }

  const HERO_SLIDES = [
    {
      tag:'🏷️ DISTRIBUCIÓN MAYORISTA',
      h: <>Cases premium para<br/><em>todos los modelos</em></>,
      p:'El catálogo más completo de Blindaje, 3 en 1, Escudo y Anillo. Precios especiales para distribuidores.',
      cta:'Ver catálogo', cta2:'Crear cuenta gratis',
    },
    {
      tag:'💰 DESCUENTOS POR VOLUMEN',
      h: <>Ahorra hasta<br/><em>15% por volumen</em></>,
      p:'+50 pzas → 5% · +100 pzas → 10% · +200 pzas → 15%. Descuentos automáticos al confirmar.',
      cta:'Registrarme', cta2:'Ya tengo cuenta',
    },
    {
      tag:'✨ NOVEDADES 2026',
      h: <>Nuevos modelos<br/><em>disponibles ya</em></>,
      p:'S25 Ultra, iPhone 16 Series, OPPO A3 Pro, Vivo Y200 y más. Stock disponible para distribuidores.',
      cta:'Ver novedades', cta2:'Iniciar sesión',
    },
  ]
  const hs = HERO_SLIDES[hero.idx]

  return (
    <>
      <style>{CSS}</style>

      {/* ── TOPBAR ── */}
      <div className="lp-topbar">
        <span className="lp-topbar-item">📍 CDMX · Zona Metropolitana</span>
        <span className="lp-topbar-sep">|</span>
        <span className="lp-topbar-item">🚚 Entrega express mismo día</span>
        <span className="lp-topbar-sep">|</span>
        <span className="lp-topbar-item">% Descuentos desde 50 pzas</span>
        <div style={{marginLeft:'auto', display:'flex', gap:16}}>
          <Link href="/login"    style={{color:'rgba(255,255,255,.6)', fontSize:12, textDecoration:'none'}}>Ingresar</Link>
          <Link href="/register" style={{color:'var(--blue2)', fontSize:12, fontWeight:700, textDecoration:'none'}}>Crear cuenta</Link>
        </div>
      </div>

      {/* ── NAV ── */}
      <nav className={`lp-nav${scrolled?' scrolled':''}`}>
        <Link href="/" style={{textDecoration:'none', flexShrink:0}}>
          <CharisLogotipo height={38} variant="color" />
        </Link>
        <div className="lp-navlinks">
          <a href="#catalogo"  className="lp-navlink">Catálogo</a>
          <a href="#como"      className="lp-navlink">Cómo funciona</a>
          <a href="#beneficios"className="lp-navlink">Beneficios</a>
        </div>
        <div className="lp-nav-ctas">
          <Link href="/login"    className="btn-sm-ghost">Ingresar</Link>
          <Link href="/register" className="btn-sm">Crear cuenta →</Link>
        </div>
      </nav>

      {/* ── HERO CAROUSEL ── */}
      <div className="hero-car">
        <div className="hero-track" style={{transform:`translateX(-${hero.idx*100}%)`}}>
          {HERO_IMGS.map((img,i)=>(
            <div key={i} className="hero-slide">
              <img className="hero-img" src={img} alt="" loading={i===0?'eager':'lazy'}/>
              <div className="hero-overlay"/>
            </div>
          ))}
        </div>
        {/* Content superpuesto — siempre arriba */}
        <div style={{position:'absolute',inset:0,zIndex:2}}>
          <div className="hero-content">
            <div className="hero-tag">{hs.tag}</div>
            <h1 className="hero-h">{hs.h}</h1>
            <p className="hero-p">{hs.p}</p>
            <div className="hero-btns">
              <Link href="/register" className="btn-primary">{hs.cta} →</Link>
              <Link href="/login"    className="btn-ghost">{hs.cta2}</Link>
            </div>
          </div>
        </div>
        {/* Arrows */}
        <button className="hero-arrow" style={{left:16}} onClick={hero.prev}>‹</button>
        <button className="hero-arrow" style={{right:16}} onClick={hero.next}>›</button>
        {/* Dots */}
        <div style={{position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',display:'flex',gap:6,zIndex:3}}>
          {HERO_IMGS.map((_,i)=>(
            <button key={i} className={`hero-dot${i===hero.idx?' act':''}`} onClick={()=>hero.go(i)}/>
          ))}
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="search-section">
        <form className="search-wrap" onSubmit={handleSearch}>
          <input
            type="text" placeholder="Buscar modelo, marca, tipo de case…"
            value={search} onChange={e=>setSearch(e.target.value)}
          />
          <button type="submit">🔍 Buscar</button>
        </form>
        <div className="search-cats">
          {['BLINDAJE','3 EN 1','ESCUDO','ANILLO'].map(c=>(
            <Link key={c} href="/login" className="search-cat">
              {SERIE_EMOJI[c]} {c}
            </Link>
          ))}
        </div>
      </div>

      {/* ── PROPUESTA B2B ── */}
      <div style={{background:'white', borderBottom:'1px solid var(--border)'}}>
        <div className="inner">
          <div className="biz-grid">
            {[
              { ico:'🚚', bg:'#e3f2fd', label:'Entrega express CDMX', sub:'Pedidos antes de las 2 PM llegan el mismo día' },
              { ico:'%',  bg:'#e8f5e9', label:'Descuentos mayoristas',  sub:'+50 pzas → 5% · +100 → 10% · +200 → 15%' },
              { ico:'📦', bg:'#e8eaf6', label:'+800 modelos activos',   sub:'Para todas las marcas y categorías' },
              { ico:'📱', bg:'#fff3e0', label:'Pedidos por WhatsApp',   sub:'CharisBot procesa tu pedido al instante' },
            ].map((p,i)=>(
              <div key={i} className="biz-prop">
                <div className="biz-ico" style={{background:p.bg}}>{p.ico}</div>
                <div><div className="biz-t1">{p.label}</div><div className="biz-t2">{p.sub}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CATÁLOGO PÚBLICO (series) ── */}
      <section id="catalogo" className="section section-gray">
        <div className="inner">
          <div className="section-hdr">
            <div>
              <div className="section-title">Explora nuestro catálogo</div>
              <div className="section-sub">Selecciona una categoría para ver los modelos disponibles</div>
            </div>
            <Link href="/login" className="see-all">Ver catálogo completo →</Link>
          </div>
          <div className="series-grid">
            {loadingSeries ? [1,2,3,4].map(i=>(
              <div key={i} style={{height:240}} className="skel"/>
            )) : series.map(s=>{
              const img = s.foto_url || SERIE_IMG[s.tipo_case] || ''
              return (
                <Link key={s.tipo_case} href="/login" className="serie-card">
                  <div style={{height:160, position:'relative', overflow:'hidden', background:'#e2eaf4'}}>
                    {img
                      ? <img src={img} alt={s.tipo_case} style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform .4s'}}
                          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.06)')}
                          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
                        />
                      : <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',fontSize:48,opacity:.3}}>{SERIE_EMOJI[s.tipo_case]||'📦'}</div>
                    }
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,.45) 0%,transparent 55%)'}}/>
                    <span style={{position:'absolute',top:10,right:10,padding:'3px 10px',borderRadius:100,background:'rgba(0,0,0,.35)',backdropFilter:'blur(6px)',color:'white',fontSize:10,fontWeight:700}}>
                      {s.total_modelos} modelos
                    </span>
                    <span style={{position:'absolute',bottom:10,left:14,fontWeight:900,fontSize:16,color:'white',textShadow:'0 2px 8px rgba(0,0,0,.5)'}}>
                      {SERIE_EMOJI[s.tipo_case]||'📦'} {s.tipo_case}
                    </span>
                  </div>
                  <div style={{padding:'12px 14px'}}>
                    <p style={{fontSize:12,color:'var(--txt2)',marginBottom:8,lineHeight:1.4}}>{s.descripcion||'Cases de alta calidad disponibles en múltiples colores y marcas.'}</p>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{display:'flex',gap:6}}>
                        <span style={{fontSize:11,background:'var(--bg)',color:'var(--txt2)',fontWeight:600,padding:'2px 7px',borderRadius:5}}>{s.total_marcas} marcas</span>
                        <span style={{fontSize:11,background:'var(--bg)',color:'var(--txt2)',fontWeight:600,padding:'2px 7px',borderRadius:5}}>{s.total_colores} colores</span>
                      </div>
                      <span style={{fontSize:12,color:'var(--blue)',fontWeight:700}}>Ver →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── PRODUCTOS CON LOCK ── */}
      <section className="section section-white">
        <div className="inner">
          <div className="section-hdr">
            <div>
              <div className="section-title">🔥 Top ventas</div>
              <div className="section-sub">Inicia sesión para ver precios y agregar al carrito</div>
            </div>
            <Link href="/login" className="see-all">Ingresar para comprar →</Link>
          </div>
          <div className="prod-grid">
            {loadingModelos
              ? [1,2,3,4,5,6,7,8].map(i=><div key={i} style={{height:190}} className="skel"/>)
              : (modelos.length > 0 ? modelos : [
                  {id:'1',tipo_case:'BLINDAJE', marca:'Samsung',  modelo:'A55 5G',   color:'Negro', foto_url:null},
                  {id:'2',tipo_case:'3 EN 1',   marca:'Apple',    modelo:'iPhone 15',color:'Negro', foto_url:null},
                  {id:'3',tipo_case:'ESCUDO',   marca:'Motorola', modelo:'G56 5G',   color:'Negro', foto_url:null},
                  {id:'4',tipo_case:'ANILLO',   marca:'Xiaomi',   modelo:'Note 13',  color:'Azul',  foto_url:null},
                  {id:'5',tipo_case:'BLINDAJE', marca:'Samsung',  modelo:'S25 Ultra',color:'Negro', foto_url:null},
                  {id:'6',tipo_case:'3 EN 1',   marca:'OPPO',     modelo:'A3 Pro',   color:'Negro', foto_url:null},
                  {id:'7',tipo_case:'ESCUDO',   marca:'Vivo',     modelo:'Y200 5G',  color:'Negro', foto_url:null},
                  {id:'8',tipo_case:'ANILLO',   marca:'Apple',    modelo:'iPhone 16',color:'Blanco',foto_url:null},
                ] as Modelo[]).map(m=>(
                <div key={m.id} className="prod-card" onClick={()=>router.push('/login')}>
                  <div className="prod-img" style={{background:'#f0f4f8', position:'relative'}}>
                    {m.foto_url
                      ? <img src={m.foto_url} alt={m.modelo} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      : <span style={{fontSize:36,opacity:.2}}>{SERIE_EMOJI[m.tipo_case]||'📦'}</span>
                    }
                    <LockBadge/>
                  </div>
                  <div className="prod-body">
                    <div className="prod-tipo">{m.tipo_case}</div>
                    <div className="prod-name">{m.marca} {m.modelo}</div>
                    <div className="prod-marca">{m.color}</div>
                    <div style={{marginTop:8,fontSize:11,color:'var(--blue)',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                      🔒 Ver precio
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* CTA login inline */}
          <div style={{marginTop:28,background:'var(--bg)',borderRadius:14,border:'1px solid var(--border)',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
            <div>
              <div style={{fontWeight:800,fontSize:15,color:'var(--txt)',marginBottom:3}}>¿Quieres ver precios y hacer pedidos?</div>
              <div style={{fontSize:13,color:'var(--txt3)'}}>Crea tu cuenta de distribuidor gratis — aprobación en minutos</div>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <Link href="/register" className="btn-primary">Crear cuenta gratis →</Link>
              <Link href="/login"    className="btn-ghost">Ya tengo cuenta</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section id="como" className="section section-gray">
        <div className="inner">
          <div style={{textAlign:'center',marginBottom:48}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--blue2)',marginBottom:8}}>CÓMO FUNCIONA</div>
            <div className="section-title">Tres pasos para hacer tu pedido</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20,maxWidth:800,margin:'0 auto'}}>
            {[
              { n:'1', ico:'👤', title:'Crea tu cuenta', desc:'Regístrate gratis con tu correo. Aprobación rápida para distribuidores.' },
              { n:'2', ico:'🛒', title:'Elige y agrega', desc:'Navega el catálogo, selecciona modelo, color y cantidad. Agrega al carrito.' },
              { n:'3', ico:'✅', title:'Confirma y recibe', desc:'Confirma tu pedido y recibe actualizaciones en tiempo real hasta la entrega.' },
            ].map(s=>(
              <div key={s.n} style={{background:'white',border:'1.5px solid var(--border)',borderRadius:14,padding:'24px 20px',display:'flex',flexDirection:'column',gap:14,transition:'all .2s'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--blue2)';(e.currentTarget as HTMLElement).style.boxShadow='0 8px 24px rgba(21,101,192,.08)'}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.boxShadow='none'}}
              >
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'var(--blue)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,flexShrink:0,boxShadow:'0 4px 12px rgba(21,101,192,.3)'}}>{s.n}</div>
                  <div style={{fontSize:24}}>{s.ico}</div>
                </div>
                <div>
                  <div style={{fontWeight:900,fontSize:15,color:'var(--txt)',marginBottom:5}}>{s.title}</div>
                  <div style={{fontSize:13,color:'var(--txt2)',lineHeight:1.6}}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ── */}
      <section id="beneficios" className="section section-white">
        <div className="inner">
          <div style={{textAlign:'center',marginBottom:40}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--blue2)',marginBottom:8}}>BENEFICIOS</div>
            <div className="section-title">Todo lo que necesitas para ordenar<br/>sin complicaciones</div>
          </div>
          <div className="feat-grid">
            {[
              { icon:'🛒', title:'Pedidos en línea',        desc:'Navega el catálogo y confirma en segundos. Sin llamadas ni mensajes.' },
              { icon:'📊', title:'Estado en tiempo real',   desc:'Consulta el estatus de cada pedido. Sabrás exactamente en qué etapa está.' },
              { icon:'🔄', title:'Recompra en 1 clic',      desc:'Repite cualquier pedido anterior directamente desde tu historial.' },
              { icon:'📋', title:'Catálogo actualizado',    desc:'Stock en tiempo real. Sin sorpresas al hacer el pedido.' },
              { icon:'📱', title:'Mobile-first',            desc:'Desde tu celular, tablet o computadora. Donde estés.' },
              { icon:'🔒', title:'Acceso seguro',           desc:'Tu cuenta y pedidos protegidos. Solo tú ves tu información.' },
            ].map(f=>(
              <div key={f.title} className="feat-card">
                <div style={{width:44,height:44,borderRadius:12,background:'rgba(21,101,192,.07)',border:'1px solid rgba(21,101,192,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginBottom:14}}>{f.icon}</div>
                <div style={{fontWeight:800,fontSize:14,color:'var(--txt)',marginBottom:6}}>{f.title}</div>
                <div style={{fontSize:13,color:'var(--txt2)',lineHeight:1.6}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="section section-gray">
        <div className="inner">
          <div className="cta-banner">
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'.08em',color:'var(--blue2)',marginBottom:12,textTransform:'uppercase'}}>EMPIEZA HOY</div>
              <h2 style={{fontWeight:900,fontSize:'clamp(22px,4vw,36px)',color:'white',lineHeight:1.15,marginBottom:10}}>
                ¿Listo para ordenar<br/>más fácil?
              </h2>
              <p style={{fontSize:14,color:'rgba(255,255,255,.65)',lineHeight:1.6,maxWidth:380}}>
                Accede al catálogo completo, gestiona tus pedidos y recibe descuentos automáticos por volumen.
              </p>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,flexShrink:0}}>
              <Link href="/register" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px 28px',borderRadius:100,background:'white',color:'var(--blue)',fontSize:15,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 20px rgba(0,0,0,.15)',whiteSpace:'nowrap'}}>
                Crear cuenta gratuita →
              </Link>
              <Link href="/login" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px 28px',borderRadius:100,background:'transparent',color:'white',fontSize:14,fontWeight:600,border:'1.5px solid rgba(255,255,255,.35)',textDecoration:'none',whiteSpace:'nowrap'}}>
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="footer-grid">
          <div>
            <CharisLogotipo height={34} variant="white" />
            <p style={{fontSize:13,color:'rgba(255,255,255,.35)',marginTop:12,lineHeight:1.6}}>
              Portal de pedidos mayoristas para distribuidores<br/>de accesorios móviles.
            </p>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <Link href="/register" style={{fontSize:12,background:'var(--blue)',color:'white',padding:'7px 16px',borderRadius:100,textDecoration:'none',fontWeight:700}}>Crear cuenta</Link>
              <Link href="/login"    style={{fontSize:12,color:'rgba(255,255,255,.5)',padding:'7px 16px',border:'1px solid rgba(255,255,255,.15)',borderRadius:100,textDecoration:'none'}}>Ingresar</Link>
            </div>
          </div>
          <div>
            <div className="footer-col-title">Catálogo</div>
            {['Blindaje','3 en 1','Escudo','Anillo','Novedades'].map(l=>(
              <Link key={l} href="/login" className="footer-link">{l}</Link>
            ))}
          </div>
          <div>
            <div className="footer-col-title">Portal</div>
            {['Mis pedidos','Mi cuenta','Seguimiento','Carrito'].map(l=>(
              <Link key={l} href="/login" className="footer-link">{l}</Link>
            ))}
          </div>
          <div>
            <div className="footer-col-title">Contacto</div>
            <span className="footer-link">ventas@charis.com.mx</span>
            <span className="footer-link">Lun–Vie 9:00–18:00</span>
            <a href="https://wa.me/521XXXXXXXXXX" className="footer-link" style={{color:'#25d366'}}>📱 WhatsApp</a>
          </div>
        </div>
        <div className="footer-copy">
          <span style={{fontSize:12,color:'rgba(255,255,255,.2)'}}>© 2026 Charis · Distribuidor Mayorista · Todos los derechos reservados</span>
          <span style={{fontSize:11,color:'rgba(255,255,255,.2)'}}>Hecho con ♥ por Código 52</span>
        </div>
      </footer>
    </>
  )
}
