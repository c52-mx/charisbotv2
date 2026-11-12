'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Truck, Percent, Boxes, Lock, PackagePlus,
  ShoppingCart, PackageSearch, RotateCcw, ListChecks, Smartphone, ShieldCheck,
} from 'lucide-react'
import { CharisLogotipo } from '@/components/CharisLogo'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { HERO_IMGS } from '@/lib/carouselConfig'

// ── Tipos ────────────────────────────────────────────────────────────
interface Serie { tipo_case:string; total_modelos:number; total_colores:number; total_marcas:number; foto_url:string|null; descripcion:string|null }
interface Modelo { id:string; tipo_case:string; marca:string; modelo:string; color:string; foto_url:string|null }

// ── Contacto ─────────────────────────────────────────────────────────
// TODO: número de pruebas QA. Reemplazar por el número real de WhatsApp Business.
const WHATSAPP_URL = 'https://wa.me/525577616497'
const CONTACT_EMAIL = 'ventas@charis.com.mx'

// ── Imágenes por categoría (Unsplash, temáticas de accesorios móviles) ─
const SERIE_IMG: Record<string,string> = {
  'BLINDAJE': 'https://images.unsplash.com/photo-1604671368394-2240d0b1bb6c?w=600&q=70',
  '3 EN 1':   'https://images.unsplash.com/photo-1601593346740-925612772716?w=600&q=70',
  'ESCUDO':   'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=600&q=70',
  'ANILLO':   'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=70',
}
// Imagen genérica de case para tarjetas de producto sin foto propia
const CASE_IMG = 'https://images.unsplash.com/photo-1601593346740-925612772716?w=400&q=70'

// Los tipos vienen en mayúsculas desde la BD; en pantalla se muestran en sentence case
const TIPO_LABEL: Record<string,string> = {
  'BLINDAJE':'Blindaje', '3 EN 1':'3 en 1', 'ESCUDO':'Escudo', 'ANILLO':'Anillo',
}
const labelTipo = (t:string) => TIPO_LABEL[t] || t

// ── Categorías fijas del catálogo (vista pública) ────────────────────
interface Categoria { tipo:string; label:string; img:string; desc:string; destacado?:boolean }
const CATEGORIAS: Categoria[] = [
  { tipo:'BLINDAJE', label:'Blindaje', img:SERIE_IMG['BLINDAJE'], desc:'Máxima protección con doble capa antichoque.' },
  { tipo:'3 EN 1',   label:'3 en 1',   img:SERIE_IMG['3 EN 1'],   desc:'Estuche, mica y protector de cámara en un set.' },
  { tipo:'ESCUDO',   label:'Escudo',   img:SERIE_IMG['ESCUDO'],   desc:'Bordes reforzados y agarre antideslizante.' },
  { tipo:'ANILLO',   label:'Anillo',   img:SERIE_IMG['ANILLO'],   desc:'Anillo integrado con soporte 360°.' },
  { tipo:'NUEVOS PRODUCTOS', label:'Nuevos productos', img:'', desc:'Los últimos modelos 2026, recién llegados.', destacado:true },
]
// HERO_IMGS importado de @/lib/carouselConfig (fuente compartida con el portal)

// ── Pasos, beneficios y ejemplo de seguimiento ───────────────────────
const PASOS = [
  { n:'01', title:'Crea tu cuenta',    desc:'Regístrate con tu correo. Aprobación en minutos para distribuidores.' },
  { n:'02', title:'Elige y agrega',    desc:'Navega el catálogo, selecciona modelo, color y cantidad. Agrega al carrito.' },
  { n:'03', title:'Confirma y recibe', desc:'Confirma tu pedido y sigue su estado hasta la entrega.' },
]

const BENEFICIOS = [
  { Icon:ShoppingCart,  title:'Pedidos en línea',      desc:'Navega el catálogo y confirma en segundos. Sin llamadas ni mensajes.' },
  { Icon:PackageSearch, title:'Estado de cada pedido', desc:'Consulta en qué etapa va cada pedido, de la confirmación a la entrega.' },
  { Icon:RotateCcw,     title:'Recompra en 1 clic',    desc:'Repite cualquier pedido anterior directamente desde tu historial.' },
  { Icon:ListChecks,    title:'Catálogo actualizado',  desc:'Stock en tiempo real. Sin sorpresas al hacer el pedido.' },
  { Icon:Smartphone,    title:'Desde cualquier lugar', desc:'Desde tu celular, tablet o computadora.' },
  { Icon:ShieldCheck,   title:'Acceso seguro',         desc:'Tu cuenta y pedidos protegidos. Solo tú ves tu información.' },
]

// Ejemplo ilustrativo del seguimiento que ve el cliente en el portal
const SEGUIMIENTO: { label:string; when:string; state:'done'|'now'|'next' }[] = [
  { label:'Pedido confirmado', when:'10 nov · 10:42',   state:'done' },
  { label:'En preparación',    when:'11 nov · 09:15',   state:'done' },
  { label:'En reparto',        when:'12 nov · 08:30',   state:'now'  },
  { label:'Entregado',         when:'Estimado 14 nov',  state:'next' },
]

// ── Autoplay hook ────────────────────────────────────────────────────
function useAutoplay(len:number, delay=4500) {
  const [idx, setIdx] = useState(0)
  const t = useRef<ReturnType<typeof setInterval>>()
  const reset = useCallback(()=>{
    clearInterval(t.current)
    // Respeta "reducir movimiento": sin rotación automática
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    t.current = setInterval(()=>setIdx(i=>(i+1)%len), delay)
  },[len,delay])
  useEffect(()=>{ if(len>1){reset();return()=>clearInterval(t.current)} },[len,reset])
  const go=(i:number)=>{setIdx(i);reset()}
  return { idx, go, prev:()=>go((idx-1+len)%len), next:()=>go((idx+1)%len) }
}

// ── CSS ──────────────────────────────────────────────────────────────
// Tokens de color, tipografía y movimiento definidos en globals.css
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

  body { font-family: var(--font-body), system-ui, sans-serif; background: var(--bg); color: var(--txt); font-size: 16px; line-height: 1.5; }

  .skel { background: var(--border); border-radius: 12px; }
  .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

  /* ── NAV ── */
  .lp-nav {
    position: sticky; top: 0; z-index: 100;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
    height: 64px;
    display: flex; align-items: center;
    padding: 0 5%; gap: 32px;
  }
  .lp-navlinks { display:flex; gap:4px; align-items:center; flex:1; }
  .lp-navlink {
    padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500;
    color: var(--txt2); text-decoration: none; white-space: nowrap;
    transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
  }
  .lp-navlink:hover { color: var(--txt); background: var(--blue-tint); }
  .lp-nav-ctas { display:flex; gap:16px; align-items:center; flex-shrink:0; }
  .lp-textlink {
    font-size: 14px; font-weight: 500; color: var(--txt2); text-decoration: none;
    padding: 8px 4px; transition: color var(--dur-fast) var(--ease);
  }
  .lp-textlink:hover { color: var(--blue); }

  /* Botones (.btn-primary/.btn-ghost/.btn-sm/.btn-sm-ghost) y carrusel (.hero-*) viven en globals.css */

  /* ── CATEGORÍAS ── */
  .series-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:16px; }
  .serie-body { padding:16px; }
  .serie-desc { font-size:14px; color:var(--txt2); line-height:1.5; min-height:42px; margin-bottom:16px; }
  .serie-foot { display:flex; justify-content:space-between; align-items:center; gap:8px; }
  .meta { font-size:12px; color:var(--txt3); }
  .serie-go { display:inline-flex; align-items:center; gap:4px; font-size:14px; font-weight:500; color:var(--blue); white-space:nowrap; }

  /* ── PRODUCTOS ── */
  .prod-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
  .prod-card {
    background:var(--bg2); border-radius:12px; border:1px solid var(--border);
    overflow:hidden; cursor:pointer;
    transition: border-color var(--dur-fast) var(--ease);
  }
  .prod-card:hover { border-color: var(--blue); }
  .prod-img { height:160px; background:var(--bg); overflow:hidden; }
  .prod-img img { width:100%; height:100%; object-fit:cover; display:block; }
  .prod-body { padding:16px; }
  .prod-tipo { font-size:12px; font-weight:500; color:var(--txt3); margin-bottom:4px; }
  .prod-name { font-size:16px; font-weight:600; color:var(--txt); line-height:1.3; }
  .prod-marca { font-size:14px; color:var(--txt2); margin-top:4px; }
  .prod-lock { margin-top:12px; font-size:13px; color:var(--txt3); display:flex; align-items:center; gap:8px; }

  .login-cta {
    margin-top:32px; background:var(--bg); border-radius:12px; border:1px solid var(--border);
    padding:24px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;
  }
  .login-cta-t { font-weight:600; font-size:16px; color:var(--txt); margin-bottom:4px; }
  .login-cta-s { font-size:14px; color:var(--txt3); }

  /* ── CÓMO FUNCIONA: pasos + ejemplo de seguimiento ── */
  .how { display:grid; grid-template-columns:5fr 6fr; gap:64px; align-items:center; }
  .how-steps { display:flex; flex-direction:column; }
  .how-step { display:flex; gap:16px; padding:24px 0; border-top:1px solid var(--border); }
  .how-step:last-child { border-bottom:1px solid var(--border); }
  .how-n { font-size:14px; color:var(--blue); width:24px; flex-shrink:0; padding-top:2px; }
  .how-t { font-size:20px; font-weight:600; color:var(--txt); margin-bottom:4px; }
  .how-d { font-size:14px; color:var(--txt2); line-height:1.6; max-width:360px; }

  .track-card {
    background:var(--bg2); border:1px solid var(--border); border-radius:16px;
    box-shadow:var(--shadow-pop); padding:24px; max-width:480px; width:100%; justify-self:center;
  }
  .track-head { display:flex; justify-content:space-between; align-items:baseline; gap:16px; padding-bottom:16px; margin-bottom:24px; border-bottom:1px solid var(--border); }
  .track-folio { font-size:16px; font-weight:500; color:var(--txt); }
  .track-note { font-size:12px; color:var(--txt3); }
  .track-list { list-style:none; }
  .track-row { display:grid; grid-template-columns:16px 1fr auto; column-gap:16px; align-items:start; position:relative; padding-bottom:24px; }
  .track-row:last-child { padding-bottom:0; }
  .track-dot { width:12px; height:12px; border-radius:50%; background:var(--navy); margin:4px 2px 0; position:relative; z-index:1; }
  .track-row.now .track-dot { background:var(--blue); box-shadow:0 0 0 4px var(--blue-tint); }
  .track-row.next .track-dot { background:var(--bg2); border:1.5px solid var(--field-border); }
  /* Línea de ruta entre estados: sólida en lo recorrido, punteada en lo que falta */
  .track-row::before { content:''; position:absolute; left:7px; top:20px; bottom:-4px; width:0; border-left:1.5px solid var(--navy); }
  .track-row.now::before, .track-row.next::before { border-left:1.5px dashed var(--field-border); }
  .track-row:last-child::before { display:none; }
  .track-label { font-size:16px; font-weight:500; color:var(--txt); }
  .track-row.next .track-label { color:var(--txt3); font-weight:400; }
  .track-when { font-size:13px; color:var(--txt3); padding-top:2px; }
  .track-foot { margin-top:24px; padding-top:16px; border-top:1px solid var(--border); display:flex; justify-content:space-between; gap:16px; font-size:13px; color:var(--txt2); }

  /* ── BENEFICIOS ── */
  .feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:0 32px; }
  .feat-item { padding:24px 0 32px; border-top:1px solid var(--border); }
  .feat-ico { color:var(--blue); margin-bottom:16px; display:block; }
  .feat-t { font-weight:600; font-size:16px; color:var(--txt); margin-bottom:8px; }
  .feat-d { font-size:14px; color:var(--txt2); line-height:1.6; }

  /* ── CTA FINAL ── */
  .cta-banner {
    background:var(--navy); border-radius:16px; padding:48px; display:flex;
    align-items:center; justify-content:space-between; gap:48px; flex-wrap:wrap; overflow:hidden;
  }
  .cta-img { flex:1 1 300px; min-width:280px; max-width:420px; }
  .cta-img img { width:100%; height:260px; object-fit:cover; border-radius:12px; display:block; }
  .cta-t { font-weight:600; font-size:clamp(28px,4vw,40px); line-height:1.15; letter-spacing:-.02em; color:#fff; margin-bottom:16px; }
  .cta-p { font-size:16px; color:var(--on-dark-2); line-height:1.6; max-width:420px; margin-bottom:32px; }

  /* ── FOOTER ── */
  .lp-footer { background: var(--navy-deep); padding:48px 5% 24px; }
  .footer-grid { max-width:1200px; margin:0 auto; display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:48px; margin-bottom:32px; }
  .footer-col-title { font-size:13px; font-weight:500; color:var(--on-dark-3); margin-bottom:16px; }
  .footer-link { display:block; font-size:14px; color:var(--on-dark-2); text-decoration:none; margin-bottom:8px; transition:color var(--dur-fast) var(--ease); }
  a.footer-link:hover { color:#fff; }
  .footer-about { font-size:14px; color:var(--on-dark-3); margin-top:16px; line-height:1.6; max-width:280px; }
  .footer-ctas { display:flex; gap:16px; align-items:center; margin-top:24px; }
  .footer-ctas .lp-textlink { color:var(--on-dark-2); }
  .footer-ctas .lp-textlink:hover { color:#fff; }
  .footer-copy { max-width:1200px; margin:0 auto; padding-top:24px; border-top:1px solid var(--on-dark-line); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; font-size:12px; color:var(--on-dark-3); }

  /* ── RESPONSIVE ── */
  @media(max-width:1100px){
    .series-grid { grid-template-columns:repeat(3,1fr); }
  }
  @media(max-width:1000px){
    .prod-grid { grid-template-columns:repeat(3,1fr); }
    .feat-grid { grid-template-columns:repeat(2,1fr); }
    .how { grid-template-columns:1fr; gap:48px; }
  }
  @media(max-width:760px){
    .series-grid { grid-template-columns:repeat(2,1fr); }
  }
  @media(max-width:480px){
    .series-grid { grid-template-columns:1fr; }
  }
  @media(max-width:900px){
    .footer-grid { grid-template-columns:1fr 1fr; gap:32px; }
    .lp-navlinks { display:none; }
    .lp-nav { justify-content:space-between; }
  }
  @media(max-width:600px){
    .prod-grid { grid-template-columns:repeat(2,1fr); }
    .feat-grid { grid-template-columns:1fr; }
    .cta-banner { padding:32px 24px; }
    .footer-grid { grid-template-columns:1fr; gap:24px; }
    .cta-img { display:none; }
    .track-card { padding:16px; }
  }
`

// ── PAGE ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router   = useRouter()
  const [series,    setSeries]    = useState<Serie[]>([])
  const [modelos,   setModelos]   = useState<Modelo[]>([])
  const [loadingSeries,  setLS]   = useState(true)
  const [loadingModelos, setLM]   = useState(true)
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
      if (!d.user) return
      const rolTipo = d.user.rolTipo || (d.user.rol === 'CLIENTE' ? 'CLIENTE' : 'INTERNO')
      if (rolTipo === 'REPARTIDOR') router.push('/repartidor')
      else if (rolTipo === 'CLIENTE') router.push('/client')
      else router.push('/admin/orders')
    }).catch(() => {})
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

  const HERO_SLIDES = [
    {
      tag:'Distribución mayorista',
      h: <>Cases para celular<br/>al mayoreo</>,
      p:'Blindaje, 3 en 1, Escudo y Anillo para todas las marcas, con precio de distribuidor.',
      cta:'Crear cuenta', cta2:'Ingresar',
    },
    {
      tag:'Descuentos por volumen',
      h: <>Hasta 15% de descuento<br/>por volumen</>,
      p:'Desde 50 piezas, 5%. Desde 100, 10%. Desde 200, 15%. Se aplica solo al confirmar tu pedido.',
      cta:'Crear cuenta', cta2:'Ingresar',
    },
    {
      tag:'Novedades 2026',
      h: <>Modelos 2026<br/>ya disponibles</>,
      p:'S25 Ultra, iPhone 16 Series, OPPO A3 Pro, Vivo Y200 y más. Stock disponible para distribuidores.',
      cta:'Crear cuenta', cta2:'Ingresar',
    },
  ]
  const safeIdx = Math.min(hero.idx, heroImgs.length - 1)
  const promo = promos[safeIdx]
  const hs = promo
    ? { tag:'', h: promo.titulo, p: promo.subtitulo||'', cta: promo.cta_label||'Ver catálogo', cta2:'Ingresar', ctaHref: promo.cta_href||'/register' }
    : { ...HERO_SLIDES[safeIdx], ctaHref:'/register' }

  const PROPUESTAS = [
    { ico:<Truck size={24} strokeWidth={1.5}/>,   label:'Envío por paquetería',  sub:'Estafeta, DHL, FedEx. Entrega en 2 a 5 días hábiles' },
    { ico:<Percent size={24} strokeWidth={1.5}/>, label:'Descuentos mayoristas', sub:'Desde 50 piezas: 5%. Desde 100: 10%. Desde 200: 15%' },
    { ico:<Boxes size={24} strokeWidth={1.5}/>,   label:'+100 modelos activos',  sub:'Para todas las marcas y categorías' },
    { ico:<WhatsAppIcon size={24}/>,               label:'Pedidos por WhatsApp',  sub:'CharisBot procesa tu pedido al instante' },
  ]

  const modelosVista: Modelo[] = modelos.length > 0 ? modelos : [
    {id:'1',tipo_case:'BLINDAJE', marca:'Samsung',  modelo:'A55 5G',   color:'Negro', foto_url:null},
    {id:'2',tipo_case:'3 EN 1',   marca:'Apple',    modelo:'iPhone 15',color:'Negro', foto_url:null},
    {id:'3',tipo_case:'ESCUDO',   marca:'Motorola', modelo:'G56 5G',   color:'Negro', foto_url:null},
    {id:'4',tipo_case:'ANILLO',   marca:'Xiaomi',   modelo:'Note 13',  color:'Azul',  foto_url:null},
    {id:'5',tipo_case:'BLINDAJE', marca:'Samsung',  modelo:'S25 Ultra',color:'Negro', foto_url:null},
    {id:'6',tipo_case:'3 EN 1',   marca:'OPPO',     modelo:'A3 Pro',   color:'Negro', foto_url:null},
    {id:'7',tipo_case:'ESCUDO',   marca:'Vivo',     modelo:'Y200 5G',  color:'Negro', foto_url:null},
    {id:'8',tipo_case:'ANILLO',   marca:'Apple',    modelo:'iPhone 16',color:'Blanco',foto_url:null},
  ]

  return (
    <>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav className="lp-nav">
        <Link href="/" style={{textDecoration:'none', flexShrink:0}}>
          <CharisLogotipo height={40} variant="color" />
        </Link>
        <div className="lp-navlinks">
          <a href="#catalogo"   className="lp-navlink">Catálogo</a>
          <a href="#como"       className="lp-navlink">Cómo funciona</a>
          <a href="#beneficios" className="lp-navlink">Beneficios</a>
        </div>
        <div className="lp-nav-ctas">
          <Link href="/login"    className="lp-textlink">Ingresar</Link>
          <Link href="/register" className="btn-sm">Crear cuenta</Link>
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
              <Link href={hs.ctaHref} className="btn-primary">{hs.cta}</Link>
              <Link href="/login"    className="btn-ghost btn-on-dark">{hs.cta2}</Link>
            </div>
          </div>
        </div>
        {/* Arrows */}
        <button className="hero-arrow" style={{left:16}}  onClick={hero.prev} aria-label="Anterior"><ChevronLeft  size={20} strokeWidth={1.5}/></button>
        <button className="hero-arrow" style={{right:16}} onClick={hero.next} aria-label="Siguiente"><ChevronRight size={20} strokeWidth={1.5}/></button>
        {/* Dots */}
        <div style={{position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',display:'flex',gap:8,zIndex:3}}>
          {heroImgs.map((_,i)=>(
            <button key={i} className={`hero-dot${i===hero.idx?' act':''}`} onClick={()=>hero.go(i)} aria-label={`Ir a la imagen ${i+1}`}/>
          ))}
        </div>
      </div>

      {/* ── PROPUESTA B2B ── */}
      <div className="biz-strip">
        <div className="inner">
          <div className="biz-grid">
            {PROPUESTAS.map((p,i)=>(
              <div key={i} className="biz-prop">
                <div className="biz-ico">{p.ico}</div>
                <div><div className="biz-t1">{p.label}</div><div className="biz-t2">{p.sub}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CATÁLOGO PÚBLICO (series) ── */}
      <section id="catalogo" className="section section-gray">
        <div className="inner">
          <div className="cat-intro">
            <div className="cat-intro-txt">
              <div className="section-title">Elige tu categoría</div>
              <div className="section-sub" style={{fontSize:16,marginTop:8}}>
                Selecciona una línea para ver los modelos disponibles. Los precios se muestran al iniciar sesión.
              </div>
            </div>
          </div>
          <div className="series-grid">
            {loadingSeries ? [1,2,3,4,5].map(i=>(
              <div key={i} style={{height:304}} className="skel"/>
            )) : CATEGORIAS.map(c=>{
              const real = series.find(s=>s.tipo_case===c.tipo)
              return (
                <Link key={c.tipo} href="/login" className="serie-card">
                  <div className="serie-thumb">
                    {c.destacado
                      ? <div className="serie-thumb-new"><PackagePlus size={40} strokeWidth={1.5}/></div>
                      : <img src={real?.foto_url || c.img} alt={c.label} className="serie-thumb-img"/>
                    }
                    <div className="serie-thumb-grad"/>
                    {c.destacado
                      ? <span className="serie-badge serie-badge-new">Nuevo</span>
                      : real && <span className="serie-badge">{real.total_modelos} modelos</span>
                    }
                    <span className="serie-thumb-title">{c.label}</span>
                  </div>
                  <div className="serie-body">
                    <p className="serie-desc">{real?.descripcion || c.desc}</p>
                    <div className="serie-foot">
                      <span className="meta mono">
                        {real ? `${real.total_marcas} marcas · ${real.total_colores} colores` : 'Ver disponibilidad'}
                      </span>
                      <span className="serie-go">Ver <ChevronRight size={16} strokeWidth={1.5}/></span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          <div style={{textAlign:'center',marginTop:40}}>
            <Link href="/login" className="btn-primary">Ver catálogo completo</Link>
          </div>
        </div>
      </section>

      {/* ── PRODUCTOS (precio bloqueado) ── */}
      <section className="section section-white">
        <div className="inner">
          <div className="section-hdr">
            <div>
              <div className="section-title">Modelos disponibles</div>
              <div className="section-sub">Inicia sesión para ver precios y agregar al carrito</div>
            </div>
            <Link href="/login" className="see-all">Ingresar para comprar</Link>
          </div>
          <div className="prod-grid">
            {loadingModelos
              ? [1,2,3,4,5,6,7,8].map(i=><div key={i} style={{height:260}} className="skel"/>)
              : modelosVista.map(m=>(
                <div key={m.id} className="prod-card" onClick={()=>router.push('/login')}>
                  <div className="prod-img">
                    <img src={m.foto_url || CASE_IMG} alt={`${m.marca} ${m.modelo}`}/>
                  </div>
                  <div className="prod-body">
                    <div className="prod-tipo">{labelTipo(m.tipo_case)}</div>
                    <div className="prod-name">{m.marca} {m.modelo}</div>
                    <div className="prod-marca">{m.color}</div>
                    <div className="prod-lock"><Lock size={14} strokeWidth={1.5}/> Precio al iniciar sesión</div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* CTA login inline */}
          <div className="login-cta">
            <div>
              <div className="login-cta-t">¿Quieres ver precios y hacer pedidos?</div>
              <div className="login-cta-s">Crea tu cuenta de distribuidor. Aprobación en minutos</div>
            </div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <Link href="/register" className="btn-primary">Crear cuenta</Link>
              <Link href="/login"    className="btn-ghost">Ingresar</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section id="como" className="section section-gray">
        <div className="inner">
          <div className="how">
            <div>
              <div className="section-title" style={{marginBottom:32}}>Tres pasos para hacer tu pedido</div>
              <div className="how-steps">
                {PASOS.map(s=>(
                  <div key={s.n} className="how-step">
                    <span className="how-n mono">{s.n}</span>
                    <div>
                      <div className="how-t">{s.title}</div>
                      <div className="how-d">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ejemplo de seguimiento, con los estados reales del portal */}
            <div className="track-card" role="img" aria-label="Ejemplo de seguimiento de un pedido: confirmado, en preparación, en reparto, entregado">
              <div className="track-head">
                <span className="track-folio mono">#CH-0142</span>
                <span className="track-note">Ejemplo de seguimiento</span>
              </div>
              <ul className="track-list">
                {SEGUIMIENTO.map(e=>(
                  <li key={e.label} className={`track-row ${e.state}`}>
                    <span className="track-dot"/>
                    <span className="track-label">{e.label}</span>
                    <span className="track-when mono">{e.when}</span>
                  </li>
                ))}
              </ul>
              <div className="track-foot">
                <span>120 piezas · Blindaje y 3 en 1</span>
                <span>Paquetería</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ── */}
      <section id="beneficios" className="section section-white">
        <div className="inner">
          <div className="section-title" style={{marginBottom:40}}>Lo que incluye tu cuenta de distribuidor</div>
          <div className="feat-grid">
            {BENEFICIOS.map(({Icon,title,desc})=>(
              <div key={title} className="feat-item">
                <Icon className="feat-ico" size={20} strokeWidth={1.5} aria-hidden="true"/>
                <div className="feat-t">{title}</div>
                <div className="feat-d">{desc}</div>
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
              <h2 className="cta-t">Haz tu primer pedido mayorista</h2>
              <p className="cta-p">
                Accede al catálogo completo, gestiona tus pedidos y recibe descuentos automáticos por volumen.
              </p>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <Link href="/register" className="btn-primary btn-light">Crear cuenta</Link>
                <Link href="/login"    className="btn-ghost btn-on-dark">Ingresar</Link>
              </div>
            </div>
            <div className="cta-img">
              <img
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=700&q=75"
                alt="Pedidos y entregas de accesorios"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="footer-grid">
          <div>
            <CharisLogotipo height={36} variant="white" />
            <p className="footer-about">
              Portal de pedidos mayoristas para distribuidores de accesorios móviles.
            </p>
            <div className="footer-ctas">
              <Link href="/register" className="btn-sm">Crear cuenta</Link>
              <Link href="/login"    className="lp-textlink">Ingresar</Link>
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
            <a href={`mailto:${CONTACT_EMAIL}`} className="footer-link">{CONTACT_EMAIL}</a>
            <span className="footer-link">Lun–Vie 9:00–18:00</span>
            <a href={WHATSAPP_URL} className="footer-link" style={{display:'inline-flex',alignItems:'center',gap:8}}><WhatsAppIcon size={16} color="var(--wa)"/> WhatsApp</a>
          </div>
        </div>
        <div className="footer-copy">
          <span>© 2026 Charis Distribuidor Mayorista. Todos los derechos reservados</span>
          <span>Hecho por Código 52</span>
        </div>
      </footer>
    </>
  )
}
