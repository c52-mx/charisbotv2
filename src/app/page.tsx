'use client'
import { useEffect, useState, useRef, useCallback, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CharisLogotipo } from '@/components/CharisLogo'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { HERO_IMGS } from '@/lib/carouselConfig'

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
// Imagen genérica de case para tarjetas de producto sin foto propia
const CASE_IMG = 'https://images.unsplash.com/photo-1601593346740-925612772716?w=400&q=70'

// ── Categorías fijas del catálogo (vista pública) ────────────────────
interface Categoria { tipo:string; emoji:string; img:string; desc:string; destacado?:boolean }
const CATEGORIAS: Categoria[] = [
  { tipo:'BLINDAJE', emoji:'🔐', img:SERIE_IMG['BLINDAJE'], desc:'Máxima protección con doble capa antichoque.' },
  { tipo:'3 EN 1',   emoji:'🎯', img:SERIE_IMG['3 EN 1'],   desc:'Estuche, mica y protector de cámara en un set.' },
  { tipo:'ESCUDO',   emoji:'🛡️', img:SERIE_IMG['ESCUDO'],   desc:'Bordes reforzados y agarre antideslizante.' },
  { tipo:'ANILLO',   emoji:'💍', img:SERIE_IMG['ANILLO'],   desc:'Anillo integrado con soporte 360°.' },
  { tipo:'NUEVOS PRODUCTOS', emoji:'✨', img:'', desc:'Los últimos modelos 2026, recién llegados.', destacado:true },
]
// HERO_IMGS importado de @/lib/carouselConfig (fuente compartida con el portal)

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

  /* Tokens de color/fuente definidos globalmente en globals.css */
  body { font-family: 'DM Sans', system-ui, sans-serif; background: var(--bg); color: var(--txt); font-size: 16px; line-height: 1.5; }

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
    padding: 8px 15px; border-radius: 8px; font-size: 16.5px; font-weight: 600;
    color: var(--txt2); text-decoration: none; transition: all .15s; white-space:nowrap;
  }
  .lp-navlink:hover { color: var(--blue); background: rgba(21,101,192,.06); }
  .lp-nav-ctas { display:flex; gap:8px; align-items:center; flex-shrink:0; }

  /* Botones (.btn-primary/.btn-ghost/.btn-sm/.btn-sm-ghost) viven en globals.css */

  /* Carrusel hero (.hero-car/.hero-track/.hero-slide/...) vive en globals.css */

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

  /* Sistema de secciones (.section/.inner/.section-title/...) vive en globals.css */

  /* Franja B2B (.biz-strip/.biz-grid/.biz-prop/...) vive en globals.css */

  /* ── SERIES GRID ── */
  /* .cat-label/.cat-intro y la familia .serie-card viven en globals.css */
  /* Imagen de fondo de la sección "Elige tu categoría" (específico del landing) */
  .section-catalogo { position:relative; background:var(--bg); overflow:hidden; }
  .section-catalogo::before {
    content:''; position:absolute; inset:0; z-index:0;
    background:
      linear-gradient(180deg, rgba(240,244,248,.93) 0%, rgba(240,244,248,.88) 45%, rgba(240,244,248,.96) 100%),
      url('/Img_Categoria.png') center/cover no-repeat;
  }
  .section-catalogo > .inner { position:relative; z-index:1; }
  .series-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:18px; }

  /* ── PRODUCTOS GRID ── */
  .prod-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
  .prod-card {
    background:white; border-radius:14px; border:1.5px solid var(--border);
    overflow:hidden; transition:all .2s; cursor:pointer;
  }
  .prod-card:hover { border-color: var(--blue2); box-shadow:0 10px 28px rgba(21,101,192,.12); transform:translateY(-3px); }
  .prod-img { height:150px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
  .prod-body { padding:14px 16px; }
  .prod-tipo { font-size:10px; font-weight:700; color: var(--blue); background:rgba(21,101,192,.08); padding:3px 9px; border-radius:5px; display:inline-block; margin-bottom:7px; letter-spacing:.04em; }
  .prod-name { font-size:14.5px; font-weight:700; color: var(--txt); line-height:1.3; margin-bottom:4px; }
  .prod-marca { font-size:13px; color: var(--txt3); }

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
  .lock-text { font-size:12.5px; font-weight:700; color: var(--blue); text-align:center; }

  /* ── CTA BANNER ── */
  .cta-banner {
    background:linear-gradient(135deg, var(--navy) 0%, #1565c0 100%);
    border-radius:20px; padding:48px; display:flex;
    align-items:center; justify-content:space-between;
    gap:40px; flex-wrap:wrap; overflow:hidden;
  }
  .cta-img { position:relative; flex:1 1 300px; min-width:280px; max-width:420px; }
  .cta-img img {
    width:100%; height:260px; object-fit:cover; border-radius:16px;
    box-shadow:0 16px 40px rgba(0,0,0,.35); display:block;
  }
  .cta-img-badge {
    position:absolute; bottom:14px; left:14px;
    background:rgba(255,255,255,.95); backdrop-filter:blur(6px);
    color:var(--navy); font-size:13px; font-weight:800;
    padding:8px 16px; border-radius:100px; box-shadow:0 6px 20px rgba(0,0,0,.2);
  }

  /* ── PASOS (cómo funciona) ── */
  .steps { display:flex; align-items:stretch; justify-content:center; gap:0; max-width:960px; margin:0 auto; }
  .step-card {
    flex:1 1 0; min-width:0; background:white; border:1.5px solid var(--border);
    border-radius:16px; padding:40px 22px 26px; text-align:center;
    position:relative; transition:transform .2s, box-shadow .2s, border-color .2s;
  }
  .step-card:hover { transform:translateY(-4px); border-color:var(--blue2); box-shadow:0 12px 30px rgba(21,101,192,.1); }
  .step-num {
    width:46px; height:46px; border-radius:50%; background:var(--blue); color:white;
    font-weight:900; font-size:18px; display:flex; align-items:center; justify-content:center;
    margin:0 auto 14px; box-shadow:0 6px 16px rgba(21,101,192,.35); border:4px solid white;
    outline:1.5px solid var(--border);
  }
  .step-ico { font-size:34px; margin-bottom:12px; line-height:1; }
  .step-title { font-weight:900; font-size:17px; color:var(--txt); margin-bottom:7px; }
  .step-desc { font-size:14px; color:var(--txt2); line-height:1.55; }
  .step-arrow {
    flex:0 0 auto; display:flex; align-items:center; justify-content:center;
    color:var(--blue2); font-size:30px; font-weight:900; padding:0 6px; align-self:center;
  }

  /* ── FEATURES ── */
  .feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
  .feat-card {
    background:white; border-radius:14px; padding:28px 24px;
    border:1.5px solid var(--border); transition:all .2s;
  }
  .feat-card:hover { border-color: var(--blue2); box-shadow:0 8px 28px rgba(21,101,192,.08); transform:translateY(-2px); }

  /* ── TESTIMONIALS ── */
  .test-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; }
  .test-card { background:white; border-radius:14px; padding:22px 20px; border:1.5px solid var(--border); }

  /* ── FOOTER ── */
  .lp-footer { background: var(--navy); padding:40px 5% 24px; }
  .footer-grid { max-width:1200px; margin:0 auto; display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:40px; margin-bottom:32px; }
  .footer-col-title { font-size:11.5px; font-weight:700; color:rgba(255,255,255,.35); letter-spacing:.1em; text-transform:uppercase; margin-bottom:12px; }
  .footer-link { display:block; font-size:14px; color:rgba(255,255,255,.45); text-decoration:none; margin-bottom:8px; transition:color .14s; }
  .footer-link:hover { color: var(--blue2); }
  .footer-copy { max-width:1200px; margin:0 auto; padding-top:20px; border-top:1px solid rgba(255,255,255,.07); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }

  /* ── RESPONSIVE ── */
  @media(max-width:1100px){
    .series-grid { grid-template-columns:repeat(3,1fr); }
  }
  @media(max-width:1000px){
    .prod-grid { grid-template-columns:repeat(3,1fr); }
    .feat-grid { grid-template-columns:repeat(2,1fr); }
  }
  @media(max-width:760px){
    .series-grid { grid-template-columns:repeat(2,1fr); }
    .steps { flex-direction:column; align-items:stretch; max-width:380px; }
    .step-arrow { transform:rotate(90deg); padding:6px 0; }
  }
  @media(max-width:480px){
    .series-grid { grid-template-columns:1fr; }
  }
  @media(max-width:900px){
    .footer-grid { grid-template-columns:1fr 1fr; gap:24px; }
    .lp-navlinks { display:none; }
    .search-section { flex-direction:column; align-items:stretch; }
    .search-wrap { max-width:100%; }
  }
  @media(max-width:600px){
    .lp-topbar { display:none; }
    .prod-grid { grid-template-columns:repeat(2,1fr); }
    .feat-grid { grid-template-columns:1fr; }
    .cta-banner { padding:32px 24px; }
    .footer-grid { grid-template-columns:1fr; gap:20px; }
    .cta-img { display:none; }
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
  const [promos, setPromos] = useState<{ imagen_url:string; titulo:string|null; subtitulo:string|null; cta_label:string|null; cta_href:string|null }[]>([])
  // Si hay promos cargadas desde /admin/landing se usan esas; si no hay (o
  // falla el fetch) se cae de vuelta a las imágenes estáticas — el landing
  // nunca queda en blanco.
  const heroImgs = promos.length ? promos.map(p => p.imagen_url) : HERO_IMGS
  const hero = useAutoplay(heroImgs.length)

  useEffect(() => {
    fetch('/api/landing-promos').then(r => r.json()).then(d => {
      if (d.items?.length) setPromos(d.items)
    }).catch(() => {})
  }, [])

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
  const safeIdx = Math.min(hero.idx, heroImgs.length - 1)
  const promo = promos[safeIdx]
  const hs = promo
    ? { tag:'', h: promo.titulo, p: promo.subtitulo||'', cta: promo.cta_label||'Ver catálogo', cta2:'Iniciar sesión', ctaHref: promo.cta_href||'/register' }
    : { ...HERO_SLIDES[safeIdx], ctaHref:'/register' }

  return (
    <>
      <style>{CSS}</style>

      {/* ── TOPBAR ── */}
      {/* <div className="lp-nav" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span className="lp-navlink">📍 CDMX · Zona Metropolitana</span>

        <span className="lp-navlink">🚚 Entrega express mismo día</span>

        <span className="lp-navlink">% Descuentos desde 50 pzas</span>
        <div style={{marginLeft:'auto', display:'flex', gap:16}}>
          <Link href="/login"    style={{color:'rgba(255,255,255,.6)', fontSize:12, textDecoration:'none'}}>Ingresar</Link>
          <Link href="/register" style={{color:'var(--blue2)', fontSize:12, fontWeight:700, textDecoration:'none'}}>Crear cuenta</Link>
        </div> 
      </div> */}

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
          {heroImgs.map((img,i)=>(
            <div key={i} className="hero-slide">
              <img className="hero-img" src={img} alt="" loading={i===0?'eager':'lazy'}/>
              <div className="hero-overlay"/>
            </div>
          ))}
        </div>
        {/* Content superpuesto — siempre arriba */}
        <div style={{position:'absolute',inset:0,zIndex:2}}>
          <div className="hero-content">
            {hs.tag ? <div className="hero-tag">{hs.tag}</div> : null}
            <h1 className="hero-h">{hs.h}</h1>
            <p className="hero-p">{hs.p}</p>
            <div className="hero-btns">
              <Link href={hs.ctaHref} className="btn-primary">{hs.cta} →</Link>
              <Link href="/login"    className="btn-ghost">{hs.cta2}</Link>
            </div>
          </div>
        </div>
        {/* Arrows */}
        <button className="hero-arrow" style={{left:16}} onClick={hero.prev}>‹</button>
        <button className="hero-arrow" style={{right:16}} onClick={hero.next}>›</button>
        {/* Dots */}
        <div style={{position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',display:'flex',gap:6,zIndex:3}}>
          {heroImgs.map((_,i)=>(
            <button key={i} className={`hero-dot${i===hero.idx?' act':''}`} onClick={()=>hero.go(i)}/>
          ))}
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      {/*<div className="search-section">
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
      </div>*/}

      {/* ── PROPUESTA B2B ── */}
      <div className="biz-strip">
        <div className="inner">
          <div className="biz-grid">
            {[
              { ico:'🚚', label:'Entrega express CDMX', sub:'Pedidos antes de las 2 PM llegan el mismo día' },
              { ico:'%',  label:'Descuentos mayoristas',  sub:'+50 pzas → 5% · +100 → 10% · +200 → 15%' },
              { ico:'📦', label:'+100 modelos activos',   sub:'Para todas las marcas y categorías' },
              { ico:<WhatsAppIcon size={28} color="#25D366"/>, label:'Pedidos por WhatsApp',   sub:'CharisBot procesa tu pedido al instante' },
            ].map((p,i)=>(
              <div key={i} className="biz-prop">
                <div className="biz-ico">{p.ico}</div>
                <div><div className="biz-t1">{p.label}</div><div className="biz-t2">{p.sub}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CATÁLOGO PÚBLICO (series) ── */}
      <section id="catalogo" className="section section-catalogo">
        <div className="inner">
          <div className="cat-intro">
            <div className="cat-intro-txt">
              {/* <div className="cat-label">🛍️ Catálogo Mayorista</div> */}
              <div className="section-title" style={{fontSize:'clamp(24px,3.5vw,32px)',marginTop:6}}>Elige tu categoría</div>
              <div style={{fontSize:14.5,color:'var(--txt2)',marginTop:8,maxWidth:440,marginLeft:'auto',marginRight:'auto',lineHeight:1.55}}>
                Selecciona una línea para ver los modelos disponibles
              </div>
              <div style={{fontSize:14.5,color:'var(--txt2)',marginTop:8,maxWidth:440,marginLeft:'auto',marginRight:'auto',lineHeight:1.55}}>
                 — precio visible al iniciar sesión —
              </div>
            </div>
          </div>
          <div className="series-grid">
            {loadingSeries ? [1,2,3,4,5].map(i=>(
              <div key={i} style={{height:300}} className="skel"/>
            )) : CATEGORIAS.map(c=>{
              const real = series.find(s=>s.tipo_case===c.tipo)
              return (
                <Link key={c.tipo} href="/login" className={`serie-card${c.destacado?' serie-card-new':''}`}>
                  <div className="serie-thumb">
                    {c.destacado
                      ? <div className="serie-thumb-new"><span style={{fontSize:60}}>{c.emoji}</span></div>
                      : <img src={real?.foto_url || c.img} alt={c.tipo} className="serie-thumb-img"/>
                    }
                    <div className="serie-thumb-grad"/>
                    {c.destacado
                      ? <span className="serie-badge serie-badge-new">NUEVO</span>
                      : real && <span className="serie-badge">{real.total_modelos} modelos</span>
                    }
                    <span className="serie-thumb-title">{c.emoji} {c.tipo}</span>
                  </div>
                  <div style={{padding:'14px 16px'}}>
                    <p style={{fontSize:12.5,color:'var(--txt2)',marginBottom:10,lineHeight:1.45,minHeight:36}}>{real?.descripcion || c.desc}</p>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{display:'flex',gap:6}}>
                        {real
                          ? <>
                              <span style={{fontSize:11,background:'var(--bg)',color:'var(--txt2)',fontWeight:600,padding:'3px 8px',borderRadius:6}}>{real.total_marcas} marcas</span>
                              <span style={{fontSize:11,background:'var(--bg)',color:'var(--txt2)',fontWeight:600,padding:'3px 8px',borderRadius:6}}>{real.total_colores} colores</span>
                            </>
                          : <span style={{fontSize:11,background:'var(--bg)',color:'var(--txt2)',fontWeight:600,padding:'3px 8px',borderRadius:6}}>Ver disponibilidad</span>
                        }
                      </div>
                      <span style={{fontSize:13,color:'var(--blue)',fontWeight:700,whiteSpace:'nowrap'}}>Ver →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          <div style={{textAlign:'center',marginTop:36}}>
            <Link href="/login" className="btn-primary" style={{padding:'13px 32px',fontSize:15}}>Ver catálogo completo →</Link>
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
              ? [1,2,3,4,5,6,7,8].map(i=><div key={i} style={{height:230}} className="skel"/>)
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
                    <img src={m.foto_url || CASE_IMG} alt={m.modelo} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    <LockBadge/>
                  </div>
                  <div className="prod-body">
                    <div className="prod-tipo">{m.tipo_case}</div>
                    <div className="prod-name">{m.marca} {m.modelo}</div>
                    <div className="prod-marca">{m.color}</div>
                    <div style={{marginTop:10,fontSize:12.5,color:'var(--blue)',fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
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
              <div style={{fontWeight:800,fontSize:17,color:'var(--txt)',marginBottom:4}}>¿Quieres ver precios y hacer pedidos?</div>
              <div style={{fontSize:14.5,color:'var(--txt3)'}}>Crea tu cuenta de distribuidor gratis — aprobación en minutos</div>
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
            <div style={{fontSize:18,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--blue2)',marginBottom:8}}>CÓMO FUNCIONA</div>
            <div className="section-title">Tres pasos para hacer tu pedido</div>
          </div>
          <div className="steps">
            {[
              { n:'1', ico:'👤', title:'Crea tu cuenta', desc:'Regístrate gratis con tu correo. Aprobación rápida para distribuidores.' },
              { n:'2', ico:'🛒', title:'Elige y agrega', desc:'Navega el catálogo, selecciona modelo, color y cantidad. Agrega al carrito.' },
              { n:'3', ico:'✅', title:'Confirma y recibe', desc:'Confirma tu pedido y recibe actualizaciones en tiempo real hasta la entrega.' },
            ].map((s,i,arr)=>(
              <Fragment key={s.n}>
                <div className="step-card">
                  <div className="step-num">{s.n}</div>
                  <div className="step-ico">{s.ico}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
                {i < arr.length-1 && <div className="step-arrow">→</div>}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ── */}
      <section id="beneficios" className="section section-white">
        <div className="inner">
          <div style={{textAlign:'center',marginBottom:40}}>
            <div style={{fontSize:18,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--blue2)',marginBottom:8}}>BENEFICIOS</div>
            <div className="section-title">Todo lo que necesitas para ordenar<br/>sin complicaciones</div>
          </div>
          <div className="feat-grid">
            {[
              { icon:'🛒', title:'Pedidos en línea',        desc:'Navega el catálogo y confirma en segundos. Sin llamadas ni mensajes.' },
              { icon:'📊', title:'Estado en tiempo real',   desc:'Consulta el estatus de cada pedido. Sabrás exactamente en qué etapa está.' },
              { icon:'🔄', title:'Recompra en 1 clic',      desc:'Repite cualquier pedido anterior directamente desde tu historial.' },
              { icon:'📋', title:'Catálogo actualizado',    desc:'Stock en tiempo real. Sin sorpresas al hacer el pedido.' },
              { icon:'📱', title:'Desde todas partes',            desc:'Desde tu celular, tablet o computadora. Donde estés.' },
              { icon:'🔒', title:'Acceso seguro',           desc:'Tu cuenta y pedidos protegidos. Solo tú ves tu información.' },
            ].map(f=>(
              <div key={f.title} className="feat-card">
                <div style={{width:50,height:50,borderRadius:13,background:'rgba(21,101,192,.07)',border:'1px solid rgba(21,101,192,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:25,marginBottom:16}}>{f.icon}</div>
                <div style={{fontWeight:800,fontSize:16.5,color:'var(--txt)',marginBottom:7}}>{f.title}</div>
                <div style={{fontSize:14.5,color:'var(--txt2)',lineHeight:1.6}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="section section-gray">
        <div className="inner">
          <div className="cta-banner">
            <div style={{flex:'1 1 320px'}}>
              <div style={{fontSize:18,fontWeight:700,letterSpacing:'.08em',color:'var(--blue2)',marginBottom:12,textTransform:'uppercase'}}>EMPIEZA HOY</div>
              <h2 style={{fontWeight:900,fontSize:'clamp(26px,4vw,40px)',color:'white',lineHeight:1.15,marginBottom:12}}>
                ¿Listo para ordenar<br/>más fácil?
              </h2>
              <p style={{fontSize:15.5,color:'rgba(255,255,255,.7)',lineHeight:1.6,maxWidth:400,marginBottom:24}}>
                Accede al catálogo completo, gestiona tus pedidos y recibe descuentos automáticos por volumen.
              </p>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <Link href="/register" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 30px',borderRadius:10,background:'white',color:'var(--blue)',fontSize:15.5,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 20px rgba(0,0,0,.15)',whiteSpace:'nowrap'}}>
                  Crear cuenta gratuita →
                </Link>
                <Link href="/login" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 30px',borderRadius:10,background:'transparent',color:'white',fontSize:15,fontWeight:600,border:'1.5px solid rgba(255,255,255,.35)',textDecoration:'none',whiteSpace:'nowrap'}}>
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
            <div className="cta-img">
              <img
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=700&q=75"
                alt="Pedidos y entregas de accesorios"
              />
              <div className="cta-img-badge">📦 Pedidos en minutos</div>
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
              <Link href="/register" style={{fontSize:12,background:'var(--blue)',color:'white',padding:'7px 16px',borderRadius:9,textDecoration:'none',fontWeight:700}}>Crear cuenta</Link>
              <Link href="/login"    style={{fontSize:12,color:'rgba(255,255,255,.5)',padding:'7px 16px',border:'1px solid rgba(255,255,255,.15)',borderRadius:9,textDecoration:'none'}}>Ingresar</Link>
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
            <a href="https://wa.me/521XXXXXXXXXX" className="footer-link" style={{color:'#25d366',display:'inline-flex',alignItems:'center',gap:7}}><WhatsAppIcon size={16}/> WhatsApp</a>
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
