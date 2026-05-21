'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface Noticia { id:string; tipo:'noticia'|'promocion'; titulo:string; cuerpo:string; imagen_url:string|null; link_texto:string|null; link_url:string|null; destacado:boolean }
interface Serie { tipo_case:string; total_modelos:number; total_colores:number; total_marcas:number; foto_url:string|null; descripcion:string|null; orden:number }

const SERIE_META: Record<string,{emoji:string; bg:string; accent:string; fallback:string}> = {
  '3 EN 1':   {emoji:'🎯', bg:'linear-gradient(135deg,#1e3a5f,#1565c0)', accent:'#4baef0', fallback:'https://images.unsplash.com/photo-1601593346740-925612772716?w=600&q=70'},
  'ESCUDO':   {emoji:'🛡️', bg:'linear-gradient(135deg,#78350f,#d97706)', accent:'#fbbf24', fallback:'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&q=70'},
  'BLINDAJE': {emoji:'🔐', bg:'linear-gradient(135deg,#1e293b,#334155)', accent:'#94a3b8', fallback:'https://images.unsplash.com/photo-1613588718956-c2e80305bf61?w=600&q=70'},
  'ANILLO':   {emoji:'💍', bg:'linear-gradient(135deg,#4c1d95,#7c3aed)', accent:'#c4b5fd', fallback:'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&q=70'},
}
const DEFAULT_META = {emoji:'📦', bg:'linear-gradient(135deg,#0d2137,#1565c0)', accent:'#4baef0', fallback:''}

const CSS = `
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slide   { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel { background:linear-gradient(90deg,#e2eaf4 25%,#f0f4f8 50%,#e2eaf4 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:12px; }

  /* ── Carrusel noticias ── */
  .carousel-wrap { position:relative; overflow:hidden; border-radius:18px; }
  .carousel-track { display:flex; transition:transform .45s cubic-bezier(.4,0,.2,1); will-change:transform; }
  .carousel-slide { min-width:100%; }
  .dot { width:8px; height:8px; border-radius:50%; cursor:pointer; transition:all .2s; background:rgba(255,255,255,0.35); border:none; padding:0; }
  .dot.act { background:white; width:20px; border-radius:4px; }

  /* ── Series grid ── */
  .serie-card {
    border-radius:18px; overflow:hidden;
    text-decoration:none;
    transition:transform .22s, box-shadow .22s;
    box-shadow:0 4px 20px rgba(0,0,0,0.08);
  }
  .serie-card:hover { transform:translateY(-5px); box-shadow:0 16px 40px rgba(21,101,192,0.18); }

  /* ── Tabla modelos ── */
  .modelo-grid { display:grid; grid-template-columns:90px 100px 1fr auto; align-items:center; gap:8px; padding:10px 14px; border-bottom:1px solid #f0f4f8; transition:background .12s; }
  .modelo-grid:hover { background:#f5f8fc; }
  .tipo-badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:100px; font-size:10px; font-weight:700; white-space:nowrap; }
  .marca-badge { font-size:11px; font-weight:700; color:#3a6080; background:#f0f4f8; padding:2px 8px; border-radius:6px; white-space:nowrap; }
  .color-chip { padding:2px 7px; border-radius:100px; background:#f0f4f8; color:#3a6080; font-size:10px; font-weight:600; }


  .sec-title { font-family:Arial Black,system-ui; font-size:17px; font-weight:900; color:#0d2137; margin-bottom:3px; }
  .sec-sub   { font-size:13px; color:#8aaac4; margin-bottom:16px; }

  @media(max-width:640px) {
    .modelo-grid { grid-template-columns:1fr 1fr; }
    .modelo-grid>*:nth-child(3) { grid-column:1/-1; }
    .modelo-grid>*:nth-child(4) { grid-column:1/-1; }
  }
`

function useAutoplay(len: number, delay = 5000) {
  const [idx, setIdx] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval>>()
  const reset = useCallback(() => {
    clearInterval(timer.current)
    timer.current = setInterval(() => setIdx(i => (i+1) % len), delay)
  }, [len, delay])
  useEffect(() => { if (len > 1) { reset(); return () => clearInterval(timer.current) } }, [len])
  const go = (i: number) => { setIdx(i); reset() }
  return { idx, go, prev: () => go((idx-1+len)%len), next: () => go((idx+1)%len) }
}

export default function ClientHome() {
  const [user,     setUser]     = useState<any>(null)
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [series,   setSeries]   = useState<Serie[]>([])
  const [loading,  setLoading]  = useState(true)

  const notCarousel = useAutoplay(noticias.length + 1 || 1)

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(d=>setUser(d.user))
    Promise.all([
      fetch('/api/client/noticias').then(r=>r.json()),
      fetch('/api/client/catalog').then(r=>r.json()),
    ]).then(([n, c]) => {
      setNoticias(n.items || [])
      setSeries(c.series || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const greeting = () => { const h=new Date().getHours(); return h<12?'¡Buenos días':h<19?'¡Buenas tardes':'¡Buenas noches' }


  return (
    <>
      <style>{CSS}</style>

      {/* Saludo */}
      <div style={{marginBottom:22, animation:'fadeUp .3s ease-out'}}>
        <h1 style={{fontFamily:'Arial Black,system-ui', fontWeight:900, fontSize:'clamp(18px,4vw,24px)', color:'#0d2137', marginBottom:3}}>
          {greeting()}, {user?.nombre?.split(' ')[0] || ''}! 👋
        </h1>
        <p style={{fontSize:13, color:'#8aaac4'}}>
          {new Date().toLocaleDateString('es-MX',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
        </p>
      </div>



      {/* ── CARRUSEL NOTICIAS ── */}
      {(loading || noticias.length > 0) && (
        <div style={{marginBottom:32, animation:'fadeUp .3s ease-out .1s both'}}>
          <p className="sec-title">📢 Novedades y promociones</p>
          <p className="sec-sub">Ofertas, nuevos modelos y avisos importantes</p>

          {loading ? (
            <div style={{height:220, borderRadius:18}} className="skel"/>
          ) : (
            <div style={{position:'relative'}}>
              <div className="carousel-wrap">
                <div className="carousel-track" style={{transform:`translateX(-${notCarousel.idx*100}%)`}}>
                  {/* Fixed: Nuevos modelos card always first */}
                  <div className="carousel-slide">
                    <div style={{background:'linear-gradient(135deg,#0d2137,#1a3a6b)',borderRadius:18,overflow:'hidden',position:'relative',minHeight:200}}>
                      <img src="https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=1200&q=60" alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.2}}/>
                      <div style={{position:'relative',padding:'28px 32px',display:'flex',flexDirection:'column',justifyContent:'space-between',minHeight:200}}>
                        <div>
                          <span style={{display:'inline-flex',alignItems:'center',padding:'4px 12px',borderRadius:100,background:'rgba(75,174,240,0.25)',fontSize:11,fontWeight:700,color:'#4baef0',marginBottom:14,letterSpacing:'.05em'}}>
                            ✦ CATÁLOGO
                          </span>
                          <h2 style={{fontFamily:'Arial Black,sans-serif',fontWeight:900,fontSize:'clamp(16px,3vw,22px)',color:'white',lineHeight:1.2,marginBottom:10}}>
                            Nuevos modelos disponibles
                          </h2>
                          <p style={{fontSize:14,color:'rgba(255,255,255,0.75)',lineHeight:1.6,maxWidth:560}}>
                            Revisa las últimas referencias agregadas al catálogo. Filtra por marca, tipo y color para encontrar lo que necesitas.
                          </p>
                        </div>
                        <Link href="/client/catalog?filter=new" style={{marginTop:18,display:'inline-flex',alignItems:'center',gap:6,padding:'9px 20px',borderRadius:100,background:'white',color:'#1565c0',fontSize:13,fontWeight:700,textDecoration:'none',width:'fit-content',transition:'all .18s'}}>
                          Ver novedades en catálogo →
                        </Link>
                      </div>
                    </div>
                  </div>
                  {noticias.map((n, i) => {
                    const isPromo = n.tipo === 'promocion'
                    return (
                      <div key={n.id} className="carousel-slide">
                        <div style={{
                          background: isPromo
                            ? 'linear-gradient(135deg, #92400e, #d97706)'
                            : 'linear-gradient(135deg, #1e3a5f, #1565c0)',
                          borderRadius:18, overflow:'hidden', position:'relative',
                          minHeight:200,
                        }}>
                          {/* Background image: usar la propia o una de unsplash según tipo */}
                          {(() => {
                            const fallbacks: Record<string,string> = {
                              'noticia':   'https://images.unsplash.com/photo-1601593346740-925612772716?w=1200&q=60',
                              'promocion': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=60',
                            }
                            const img = n.imagen_url || fallbacks[n.tipo]
                            return img ? <img src={img} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.22}}/> : null
                          })()}
                          <div style={{position:'relative', padding:'28px 32px', display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:200}}>
                            <div>
                              <span style={{display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:100, background:'rgba(255,255,255,0.2)', fontSize:11, fontWeight:700, color:'white', marginBottom:14, letterSpacing:'.05em'}}>
                                {isPromo ? '🔥 PROMOCIÓN' : '📣 NOVEDAD'}{n.destacado ? ' · ⭐ DESTACADO' : ''}
                              </span>
                              <h2 style={{fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:'clamp(16px,3vw,22px)', color:'white', lineHeight:1.2, marginBottom:10}}>{n.titulo}</h2>
                              <p style={{fontSize:14, color:'rgba(255,255,255,0.8)', lineHeight:1.6, maxWidth:560}}>{n.cuerpo}</p>
                            </div>
                            {n.link_url && (
                              <Link href={n.link_url} style={{marginTop:18, display:'inline-flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:100, background:'white', color: isPromo?'#92400e':'#1565c0', fontSize:13, fontWeight:700, textDecoration:'none', width:'fit-content', transition:'all .18s'}}>
                                {n.link_texto||'Ver más'} →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Dots + flechas */}
              {noticias.length > 1 && (
                <>
                  <button onClick={notCarousel.prev} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:16,color:'white',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                  <button onClick={notCarousel.next} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:16,color:'white',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
                  <div style={{position:'absolute',bottom:14,left:'50%',transform:'translateX(-50%)',display:'flex',gap:5}}>
                    {[null,...noticias].map((_,i) => (
                      <button key={i} className={`dot${i===notCarousel.idx?' act':''}`} onClick={()=>notCarousel.go(i)}/>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SERIES ── */}
      <div style={{marginBottom:32, animation:'fadeUp .3s ease-out .15s both'}}>
        <p className="sec-title">🗂️ Series de productos</p>
        <p className="sec-sub">Selecciona una serie para ver los modelos disponibles</p>

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16}}>
          {loading ? [1,2,3,4].map(i=>(
            <div key={i} style={{minWidth:280,height:240,borderRadius:18,flexShrink:0}} className="skel"/>
          )) : series.map(s => {
            const meta = SERIE_META[s.tipo_case] || DEFAULT_META
            const img  = s.foto_url || meta.fallback
            return (
              <Link key={s.tipo_case} href={`/client/catalog/${encodeURIComponent(s.tipo_case)}`} className="serie-card" style={{minWidth:0}}>
                {/* Image */}
                <div style={{height:160, position:'relative', overflow:'hidden', background:meta.bg}}>
                  {img
                    ? <img src={img} alt={s.tipo_case} style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform .4s'}} onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.06)')} onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}/>
                    : <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',fontSize:52,opacity:.5}}>{meta.emoji}</div>
                  }
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)'}}/>
                  <span style={{position:'absolute',top:10,right:10,padding:'3px 10px',borderRadius:100,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(6px)',color:'white',fontSize:10,fontWeight:700}}>
                    {s.total_modelos} modelos
                  </span>
                  <span style={{position:'absolute',bottom:10,left:12,fontFamily:'Arial Black,sans-serif',fontSize:17,fontWeight:900,color:'white',textShadow:'0 2px 8px rgba(0,0,0,0.5)'}}>
                    {meta.emoji} {s.tipo_case}
                  </span>
                </div>
                {/* Footer */}
                <div style={{padding:'12px 14px',background:'white'}}>
                  <p style={{fontSize:12,color:'#3a6080',lineHeight:1.5,marginBottom:8,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'} as any}>
                    {s.descripcion || 'Cases de alta calidad para tu celular.'}
                  </p>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:11,color:'#8aaac4'}}>{s.total_marcas} marcas · {s.total_colores} colores</span>
                    <span style={{fontSize:12,color:'#1565c0',fontWeight:700}}>Ver modelos →</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

    </>
  )
}