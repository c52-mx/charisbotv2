'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'

interface CartItem {
  _id?: string
  tipo_case: string; marca: string; modelo: string; color: string; cantidad: number
}

const TIPO_EMOJI: Record<string, string> = {
  'BLINDAJE': '🔐', '3 EN 1': '🎯', 'ESCUDO': '🛡️', 'ANILLO': '💍',
}

function descuentoPct(piezas: number) {
  if (piezas >= 200) return 15
  if (piezas >= 100) return 10
  if (piezas >= 50)  return 5
  return 0
}

const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }

  .group-header {
    display:flex; align-items:center; gap:10px;
    padding:12px 18px; background:var(--field-bg);
    border-bottom:1px solid var(--border);
    font-weight:900; font-size:14px; color:var(--txt);
  }
  .cart-row {
    display:flex; align-items:center; gap:12px;
    padding:12px 18px; border-bottom:1px solid var(--bg);
    transition:background .12s;
  }
  .cart-row:last-child { border-bottom:none; }
  .cart-row:hover { background:#fafcff; }

  .qty-ctrl { display:flex; align-items:center; flex-shrink:0; }
  .qty-btn  {
    width:28px; height:28px; border:1px solid var(--field-border); background:var(--field-bg);
    cursor:pointer; font-size:15px; color:var(--txt);
    display:flex; align-items:center; justify-content:center; transition:all .12s;
    font-family:inherit;
  }
  .qty-btn:hover { background:var(--border); }
  .qty-input {
    width:46px; height:28px; border:1px solid var(--field-border); border-left:none; border-right:none;
    text-align:center; font-size:13px; font-weight:600; color:var(--txt);
    font-family:inherit; outline:none; background:white;
  }
  .del-btn {
    background:none; border:none; color:var(--txt3); cursor:pointer; font-size:12px;
    font-weight:600; padding:4px 8px; border-radius:6px;
    transition:all .14s; font-family:inherit; white-space:nowrap; flex-shrink:0;
  }
  .del-btn:hover { color:var(--err); background:rgba(239,68,68,0.08); }

  .vol-bar { height:5px; background:var(--border); border-radius:3px; overflow:hidden; margin-top:6px; }
  .vol-fill { height:100%; background:var(--blue); border-radius:3px; transition:width .4s; }

  @media(max-width:768px){
    .cart-layout { grid-template-columns:1fr !important; }
    .cart-summary { position:static !important; }
  }
`

function loadCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem('charis-cart') || '[]')
    return raw.map((it: CartItem, i: number) => ({
      ...it,
      _id: it._id || `item-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`
    }))
  } catch { return [] }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem('charis-cart', JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('charis-cart-updated'))
}

export default function CartPage() {
  const router  = useRouter()
  const [cart,    setCart]    = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const skipSync = useRef(false)

  useEffect(() => {
    setCart(loadCart())
    setLoading(false)
    const sync = () => { if (!skipSync.current) setCart(loadCart()) }
    window.addEventListener('charis-cart-updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('charis-cart-updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function updateCart(fn: (prev: CartItem[]) => CartItem[]) {
    skipSync.current = true
    setCart(prev => {
      const next = fn(prev)
      saveCart(next)
      setTimeout(() => { skipSync.current = false }, 60)
      return next
    })
  }

  function releaseReserve(it: CartItem) {
    fetch('/api/client/cart/reserve', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_case: it.tipo_case, modelo: it.modelo, color: it.color }),
    }).catch(() => {})
  }

  const removeItem = (id: string) => {
    const item = cart.find(it => it._id === id)
    if (item) releaseReserve(item)
    updateCart(c => c.filter(it => it._id !== id))
  }

  async function updateQty(id: string, qty: number) {
    const item = cart.find(it => it._id === id)
    if (!item) return
    const cantidad = Math.max(1, qty)

    const res = await fetch('/api/client/cart/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_case: item.tipo_case, modelo: item.modelo, color: item.color, cantidad }),
    })
    const data = await res.json()
    if (!res.ok) {
      // No hay suficiente stock — ajusta a lo máximo disponible
      const disponible = Math.max(1, data.disponible ?? item.cantidad)
      updateCart(c => c.map(it => it._id === id ? { ...it, cantidad: disponible } : it))
      return
    }
    updateCart(c => c.map(it => it._id === id ? { ...it, cantidad } : it))
  }

  const clearAll = () => {
    cart.forEach(releaseReserve)
    updateCart(() => [])
  }

  async function handleCheckout() {
    if (cart.length === 0 || placing) return
    setPlacing(true); setCheckoutError('')
    try {
      const res = await fetch('/api/client/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detalle = Array.isArray(data.faltantes) && data.faltantes.length
          ? ` Quedan ${data.faltantes.map((f: any) => f.disponible).join(', ')} piezas disponibles de los artículos afectados — ajusta las cantidades en tu carrito.`
          : ''
        throw new Error((data.error || 'Error al crear el pedido') + detalle)
      }
      updateCart(() => [])
      setSuccess(true)
      setTimeout(() => router.push('/client/orders'), 2000)
    } catch (e: any) {
      setCheckoutError(e.message)
    } finally {
      setPlacing(false)
    }
  }

  const totalPiezas = cart.reduce((s, i) => s + i.cantidad, 0)
  const desc        = descuentoPct(totalPiezas)
  const nextTier    = totalPiezas < 50 ? 50 : totalPiezas < 100 ? 100 : totalPiezas < 200 ? 200 : null
  const volPct      = Math.min(100, (totalPiezas / 200) * 100)

  const groups = cart.reduce<Record<string, CartItem[]>>((acc, item) => {
    if (!acc[item.tipo_case]) acc[item.tipo_case] = []
    acc[item.tipo_case].push(item)
    return acc
  }, {})

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:'var(--blue)', animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (success) return (
    <div style={{ textAlign:'center', padding:'70px 20px', animation:'fadeUp .4s ease-out' }}>
      <style>{CSS}</style>
      <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
      <h2 style={{ fontWeight:900, fontSize:22, color:'var(--txt)', marginBottom:8 }}>¡Pedido creado!</h2>
      <p style={{ fontSize:14, color:'var(--txt3)' }}>Redirigiendo a tus pedidos…</p>
    </div>
  )

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:24, animation:'fadeUp .3s ease-out' }}>
        <div>
          <h1 style={{ fontWeight:900, fontSize:'clamp(18px,4vw,22px)', color:'var(--txt)', marginBottom:4 }}>
            🛒 Carrito de compras
          </h1>
          <p style={{ fontSize:13, color:'var(--txt3)' }}>{totalPiezas} piezas · {cart.length} artículo{cart.length !== 1 ? 's' : ''}</p>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearAll}
            style={{ padding:'8px 16px', borderRadius:8, border:'1.5px solid var(--border)', background:'white', color:'var(--txt3)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--err)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >Vaciar carrito</button>
        )}
      </div>

      {cart.length === 0 ? (
        <div style={{ textAlign:'center', padding:'64px 20px', background:'white', borderRadius:16, border:'1px solid var(--border)' }}>
          <div style={{ fontSize:48, marginBottom:16, opacity:.25 }}>🛒</div>
          <h3 style={{ fontWeight:900, fontSize:18, color:'var(--txt)', marginBottom:8 }}>Carrito vacío</h3>
          <p style={{ fontSize:14, color:'var(--txt3)', marginBottom:24 }}>Agrega productos desde el catálogo</p>
          <Link href="/client/catalog" className="btn-primary">
            Ir al catálogo →
          </Link>
        </div>
      ) : (
        <div className="cart-layout" style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, alignItems:'start', animation:'fadeUp .3s ease-out .05s both' }}>

          {/* ── ITEMS ── */}
          <div style={{ background:'white', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden' }}>
            {Object.entries(groups).map(([tipo, items]) => (
              <div key={tipo}>
                <div className="group-header">
                  <span>{TIPO_EMOJI[tipo] || '📦'}</span>
                  {tipo}
                  <span style={{ fontSize:12, color:'var(--txt3)', fontWeight:400 }}>
                    {items.length} artículo{items.length !== 1 ? 's' : ''} · {items.reduce((s,i)=>s+i.cantidad,0)} pzas
                  </span>
                </div>
                {items.map(item => (
                  <div key={item._id} className="cart-row">
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--txt)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {item.modelo}
                      </p>
                      <p style={{ fontSize:11, color:'var(--txt3)' }}>
                        {item.marca} · <span style={{ background:'var(--bg)', borderRadius:4, padding:'1px 6px', fontSize:10, fontWeight:600, color:'var(--txt2)' }}>{item.color}</span>
                      </p>
                    </div>
                    <div className="qty-ctrl">
                      <button className="qty-btn" style={{ borderRadius:'7px 0 0 7px' }} onClick={() => updateQty(item._id!, item.cantidad - 1)}>−</button>
                      <input className="qty-input" type="number" value={item.cantidad} min={1}
                        onChange={e => updateQty(item._id!, parseInt(e.target.value) || 1)} />
                      <button className="qty-btn" style={{ borderRadius:'0 7px 7px 0' }} onClick={() => updateQty(item._id!, item.cantidad + 1)}>+</button>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--blue)', minWidth:54, textAlign:'right', flexShrink:0 }}>
                      {item.cantidad} pzas
                    </span>
                    <button className="del-btn" onClick={() => removeItem(item._id!)}>Eliminar</button>
                  </div>
                ))}
              </div>
            ))}

            {/* Descuento banner */}
            {desc > 0 && (
              <div style={{ padding:'10px 18px', background:'#e8f5e9', borderTop:'1px solid #c8e6c9', display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#1b5e20', fontWeight:600 }}>
                % Descuento mayoreo {desc}% aplicado automáticamente — {totalPiezas} pzas
              </div>
            )}
          </div>

          {/* ── RESUMEN ── */}
          <div className="cart-summary" style={{ background:'white', borderRadius:16, border:'1px solid var(--border)', padding:'20px', position:'sticky', top:88 }}>
            <h3 style={{ fontWeight:900, fontSize:16, color:'var(--txt)', marginBottom:16 }}>Resumen del pedido</h3>

            {/* Vol progress */}
            <div style={{ background:'var(--field-bg)', borderRadius:10, padding:'12px', marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span style={{ fontWeight:700, color:'var(--txt)' }}>{totalPiezas} pzas</span>
                {desc > 0
                  ? <span style={{ color:'#1b5e20', fontWeight:700 }}>✓ {desc}% desc.</span>
                  : nextTier
                    ? <span style={{ color:'var(--txt3)' }}>Faltan {nextTier - totalPiezas} pzas para {descuentoPct(nextTier)}%</span>
                    : <span style={{ color:'#1b5e20', fontWeight:700 }}>✓ Descuento máximo</span>
                }
              </div>
              <div className="vol-bar"><div className="vol-fill" style={{ width:`${volPct}%` }} /></div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:14, paddingBottom:14, borderBottom:'1px solid var(--bg)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--txt2)' }}>
                <span>Artículos</span><span style={{ fontWeight:600, color:'var(--txt)' }}>{cart.length}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--txt2)' }}>
                <span>Total piezas</span><span style={{ fontWeight:600, color:'var(--txt)' }}>{totalPiezas}</span>
              </div>
              {desc > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#1b5e20', fontWeight:600 }}>
                  <span>% Descuento mayoreo</span><span>{desc}%</span>
                </div>
              )}
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <span style={{ fontSize:14, fontWeight:700, color:'var(--txt)' }}>Total</span>
              <span style={{ fontSize:20, fontWeight:900, color:'var(--blue)' }}>{totalPiezas} pzas</span>
            </div>

            {checkoutError && (
              <div style={{ background:'var(--err-bg)', border:'1px solid var(--err-border)', color:'var(--err-text)', borderRadius:8, padding:'10px 12px', fontSize:12, marginBottom:12, lineHeight:1.5 }}>
                ⚠ {checkoutError}
              </div>
            )}

            <button className="btn-primary btn-block" disabled={placing} onClick={handleCheckout}>
              {placing
                ? <><div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', animation:'spin .7s linear infinite' }}/> Procesando…</>
                : `Confirmar pedido (${totalPiezas} pzas)`
              }
            </button>

            <Link href="/client/catalog" className="btn-sm-ghost" style={{ width:'100%', marginTop:10 }}>
              Seguir comprando
            </Link>

            {/* WA alternativa */}
            <div style={{ marginTop:16, padding:'10px 12px', background:'#e8f5e9', border:'1px solid #c8e6c9', borderRadius:8, display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <WhatsAppIcon size={20} color="var(--wa)"/>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--txt)' }}>¿Prefieres pedir por WhatsApp?</div>
                <div style={{ fontSize:10, color:'#4a5568' }}>CharisBot lo procesa al instante</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
