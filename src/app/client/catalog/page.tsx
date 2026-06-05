'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Serie {
  tipo_case: string; total_modelos: number; total_colores: number
  total_marcas: number; foto_url: string|null; descripcion: string|null
}

const SERIE_META: Record<string,{emoji:string; bg:string; fallback:string}> = {
  '3 EN 1':   { emoji:'🎯', bg:'linear-gradient(135deg,#1e3a5f,var(--blue))', fallback:'https://images.unsplash.com/photo-1601593346740-925612772716?w=600&q=70' },
  'ESCUDO':   { emoji:'🛡️', bg:'linear-gradient(135deg,#78350f,#d97706)', fallback:'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&q=70' },
  'BLINDAJE': { emoji:'🔐', bg:'linear-gradient(135deg,#1e293b,#334155)', fallback:'https://images.unsplash.com/photo-1613588718956-c2e80305bf61?w=600&q=70' },
  'ANILLO':   { emoji:'💍', bg:'linear-gradient(135deg,#4c1d95,#7c3aed)', fallback:'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&q=70' },
}
const DEFAULT_META = { emoji:'📦', bg:'linear-gradient(135deg,var(--txt),var(--blue))', fallback:'' }

const CSS = `
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel { background:linear-gradient(90deg,var(--border) 25%,var(--bg) 50%,var(--border) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:14px; }

  .serie-card {
    border-radius:16px; overflow:hidden; text-decoration:none; display:block;
    transition:transform .22s, box-shadow .22s, border-color .2s;
    box-shadow:0 4px 16px rgba(0,0,0,.07); background:white;
    border:1.5px solid var(--border);
  }
  .serie-card:hover { transform:translateY(-5px); box-shadow:0 16px 40px rgba(21,101,192,.15); border-color:var(--blue2); }

  .cat-tab {
    padding:8px 18px; border-radius:100px; font-size:13px; font-weight:600;
    border:1.5px solid var(--border); background:white; color:var(--txt2);
    cursor:pointer; transition:all .15s; font-family:inherit; white-space:nowrap;
    text-decoration: none; display: inline-block;
  }
  .cat-tab:hover { border-color:var(--blue); color:var(--blue); }
  .cat-tab.act { border-color:var(--blue); background:var(--blue); color:white; }

  .search-field {
    padding:10px 14px 10px 36px; border-radius:10px;
    border:1.5px solid var(--field-border); background:white; font-size:13px;
    color:var(--txt); font-family:inherit; outline:none;
    transition:border-color .18s; width:100%; max-width:360px; box-sizing:border-box;
  }
  .search-field:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(21,101,192,.1); }
  .search-wrap { position:relative; display:inline-block; }
  .search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:14px; pointer-events:none; }
`

export default function CatalogPage() {
  const searchParams = useSearchParams()
  const [series,  setSeries]  = useState<Serie[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState(searchParams.get('search') || '')
  const [active,  setActive]  = useState<string>('todos')

  useEffect(() => {
    fetch('/api/client/catalog')
      .then(r => r.json())
      .then(d => { setSeries(d.series || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const tipos = ['todos', ...series.map(s => s.tipo_case)]

  const filtered = series.filter(s => {
    const matchTipo   = active === 'todos' || s.tipo_case === active
    const matchSearch = !search || s.tipo_case.toLowerCase().includes(search.toLowerCase())
    return matchTipo && matchSearch
  })

  return (
    <>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div style={{ marginBottom:24, animation:'fadeUp .3s ease-out' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontWeight:900, fontSize:'clamp(18px,4vw,24px)', color:'var(--txt)', marginBottom:4 }}>
              🗂️ Catálogo de productos
            </h1>
            <p style={{ fontSize:13, color:'var(--txt3)' }}>
              {loading ? 'Cargando…' : `${series.reduce((s,r)=>s+r.total_modelos,0)} modelos disponibles en ${series.length} categorías`}
            </p>
          </div>
          {/* Buscador */}
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-field"
              placeholder="Buscar categoría…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── TABS POR TIPO ── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
        {loading ? [1,2,3,4,5].map(i => (
          <div key={i} style={{ width:90, height:36, borderRadius:100 }} className="skel" />
        )) : tipos.map(t => (
          <button
            key={t}
            className={`cat-tab${active === t ? ' act' : ''}`}
            onClick={() => setActive(t)}
          >
            {t === 'todos' ? 'Todas' : `${(SERIE_META[t] || DEFAULT_META).emoji} ${t}`}
          </button>
        ))}
      </div>

      {/* ── GRID ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16, animation:'fadeUp .3s ease-out .05s both' }}>
        {loading ? [1,2,3,4].map(i => (
          <div key={i} style={{ height:280 }} className="skel" />
        )) : filtered.length === 0 ? (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'48px 20px', color:'var(--txt3)', fontSize:14 }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🔍</div>
            Sin series para ese filtro.{' '}
            <button onClick={() => { setSearch(''); setActive('todos') }} style={{ color:'var(--blue)', fontWeight:600, cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', fontSize:14 }}>
              Ver todo
            </button>
          </div>
        ) : filtered.map(s => {
          const meta = SERIE_META[s.tipo_case] || DEFAULT_META
          const img  = s.foto_url || meta.fallback
          return (
            <Link key={s.tipo_case} href={`/client/catalog/${encodeURIComponent(s.tipo_case)}`} className="serie-card">
              {/* Image */}
              <div style={{ height:170, position:'relative', overflow:'hidden', background:meta.bg }}>
                {img
                  ? <img src={img} alt={s.tipo_case} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .4s' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                  : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:56, opacity:.45 }}>{meta.emoji}</div>
                }
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 60%)' }} />
                <span style={{ position:'absolute', top:10, right:10, padding:'3px 10px', borderRadius:100, background:'rgba(0,0,0,.4)', backdropFilter:'blur(6px)', color:'white', fontSize:10, fontWeight:700 }}>
                  {s.total_modelos} modelos
                </span>
                <span style={{ position:'absolute', bottom:10, left:14, fontWeight:900, fontSize:17, color:'white', textShadow:'0 2px 8px rgba(0,0,0,.5)' }}>
                  {meta.emoji} {s.tipo_case}
                </span>
              </div>
              {/* Footer */}
              <div style={{ padding:'14px 16px', background:'white' }}>
                <p style={{ fontSize:12, color:'var(--txt2)', lineHeight:1.5, marginBottom:10, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' } as any}>
                  {s.descripcion || 'Cases de alta calidad disponibles en múltiples colores y marcas.'}
                </p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <span style={{ fontSize:11, background:'var(--bg)', color:'var(--txt2)', fontWeight:600, padding:'2px 8px', borderRadius:6 }}>{s.total_marcas} marcas</span>
                    <span style={{ fontSize:11, background:'var(--bg)', color:'var(--txt2)', fontWeight:600, padding:'2px 8px', borderRadius:6 }}>{s.total_colores} colores</span>
                  </div>
                  <span style={{ fontSize:12, color:'var(--blue)', fontWeight:700 }}>Ver →</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
