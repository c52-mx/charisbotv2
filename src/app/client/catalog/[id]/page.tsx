'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Producto {
  producto_id: string
  categoria: string
  serie: string | null
  modelo: string | null
  color: string | null
  nombre: string
  foto_url: string | null
  fotos: string[] | null
  marca: string | null
  precio: number
  stock: number
  vendidos: number
  atributos: Record<string, any> | null
  descripcion: string | null
  creado_en: string
}

interface Variante {
  producto_id: string
  color: string | null
  foto_url: string | null
  precio: number
  disponible: number
}

interface ModeloRel {
  modelo: string
  producto_id: string
  foto_url: string | null
  precio_min: number
  num_colores: number
}

interface RelacionadoCard {
  producto_id: string
  nombre: string
  serie: string | null
  modelo: string | null
  color: string | null
  foto_url: string | null
  precio: number
  stock: number
  categoria: string
  vendidos: number
}

const COLOR_DOT: Record<string, string> = {
  NEGRO: '#111', BLANCO: '#f8f8f8', TRANSPARENTE: 'linear-gradient(135deg,#e0e0e0,#f8f8f8)',
  ROJO: '#ef4444', AZUL: '#3b82f6', VERDE: '#22c55e',
  ROSA: '#ec4899', MORADO: '#a855f7', DORADO: '#d97706',
  PLATEADO: '#94a3b8', NARANJA: '#f97316', GRIS: '#64748b',
}

const CSS = `
  @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel { background:linear-gradient(90deg,var(--border) 25%,var(--bg) 50%,var(--border) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }

  /* ── BREADCRUMB ── */
  .pd-breadcrumb { display:flex; align-items:center; gap:5px; margin-bottom:16px; font-size:12px; color:#999; flex-wrap:wrap; }
  .pd-breadcrumb a { color:#999; text-decoration:none; }
  .pd-breadcrumb a:hover { color:#3483fa; text-decoration:underline; }
  .pd-breadcrumb-sep { color:#ccc; }

  /* ── LAYOUT (3 columns: thumbs | main-img | info) ── */
  .pd-wrap { display:grid; grid-template-columns:72px 1fr 420px; gap:16px; align-items:start; animation:fadeUp .3s ease-out; }

  /* ── THUMBS COLUMN (left) ── */
  .pd-thumbs-col {
    display:flex; flex-direction:column; gap:8px;
    position:sticky; top:84px;
  }
  .pd-thumb {
    width:62px; height:62px; border-radius:6px; background:#fff;
    border:1.5px solid #e0e0e0; cursor:pointer; overflow:hidden;
    transition:border-color .15s; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
  }
  .pd-thumb:hover { border-color:#3483fa; }
  .pd-thumb.act { border-color:#3483fa; box-shadow:0 0 0 1.5px #3483fa; }
  .pd-thumb img { width:100%; height:100%; object-fit:contain; padding:5px; }

  /* ── MAIN IMAGE ── */
  .pd-main-col { position:sticky; top:84px; }
  .pd-main-img {
    border-radius:8px; background:#fff; overflow:hidden;
    border:1px solid #e0e0e0; aspect-ratio:1/1;
    display:flex; align-items:center; justify-content:center;
    cursor:zoom-in;
  }
  .pd-main-img img { width:100%; height:100%; object-fit:contain; padding:6%; transition:transform .2s; }
  .pd-main-img:hover img { transform:scale(1.03); }

  /* ── LIGHTBOX ── */
  .pd-lightbox {
    position:fixed; inset:0; background:rgba(0,0,0,.92); z-index:1000;
    display:flex; align-items:center; justify-content:center;
    cursor:zoom-out; animation:lbFadeIn .15s ease;
  }
  @keyframes lbFadeIn { from { opacity:0 } to { opacity:1 } }
  .pd-lightbox img {
    max-width:90vw; max-height:90vh; object-fit:contain;
    border-radius:6px; box-shadow:0 8px 60px rgba(0,0,0,.6);
    user-select:none;
  }
  .pd-lightbox-close {
    position:absolute; top:16px; right:20px; background:rgba(255,255,255,.15);
    border:none; color:#fff; width:40px; height:40px; border-radius:50%;
    font-size:22px; cursor:pointer; display:flex; align-items:center;
    justify-content:center; transition:background .12s;
  }
  .pd-lightbox-close:hover { background:rgba(255,255,255,.28); }

  /* ── INFO PANEL ── */
  .pd-panel { }
  .pd-marca-link { font-size:11.5px; color:#3483fa; font-weight:600; text-decoration:none; }
  .pd-marca-link:hover { text-decoration:underline; }
  .pd-condition { font-size:11.5px; color:#999; margin-bottom:4px; }
  .pd-title { font-size:20px; font-weight:300; color:#333; line-height:1.35; margin:4px 0 8px; }
  .pd-stars { display:flex; align-items:center; gap:6px; margin-bottom:12px; }
  .pd-stars-val { color:#3483fa; font-size:14px; letter-spacing:-.3px; }
  .pd-stars-cnt { color:#999; font-size:12px; }
  .pd-vendidos { font-size:12px; color:#999; padding-left:8px; border-left:1px solid #e0e0e0; }
  .pd-divider { height:1px; background:#e0e0e0; margin:12px 0; }

  /* ── PRICE ── */
  .pd-price-block { margin-bottom:12px; }
  .pd-price { font-size:32px; font-weight:300; color:#333; line-height:1.1; }
  .pd-price-cents { font-size:16px; font-weight:300; vertical-align:super; }
  .pd-iva { font-size:12px; color:#999; margin-top:2px; }
  .pd-cuotas { font-size:13px; color:#00a650; font-weight:600; margin-top:5px; }

  /* ── STOCK ── */
  .pd-stock-ok  { font-size:13px; font-weight:600; color:#00a650; }
  .pd-stock-low { font-size:13px; font-weight:600; color:#f73; }
  .pd-stock-out { font-size:13px; font-weight:600; color:#f00; opacity:.7; }

  /* ── COLOR SELECTOR ── */
  .pd-color-label { font-size:12.5px; color:#333; margin-bottom:7px; }
  .pd-color-label b { color:#333; }
  .pd-color-wrap { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
  .pd-color-btn {
    width:36px; height:36px; border-radius:50%;
    border:2px solid #e0e0e0; cursor:pointer;
    transition:transform .15s, border-color .15s, box-shadow .15s;
  }
  .pd-color-btn:hover { transform:scale(1.1); border-color:#ccc; }
  .pd-color-btn.act { border-color:#3483fa; box-shadow:0 0 0 2px #3483fa; transform:scale(1.06); }

  /* ── MODEL SELECTOR ── */
  .pd-model-btn {
    padding:7px 14px; border-radius:6px; border:1.5px solid #e0e0e0;
    font-size:12px; font-weight:600; color:#666; background:white;
    cursor:pointer; font-family:inherit; transition:all .15s;
  }
  .pd-model-btn:hover { border-color:#3483fa; color:#3483fa; }
  .pd-model-btn.act { border-color:#3483fa; background:#f0f7ff; color:#3483fa; }

  /* ── QTY ── */
  .pd-qty { display:flex; align-items:center; gap:0; border:1.5px solid #e0e0e0; border-radius:8px; overflow:hidden; width:fit-content; }
  .pd-qty-btn {
    width:38px; height:38px; border:none; background:white;
    font-size:18px; cursor:pointer; color:#333; transition:background .12s;
    display:flex; align-items:center; justify-content:center; font-weight:300;
  }
  .pd-qty-btn:hover { background:#f5f5f5; }
  .pd-qty-btn:disabled { opacity:.3; cursor:not-allowed; }
  .pd-qty-val { width:46px; height:38px; text-align:center; border:none; border-left:1.5px solid #e0e0e0; border-right:1.5px solid #e0e0e0; font-size:14px; font-weight:600; color:#333; font-family:inherit; outline:none; background:white; }

  /* ── BUTTONS ── */
  .pd-btn-comprar {
    width:100%; padding:14px 28px; background:#3483fa; color:white;
    border:none; border-radius:8px; font-size:15px; font-weight:600;
    cursor:pointer; font-family:inherit; transition:background .15s;
    margin-bottom:10px;
  }
  .pd-btn-comprar:hover { background:#2968c8; }
  .pd-btn-comprar:disabled { background:#e0e0e0; color:#999; cursor:not-allowed; }
  .pd-btn-carrito {
    width:100%; padding:13px 28px; background:white; color:#3483fa;
    border:1.5px solid #3483fa; border-radius:8px; font-size:15px; font-weight:600;
    cursor:pointer; font-family:inherit; transition:background .15s, color .15s;
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .pd-btn-carrito:hover { background:#f0f7ff; }
  .pd-btn-carrito:disabled { border-color:#e0e0e0; color:#999; cursor:not-allowed; background:white; }

  /* ── SELLER CARD ── */
  .pd-seller {
    border:1px solid #e0e0e0; border-radius:8px; padding:14px 16px; margin-top:14px;
  }
  .pd-seller-title { font-size:12px; color:#999; margin-bottom:6px; }
  .pd-seller-name { font-size:14px; font-weight:700; color:#333; margin-bottom:8px; }
  .pd-seller-row { display:flex; align-items:center; gap:8px; font-size:12.5px; color:#555; margin-bottom:5px; }
  .pd-seller-row:last-child { margin-bottom:0; }

  /* ── ATTRIBUTES ── */
  .pd-attrs { border-radius:8px; border:1px solid #e0e0e0; overflow:hidden; }
  .pd-attr-row { display:flex; padding:9px 14px; border-bottom:1px solid #f5f5f5; font-size:13px; }
  .pd-attr-row:last-child { border-bottom:none; }
  .pd-attr-k { width:140px; flex-shrink:0; color:#999; font-weight:500; }
  .pd-attr-v { color:#333; }

  /* ── DESCRIPTION ── */
  .pd-desc-section { margin-top:28px; padding:24px; background:white; border-radius:8px; border:1px solid #e0e0e0; }
  .pd-desc-title { font-size:20px; font-weight:300; color:#333; margin-bottom:16px; }
  .pd-desc-text { font-size:14px; color:#555; line-height:1.75; white-space:pre-line; }

  /* ── RELATED SECTION ── */
  .pd-related { margin-top:28px; }
  .pd-related-title { font-size:20px; font-weight:300; color:#333; margin-bottom:16px; }
  .pd-related-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
  .pd-rel-card {
    text-decoration:none; border:1px solid #e0e0e0; border-radius:6px;
    overflow:hidden; transition:box-shadow .2s, border-color .2s;
    display:block; background:white;
  }
  .pd-rel-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.1); border-color:#ccc; }
  .pd-rel-img { aspect-ratio:1/1; background:#fff; overflow:hidden; display:flex; align-items:center; justify-content:center; padding:8%; }
  .pd-rel-img img { width:100%; height:100%; object-fit:contain; }
  .pd-rel-body { padding:10px 12px; }
  .pd-rel-name { font-size:12.5px; font-weight:400; color:#333; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:4px; }
  .pd-rel-price { font-size:16px; font-weight:300; color:#333; }

  /* ── RESPONSIVE ── */
  @media (max-width:1100px) {
    .pd-wrap { grid-template-columns:62px 1fr 360px; }
  }
  @media (max-width:900px) {
    .pd-wrap { grid-template-columns:1fr; }
    .pd-thumbs-col { flex-direction:row; position:static; overflow-x:auto; }
    .pd-thumb { flex-shrink:0; }
    .pd-main-col { position:static; }
    .pd-related-grid { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:500px) {
    .pd-related-grid { grid-template-columns:1fr; }
    .pd-title { font-size:17px; }
    .pd-price { font-size:26px; }
  }
`

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

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productoId = params?.id as string

  const [producto,     setProducto]    = useState<Producto | null>(null)
  const [disponible,   setDisponible]  = useState(0)
  const [variantes,    setVariantes]   = useState<Variante[]>([])
  const [modelosRel,   setModelosRel]  = useState<ModeloRel[]>([])
  const [relacionados, setRelacionados]= useState<RelacionadoCard[]>([])
  const [loading,      setLoading]     = useState(true)
  const [mainImg,      setMainImg]     = useState<string | null>(null)
  const [lightbox,     setLightbox]    = useState(false)
  const [qty,          setQty]         = useState(1)
  const [addMsg,       setAddMsg]      = useState('')
  const [adding,       setAdding]      = useState(false)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox])

  useEffect(() => {
    if (!productoId) return
    setLoading(true)
    fetch(`/api/client/catalog/${productoId}`)
      .then(r => r.json())
      .then(d => {
        setProducto(d.producto)
        setDisponible(d.disponible ?? 0)
        setVariantes(d.variantes || [])
        setModelosRel(d.modelosRel || [])
        setRelacionados(d.relacionados || [])
        setMainImg(d.producto?.foto_url || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [productoId])

  const allImgs = [
    producto?.foto_url,
    ...(producto?.fotos || []),
    ...variantes.map(v => v.foto_url),
  ].filter(Boolean) as string[]
  const uniqueImgs = [...new Set(allImgs)]

  async function addToCart(goToCheckout = false) {
    if (!producto || disponible <= 0) return
    setAdding(true)
    try {
      const res = await fetch('/api/client/cart/reserve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: producto.producto_id, cantidad: qty }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddMsg(`⚠ Solo hay ${data.disponible ?? 0} pzas disponibles`)
        setTimeout(() => setAddMsg(''), 3000)
        setDisponible(data.disponible ?? 0)
        return
      }
      let cart: any[] = []
      try { cart = JSON.parse(localStorage.getItem('charis-cart') || '[]') } catch {}
      const idx = cart.findIndex((i: any) => i.producto_id === producto.producto_id)
      if (idx >= 0) cart[idx].cantidad = Math.min(cart[idx].cantidad + qty, data.disponible ?? disponible)
      else cart.push({
        producto_id: producto.producto_id, nombre: producto.nombre,
        serie: producto.serie, categoria: producto.categoria, color: producto.color,
        modelo: producto.modelo, cantidad: qty, precio: data.precio ?? producto.precio,
      })
      localStorage.setItem('charis-cart', JSON.stringify(cart))
      window.dispatchEvent(new CustomEvent('charis-cart-updated'))
      if (goToCheckout) {
        router.push('/client/checkout')
      } else {
        window.dispatchEvent(new CustomEvent('charis-cart-open'))
        setAddMsg(`✓ Agregado — ${qty} pza${qty > 1 ? 's' : ''}`)
        setTimeout(() => setAddMsg(''), 2500)
      }
    } finally { setAdding(false) }
  }

  const rating = producto ? ratingFor(producto.nombre) : 4
  const cnt = producto ? cntFor(producto.nombre) : 0
  const stockStatus = !producto ? 'out' : disponible <= 0 ? 'out' : disponible <= 5 ? 'low' : 'ok'
  const precio = producto ? Number(producto.precio) : 0
  const cuotaAmt = (precio / 3).toFixed(2)

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
        <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #e0e0e0', borderTopColor:'#3483fa', animation:'spin .7s linear infinite' }} />
      </div>
    </>
  )

  if (!producto) return (
    <>
      <style>{CSS}</style>
      <div style={{ textAlign:'center', padding:'60px 20px', color:'#999' }}>
        <div style={{ fontSize:52 }}>🔍</div>
        <p style={{ fontSize:16, fontWeight:400, margin:'12px 0 8px', color:'#333' }}>Producto no encontrado</p>
        <button onClick={() => router.push('/client/catalog')} style={{ background:'none', border:'none', color:'#3483fa', fontSize:14, cursor:'pointer', fontFamily:'inherit', padding:0 }}>← Volver al catálogo</button>
      </div>
    </>
  )

  return (
    <>
      <style>{CSS}</style>

      {addMsg && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', background:'#333', color:'white', padding:'10px 20px', borderRadius:8, fontSize:13, fontWeight:600, zIndex:300, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(0,0,0,.3)' }}>
          {addMsg}
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightbox && mainImg && (
        <div className="pd-lightbox" onClick={() => setLightbox(false)}>
          <button className="pd-lightbox-close" onClick={() => setLightbox(false)} aria-label="Cerrar">✕</button>
          <img src={mainImg} alt={producto.nombre} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* ── BREADCRUMB ── */}
      <nav className="pd-breadcrumb">
        <Link href="/client">Inicio</Link>
        <span className="pd-breadcrumb-sep">›</span>
        <Link href="/client/catalog">Catálogo</Link>
        {producto.categoria && <>
          <span className="pd-breadcrumb-sep">›</span>
          <Link href={`/client/catalog?categoria=${encodeURIComponent(producto.categoria)}`}>{producto.categoria}</Link>
        </>}
        {producto.serie && <>
          <span className="pd-breadcrumb-sep">›</span>
          <Link href={`/client/catalog?serie=${encodeURIComponent(producto.serie)}`}>{producto.serie}</Link>
        </>}
        <span className="pd-breadcrumb-sep">›</span>
        <span style={{ color:'#333', fontWeight:500 }}>{producto.nombre}</span>
        <button onClick={() => router.push('/client/catalog')} style={{ marginLeft:'auto', background:'none', border:'1px solid #e0e0e0', borderRadius:6, padding:'4px 12px', fontSize:12, color:'#666', cursor:'pointer', fontFamily:'inherit' }}>
          ← Volver
        </button>
      </nav>

      {/* ── 3-COLUMN GRID ── */}
      <div className="pd-wrap">

        {/* COL 1: Thumbs */}
        <div className="pd-thumbs-col">
          {uniqueImgs.map((img, i) => (
            <div key={i} className={`pd-thumb${mainImg === img ? ' act' : ''}`} onClick={() => setMainImg(img)}>
              <img src={img} alt={`Vista ${i + 1}`} />
            </div>
          ))}
          {uniqueImgs.length === 0 && (
            <div className="pd-thumb" style={{ opacity:.3, cursor:'default' }}>
              <span style={{ fontSize:26 }}>{producto.categoria === 'FUNDA' ? '📱' : '📦'}</span>
            </div>
          )}
        </div>

        {/* COL 2: Main image */}
        <div className="pd-main-col">
          <div className="pd-main-img" onClick={() => mainImg && setLightbox(true)}>
            {mainImg
              ? <img src={mainImg} alt={producto.nombre} />
              : <span style={{ fontSize:90, opacity:.15 }}>{producto.categoria === 'FUNDA' ? '📱' : producto.categoria === 'CARGADOR' ? '🔌' : '📦'}</span>
            }
          </div>
        </div>

        {/* COL 3: Info */}
        <div className="pd-panel">
          {/* Condition + brand */}
          <p className="pd-condition">
            Nuevo{producto.marca && <> · <a className="pd-marca-link" href={`/client/catalog?search=${encodeURIComponent(producto.marca)}`}>{producto.marca}</a></>}
          </p>
          <h1 className="pd-title">{producto.nombre}</h1>

          {/* Rating */}
          <div className="pd-stars">
            <span className="pd-stars-val">{'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}</span>
            <span className="pd-stars-cnt">{rating.toFixed(1)} ({cnt})</span>
            {producto.vendidos > 0 && <span className="pd-vendidos">{producto.vendidos.toLocaleString('es-MX')} vendidos</span>}
          </div>

          <div className="pd-divider" />

          {/* Price */}
          <div className="pd-price-block">
            <div className="pd-price">
              ${Number(producto.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Stock status */}
          <div style={{ marginBottom:14 }}>
            {stockStatus === 'ok'  && <span className="pd-stock-ok">Stock disponible ({disponible} pzas)</span>}
            {stockStatus === 'low' && <span className="pd-stock-low">¡Solo quedan {disponible} pzas!</span>}
            {stockStatus === 'out' && <span className="pd-stock-out">Sin existencia por el momento</span>}
          </div>

          {/* Color variants */}
          {variantes.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <p className="pd-color-label">Color: <b>{producto.color}</b></p>
              <div className="pd-color-wrap">
                {producto.color && (
                  <Link href={`/client/catalog/${producto.producto_id}`} title={producto.color}>
                    <div className="pd-color-btn act" style={{ background: COLOR_DOT[producto.color || ''] || '#94a3b8' }} />
                  </Link>
                )}
                {variantes.map(v => (
                  <Link key={v.producto_id} href={`/client/catalog/${v.producto_id}`} title={`${v.color}${v.disponible <= 0 ? ' · agotado' : ''}`}>
                    <div className={`pd-color-btn`}
                      style={{ background: COLOR_DOT[v.color || ''] || '#94a3b8', opacity: v.disponible <= 0 ? 0.3 : 1, cursor: v.disponible <= 0 ? 'default' : 'pointer' }}
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Models */}
          {modelosRel.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:12, color:'#999', marginBottom:6, fontWeight:500 }}>Modelo</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                <span className="pd-model-btn act">{producto.modelo || 'Este'}</span>
                {modelosRel.map(m => (
                  <Link key={m.producto_id} href={`/client/catalog/${m.producto_id}`} style={{ textDecoration:'none' }}>
                    <span className="pd-model-btn">{m.modelo}{m.num_colores > 1 ? ` (${m.num_colores} col.)` : ''}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Qty + CTAs */}
          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:12, color:'#999', marginBottom:8, fontWeight:500 }}>Cantidad</p>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, flexWrap:'wrap' }}>
              <div className="pd-qty">
                <button className="pd-qty-btn" disabled={qty <= 1} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <input type="number" className="pd-qty-val" value={qty} min={1} max={disponible}
                  onChange={e => setQty(Math.max(1, Math.min(disponible, parseInt(e.target.value) || 1)))} />
                <button className="pd-qty-btn" disabled={qty >= disponible} onClick={() => setQty(q => Math.min(disponible, q + 1))}>+</button>
              </div>
              {stockStatus !== 'out' && (
                <span style={{ fontSize:13, color:'#999' }}>
                  Total: <b style={{ color:'#333' }}>${(precio * qty).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</b>
                </span>
              )}
            </div>

            <button className="pd-btn-comprar" disabled={stockStatus === 'out' || adding}
              onClick={() => addToCart(true)}>
              {adding ? 'Procesando…' : 'Comprar ahora'}
            </button>
            <button className="pd-btn-carrito" disabled={stockStatus === 'out' || adding}
              onClick={() => addToCart(false)}>
              🛒 Agregar al carrito
            </button>
          </div>

          {/* Seller card */}
          <div className="pd-seller">
            <p className="pd-seller-title">Vendido por</p>
            <p className="pd-seller-name">Charis</p>
            <div className="pd-seller-row"><span>🚚</span> Envío disponible a todo México</div>
            <div className="pd-seller-row"><span>🔒</span> Compra segura — stock reservado al agregar</div>
            <div className="pd-seller-row"><span>↩️</span> Consulta condiciones de devolución</div>
          </div>

          {/* Atributos */}
          {producto.atributos && Object.keys(producto.atributos).length > 0 && (
            <div style={{ marginTop:16 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#333', marginBottom:8 }}>Especificaciones</p>
              <div className="pd-attrs">
                {Object.entries(producto.atributos).map(([k, v]) => (
                  <div key={k} className="pd-attr-row">
                    <span className="pd-attr-k">{k}</span>
                    <span className="pd-attr-v">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DESCRIPTION ── */}
      {producto.descripcion && (
        <div className="pd-desc-section">
          <h2 className="pd-desc-title">Descripción</h2>
          <p className="pd-desc-text">{producto.descripcion}</p>
        </div>
      )}

      {/* ── RELATED ── */}
      {relacionados.length > 0 && (
        <div className="pd-related">
          <h2 className="pd-related-title">Productos relacionados</h2>
          <div className="pd-related-grid">
            {relacionados.map(r => (
              <Link key={r.producto_id} href={`/client/catalog/${r.producto_id}`} className="pd-rel-card">
                <div className="pd-rel-img">
                  {r.foto_url
                    ? <img src={r.foto_url} alt={r.nombre} loading="lazy" />
                    : <div style={{ fontSize:36, opacity:.2 }}>📦</div>
                  }
                </div>
                <div className="pd-rel-body">
                  <p className="pd-rel-name">{r.nombre}</p>
                  <p className="pd-rel-price">${Number(r.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
