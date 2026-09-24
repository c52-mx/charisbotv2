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

  /* ── LAYOUT ── */
  .ml-wrap { display:flex; gap:0; align-items:flex-start; }
  .ml-sidebar {
    width: 230px;
    flex-shrink: 0;
    background: white;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    position: sticky;
    top: 84px;
    overflow: hidden;
    margin-right: 16px;
  }
  .ml-main { flex: 1; min-width: 0; }

  /* ── SIDEBAR SECTIONS ── */
  .sb-section { border-bottom: 1px solid var(--border); padding: 14px 16px; }
  .sb-section:last-child { border-bottom: none; }
  .sb-title { font-size: 12px; font-weight: 800; color: var(--txt3); letter-spacing: .07em; text-transform: uppercase; margin-bottom: 10px; }
  .sb-item {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 0; font-size: 13.5px; color: var(--txt);
    cursor: pointer; transition: color .12s; user-select: none;
  }
  .sb-item:hover { color: var(--blue); }
  .sb-item.act { color: var(--blue); font-weight: 700; }
  .sb-checkbox { width: 15px; height: 15px; accent-color: var(--blue); cursor: pointer; flex-shrink: 0; }
  .sb-count { margin-left: auto; font-size: 11px; color: var(--txt3); background: var(--bg); padding: 1px 6px; border-radius: 10px; }
  .sb-clear { font-size: 12px; color: var(--blue); font-weight: 600; cursor: pointer; border: none; background: none; padding: 0; font-family: inherit; }
  .sb-clear:hover { text-decoration: underline; }
  .sb-color-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  .sb-color {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid var(--border); cursor: pointer;
    transition: transform .15s, border-color .15s;
    flex-shrink: 0;
  }
  .sb-color:hover { transform: scale(1.15); }
  .sb-color.act { border-color: var(--blue); box-shadow: 0 0 0 2px var(--blue); transform: scale(1.1); }
  .sb-price-row { display: flex; gap: 6px; align-items: center; margin-top: 8px; }
  .sb-price-input {
    flex: 1; padding: 6px 8px; border: 1.5px solid var(--field-border); border-radius: 7px;
    font-size: 12px; color: var(--txt); font-family: inherit; outline: none; background: var(--field-bg);
  }
  .sb-price-input:focus { border-color: var(--blue); }

  /* ── PRODUCT CARD ── */
  .pc-card {
    background: white;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    transition: box-shadow .2s, border-color .2s, transform .2s;
    position: relative;
  }
  .pc-card:hover { box-shadow: 0 8px 30px rgba(21,101,192,.13); border-color: var(--blue2); transform: translateY(-2px); }
  .pc-img-wrap { position: relative; background: var(--bg); aspect-ratio: 1/1; overflow: hidden; }
  .pc-img { width: 100%; height: 100%; object-fit: contain; padding: 10%; transition: transform .3s; }
  .pc-card:hover .pc-img { transform: scale(1.05); }
  .pc-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; opacity: .3; }
  .pc-badge {
    position: absolute; top: 8px; left: 8px;
    padding: 2px 8px; border-radius: 4px;
    font-size: 11px; font-weight: 800; letter-spacing: .02em;
  }
  .pc-badge-new  { background: var(--blue); color: white; }
  .pc-badge-hot  { background: #ef4444; color: white; }
  .pc-badge-out  { background: #e2e8f0; color: #64748b; }
  .pc-body { padding: 12px 14px; flex: 1; display: flex; flex-direction: column; gap: 5px; }
  .pc-cat { font-size: 11px; color: var(--txt3); font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
  .pc-name { font-size: 13.5px; font-weight: 700; color: var(--txt); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .pc-stars { display: flex; align-items: center; gap: 3px; font-size: 12px; }
  .pc-stars-val { color: #f59e0b; letter-spacing: -.5px; }
  .pc-stars-cnt { color: var(--txt3); font-size: 11px; }
  .pc-price { font-size: 17px; font-weight: 900; color: var(--navy-deep); }
  .pc-price-unit { font-size: 11px; color: var(--txt3); font-weight: 400; }
  .pc-vendidos { font-size: 11px; color: var(--txt3); }
  .pc-stock-ok  { font-size: 11px; font-weight: 600; color: #16a34a; }
  .pc-stock-low { font-size: 11px; font-weight: 600; color: #d97706; }
  .pc-stock-out { font-size: 11px; font-weight: 600; color: #ef4444; }
  .pc-add-btn {
    margin: 0 14px 14px; padding: 9px 14px;
    background: var(--blue); color: white;
    border: none; border-radius: 8px; font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: inherit;
    transition: background .15s;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .pc-add-btn:hover { background: var(--blue-hover, #1251a3); }
  .pc-add-btn:disabled { background: var(--border); color: var(--txt3); cursor: not-allowed; }

  /* ── GRID ── */
  .ml-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    animation: fadeUp .3s ease-out;
  }

  /* ── TOP BAR ── */
  .ml-topbar {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px; gap: 10px; flex-wrap: wrap;
  }
  .ml-count { font-size: 13px; color: var(--txt3); }
  .ml-sort {
    padding: 7px 12px; border: 1.5px solid var(--field-border); border-radius: 8px;
    font-size: 13px; color: var(--txt); background: white; outline: none;
    font-family: inherit; cursor: pointer;
  }
  .ml-sort:focus { border-color: var(--blue); }

  /* ── SEARCH BAR inline (catalog header) ── */
  .ml-search-wrap { position: relative; flex: 1; max-width: 400px; }
  .ml-search-input {
    width: 100%; padding: 9px 14px 9px 38px; border: 1.5px solid var(--field-border); border-radius: 9px;
    font-size: 13.5px; color: var(--txt); background: white; outline: none;
    font-family: inherit; box-sizing: border-box;
    transition: border-color .15s;
  }
  .ml-search-input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(21,101,192,.09); }
  .ml-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; pointer-events: none; }

  /* ── PAGINATION ── */
  .ml-pag { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 28px; }
  .ml-pag-btn {
    min-width: 34px; height: 34px; border-radius: 8px;
    border: 1.5px solid var(--border); background: white;
    font-size: 13px; font-weight: 600; color: var(--txt2);
    cursor: pointer; font-family: inherit; padding: 0 8px;
    transition: all .12s;
  }
  .ml-pag-btn:hover { border-color: var(--blue); color: var(--blue); }
  .ml-pag-btn.act { background: var(--blue); color: white; border-color: var(--blue); }
  .ml-pag-btn:disabled { opacity: .35; cursor: not-allowed; }

  /* ── MOBILE sidebar toggle ── */
  .ml-filter-toggle {
    display: none; align-items: center; gap: 6px;
    padding: 8px 14px; border: 1.5px solid var(--border); border-radius: 8px;
    background: white; font-size: 13px; font-weight: 600; color: var(--txt);
    cursor: pointer; font-family: inherit;
  }

  /* ── ACTIVE FILTER CHIPS ── */
  .ml-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .ml-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 100px;
    background: #eff6ff; color: var(--blue);
    font-size: 12px; font-weight: 600; border: 1px solid #bfdbfe;
  }
  .ml-chip-x { cursor: pointer; font-size: 11px; line-height: 1; opacity: .7; }
  .ml-chip-x:hover { opacity: 1; }

  @media (max-width: 1024px) {
    .ml-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 768px) {
    .ml-sidebar { display: none; position: fixed; inset: 0; z-index: 150; width: 280px; top: 0; border-radius: 0; height: 100%; overflow-y: auto; }
    .ml-sidebar.open { display: block; }
    .ml-wrap { display: block; }
    .ml-filter-toggle { display: flex; }
    .ml-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 480px) {
    .ml-grid { grid-template-columns: 1fr; }
  }
`

function StarRating({ val = 4.3 }: { val?: number }) {
  const full = Math.floor(val)
  const half = val - full >= 0.5
  return (
    <span className="pc-stars">
      <span className="pc-stars-val">
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      </span>
      <span className="pc-stars-cnt">({val.toFixed(1)})</span>
    </span>
  )
}

// Genera un rating pseudo-consistente basado en el hash del nombre
function ratingFor(nombre: string): number {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = ((h << 5) - h + nombre.charCodeAt(i)) | 0
  return 3.8 + (Math.abs(h) % 12) / 10
}

function ProductCard({ p, onAdd }: { p: Product; onAdd: (p: Product) => void }) {
  const isNew = Date.now() - new Date(p.creado_en as any || 0).getTime() < 30 * 86400_000
  const stockStatus = p.stock <= 0 ? 'out' : p.stock <= 5 ? 'low' : 'ok'

  return (
    <div className="pc-card">
      <Link href={`/client/catalog/${p.producto_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
        {/* Image */}
        <div className="pc-img-wrap">
          {p.foto_url
            ? <img src={p.foto_url} alt={p.nombre} className="pc-img" loading="lazy" />
            : <div className="pc-img-placeholder">
                {p.categoria === 'FUNDA' ? '📱' : p.categoria === 'CARGADOR' ? '🔌' : '📦'}
              </div>
          }
          {stockStatus === 'out' && <span className="pc-badge pc-badge-out">Agotado</span>}
          {stockStatus !== 'out' && isNew && <span className="pc-badge pc-badge-new">NUEVO</span>}
          {stockStatus !== 'out' && !isNew && p.vendidos > 50 && <span className="pc-badge pc-badge-hot">+ vendido</span>}
        </div>

        {/* Body */}
        <div className="pc-body">
          <span className="pc-cat">{p.serie || p.categoria}</span>
          <span className="pc-name">{p.nombre}</span>
          <StarRating val={ratingFor(p.nombre)} />
          {p.vendidos > 0 && <span className="pc-vendidos">{p.vendidos.toLocaleString('es-MX')} vendidos</span>}
          <div>
            <span className="pc-price">${Number(p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            {' '}<span className="pc-price-unit">MXN / pza</span>
          </div>
          {stockStatus === 'ok'  && <span className="pc-stock-ok">✓ Disponible ({p.stock} pzas)</span>}
          {stockStatus === 'low' && <span className="pc-stock-low">⚡ Últimas {p.stock} pzas</span>}
          {stockStatus === 'out' && <span className="pc-stock-out">✕ Sin stock</span>}
        </div>
      </Link>

      {/* Add to cart — outside the Link so click doesn't navigate */}
      <button
        className="pc-add-btn"
        disabled={stockStatus === 'out'}
        onClick={() => onAdd(p)}
      >
        🛒 Agregar al carrito
      </button>
    </div>
  )
}

export default function CatalogPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts]   = useState<Product[]>([])
  const [filters,  setFilters]    = useState<Filters>({ categorias: [], series: [], colores: [], precio_min: 0, precio_max: 0 })
  const [loading,  setLoading]    = useState(true)
  const [total,    setTotal]      = useState(0)
  const [page,     setPage]       = useState(1)
  const pageSize = 24

  // Filter state
  const [search,     setSearch]     = useState(searchParams.get('search') || '')
  const [categoria,  setCategoria]  = useState(searchParams.get('categoria') || '')
  const [serie,      setSerie]      = useState(searchParams.get('serie') || searchParams.get('tipo') || '')
  const [color,      setColor]      = useState(searchParams.get('color') || '')
  const [minPrecio,  setMinPrecio]  = useState(searchParams.get('min_precio') || '')
  const [maxPrecio,  setMaxPrecio]  = useState(searchParams.get('max_precio') || '')
  const [soloDisp,   setSoloDisp]   = useState(false)
  const [sortBy,     setSortBy]     = useState('relevance')
  const [sideOpen,   setSideOpen]   = useState(false)
  const [addMsg,     setAddMsg]     = useState('')
  const addMsgTimer = useRef<any>(null)

  const fetchProducts = useCallback(async (p = 1) => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (search)    qs.set('search', search)
    if (categoria) qs.set('categoria', categoria)
    if (serie)     qs.set('serie', serie)
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
    } finally {
      setLoading(false)
    }
  }, [search, categoria, serie, color, minPrecio, maxPrecio, soloDisp, sortBy])

  useEffect(() => { setPage(1); fetchProducts(1) }, [fetchProducts])
  useEffect(() => { if (page > 1) fetchProducts(page) }, [page])

  async function addToCart(p: Product) {
    const res = await fetch('/api/client/cart/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ producto_id: p.producto_id, cantidad: 1 }),
    })
    const data = await res.json()
    if (!res.ok) {
      showMsg(`⚠ Stock insuficiente (${data.disponible ?? 0} disp.)`)
      return
    }

    // Update localStorage cart
    let cart: any[] = []
    try { cart = JSON.parse(localStorage.getItem('charis-cart') || '[]') } catch {}
    const idx = cart.findIndex((i: any) => i.producto_id === p.producto_id)
    if (idx >= 0) {
      cart[idx].cantidad = Math.min(cart[idx].cantidad + 1, data.disponible ?? p.stock)
    } else {
      cart.push({ producto_id: p.producto_id, nombre: p.nombre, serie: p.serie, categoria: p.categoria, color: p.color, cantidad: 1, precio: data.precio ?? p.precio })
    }
    localStorage.setItem('charis-cart', JSON.stringify(cart))
    window.dispatchEvent(new CustomEvent('charis-cart-updated'))
    window.dispatchEvent(new CustomEvent('charis-cart-open'))
    showMsg(`✓ ${p.nombre} — 1 pza`)
  }

  function showMsg(msg: string) {
    clearTimeout(addMsgTimer.current)
    setAddMsg(msg)
    addMsgTimer.current = setTimeout(() => setAddMsg(''), 2800)
  }

  function clearAllFilters() {
    setCategoria(''); setSerie(''); setColor('')
    setMinPrecio(''); setMaxPrecio(''); setSoloDisp(false)
    setSearch('')
  }

  const hasFilters = !!(categoria || serie || color || minPrecio || maxPrecio || soloDisp || search)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <style>{CSS}</style>

      {/* Add msg toast */}
      {addMsg && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', background:'var(--navy-deep)', color:'white', padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:700, zIndex:300, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(0,0,0,.25)' }}>
          {addMsg}
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sideOpen && <div onClick={() => setSideOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(7,17,31,.5)', zIndex:149, backdropFilter:'blur(2px)' }} />}

      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontWeight:900, fontSize:'clamp(16px,3vw,22px)', color:'var(--txt)', marginBottom:2 }}>
              Catálogo de productos
            </h1>
            {!loading && (
              <p style={{ fontSize:12, color:'var(--txt3)' }}>
                {total.toLocaleString('es-MX')} productos disponibles
              </p>
            )}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {/* Inline search */}
            <div className="ml-search-wrap">
              <span className="ml-search-icon">🔍</span>
              <input
                className="ml-search-input"
                placeholder="Buscar producto, modelo, marca…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchProducts(1)}
              />
            </div>
            <button className="ml-filter-toggle" onClick={() => setSideOpen(o => !o)}>
              ⚙ Filtros {hasFilters ? `(${[categoria, serie, color, minPrecio, maxPrecio, soloDisp].filter(Boolean).length})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="ml-chips">
          {search    && <span className="ml-chip">"{search}" <span className="ml-chip-x" onClick={() => setSearch('')}>✕</span></span>}
          {categoria && <span className="ml-chip">{categoria} <span className="ml-chip-x" onClick={() => setCategoria('')}>✕</span></span>}
          {serie     && <span className="ml-chip">{serie} <span className="ml-chip-x" onClick={() => setSerie('')}>✕</span></span>}
          {color     && <span className="ml-chip">{color} <span className="ml-chip-x" onClick={() => setColor('')}>✕</span></span>}
          {minPrecio && <span className="ml-chip">Desde ${minPrecio} <span className="ml-chip-x" onClick={() => setMinPrecio('')}>✕</span></span>}
          {maxPrecio && <span className="ml-chip">Hasta ${maxPrecio} <span className="ml-chip-x" onClick={() => setMaxPrecio('')}>✕</span></span>}
          {soloDisp  && <span className="ml-chip">Solo disponibles <span className="ml-chip-x" onClick={() => setSoloDisp(false)}>✕</span></span>}
          <button className="sb-clear" style={{ marginLeft:4 }} onClick={clearAllFilters}>Borrar todos</button>
        </div>
      )}

      {/* ── TWO COLUMN LAYOUT ── */}
      <div className="ml-wrap">

        {/* ── SIDEBAR ── */}
        <aside className={`ml-sidebar${sideOpen ? ' open' : ''}`}>
          {/* Header sidebar (mobile) */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontWeight:800, fontSize:14, color:'var(--txt)' }}>Filtros</span>
            {hasFilters && <button className="sb-clear" onClick={clearAllFilters}>Borrar todos</button>}
            <button onClick={() => setSideOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--txt2)', marginLeft:8 }}>✕</button>
          </div>

          {/* Categorías */}
          <div className="sb-section">
            <div className="sb-title">Categoría</div>
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

          {/* Serie / Línea */}
          {filters.series.length > 0 && (
            <div className="sb-section">
              <div className="sb-title">Línea</div>
              {filters.series.slice(0, 8).map(s => (
                <label key={s} className={`sb-item${serie === s ? ' act' : ''}`} style={{ cursor:'pointer' }}>
                  <input type="checkbox" className="sb-checkbox" checked={serie === s} onChange={() => setSerie(v => v === s ? '' : s)} />
                  {s}
                </label>
              ))}
            </div>
          )}

          {/* Colores */}
          {filters.colores.length > 0 && (
            <div className="sb-section">
              <div className="sb-title">Color</div>
              <div className="sb-color-wrap">
                {filters.colores.map(c => (
                  <button
                    key={c}
                    className={`sb-color${color === c ? ' act' : ''}`}
                    style={{ background: COLOR_DOT[c] || '#94a3b8' }}
                    title={c}
                    onClick={() => setColor(v => v === c ? '' : c)}
                  />
                ))}
              </div>
              {color && <div style={{ marginTop:6, fontSize:11, color:'var(--txt3)' }}>Seleccionado: <b>{color}</b></div>}
            </div>
          )}

          {/* Precio */}
          <div className="sb-section">
            <div className="sb-title">Precio (MXN)</div>
            <div className="sb-price-row">
              <input className="sb-price-input" placeholder="Mín" type="number" value={minPrecio} onChange={e => setMinPrecio(e.target.value)} />
              <span style={{ color:'var(--txt3)', fontSize:12 }}>—</span>
              <input className="sb-price-input" placeholder="Máx" type="number" value={maxPrecio} onChange={e => setMaxPrecio(e.target.value)} />
            </div>
            {filters.precio_min > 0 && (
              <div style={{ fontSize:11, color:'var(--txt3)', marginTop:5 }}>
                Rango: ${filters.precio_min.toLocaleString('es-MX')} – ${filters.precio_max.toLocaleString('es-MX')}
              </div>
            )}
          </div>

          {/* Stock */}
          <div className="sb-section">
            <label className="sb-item" style={{ cursor:'pointer' }}>
              <input type="checkbox" className="sb-checkbox" checked={soloDisp} onChange={e => setSoloDisp(e.target.checked)} />
              Solo con stock disponible
            </label>
          </div>

          {/* Apply (mobile) */}
          <div style={{ padding:'12px 16px' }}>
            <button onClick={() => setSideOpen(false)} style={{ width:'100%', padding:'10px', background:'var(--blue)', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
              Ver {total} resultados
            </button>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="ml-main">
          {/* Top bar */}
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

          {/* Grid */}
          {loading ? (
            <div className="ml-grid">
              {[...Array(12)].map((_, i) => (
                <div key={i} style={{ borderRadius:12, overflow:'hidden', border:'1.5px solid var(--border)' }}>
                  <div className="skel" style={{ height:180 }} />
                  <div style={{ padding:12, display:'flex', flexDirection:'column', gap:8 }}>
                    <div className="skel" style={{ height:14, width:'60%' }} />
                    <div className="skel" style={{ height:18, width:'90%' }} />
                    <div className="skel" style={{ height:12, width:'40%' }} />
                    <div className="skel" style={{ height:20, width:'50%' }} />
                    <div className="skel" style={{ height:34, marginTop:6 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--txt3)' }}>
              <div style={{ fontSize:52, marginBottom:12 }}>🔍</div>
              <p style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>Sin resultados para ese filtro</p>
              <p style={{ fontSize:13, marginBottom:16 }}>Intenta con otra categoría o borra los filtros</p>
              <button onClick={clearAllFilters} style={{ padding:'9px 20px', borderRadius:8, background:'var(--blue)', color:'white', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="ml-grid">
              {products.map(p => <ProductCard key={p.producto_id} p={p} onAdd={addToCart} />)}
            </div>
          )}

          {/* Pagination */}
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
                return (
                  <button key={p} className={`ml-pag-btn${page === p ? ' act' : ''}`} onClick={() => setPage(p)}>{p}</button>
                )
              })}
              <button className="ml-pag-btn" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
