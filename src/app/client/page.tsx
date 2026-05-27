'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface Noticia { id:string; tipo:'noticia'|'promocion'; titulo:string; cuerpo:string; imagen_url:string|null; link_texto:string|null; link_url:string|null; destacado:boolean }
interface Serie { tipo_case:string; total_modelos:number; total_colores:number; total_marcas:number; foto_url:string|null; descripcion:string|null; orden:number }

const SERIE_META: Record<string,{emoji:string; bg:string; accent:string; fallback:string}> = {
  '3 EN 1':   { emoji:'🎯', bg:'linear-gradient(135deg,#1e3a5f,#1565c0)', accent:'#4baef0', fallback:'https://images.unsplash.com/photo-1601593346740-925612772716?w=600&q=70' },
  'ESCUDO':   { emoji:'🛡️', bg:'linear-gradient(135deg,#78350f,#d97706)', accent:'#fbbf24', fallback:'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&q=70' },
  'BLINDAJE': { emoji:'🔐', bg:'linear-gradient(135deg,#1e293b,#334155)', accent:'#94a3b8', fallback:'https://images.unsplash.com/photo-1613588718956-c2e80305bf61?w=600&q=70' },
  'ANILLO':   { emoji:'💍', bg:'linear-gradient(135deg,#4c1d95,#7c3aed)', accent:'#c4b5fd', fallback:'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&q=70' },
}
const DEFAULT_META = { emoji:'📦', bg:'linear-gradient(135deg,#0d2137,#1565c0)', accent:'#4baef0', fallback:'' }

const CSS = `
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel { background:linear-gradient(90deg,#e2eaf4 25%,#f0f4f8 50%,#e2eaf4 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:12px; }

  /* Carrusel */
  .car-wrap   { position:relative; overflow:hidden; border-radius:18px; }
  .car-track  { display:flex; transition:transform .45s cubic-bezier(.4,0,.2,1); will-change:transform; }
  .car-slide  { min-width:100%; }
  .car-dot    { width:8px; height:8px; border-radius:50%; cursor:pointer; transition:all .2s; background:rgba(255,255,255,.35); border:none; padding:0; }
  .car-dot.act{ background:white; width:20px; border-radius:4px; }
  .car-arrow  {
    position:absolute; top:50%; transform:translateY(-50%);
    background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.2);
    border-radius:50%; width:36px; height:36px; cursor:pointer;
    font-size:18px; color:white; display:flex; align-items:center; justify-content:center;
    backdrop-filter:blur(4px); transition:background .15s; z-index:5;
  }
  .car-arrow:hover { background:rgba(255,255,255,.25); }

  /* Series */
  .serie-card {
    border-radius:16px; overflow:hidden; text-decoration:none;
    transition:transform .22s, box-shadow .22s;
    box-shadow:0 4px 20px rgba(0,0,0,.08);
    display:block;
  }
  .serie-card:hover { transform:translateY(-5px); box-shadow:0 16px 40px rgba(21,101,192,.18); }

  /* Category pills */
  .cat-pill {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 16px; border-radius:10px;
    background:white; border:1.5px solid #e2eaf4;
    text-decoration:none; color:#3a6080; font-size:13px; font-weight:600;
    transition:all .18s; cursor:pointer;
  }
  .cat-pill:hover { border-color:#1565c0; color:#1565c0; background:#f0f6ff; }

  /* B2B props */
  .biz-prop {
    background:white; border-radius:12px; border:1px solid #e2eaf4;
    padding:16px; display:flex; align-items:flex-start; gap:12px;
    transition:border-color .18s;
  }
  .biz-prop:hover { border-color:#4baef0; }
  .biz-prop-ico {
    width:44px; height:44px; border-radius:10px;
    display:flex; align-items:center; justify-content:center;
    font-size:20px; flex-shrink:0;
  }

  .sec-title { font-weight:900; font-size:17px; color:#0d2137; margin-bottom:3px; }
  .sec-sub   { font-size:13px; color:#8aaac4; margin-bottom:16px; }

  @media(max-width:640px) {
    .biz-grid { grid-template-columns:1fr 1fr !important; }
    .series-grid { grid-template-columns:1fr 1fr !important; }
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
  const [user,     setUser]     = useState<any>(null)
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [series,   setSeries]   = useState<Serie[]>([])
  const [loading,  setLoading]  = useState(true)

  const car = useAutoplay(noticias.length + 1 || 1)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
    Promise.all([
      fetch('/api/client/noticias').then(r => r.json()),
      fetch('/api/client/catalog').then(r => r.json()),
    ]).then(([n, c]) => {
      setNoticias(n.items || [])
      setSeries(c.series || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

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
        <h1 style={{ fontWeight:900, fontSize:'clamp(18px,4vw,24px)', color:'#0d2137', marginBottom:4 }}>
          {greeting()}, {user?.nombre?.split(' ')[0] || ''}! 👋
        </h1>
        <p style={{ fontSize:13, color:'#8aaac4' }}>
          {new Date().toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* ── CARRUSEL ── */}
      <div style={{ marginBottom:32, animation:'fadeUp .3s ease-out .05s both' }}>
        {loading ? (
          <div style={{ height:260, borderRadius:18 }} className="skel" />
        ) : (
          <div style={{ position:'relative' }}>
            <div className="car-wrap">
              <div className="car-track" style={{ transform:`translateX(-${car.idx * 100}%)` }}>

                {/* Slide fijo — catálogo */}
                <div className="car-slide">
                  <div style={{ background:'linear-gradient(135deg,#07111f,#0d2d52)', borderRadius:18, overflow:'hidden', position:'relative', minHeight:240 }}>
                    <img src="https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=1200&q=60" alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:.18 }} />
                    <div style={{ position:'relative', padding:'36px 40px', display:'flex', flexDirection:'column', justifyContent:'center', minHeight:240 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:100, background:'rgba(75,174,240,.2)', fontSize:11, fontWeight:700, color:'#4baef0', marginBottom:14, letterSpacing:'.05em', width:'fit-content' }}>
                        ✦ CATÁLOGO ACTUALIZADO
                      </span>
                      <h2 style={{ fontWeight:900, fontSize:'clamp(18px,3vw,26px)', color:'white', lineHeight:1.2, marginBottom:10 }}>
                        Nuevos modelos disponibles
                      </h2>
                      <p style={{ fontSize:14, color:'rgba(255,255,255,.72)', lineHeight:1.6, maxWidth:520, marginBottom:20 }}>
                        Revisa las últimas referencias en Blindaje, 3 en 1, Escudo y Anillo. Filtra por marca, tipo y color.
                      </p>
                      <Link href="/client/catalog?filter=new" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 22px', borderRadius:100, background:'white', color:'#1565c0', fontSize:13, fontWeight:700, textDecoration:'none', width:'fit-content' }}>
                        Ver novedades en catálogo →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Slides dinámicos de noticias */}
                {noticias.map(n => {
                  const isPromo = n.tipo === 'promocion'
                  return (
                    <div key={n.id} className="car-slide">
                      <div style={{ background: isPromo ? 'linear-gradient(135deg,#92400e,#d97706)' : 'linear-gradient(135deg,#1e3a5f,#1565c0)', borderRadius:18, overflow:'hidden', position:'relative', minHeight:240 }}>
                        {(n.imagen_url || (isPromo ? 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=60' : 'https://images.unsplash.com/photo-1601593346740-925612772716?w=1200&q=60')) && (
                          <img src={n.imagen_url || (isPromo ? 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=60' : 'https://images.unsplash.com/photo-1601593346740-925612772716?w=1200&q=60')} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:.2 }} />
                        )}
                        <div style={{ position:'relative', padding:'36px 40px', display:'flex', flexDirection:'column', justifyContent:'center', minHeight:240 }}>
                          <span style={{ display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:100, background:'rgba(255,255,255,.18)', fontSize:11, fontWeight:700, color:'white', marginBottom:14, width:'fit-content' }}>
                            {isPromo ? '🔥 PROMOCIÓN' : '📣 NOVEDAD'}{n.destacado ? ' · ⭐ DESTACADO' : ''}
                          </span>
                          <h2 style={{ fontWeight:900, fontSize:'clamp(18px,3vw,26px)', color:'white', lineHeight:1.2, marginBottom:10 }}>{n.titulo}</h2>
                          <p style={{ fontSize:14, color:'rgba(255,255,255,.78)', lineHeight:1.6, maxWidth:520, marginBottom:20 }}>{n.cuerpo}</p>
                          {n.link_url && (
                            <Link href={n.link_url} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 22px', borderRadius:100, background:'white', color: isPromo ? '#92400e' : '#1565c0', fontSize:13, fontWeight:700, textDecoration:'none', width:'fit-content' }}>
                              {n.link_texto || 'Ver más'} →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Arrows */}
            {allSlides.length > 1 && (
              <>
                <button className="car-arrow" style={{ left:12 }} onClick={car.prev}>‹</button>
                <button className="car-arrow" style={{ right:12 }} onClick={car.next}>›</button>
                <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5 }}>
                  {allSlides.map((_, i) => (
                    <button key={i} className={`car-dot${i === car.idx ? ' act' : ''}`} onClick={() => car.go(i)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── PROPUESTA B2B ── */}
      <div style={{ marginBottom:32, animation:'fadeUp .3s ease-out .08s both' }}>
        <div className="biz-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[
            { ico:'🚚', bg:'#e3f2fd', label:'Entrega express CDMX',  sub:'Pedidos antes de las 2 PM llegan el mismo día' },
            { ico:'%',  bg:'#e8f5e9', label:'Descuentos por volumen', sub:'+50 pzas → 5% · +100 → 10% · +200 → 15%' },
            { ico:'📦', bg:'#e8eaf6', label:'+800 modelos activos',   sub:'Blindaje, 3 en 1, Escudo y Anillo para todas las marcas' },
            { ico:'📱', bg:'#e0f2fe', label:'Pedidos por WhatsApp',   sub:'CharisBot procesa tu pedido al instante' },
          ].map((p, i) => (
            <div key={i} className="biz-prop">
              <div className="biz-prop-ico" style={{ background:p.bg }}>{p.ico}</div>
              <div>
                <div style={{ fontSize:12, fontWeight:800, color:'#0d2137', marginBottom:3 }}>{p.label}</div>
                <div style={{ fontSize:11, color:'#8aaac4', lineHeight:1.4 }}>{p.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CATEGORÍAS RÁPIDAS ── */}
      <div style={{ marginBottom:32, animation:'fadeUp .3s ease-out .1s both' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <p className="sec-title">🗂️ Explorar por categoría</p>
            <p className="sec-sub">Selecciona una serie para ver los modelos disponibles</p>
          </div>
          <Link href="/client/catalog" style={{ fontSize:13, color:'#1565c0', fontWeight:600, textDecoration:'none' }}>Ver todo →</Link>
        </div>

        {/* Pills */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
          {loading ? [1,2,3,4].map(i => (
            <div key={i} style={{ width:120, height:40, borderRadius:10 }} className="skel" />
          )) : series.map(s => {
            const meta = SERIE_META[s.tipo_case] || DEFAULT_META
            return (
              <Link key={s.tipo_case} href={`/client/catalog/${encodeURIComponent(s.tipo_case)}`} className="cat-pill">
                {meta.emoji} {s.tipo_case}
                <span style={{ fontSize:11, color:'#8aaac4', fontWeight:400 }}>({s.total_modelos})</span>
              </Link>
            )
          })}
        </div>

        {/* Series grid */}
        <div className="series-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
          {loading ? [1,2,3,4].map(i => (
            <div key={i} style={{ height:240, borderRadius:16 }} className="skel" />
          )) : series.map(s => {
            const meta = SERIE_META[s.tipo_case] || DEFAULT_META
            const img  = s.foto_url || meta.fallback
            return (
              <Link key={s.tipo_case} href={`/client/catalog/${encodeURIComponent(s.tipo_case)}`} className="serie-card">
                <div style={{ height:155, position:'relative', overflow:'hidden', background:meta.bg }}>
                  {img
                    ? <img src={img} alt={s.tipo_case} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .4s' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      />
                    : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:52, opacity:.45 }}>{meta.emoji}</div>
                  }
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 55%)' }} />
                  <span style={{ position:'absolute', top:10, right:10, padding:'3px 10px', borderRadius:100, background:'rgba(0,0,0,.4)', backdropFilter:'blur(6px)', color:'white', fontSize:10, fontWeight:700 }}>
                    {s.total_modelos} modelos
                  </span>
                  <span style={{ position:'absolute', bottom:10, left:14, fontWeight:900, fontSize:16, color:'white', textShadow:'0 2px 8px rgba(0,0,0,.5)' }}>
                    {meta.emoji} {s.tipo_case}
                  </span>
                </div>
                <div style={{ padding:'12px 14px', background:'white' }}>
                  <p style={{ fontSize:12, color:'#3a6080', lineHeight:1.5, marginBottom:8, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' } as any}>
                    {s.descripcion || 'Cases de alta calidad para tu celular.'}
                  </p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'#8aaac4' }}>{s.total_marcas} marcas · {s.total_colores} colores</span>
                    <span style={{ fontSize:12, color:'#1565c0', fontWeight:700 }}>Ver modelos →</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── DESCUENTO POR VOLUMEN ── */}
      <div style={{ background:'linear-gradient(135deg,#07111f,#0d2d52)', borderRadius:16, padding:'24px 28px', marginBottom:32, border:'1px solid rgba(75,174,240,.15)', animation:'fadeUp .3s ease-out .15s both' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ color:'white', fontWeight:900, fontSize:16, marginBottom:5 }}>% Descuentos por volumen activos</div>
            <div style={{ color:'rgba(255,255,255,.6)', fontSize:13 }}>Se aplican automáticamente al confirmar tu pedido</div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[
              { rng:'+50 pzas',  desc:'5%',  color:'#4baef0' },
              { rng:'+100 pzas', desc:'10%', color:'#4baef0' },
              { rng:'+200 pzas', desc:'15%', color:'#22c55e' },
            ].map(t => (
              <div key={t.rng} style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'10px 18px', textAlign:'center', minWidth:90 }}>
                <div style={{ color:'rgba(255,255,255,.5)', fontSize:10, marginBottom:4 }}>{t.rng}</div>
                <div style={{ color:t.color, fontSize:20, fontWeight:900 }}>{t.desc}</div>
              </div>
            ))}
          </div>
          <Link href="/client/catalog" style={{ background:'#1a7fe3', color:'white', padding:'10px 22px', borderRadius:8, fontSize:13, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
            Explorar catálogo
          </Link>
        </div>
      </div>

    </>
  )
}
