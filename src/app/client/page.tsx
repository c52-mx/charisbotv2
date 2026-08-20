'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { HERO_IMGS } from '@/lib/carouselConfig'

interface Noticia { id:string; tipo:'noticia'|'promocion'; titulo:string; cuerpo:string; imagen_url:string|null; link_texto:string|null; link_url:string|null; destacado:boolean }
interface Serie { tipo_case:string; total_modelos:number; total_colores:number; total_marcas:number; foto_url:string|null; descripcion:string|null; orden:number }

const SERIE_META: Record<string,{emoji:string; bg:string; accent:string; fallback:string}> = {
  '3 EN 1':   { emoji:'🎯', bg:'linear-gradient(135deg,#1e3a5f,#1565c0)', accent:'var(--blue2)', fallback:'https://images.unsplash.com/photo-1601593346740-925612772716?w=600&q=70' },
  'ESCUDO':   { emoji:'🛡️', bg:'linear-gradient(135deg,#78350f,#d97706)', accent:'#fbbf24', fallback:'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&q=70' },
  'BLINDAJE': { emoji:'🔐', bg:'linear-gradient(135deg,#1e293b,#334155)', accent:'#94a3b8', fallback:'https://images.unsplash.com/photo-1613588718956-c2e80305bf61?w=600&q=70' },
  'ANILLO':   { emoji:'💍', bg:'linear-gradient(135deg,#4c1d95,#7c3aed)', accent:'#c4b5fd', fallback:'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&q=70' },
  'NUEVOS':   { emoji:'✨', bg:'linear-gradient(135deg,#1565c0,#4baef0)', accent:'#4baef0', fallback:'' },
}
const DEFAULT_META = { emoji:'📦', bg:'linear-gradient(135deg,#0d2137,#1565c0)', accent:'var(--blue2)', fallback:'' }

const CSS = `
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel { background:linear-gradient(90deg,var(--border) 25%,var(--bg) 50%,var(--border) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:12px; }

  /* Carrusel hero (.hero-car/.hero-track/...), tarjeta de categoría (.serie-card)
     y franja B2B (.biz-*) viven en globals.css */

  /* Category pills (filtros rápidos, propios del portal) */
  .cat-pill {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 16px; border-radius:10px;
    background:white; border:1.5px solid var(--border);
    text-decoration:none; color:var(--txt2); font-size:13.5px; font-weight:600;
    transition:all .18s; cursor:pointer;
  }
  .cat-pill:hover { border-color:var(--blue); color:var(--blue); background:#f0f6ff; }

  /* Grid de categorías del portal */
  .series-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px,1fr)); gap:16px; }
  @media(max-width:640px) {
    .series-grid { grid-template-columns:1fr 1fr; }
  }
`

function useAutoplay(len: number, delay = 5000) {
  const [idx, setIdx] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval>>()
  const reset = useCallback(() => {
    clearInterval(timer.current)
    timer.current = setInterval(() => setIdx(i => (i + 1) % len), delay)
  }, [len, delay])
  useEffect(() => {
    if (len > 1) { reset(); return () => clearInterval(timer.current) }
  }, [len, reset])
  const go = (i: number) => { setIdx(i); reset() }
  return { idx, go, prev: () => go((idx - 1 + len) % len), next: () => go((idx + 1) % len) }
}

export default function ClientHome() {
  const [user,       setUser]       = useState<any>(null)
  const [noticias,   setNoticias]   = useState<Noticia[]>([])
  const [series,     setSeries]     = useState<Serie[]>([])
  const [loading,    setLoading]    = useState(true)
  const [descuentos,   setDescuentos]   = useState<{piezas_minimas:number; porcentaje:number}[]>([])
  const [paqueterias,  setPaqueterias]  = useState<{nombre:string; dias_estimados:string}[]>([])

  const car = useAutoplay(noticias.length + 1 || 1)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
    fetch('/api/descuentos').then(r => r.json()).then(d => setDescuentos(d.items || []))
    // Endpoint público: no requiere sesión, solo devuelve paqueterías y puntos
    fetch('/api/public/config').then(r => r.json()).then(d => {
      try { const ps = JSON.parse(d.paqueterias || '[]'); if (Array.isArray(ps)) setPaqueterias(ps) } catch {}
    }).catch(() => {})
    Promise.all([
      fetch('/api/client/noticias').then(r => r.json()),
      fetch('/api/client/catalog').then(r => r.json()),
    ]).then(([n, c]) => {
      setNoticias(n.items || [])
      setSeries(c.series || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const descuentoSub = descuentos.length
    ? descuentos
        .sort((a, b) => a.piezas_minimas - b.piezas_minimas)
        .map(d => `+${d.piezas_minimas} pzas → ${d.porcentaje}%`)
        .join(' · ')
    : 'Descuentos automáticos por cantidad'

  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? '¡Buenos días' : h < 19 ? '¡Buenas tardes' : '¡Buenas noches'
  }

  const allSlides = [null, ...noticias] // null = slide fijo "nuevos modelos"

  return (
    <>
      <style>{CSS}</style>

      {/* ── SALUDO ── */}
      <div style={{ marginBottom:24, animation:'fadeUp .3s ease-out' }}>
        <h1 style={{ fontWeight:900, fontSize:'clamp(22px,4vw,30px)', color:'var(--txt)', marginBottom:5, letterSpacing:'-.01em' }}>
          {greeting()}, {user?.nombre?.split(' ')[0] || ''}! 👋
        </h1>
        <p style={{ fontSize:14, color:'var(--txt3)' }}>
          {new Date().toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* ── CARRUSEL ── */}
      <div style={{ marginBottom:32, animation:'fadeUp .3s ease-out .05s both' }}>
        {loading ? (
          <div style={{ height:'clamp(280px,38vw,420px)', borderRadius:18 }} className="skel" />
        ) : (
          <div className="hero-car" style={{ height:'clamp(280px,38vw,420px)', borderRadius:18 }}>
            <div className="hero-track" style={{ transform:`translateX(-${car.idx * 100}%)` }}>

              {/* Slide fijo — usa HERO_IMGS[0] (misma imagen que el landing) */}
              <div className="hero-slide">
                <img className="hero-img" src={HERO_IMGS[0]} alt="" />
                <div className="hero-overlay" />
                <div className="hero-content">
                  <div className="hero-tag">✦ CATÁLOGO ACTUALIZADO</div>
                  <h2 className="hero-h">Nuevos modelos<br/>disponibles</h2>
                  <p className="hero-p">Revisa las últimas referencias en Blindaje, 3 en 1, Escudo y Anillo. Filtra por marca, tipo y color.</p>
                  <div className="hero-btns">
                    <Link href="/client/catalog?filter=new" className="btn-primary">Ver novedades en catálogo →</Link>
                  </div>
                </div>
              </div>

              {/* Slides dinámicos de noticias — fallback rota entre HERO_IMGS */}
              {noticias.map((n, i) => {
                const isPromo = n.tipo === 'promocion'
                const fallbackImg = n.imagen_url || HERO_IMGS[(i + 1) % HERO_IMGS.length]
                return (
                  <div key={n.id} className="hero-slide">
                    <img className="hero-img" src={fallbackImg} alt="" />
                    <div className="hero-overlay" />
                    <div className="hero-content">
                      <div className="hero-tag">{isPromo ? '🔥 PROMOCIÓN' : '📣 NOVEDAD'}{n.destacado ? ' · ⭐ DESTACADO' : ''}</div>
                      <h2 className="hero-h">{n.titulo}</h2>
                      <p className="hero-p">{n.cuerpo}</p>
                      {n.link_url && (
                        <div className="hero-btns">
                          <Link href={n.link_url} className="btn-primary">{n.link_texto || 'Ver más'} →</Link>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Arrows + dots */}
            {allSlides.length > 1 && (
              <>
                <button className="hero-arrow" style={{ left:16 }} onClick={car.prev}>‹</button>
                <button className="hero-arrow" style={{ right:16 }} onClick={car.next}>›</button>
                <div style={{ position:'absolute', bottom:18, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6, zIndex:3 }}>
                  {allSlides.map((_, i) => (
                    <button key={i} className={`hero-dot${i === car.idx ? ' act' : ''}`} onClick={() => car.go(i)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── PROPUESTA B2B (franja oscura, estilo landing) ── */}
      <div className="biz-strip" style={{ borderRadius:16, overflow:'hidden', marginBottom:32, animation:'fadeUp .3s ease-out .08s both' }}>
        <div className="biz-grid">
          {[
            { ico:'🚚', label:'Envío por paquetería',   sub: paqueterias.length
                ? (() => {
                    const nombres = paqueterias.map(p => p.nombre).join(', ')
                    const dias = [...new Set(paqueterias.map(p => p.dias_estimados).filter(Boolean))]
                    return dias.length === 1 ? `${nombres} — entrega en ${dias[0]} hábiles` : `${nombres}${dias.length ? ` — entrega en ${dias[0]} hábiles` : ''}`
                  })()
                : 'Estafeta, FedEx, Paqueteexpress — entrega en 2 a 5 días hábiles' },
            { ico:'%',  label:'Descuentos por volumen', sub: descuentoSub },
            { ico:'📦', label:'+800 modelos activos',   sub:'Blindaje, 3 en 1, Escudo y Anillo para todas las marcas' },
            { ico:<WhatsAppIcon size={28} color="#25D366"/>, label:'Pedidos por WhatsApp',   sub:'CharisBot procesa tu pedido al instante' },
          ].map((p, i) => (
            <div key={i} className="biz-prop">
              <div className="biz-ico">{p.ico}</div>
              <div>
                <div className="biz-t1">{p.label}</div>
                <div className="biz-t2">{p.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CATEGORÍAS RÁPIDAS ── */}
      <div style={{ marginBottom:32, animation:'fadeUp .3s ease-out .1s both' }}>
        <div className="section-hdr">
          <div>
            <div className="section-title">🗂️ Explorar por categoría</div>
            <div className="section-sub">Selecciona una serie para ver los modelos disponibles</div>
          </div>
          <Link href="/client/catalog" className="see-all">Ver todo →</Link>
        </div>

        {/* Pills */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
          {loading ? [1,2,3,4].map(i => (
            <div key={i} style={{ width:120, height:40, borderRadius:10 }} className="skel" />
          )) : (
            <>
              {series.map(s => {
                const meta = SERIE_META[s.tipo_case] || DEFAULT_META
                return (
                  <Link key={s.tipo_case} href={`/client/catalog/${encodeURIComponent(s.tipo_case)}`} className="cat-pill">
                    {meta.emoji} {s.tipo_case}
                    <span style={{ fontSize:11, color:'var(--txt3)', fontWeight:400 }}>({s.total_modelos})</span>
                  </Link>
                )
              })}
              <Link href="/client/catalog?filter=new" className="cat-pill" style={{ borderColor:'var(--blue)', color:'var(--blue)' }}>
                ✨ NUEVOS
              </Link>
            </>
          )}
        </div>

        {/* Series grid — tarjetas estilo landing (.serie-card global) */}
        <div className="series-grid">
          {loading ? [1,2,3,4].map(i => (
            <div key={i} style={{ height:290, borderRadius:16 }} className="skel" />
          )) : series.map(s => {
            const meta = SERIE_META[s.tipo_case] || DEFAULT_META
            const img  = s.foto_url || meta.fallback
            return (
              <Link key={s.tipo_case} href={`/client/catalog/${encodeURIComponent(s.tipo_case)}`} className="serie-card">
                <div className="serie-thumb" style={img ? undefined : { background:meta.bg }}>
                  {img
                    ? <img className="serie-thumb-img" src={img} alt={s.tipo_case} />
                    : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:60, opacity:.5 }}>{meta.emoji}</div>
                  }
                  <div className="serie-thumb-grad" />
                  <span className="serie-badge">{s.total_modelos} modelos</span>
                  <span className="serie-thumb-title">{meta.emoji} {s.tipo_case}</span>
                </div>
                <div style={{ padding:'14px 16px' }}>
                  <p style={{ fontSize:12.5, color:'var(--txt2)', lineHeight:1.45, marginBottom:10, minHeight:36, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' } as any}>
                    {s.descripcion || 'Cases de alta calidad para tu celular.'}
                  </p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'var(--txt3)' }}>{s.total_marcas} marcas · {s.total_colores} colores</span>
                    <span style={{ fontSize:13, color:'var(--blue)', fontWeight:700 }}>Ver modelos →</span>
                  </div>
                </div>
              </Link>
            )
          })}

          {/* Tarjeta destacada — Nuevos productos */}
          {!loading && (
            <Link href="/client/catalog?filter=new" className="serie-card serie-card-new">
              <div className="serie-thumb">
                <div className="serie-thumb-new"><span style={{ fontSize:60 }}>✨</span></div>
                <div className="serie-thumb-grad" />
                <span className="serie-badge serie-badge-new">NUEVO</span>
                <span className="serie-thumb-title">✨ NUEVOS PRODUCTOS</span>
              </div>
              <div style={{ padding:'14px 16px' }}>
                <p style={{ fontSize:12.5, color:'var(--txt2)', lineHeight:1.45, marginBottom:10, minHeight:36 }}>
                  Los últimos modelos 2026, recién llegados al catálogo.
                </p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'var(--txt3)' }}>Recién agregados</span>
                  <span style={{ fontSize:13, color:'var(--blue)', fontWeight:700 }}>Ver novedades →</span>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* ── DESCUENTO POR VOLUMEN ── */}
      <div style={{ background:'linear-gradient(135deg,#07111f,#0d2d52)', borderRadius:16, padding:'24px 28px', marginBottom:32, border:'1px solid rgba(75,174,240,.15)', animation:'fadeUp .3s ease-out .15s both' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ color:'white', fontWeight:900, fontSize:18, marginBottom:5 }}>% Descuentos por volumen activos</div>
            <div style={{ color:'rgba(255,255,255,.6)', fontSize:14 }}>Se aplican automáticamente al confirmar tu pedido</div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[
              { rng:'+50 pzas',  desc:'5%',  color:'var(--blue2)' },
              { rng:'+100 pzas', desc:'10%', color:'var(--blue2)' },
              { rng:'+200 pzas', desc:'15%', color:'var(--ok)' },
            ].map(t => (
              <div key={t.rng} style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'10px 18px', textAlign:'center', minWidth:90 }}>
                <div style={{ color:'rgba(255,255,255,.5)', fontSize:10, marginBottom:4 }}>{t.rng}</div>
                <div style={{ color:t.color, fontSize:20, fontWeight:900 }}>{t.desc}</div>
              </div>
            ))}
          </div>
          <Link href="/client/catalog" className="btn-primary" style={{ whiteSpace:'nowrap' }}>
            Explorar catálogo
          </Link>
        </div>
      </div>

    </>
  )
}
