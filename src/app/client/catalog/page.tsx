'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Serie {
  tipo_case: string; total_modelos: number; total_colores: number
  total_marcas: number; foto_url: string|null; descripcion: string|null
}

const SERIE_META: Record<string,{emoji:string; bg:string; fallback:string}> = {
  '3 EN 1':   {emoji:'🎯', bg:'linear-gradient(135deg,#1e3a5f,#1565c0)', fallback:'https://images.unsplash.com/photo-1601593346740-925612772716?w=600&q=70'},
  'ESCUDO':   {emoji:'🛡️', bg:'linear-gradient(135deg,#78350f,#d97706)', fallback:'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&q=70'},
  'BLINDAJE': {emoji:'🔐', bg:'linear-gradient(135deg,#1e293b,#334155)', fallback:'https://images.unsplash.com/photo-1613588718956-c2e80305bf61?w=600&q=70'},
  'ANILLO':   {emoji:'💍', bg:'linear-gradient(135deg,#4c1d95,#7c3aed)', fallback:'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&q=70'},
}
const DEFAULT_META = {emoji:'📦', bg:'linear-gradient(135deg,#0d2137,#1565c0)', fallback:''}

const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel { background:linear-gradient(90deg,#e2eaf4 25%,#f0f4f8 50%,#e2eaf4 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:16px; }
  .serie-card {
    border-radius:18px; overflow:hidden; text-decoration:none;
    display:block; transition:transform .22s, box-shadow .22s;
    box-shadow:0 4px 20px rgba(0,0,0,0.08); background:white;
    border:1px solid #e2eaf4;
  }
  .serie-card:hover { transform:translateY(-5px); box-shadow:0 16px 40px rgba(21,101,192,0.15); border-color:#4baef0; }
`

export default function CatalogPage() {
  const searchParams = useSearchParams()
  const [series,  setSeries]  = useState<Serie[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    fetch('/api/client/catalog')
      .then(r => r.json())
      .then(d => { setSeries(d.series || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = series.filter(s =>
    !search || s.tipo_case.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{marginBottom:24, animation:'fadeUp .3s ease-out'}}>
        <h1 style={{fontFamily:'Arial Black,system-ui', fontWeight:900, fontSize:'clamp(18px,4vw,24px)', color:'#0d2137', marginBottom:4}}>
          🗂️ Catálogo de productos
        </h1>
        <p style={{fontSize:13, color:'#8aaac4'}}>
          Selecciona una serie para ver los modelos disponibles
        </p>
      </div>

      {/* Search */}
      <div style={{marginBottom:24}}>
        <input
          placeholder="🔍 Buscar serie..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{padding:'10px 14px', borderRadius:10, border:'1.5px solid #d0dde8', background:'white', fontSize:13, color:'#0d2137', fontFamily:'inherit', outline:'none', width:'100%', maxWidth:320, transition:'border-color .18s', boxSizing:'border-box'}}
          onFocus={e => e.currentTarget.style.borderColor='#1565c0'}
          onBlur={e  => e.currentTarget.style.borderColor='#d0dde8'}
        />
      </div>

      {/* Grid — same layout as home "Series de productos" */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:16, animation:'fadeUp .3s ease-out .05s both'}}>
        {loading ? [1,2,3,4].map(i => (
          <div key={i} style={{height:260}} className="skel"/>
        )) : filtered.length === 0 ? (
          <div style={{gridColumn:'1/-1', textAlign:'center', padding:'48px 20px', color:'#8aaac4', fontSize:14}}>
            Sin series para ese filtro
          </div>
        ) : filtered.map(s => {
          const meta = SERIE_META[s.tipo_case] || DEFAULT_META
          const img  = s.foto_url || meta.fallback
          return (
            <Link key={s.tipo_case} href={`/client/catalog/${encodeURIComponent(s.tipo_case)}`} className="serie-card">
              {/* Image */}
              <div style={{height:160, position:'relative', overflow:'hidden', background:meta.bg}}>
                {img
                  ? <img src={img} alt={s.tipo_case} style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform .4s'}}
                         onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.06)')}
                         onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}/>
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
              <div style={{padding:'14px 16px'}}>
                <p style={{fontSize:12.5,color:'#3a6080',lineHeight:1.5,marginBottom:10,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'} as any}>
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
    </>
  )
}
