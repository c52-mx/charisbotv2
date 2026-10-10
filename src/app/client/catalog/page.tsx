'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

interface Product {
  producto_id: string
  categoria: string
  serie: string | null
  modelo: string | null
  color: string | null
  nombre: string
  foto_url: string | null
  marca: string | null
  precio: number
  stock: number
  vendidos: number
  atributos: Record<string, any> | null
  creado_en: string
}

interface Filters {
  categorias: string[]
  series: string[]
  modelos: string[]
  colores: string[]
  precio_min: number
  precio_max: number
}

const COLOR_DOT: Record<string, string> = {
  NEGRO: '#111', BLANCO: '#f0f0f0', TRANSPARENTE: '#e0e0e0',
  ROJO: '#ef4444', AZUL: '#3b82f6', VERDE: '#22c55e',
  ROSA: '#ec4899', MORADO: '#a855f7', DORADO: '#d97706',
  PLATEADO: '#94a3b8', NARANJA: '#f97316', GRIS: '#64748b',
}

const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel { background:linear-gradient(90deg,var(--border) 25%,var(--bg) 50%,var(--border) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }

  /* ── SEARCH BAR (ML-style top) ── */
  .ml-searchbar {
    display: flex; align-items: center; gap: 0;
    border: 1.5px solid var(--field-border); border-radius: 10px;
    background: white; overflow: hidden;
    transition: border-color .15s, box-shadow .15s;
    box-shadow: 0 1px 4px rgba(0,0,0,.06);
  }
  .ml-searchbar:focus-within { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(21,101,192,.09); }
  .ml-search-input {
    flex: 1; padding: 11px 14px; border: none; background: none;
    font-size: 14px; color: var(--txt); font-family: inherit; outline: none;
  }
  .ml-search-btn {
    padding: 0 18px; background: var(--blue); border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; line-height: 1; transition: background .15s; align-self: stretch;
    min-height: 44px;
  }
  .ml-search-btn:hover { background: var(--blue-hover, #1251a3); }

  /* ── LAYOUT ── */
  .ml-wrap { display: flex; gap: 0; align-items: flex-start; }
  .ml-sidebar {
    width: 220px; flex-shrink: 0; background: white;
    border: 1.5px solid var(--border); border-radius: 12px;
    position: sticky; top: 84px; overflow: hidden; margin-right: 18px;
  }
  .ml-main { flex: 1; min-width: 0; }

  /* ── SIDEBAR ── */
  .sb-section { border-bottom: 1px solid var(--border); }
  .sb-section:last-child { border-bottom: none; }
  .sb-section-hd {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; cursor: pointer; user-select: none;
    transition: background .12s;
  }
  .sb-section-hd:hover { background: var(--bg); }
  .sb-title { font-size: 12px; font-weight: 800; color: var(--txt3); letter-spacing: .07em; text-transform: uppercase; }
  .sb-chevron { font-size: 10px; color: var(--txt3); transition: transform .2s; line-height: 1; }
  .sb-chevron.open { transform: rotate(180deg); }
  .sb-body { overflow: hidden; transition: max-height .22s ease, opacity .2s ease; }
  .sb-body.open { opacity: 1; }
  .sb-body.closed { max-height: 0 !important; opacity: 0; }
  .sb-body-inner { padding: 0 14px 12px; }
  .sb-item {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 0; font-size: 13px; color: var(--txt);
    cursor: pointer; transition: color .12s; user-select: none;
  }
  .sb-item:hover { color: var(--blue); }
  .sb-item.act { color: var(--blue); font-weight: 700; }
  .sb-checkbox { width: 14px; height: 14px; accent-color: var(--blue); cursor: pointer; flex-shrink: 0; }
  .sb-color-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  .sb-color {
    width: 22px; height: 22px; border-radius: 50%;
    border: 2px solid var(--border); cursor: pointer;
    transition: transform .15s, border-color .15s;
  }
  .sb-color:hover { transform: scale(1.15); }
  .sb-color.act { border-color: var(--blue); box-shadow: 0 0 0 2px var(--blue); transform: scale(1.1); }
  .sb-price-row { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
  .sb-price-input {
    flex: 1; min-width: 0; padding: 6px 8px; border: 1.5px solid var(--field-border); border-radius: 7px;
    font-size: 12px; color: var(--txt); font-family: inherit; outline: none; background: var(--field-bg);
    box-sizing: border-box;
  }
  .sb-price-input:focus { border-color: var(--blue); }
  .sb-range-hint { font-size: 10.5px; color: var(--txt3); margin-top: 4px; }
  .sb-clear { font-size: 12px; color: var(--blue); font-weight: 600; cursor: pointer; border: none; background: none; padding: 0; font-family: inherit; }
  .sb-clear:hover { text-decoration: underline; }

  /* ── PRODUCT CARD (ML style) ── */
  .pc-card {
    background: white;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    transition: box-shadow .2s, border-color .2s;
    position: relative;
    color: inherit;
  }
  .pc-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.12); border-color: #ccc; }
  .pc-img-wrap { position: relative; background: #fff; aspect-ratio: 1/1; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 8%; }
  .pc-img { width: 100%; height: 100%; object-fit: contain; transition: transform .3s; }
  .pc-card:hover .pc-img { transform: scale(1.04); }
  .pc-img-placeholder { font-size: 52px; opacity: .2; }
  .pc-badge {
    position: absolute; top: 8px; left: 8px;
    padding: 2px 7px; border-radius: 3px;
    font-size: 10.5px; font-weight: 800; letter-spacing: .02em;
  }
  .pc-badge-new  { background: #3483fa; color: white; }
  .pc-badge-hot  { background: #ff7733; color: white; }
  .pc-badge-out  { background: #f0f0f0; color: #999; }
  .pc-body { padding: 10px 12px 8px; flex: 1; display: flex; flex-direction: column; }
  .pc-name {
    font-size: 13px; font-weight: 400; color: #333; line-height: 1.5;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    margin-bottom: 6px;
  }
  .pc-stars { display: flex; align-items: center; gap: 3px; font-size: 11px; margin-bottom: 5px; }
  .pc-stars-val { color: #3483fa; letter-spacing: -.5px; font-size: 12px; }
  .pc-stars-cnt { color: #999; }
  .pc-vendidos-inline { color: #999; font-size: 11px; }
  .pc-price-row { margin-bottom: 2px; }
  .pc-price { font-size: 20px; font-weight: 300; color: #333; }
  .pc-price-unit { font-size: 11px; color: #999; font-weight: 400; }
  .pc-envio { font-size: 12px; color: #00a650; font-weight: 600; margin-top: 4px; }
  .pc-stock-low { font-size: 11px; font-weight: 600; color: #f73; margin-top: 2px; }
  .pc-stock-out { font-size: 11px; font-weight: 600; color: #f00; margin-top: 2px; opacity: .7; }
  .pc-add-btn {
    margin: 8px 12px 10px; padding: 9px 10px;
    background: #3483fa; color: white;
    border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: background .15s;
    letter-spacing: .01em;
  }
  .pc-add-btn:hover { background: #2968c8; }
  .pc-add-btn:disabled { background: #e0e0e0; color: #999; cursor: not-allowed; }

  /* ── GRID ── */
  .ml-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    animation: fadeUp .3s ease-out;
  }

  /* ── TOP BAR ── */
  .ml-topbar {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px; gap: 8px; flex-wrap: wrap;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .ml-count { font-size: 13px; color: #666; }
  .ml-sort {
    padding: 6px 10px; border: 1px solid var(--field-border); border-radius: 6px;
    font-size: 13px; color: var(--txt); background: white; outline: none;
    font-family: inherit; cursor: pointer;
  }
  .ml-sort:focus { border-color: var(--blue); }

  /* ── PAGINATION ── */
  .ml-pag { display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 28px; }
  .ml-pag-btn {
    min-width: 32px; height: 32px; border-radius: 6px;
    border: 1px solid var(--border); background: white;
    font-size: 13px; font-weight: 600; color: var(--txt2);
    cursor: pointer; font-family: inherit; padding: 0 6px;
    transition: all .12s;
  }
  .ml-pag-btn:hover { border-color: var(--blue); color: var(--blue); background: #f0f7ff; }
  .ml-pag-btn.act { background: #3483fa; color: white; border-color: #3483fa; }
  .ml-pag-btn:disabled { opacity: .35; cursor: not-allowed; }

  /* ── MOBILE sidebar toggle ── */
  .ml-filter-toggle {
    display: none; align-items: center; gap: 6px;
    padding: 8px 14px; border: 1px solid var(--border); border-radius: 8px;
    background: white; font-size: 13px; font-weight: 600; color: var(--txt);
    cursor: pointer; font-family: inherit;
  }

  /* ── ACTIVE FILTER CHIPS ── */
  .ml-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .ml-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 100px;
    background: #eff6ff; color: var(--blue);
    font-size: 12px; font-weight: 600; border: 1px solid #bfdbfe;
  }
  .ml-chip-x { cursor: pointer; font-size: 11px; line-height: 1; opacity: .7; }
  .ml-chip-x:hover { opacity: 1; }

  @media (max-width: 1024px) { .ml-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 768px) {
    .ml-sidebar { display: none; position: fixed; inset: 0; z-index: 150; width: 280px; top: 0; border-radius: 0; height: 100%; overflow-y: auto; }
    .ml-sidebar.open { display: block; }
    .ml-wrap { display: block; }
    .ml-filter-toggle { display: flex; }
    .ml-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 480px) { .ml-grid { grid-template-columns: repeat(2, 1fr); } }
`

function StarRating({ val = 4.3, cnt }: { val?: number; cnt?: number }) {
  const full = Math.floor(val)
  const half = val - full >= 0.5
  return (
    <span className="pc-stars">
      <span className="pc-stars-val">
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      </span>
      {cnt !== undefined && <span className="pc-stars-cnt">({cnt})</span>}
    </span>
  )
}

function ratingFor(nombre: string): number {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = ((h << 5) - h + nombre.charCodeAt(i)) | 0
  return 3.8 + (Math.abs(h) % 12) / 10
}
function cntFor(nombre: string): number {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = ((h << 5) - h + nombre.charCodeAt(i) + 7) | 0
  return 12 + (Math.abs(h) % 200)
}

function ProductCard({ p, onAdd }: { p: Product; onAdd: (p: Product) => void }) {
  const isNew = Date.now() - new Date((p.creado_en as any) || 0).getTime() < 30 * 86400_000
  const stockStatus = p.stock <= 0 ? 'out' : p.stock <= 5 ? 'low' : 'ok'
  const rating = ratingFor(p.nombre)
  const cnt = cntFor(p.nombre)

  return (
    <div className="pc-card">
      <Link href={`/client/catalog/${p.producto_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
        <div className="pc-img-wrap">
          {p.foto_url
            ? <img src={p.foto_url} alt={p.nombre} className="pc-img" loading="lazy" />
            : <div className="pc-img-placeholder">
                {p.categoria === 'FUNDA' ? '📱' : p.categoria === 'CARGADOR' ? '🔌' : '📦'}
              </div>
          }
          {stockStatus === 'out' && <span className="pc-badge pc-badge-out">Sin stock</span>}
          {stockStatus !== 'out' && isNew && <span className="pc-badge pc-badge-new">NUEVO</span>}
          {stockStatus !== 'out' && !isNew && p.vendidos > 50 && <span className="pc-badge pc-badge-hot">MÁS VENDIDO</span>}
        </div>

        <div className="pc-body">
          <p className="pc-name">{p.nombre}</p>
          <StarRating val={rating} cnt={cnt} />
          <div className="pc-price-row">
            <span className="pc-price">${Number(p.precio).toLocaleString('es-MX')}</span>
            <span className="pc-price-unit"> MXN</span>
          </div>
          {stockStatus !== 'out' && <p className="pc-envio">Envío disponible</p>}
          {stockStatus === 'low' && <p className="pc-stock-low">¡Solo quedan {p.stock}!</p>}
          {stockStatus === 'out' && <p className="pc-stock-out">Sin existencia</p>}
        </div>
      </Link>

      <button
        className="pc-add-btn"
        disabled={stockStatus === 'out'}
        onClick={() => onAdd(p)}
      >
        Agregar al carrito
      </button>
    </div>
  )
}

export default function CatalogPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts]   = useState<Product[]>([])
  const [filters,  setFilters]    = useState<Filters>({ categorias: [], series: [], modelos: [], colores: [], precio_min: 0, precio_max: 0 })
  const [loading,  setLoading]    = useState(true)
  const [total,    setTotal]      = useState(0)
  const [page,     setPage]       = useState(1)
  const pageSize = 24

  const [search,    setSearch]    = useState(searchParams.get('search') || '')
  const [inputVal,  setInputVal]  = useState(searchParams.get('search') || '')
  const [categoria, setCategoria] = useState(searchParams.get('categoria') || '')
  const [serie,     setSerie]     = useState(searchParams.get('serie') || searchParams.get('tipo') || '')
  const [modelo,    setModelo]    = useState(searchParams.get('modelo') || '')
  const [color,     setColor]     = useState(searchParams.get('color') || '')
  const [minPrecio, setMinPrecio] = useState(searchParams.get('min_precio') || '')
  const [maxPrecio, setMaxPrecio] = useState(searchParams.get('max_precio') || '')
  const [soloDisp,  setSoloDisp]  = useState(false)
  const [sortBy,    setSortBy]    = useState('relevance')
  const [sideOpen,  setSideOpen]  = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [addMsg,    setAddMsg]    = useState('')
  const addMsgTimer = useRef<any>(null)

  // Sincronizar búsqueda del header: cuando el usuario usa la barra del header,
  // navega a /client/catalog?search=..., lo que cambia searchParams sin
  // remontar el componente — aquí actualizamos el estado para que se relance el fetch.
  useEffect(() => {
    const urlSearch = searchParams.get('search') || ''
    setSearch(urlSearch)
    setInputVal(urlSearch)
  }, [searchParams])

  function toggleSection(key: string) { setCollapsed(c => ({ ...c, [key]: !c[key] })) }
  function isOpen(key: string) { return collapsed[key] !== true }

  const fetchProducts = useCallback(async (p = 1) => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (search)    qs.set('search', search)
    if (categoria) qs.set('categoria', categoria)
    if (serie)     qs.set('serie', serie)
    if (modelo)    qs.set('modelo', modelo)
    if (color)     qs.set('color', color)
    if (minPrecio) qs.set('min_precio', minPrecio)
    if (maxPrecio) qs.set('max_precio', maxPrecio)
    if (soloDisp)  qs.set('solo_disponibles', 'true')
    qs.set('sort', sortBy)
    qs.set('page', String(p))
    qs.set('size', String(pageSize))
    try {
      const res  = await fetch(`/api/client/catalog?${qs}`)
      const data = await res.json()
      setProducts(data.items || [])
      setTotal(data.total || 0)
      setFilters(f => data.filters?.categorias?.length ? data.filters : f)
    } finally { setLoading(false) }
  }, [search, categoria, serie, modelo, color, minPrecio, maxPrecio, soloDisp, sortBy])

  useEffect(() => { setPage(1); fetchProducts(1) }, [fetchProducts])
  useEffect(() => { if (page > 1) fetchProducts(page) }, [page])

  function submitSearch() {
    setSearch(inputVal)
  }

  async function addToCart(p: Product) {
    const res = await fetch('/api/client/cart/reserve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ producto_id: p.producto_id, cantidad: 1 }),
    })
    const data = await res.json()
    if (!res.ok) { showMsg(`⚠ Stock insuficiente (${data.disponible ?? 0} disp.)`); return }
    let cart: any[] = []
    try { cart = JSON.parse(localStorage.getItem('charis-cart') || '[]') } catch {}
    const idx = cart.findIndex((i: any) => i.producto_id === p.producto_id)
    if (idx >= 0) cart[idx].cantidad = Math.min(cart[idx].cantidad + 1, data.disponible ?? p.stock)
    else cart.push({ producto_id: p.producto_id, nombre: p.nombre, serie: p.serie, categoria: p.categoria, color: p.color, cantidad: 1, precio: data.precio ?? p.precio })
    localStorage.setItem('charis-cart', JSON.stringify(cart))
    window.dispatchEvent(new CustomEvent('charis-cart-updated'))
    window.dispatchEvent(new CustomEvent('charis-cart-open'))
    showMsg(`✓ ${p.nombre} — agregado`)
  }

  function showMsg(msg: string) {
    clearTimeout(addMsgTimer.current)
    setAddMsg(msg)
    addMsgTimer.current = setTimeout(() => setAddMsg(''), 2800)
  }

  function clearAllFilters() {
    setCategoria(''); setSerie(''); setModelo(''); setColor('')
    setMinPrecio(''); setMaxPrecio(''); setSoloDisp(false)
    setSearch(''); setInputVal('')
  }

  const hasFilters = !!(categoria || serie || modelo || color || minPrecio || maxPrecio || soloDisp || search)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <style>{CSS}</style>

      {addMsg && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', background:'#333', color:'white', padding:'10px 20px', borderRadius:8, fontSize:13, fontWeight:600, zIndex:300, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(0,0,0,.3)' }}>
          {addMsg}
        </div>
      )}

      {sideOpen && <div onClick={() => setSideOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:149 }} />}

      {/* ── ML-STYLE SEARCH BAR ── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="ml-searchbar">
              <input
                className="ml-search-input"
                placeholder="Buscar en el catálogo…"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitSearch()}
              />
              <button className="ml-search-btn" onClick={submitSearch} aria-label="Buscar">🔍</button>
            </div>
          </div>
          <button className="ml-filter-toggle" onClick={() => setSideOpen(o => !o)}>
            ☰ Filtros{hasFilters ? ` (${[categoria, serie, modelo, color, minPrecio, maxPrecio, soloDisp].filter(Boolean).length})` : ''}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="ml-chips">
          {search    && <span className="ml-chip">"{search}" <span className="ml-chip-x" onClick={() => { setSearch(''); setInputVal('') }}>✕</span></span>}
          {categoria && <span className="ml-chip">{categoria} <span className="ml-chip-x" onClick={() => setCategoria('')}>✕</span></span>}
          {serie     && <span className="ml-chip">{serie} <span className="ml-chip-x" onClick={() => setSerie('')}>✕</span></span>}
          {modelo    && <span className="ml-chip">{modelo} <span className="ml-chip-x" onClick={() => setModelo('')}>✕</span></span>}
          {color     && <span className="ml-chip">{color} <span className="ml-chip-x" onClick={() => setColor('')}>✕</span></span>}
          {minPrecio && <span className="ml-chip">Desde ${minPrecio} <span className="ml-chip-x" onClick={() => setMinPrecio('')}>✕</span></span>}
          {maxPrecio && <span className="ml-chip">Hasta ${maxPrecio} <span className="ml-chip-x" onClick={() => setMaxPrecio('')}>✕</span></span>}
          {soloDisp  && <span className="ml-chip">Con stock <span className="ml-chip-x" onClick={() => setSoloDisp(false)}>✕</span></span>}
          <button className="sb-clear" style={{ marginLeft: 4 }} onClick={clearAllFilters}>Borrar todos</button>
        </div>
      )}

      {/* ── TWO-COLUMN ── */}
      <div className="ml-wrap">

        {/* ── SIDEBAR ── */}
        <aside className={`ml-sidebar${sideOpen ? ' open' : ''}`}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 14px', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontWeight:800, fontSize:13, color:'var(--txt)' }}>Filtrar por</span>
            {hasFilters && <button className="sb-clear" onClick={clearAllFilters}>Borrar</button>}
            <button onClick={() => setSideOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--txt3)', marginLeft:8 }}>✕</button>
          </div>

          {/* Categorías */}
          <div className="sb-section">
            <div className="sb-section-hd" onClick={() => toggleSection('cat')}>
              <span className="sb-title">Categoría</span>
              <span className={`sb-chevron${isOpen('cat') ? ' open' : ''}`}>▼</span>
            </div>
            <div className={`sb-body${isOpen('cat') ? ' open' : ' closed'}`} style={{ maxHeight: isOpen('cat') ? 300 : 0 }}>
              <div className="sb-body-inner">
                {['FUNDA','ACCESORIO','CARGADOR','MICA'].map(cat => (
                  <div key={cat} className={`sb-item${categoria === cat ? ' act' : ''}`} onClick={() => setCategoria(c => c === cat ? '' : cat)}>
                    <span>{cat === 'FUNDA' ? '📱' : cat === 'ACCESORIO' ? '🔗' : cat === 'CARGADOR' ? '🔌' : '🛡️'}</span>
                    {cat}
                  </div>
                ))}
                {filters.categorias.filter(c => !['FUNDA','ACCESORIO','CARGADOR','MICA'].includes(c)).map(cat => (
                  <div key={cat} className={`sb-item${categoria === cat ? ' act' : ''}`} onClick={() => setCategoria(c => c === cat ? '' : cat)}>
                    <span>📦</span>{cat}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Línea / Modelo */}
          {(filters.series.length > 0 || filters.modelos?.length > 0) && (
            <div className="sb-section">
              <div className="sb-section-hd" onClick={() => toggleSection('serie')}>
                <span className="sb-title">Línea / Modelo</span>
                <span className={`sb-chevron${isOpen('serie') ? ' open' : ''}`}>▼</span>
              </div>
              <div className={`sb-body${isOpen('serie') ? ' open' : ' closed'}`} style={{ maxHeight: isOpen('serie') ? 360 : 0 }}>
                <div className="sb-body-inner">
                  {filters.series.slice(0, 8).map(s => (
                    <label key={`s-${s}`} className={`sb-item${serie === s ? ' act' : ''}`} style={{ cursor:'pointer' }}>
                      <input type="checkbox" className="sb-checkbox" checked={serie === s}
                        onChange={() => { setSerie(v => v === s ? '' : s); setModelo('') }} />
                      {s}
                    </label>
                  ))}
                  {(filters.modelos || []).slice(0, 8).map(m => (
                    <label key={`m-${m}`} className={`sb-item${modelo === m ? ' act' : ''}`} style={{ cursor:'pointer' }}>
                      <input type="checkbox" className="sb-checkbox" checked={modelo === m}
                        onChange={() => { setModelo(v => v === m ? '' : m); setSerie('') }} />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Color */}
          {filters.colores.length > 0 && (
            <div className="sb-section">
              <div className="sb-section-hd" onClick={() => toggleSection('color')}>
                <span className="sb-title">Color</span>
                <span className={`sb-chevron${isOpen('color') ? ' open' : ''}`}>▼</span>
              </div>
              <div className={`sb-body${isOpen('color') ? ' open' : ' closed'}`} style={{ maxHeight: isOpen('color') ? 200 : 0 }}>
                <div className="sb-body-inner">
                  <div className="sb-color-wrap">
                    {filters.colores.map(c => (
                      <button key={c} className={`sb-color${color === c ? ' act' : ''}`}
                        style={{ background: COLOR_DOT[c] || '#94a3b8' }} title={c}
                        onClick={() => setColor(v => v === c ? '' : c)} />
                    ))}
                  </div>
                  {color && <div style={{ marginTop:5, fontSize:11, color:'var(--txt3)' }}>Seleccionado: <b>{color}</b></div>}
                </div>
              </div>
            </div>
          )}

          {/* Precio */}
          <div className="sb-section">
            <div className="sb-section-hd" onClick={() => toggleSection('precio')}>
              <span className="sb-title">Precio (MXN)</span>
              <span className={`sb-chevron${isOpen('precio') ? ' open' : ''}`}>▼</span>
            </div>
            <div className={`sb-body${isOpen('precio') ? ' open' : ' closed'}`} style={{ maxHeight: isOpen('precio') ? 160 : 0 }}>
              <div className="sb-body-inner">
                <div className="sb-price-row">
                  <input className="sb-price-input" placeholder="Mín" type="number" value={minPrecio} onChange={e => setMinPrecio(e.target.value)} />
                  <span style={{ color:'var(--txt3)', fontSize:11 }}>—</span>
                  <input className="sb-price-input" placeholder="Máx" type="number" value={maxPrecio} onChange={e => setMaxPrecio(e.target.value)} />
                </div>
                {filters.precio_min > 0 && (
                  <p className="sb-range-hint">Rango: ${filters.precio_min.toLocaleString('es-MX')} – ${filters.precio_max.toLocaleString('es-MX')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Disponibilidad */}
          <div className="sb-section">
            <div className="sb-section-hd" onClick={() => toggleSection('stock')}>
              <span className="sb-title">Disponibilidad</span>
              <span className={`sb-chevron${isOpen('stock') ? ' open' : ''}`}>▼</span>
            </div>
            <div className={`sb-body${isOpen('stock') ? ' open' : ' closed'}`} style={{ maxHeight: isOpen('stock') ? 80 : 0 }}>
              <div className="sb-body-inner">
                <label className="sb-item" style={{ cursor:'pointer' }}>
                  <input type="checkbox" className="sb-checkbox" checked={soloDisp} onChange={e => setSoloDisp(e.target.checked)} />
                  Solo con stock
                </label>
              </div>
            </div>
          </div>

          <div style={{ padding:'12px 14px' }}>
            <button onClick={() => setSideOpen(false)} style={{ width:'100%', padding:'10px', background:'#3483fa', color:'white', border:'none', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              Ver {total} resultado{total !== 1 ? 's' : ''}
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="ml-main">
          <div className="ml-topbar">
            <span className="ml-count">
              {loading ? 'Buscando…' : `${total.toLocaleString('es-MX')} resultado${total !== 1 ? 's' : ''}`}
              {page > 1 ? ` · Pág. ${page} de ${totalPages}` : ''}
            </span>
            <select className="ml-sort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="relevance">Más recientes</option>
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
              <option value="vendidos">Más vendidos</option>
              <option value="nombre">A–Z</option>
            </select>
          </div>

          {loading ? (
            <div className="ml-grid">
              {[...Array(12)].map((_, i) => (
                <div key={i} style={{ borderRadius:6, overflow:'hidden', border:'1px solid var(--border)', background:'white' }}>
                  <div className="skel" style={{ height:190, borderRadius:0 }} />
                  <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:7 }}>
                    <div className="skel" style={{ height:13, width:'90%' }} />
                    <div className="skel" style={{ height:13, width:'70%' }} />
                    <div className="skel" style={{ height:10, width:'40%' }} />
                    <div className="skel" style={{ height:22, width:'50%', marginTop:4 }} />
                    <div className="skel" style={{ height:34, marginTop:4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--txt3)' }}>
              <div style={{ fontSize:52, marginBottom:12 }}>🔍</div>
              <p style={{ fontSize:15, fontWeight:700, marginBottom:8, color:'#333' }}>Sin resultados</p>
              <p style={{ fontSize:13, marginBottom:16 }}>Intenta con otro término o borra los filtros</p>
              <button onClick={clearAllFilters} style={{ padding:'9px 20px', borderRadius:6, background:'#3483fa', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="ml-grid">
              {products.map(p => <ProductCard key={p.producto_id} p={p} onAdd={addToCart} />)}
            </div>
          )}

          {totalPages > 1 && !loading && (
            <div className="ml-pag">
              <button className="ml-pag-btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let p = i + 1
                if (totalPages > 7) {
                  if (page <= 4) p = i + 1
                  else if (page >= totalPages - 3) p = totalPages - 6 + i
                  else p = page - 3 + i
                }
                return <button key={p} className={`ml-pag-btn${page === p ? ' act' : ''}`} onClick={() => setPage(p)}>{p}</button>
              })}
              <button className="ml-pag-btn" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
