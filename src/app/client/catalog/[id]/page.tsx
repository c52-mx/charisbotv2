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

  /* ── DETAIL LAYOUT ── */
  .pd-wrap { display:grid; grid-template-columns:480px 1fr; gap:28px; align-items:start; animation:fadeUp .3s ease-out; }
  .pd-gallery { position:sticky; top:84px; }
  .pd-main-img { border-radius:14px; background:var(--bg); overflow:hidden; border:1.5px solid var(--border); aspect-ratio:1/1; display:flex; align-items:center; justify-content:center; }
  .pd-main-img img { width:100%; height:100%; object-fit:contain; padding:8%; }
  .pd-thumbs { display:flex; gap:7px; margin-top:9px; flex-wrap:wrap; }
  .pd-thumb {
    width:62px; height:62px; border-radius:9px; background:var(--bg);
    border:2px solid var(--border); cursor:pointer; overflow:hidden;
    transition:border-color .15s, transform .15s;
    display:flex; align-items:center; justify-content:center;
  }
  .pd-thumb:hover { transform:scale(1.06); }
  .pd-thumb.act { border-color:var(--blue); }
  .pd-thumb img { width:100%; height:100%; object-fit:contain; padding:6px; }

  /* ── PRODUCT INFO PANEL ── */
  .pd-panel { }
  .pd-marca-chip {
    display:inline-block; padding:3px 12px; border-radius:100px;
    background:#eff6ff; color:var(--blue); font-size:11px; font-weight:800;
    letter-spacing:.05em; text-transform:uppercase; margin-bottom:8px;
  }
  .pd-title { font-size:clamp(17px,2.5vw,22px); font-weight:900; color:var(--txt); line-height:1.3; margin-bottom:6px; }
  .pd-meta  { font-size:12px; color:var(--txt3); margin-bottom:10px; }
  .pd-price { font-size:28px; font-weight:900; color:var(--navy-deep); margin:6px 0; }
  .pd-price-unit { font-size:13px; font-weight:400; color:var(--txt3); }

  /* ── STARS ── */
  .pd-stars { display:flex; align-items:center; gap:6px; margin-bottom:8px; }
  .pd-stars-val { color:#f59e0b; font-size:15px; letter-spacing:-.3px; }
  .pd-stars-cnt { color:var(--txt3); font-size:12px; }
  .pd-vendidos  { font-size:12px; color:var(--txt3); padding-left:8px; border-left:1px solid var(--border); }

  /* ── STOCK ── */
  .pd-stock-ok  { color:#16a34a; font-size:13px; font-weight:700; }
  .pd-stock-low { color:#d97706; font-size:13px; font-weight:700; }
  .pd-stock-out { color:#ef4444; font-size:13px; font-weight:700; }

  /* ── COLOR SELECTOR ── */
  .pd-color-wrap { display:flex; flex-wrap:wrap; gap:8px; margin:8px 0 0; }
  .pd-color-btn {
    position:relative; width:32px; height:32px; border-radius:50%;
    border:2px solid var(--border); cursor:pointer;
    transition:transform .15s, border-color .15s, box-shadow .15s;
    flex-shrink:0;
  }
  .pd-color-btn:hover { transform:scale(1.12); }
  .pd-color-btn.act { border-color:var(--blue); box-shadow:0 0 0 2px var(--blue); transform:scale(1.08); }
  .pd-color-btn:disabled { opacity:.3; cursor:not-allowed; transform:none; }
  .pd-color-lbl { font-size:12px; color:var(--txt2); margin-top:5px; }

  /* ── MODEL SELECTOR ── */
  .pd-model-btn {
    padding:6px 14px; border-radius:8px; border:1.5px solid var(--border);
    font-size:12px; font-weight:700; color:var(--txt2); background:white;
    cursor:pointer; font-family:inherit; transition:all .15s;
  }
  .pd-model-btn:hover { border-color:var(--blue2); color:var(--blue); }
  .pd-model-btn.act { border-color:var(--blue); background:#eff6ff; color:var(--blue); }

  /* ── QTY CONTROL ── */
  .pd-qty { display:flex; align-items:center; gap:0; border:1.5px solid var(--field-border); border-radius:9px; overflow:hidden; }
  .pd-qty-btn {
    width:36px; height:36px; border:none; background:var(--field-bg);
    font-size:16px; cursor:pointer; color:var(--txt); transition:background .12s;
    display:flex; align-items:center; justify-content:center; font-weight:700;
  }
  .pd-qty-btn:hover { background:var(--border); }
  .pd-qty-btn:disabled { opacity:.3; cursor:not-allowed; }
  .pd-qty-val { width:44px; height:36px; text-align:center; border:none; border-left:1.5px solid var(--field-border); border-right:1.5px solid var(--field-border); font-size:14px; font-weight:700; color:var(--txt); font-family:inherit; outline:none; background:white; }

  /* ── ADD BTN ── */
  .pd-add-btn {
    padding:13px 28px; background:var(--blue); color:white;
    border:none; border-radius:11px; font-size:15px; font-weight:800;
    cursor:pointer; font-family:inherit; transition:background .15s;
    display:flex; align-items:center; gap:8px; justify-content:center;
  }
  .pd-add-btn:hover  { background:var(--blue-hover,#1251a3); }
  .pd-add-btn:disabled { background:var(--border); color:var(--txt3); cursor:not-allowed; }

  /* ── SHIPPING CARD ── */
  .pd-ship { background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:12px; padding:14px 16px; }
  .pd-ship-row { display:flex; align-items:flex-start; gap:10px; font-size:13px; color:'#15803d'; margin-bottom:6px; }
  .pd-ship-row:last-child { margin-bottom:0; }
  .pd-ship-ico { font-size:16px; flex-shrink:0; margin-top:1px; }

  /* ── ATTRIBUTES TABLE ── */
  .pd-attrs { border-radius:10px; border:1.5px solid var(--border); overflow:hidden; margin-top:4px; }
  .pd-attr-row { display:flex; padding:8px 14px; border-bottom:1px solid var(--bg); font-size:13px; }
  .pd-attr-row:last-child { border-bottom:none; }
  .pd-attr-k { width:120px; flex-shrink:0; color:var(--txt3); font-weight:600; }
  .pd-attr-v { color:var(--txt); }

  /* ── RELATED SECTION ── */
  .pd-related-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:14px; }
  .pd-rel-card {
    text-decoration:none; border:1.5px solid var(--border); border-radius:10px;
    overflow:hidden; transition:box-shadow .2s, border-color .2s;
    display:block;
  }
  .pd-rel-card:hover { box-shadow:0 4px 16px rgba(21,101,192,.1); border-color:var(--blue2); }
  .pd-rel-img { aspect-ratio:1/1; background:var(--bg); overflow:hidden; }
  .pd-rel-img img { width:100%; height:100%; object-fit:contain; padding:8%; }
  .pd-rel-body { padding:9px 10px; }
  .pd-rel-name { font-size:12px; font-weight:700; color:var(--txt); line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:3px; }
  .pd-rel-price { font-size:13px; font-weight:900; color:var(--navy-deep); }

  @media (max-width:960px) {
    .pd-wrap { grid-template-columns:1fr; }
    .pd-gallery { position:static; }
    .pd-related-grid { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:500px) {
    .pd-related-grid { grid-template-columns:1fr; }
  }
`

function ratingFor(nombre: string): number {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = ((h << 5) - h + nombre.charCodeAt(i)) | 0
  return 3.8 + (Math.abs(h) % 12) / 10
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productoId = params?.id as string

  const [producto,    setProducto]    = useState<Producto | null>(null)
  const [disponible,  setDisponible]  = useState(0)
  const [variantes,   setVariantes]   = useState<Variante[]>([])
  const [modelosRel,  setModelosRel]  = useState<ModeloRel[]>([])
  const [relacionados,setRelacionados]= useState<RelacionadoCard[]>([])
  const [loading,     setLoading]     = useState(true)
  const [mainImg,     setMainImg]     = useState<string | null>(null)
  const [qty,         setQty]         = useState(1)
  const [addMsg,      setAddMsg]      = useState('')
  const [adding,      setAdding]      = useState(false)

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
    ...variantes.map(v => v.foto_url),
  ].filter(Boolean) as string[]
  const uniqueImgs = [...new Set(allImgs)]

  async function addToCart() {
    if (!producto || disponible <= 0) return
    setAdding(true)
    try {
      const res = await fetch('/api/client/cart/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (idx >= 0) {
        cart[idx].cantidad = Math.min(cart[idx].cantidad + qty, data.disponible ?? disponible)
      } else {
        cart.push({
          producto_id: producto.producto_id,
          nombre: producto.nombre,
          serie: producto.serie,
          categoria: producto.categoria,
          color: producto.color,
          modelo: producto.modelo,
          cantidad: qty,
          precio: data.precio ?? producto.precio,
        })
      }
      localStorage.setItem('charis-cart', JSON.stringify(cart))
      window.dispatchEvent(new CustomEvent('charis-cart-updated'))
      window.dispatchEvent(new CustomEvent('charis-cart-open'))
      setAddMsg(`✓ Agregado al carrito — ${qty} pza${qty > 1 ? 's' : ''}`)
      setTimeout(() => setAddMsg(''), 2500)
    } finally {
      setAdding(false)
    }
  }

  const rating = producto ? ratingFor(producto.nombre) : 4
  const stockStatus = !producto ? 'out' : disponible <= 0 ? 'out' : disponible <= 5 ? 'low' : 'ok'

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
        <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:'var(--blue)', animation:'spin .7s linear infinite' }} />
      </div>
    </>
  )

  if (!producto) return (
    <>
      <style>{CSS}</style>
      <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--txt3)' }}>
        <div style={{ fontSize:52 }}>🔍</div>
        <p style={{ fontSize:16, fontWeight:700, margin:'12px 0 8px' }}>Producto no encontrado</p>
        <Link href="/client/catalog" style={{ color:'var(--blue)', fontSize:14 }}>← Volver al catálogo</Link>
      </div>
    </>
  )

  return (
    <>
      <style>{CSS}</style>

      {/* Add msg toast */}
      {addMsg && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', background:'var(--navy-deep)', color:'white', padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:700, zIndex:300, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(0,0,0,.25)' }}>
          {addMsg}
        </div>
      )}

      {/* ── BREADCRUMB ── */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:18, fontSize:12.5, color:'var(--txt3)', flexWrap:'wrap' }}>
        <Link href="/client"         style={{ color:'var(--txt3)', textDecoration:'none' }}>Inicio</Link>
        <span>›</span>
        <Link href="/client/catalog" style={{ color:'var(--txt3)', textDecoration:'none' }}>Catálogo</Link>
        {producto.categoria && <>
          <span>›</span>
          <Link href={`/client/catalog?categoria=${encodeURIComponent(producto.categoria)}`} style={{ color:'var(--txt3)', textDecoration:'none' }}>{producto.categoria}</Link>
        </>}
        {producto.serie && <>
          <span>›</span>
          <Link href={`/client/catalog?serie=${encodeURIComponent(producto.serie)}`} style={{ color:'var(--txt3)', textDecoration:'none' }}>{producto.serie}</Link>
        </>}
        <span>›</span>
        <span style={{ color:'var(--txt)', fontWeight:600 }}>{producto.nombre}</span>
        <button onClick={() => router.back()} style={{ marginLeft:'auto', background:'none', border:'1.5px solid var(--border)', borderRadius:7, padding:'4px 12px', fontSize:12, color:'var(--txt2)', cursor:'pointer', fontFamily:'inherit' }}>
          ← Volver
        </button>
      </div>

      {/* ── DETAIL GRID ── */}
      <div className="pd-wrap">

        {/* ── GALLERY ── */}
        <div className="pd-gallery">
          <div className="pd-main-img">
            {mainImg
              ? <img src={mainImg} alt={producto.nombre} />
              : <span style={{ fontSize:80, opacity:.25 }}>{producto.categoria === 'FUNDA' ? '📱' : producto.categoria === 'CARGADOR' ? '🔌' : '📦'}</span>
            }
          </div>
          {uniqueImgs.length > 1 && (
            <div className="pd-thumbs">
              {uniqueImgs.map((img, i) => (
                <div key={i} className={`pd-thumb${mainImg === img ? ' act' : ''}`} onClick={() => setMainImg(img)}>
                  <img src={img} alt={`Vista ${i + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── INFO PANEL ── */}
        <div className="pd-panel">
          {producto.marca && <span className="pd-marca-chip">{producto.marca}</span>}
          <h1 className="pd-title">{producto.nombre}</h1>
          <div className="pd-meta">
            {producto.serie && `Serie: ${producto.serie}`}
            {producto.modelo && ` · Modelo: ${producto.modelo}`}
            {producto.color && ` · Color: ${producto.color}`}
          </div>

          {/* Stars + vendidos */}
          <div className="pd-stars">
            <span className="pd-stars-val">{'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}</span>
            <span className="pd-stars-cnt">({rating.toFixed(1)})</span>
            {producto.vendidos > 0 && <span className="pd-vendidos">{producto.vendidos.toLocaleString('es-MX')} vendidos</span>}
          </div>

          {/* Price */}
          <div className="pd-price">
            ${Number(producto.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            <span className="pd-price-unit"> MXN / pza</span>
          </div>

          {/* Stock */}
          <div style={{ marginBottom:14 }}>
            {stockStatus === 'ok'  && <span className="pd-stock-ok">✓ Disponible ({disponible} pzas)</span>}
            {stockStatus === 'low' && <span className="pd-stock-low">⚡ Últimas {disponible} pzas</span>}
            {stockStatus === 'out' && <span className="pd-stock-out">✕ Sin stock en este momento</span>}
          </div>

          {/* ── COLOR VARIANTES ── */}
          {variantes.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--txt3)', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:6 }}>Variantes de color</p>
              <div className="pd-color-wrap">
                {/* Current producto color */}
                {producto.color && (
                  <Link href={`/client/catalog/${producto.producto_id}`} title={`${producto.color} — actual`}>
                    <div className="pd-color-btn act" style={{ background: COLOR_DOT[producto.color || ''] || '#94a3b8' }} />
                  </Link>
                )}
                {variantes.map(v => (
                  <Link key={v.producto_id} href={`/client/catalog/${v.producto_id}`} title={`${v.color} · ${v.disponible > 0 ? `${v.disponible} disp.` : 'agotado'}`}>
                    <div className={`pd-color-btn${v.disponible <= 0 ? ' disabled' : ''}`}
                      style={{ background: COLOR_DOT[v.color || ''] || '#94a3b8', opacity: v.disponible <= 0 ? 0.3 : 1, cursor: v.disponible <= 0 ? 'default' : 'pointer' }}
                    />
                  </Link>
                ))}
              </div>
              <p className="pd-color-lbl">{producto.color}</p>
            </div>
          )}

          {/* ── MODELOS RELACIONADOS ── */}
          {modelosRel.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--txt3)', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:6 }}>Otros modelos de la misma línea</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                <span className="pd-model-btn act">{producto.modelo || 'Este'}</span>
                {modelosRel.map(m => (
                  <Link key={m.producto_id} href={`/client/catalog/${m.producto_id}`} style={{ textDecoration:'none' }}>
                    <span className="pd-model-btn">{m.modelo} {m.num_colores > 1 ? `(${m.num_colores} col.)` : ''}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── QTY + ADD ── */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' }}>
            <div className="pd-qty">
              <button className="pd-qty-btn" disabled={qty <= 1} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <input type="number" className="pd-qty-val" value={qty} min={1} max={disponible} onChange={e => setQty(Math.max(1, Math.min(disponible, parseInt(e.target.value) || 1)))} />
              <button className="pd-qty-btn" disabled={qty >= disponible} onClick={() => setQty(q => Math.min(disponible, q + 1))}>+</button>
            </div>
            <button className="pd-add-btn" disabled={stockStatus === 'out' || adding} onClick={addToCart} style={{ flex:1, minWidth:180 }}>
              {adding ? '…' : '🛒 Agregar al carrito'}
              {stockStatus !== 'out' && (
                <span style={{ background:'rgba(255,255,255,.18)', padding:'1px 8px', borderRadius:100, fontSize:12, fontWeight:700 }}>
                  ${(Number(producto.precio) * qty).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              )}
            </button>
          </div>

          {/* ── SHIPPING CARD ── */}
          <div className="pd-ship" style={{ marginBottom:16 }}>
            <div className="pd-ship-row">
              <span className="pd-ship-ico">🚚</span>
              <div>
                <strong style={{ color:'#15803d', fontSize:13 }}>Envío disponible</strong>
                <p style={{ fontSize:12, color:'#166534', margin:'2px 0 0' }}>Cotiza envío al finalizar tu pedido</p>
              </div>
            </div>
            <div className="pd-ship-row">
              <span className="pd-ship-ico">🔒</span>
              <div style={{ fontSize:12, color:'#166534' }}>Compra protegida — stock reservado al agregar al carrito</div>
            </div>
          </div>

          {/* ── ATRIBUTOS ── */}
          {producto.atributos && Object.keys(producto.atributos).length > 0 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--txt3)', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:8 }}>Especificaciones</p>
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

          {/* ── DESCRIPCIÓN ── */}
          {(producto as any).descripcion && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--txt3)', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:6 }}>Descripción</p>
              <p style={{ fontSize:13.5, color:'var(--txt2)', lineHeight:1.65 }}>{(producto as any).descripcion}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RELATED PRODUCTS ── */}
      {relacionados.length > 0 && (
        <div style={{ marginTop:36 }}>
          <h2 style={{ fontWeight:900, fontSize:17, color:'var(--txt)', marginBottom:2 }}>Productos relacionados</h2>
          <p style={{ fontSize:12, color:'var(--txt3)', marginBottom:0 }}>Más de la categoría {producto.categoria}</p>
          <div className="pd-related-grid">
            {relacionados.map(r => (
              <Link key={r.producto_id} href={`/client/catalog/${r.producto_id}`} className="pd-rel-card">
                <div className="pd-rel-img">
                  {r.foto_url
                    ? <img src={r.foto_url} alt={r.nombre} loading="lazy" />
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, opacity:.25 }}>📦</div>
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
