'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface CartItem {
  tipo_case: string; marca: string; modelo: string; color: string; cantidad: number; _id?: string
}

const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }

  .cart-row {
    display:grid; grid-template-columns:24px 1fr auto auto auto;
    align-items:center; gap:12px; padding:12px 16px;
    border-bottom:1px solid #f0f4f8; transition:background .12s;
  }
  .cart-row:hover { background:#fafcff; }

  .qty-ctrl { display:flex; align-items:center; }
  .qty-btn  {
    width:28px; height:28px; border:1px solid #d0dde8;
    background:#f5f8fc; cursor:pointer; font-size:14px;
    color:#0d2137; display:flex; align-items:center; justify-content:center;
    transition:all .12s;
  }
  .qty-btn:hover { background:#e2eaf4; }
  .qty-input {
    width:44px; height:28px; border:1px solid #d0dde8;
    border-left:none; border-right:none; text-align:center;
    font-size:13px; font-weight:600; color:#0d2137;
    font-family:inherit; outline:none;
  }

  .del-btn {
    background:none; border:none; color:#8aaac4; cursor:pointer;
    font-size:12px; font-weight:600; padding:4px 8px;
    border-radius:6px; transition:all .14s; font-family:inherit;
    white-space:nowrap;
  }
  .del-btn:hover { color:#ef4444; background:rgba(239,68,68,0.08); }

  .group-header {
    display:flex; align-items:center; gap:10px;
    padding:10px 16px; background:#f5f8fc;
    border-bottom:1px solid #e2eaf4; border-top:1px solid #e2eaf4;
  }

  .checkout-btn {
    width:100%; padding:13px; background:#1565c0; color:white;
    border:none; border-radius:10px; font-size:15px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:all .18s;
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .checkout-btn:hover:not(:disabled) { background:#1976d2; transform:translateY(-1px); box-shadow:0 6px 20px rgba(21,101,192,0.3); }
  .checkout-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; box-shadow:none; }

  @media(max-width:640px) {
    .cart-row { grid-template-columns:24px 1fr auto; }
    .cart-row .qty-ctrl { display:none; }
  }
`

function loadCart(): CartItem[] {
  try {
    const items = JSON.parse(localStorage.getItem('charis-cart') || '[]')
    // Ensure each item has a stable id
    return items.map((it: any, i: number) => ({ ...it, _id: it._id || `${Date.now()}-${i}` }))
  } catch { return [] }
}
function saveCart(items: CartItem[]) {
  localStorage.setItem('charis-cart', JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('charis-cart-updated'))
}

export default function CartPage() {
  const router = useRouter()
  const isLocalWrite = useRef(false)

  function updateCart(fn: (prev: CartItem[]) => CartItem[]) {
    setCart(prev => {
      const next = fn(prev)
      isLocalWrite.current = true
      saveCart(next)
      setTimeout(() => { isLocalWrite.current = false }, 50)
      return next
    })
  }
  const [cart,     setCart]     = useState<CartItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [placing,  setPlacing]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  // internal = change came from this page (not from drawer/other tab)
  const isInternal = useRef(false)

  useEffect(() => {
    setCart(loadCart())
    setLoading(false)
    // Only sync from external sources (drawer, other tabs)
    const sync = () => {
      if (!isInternal.current) setCart(loadCart())
    }
    window.addEventListener('charis-cart-updated', sync)
    window.addEventListener('storage',             sync)
    return () => {
      window.removeEventListener('charis-cart-updated', sync)
      window.removeEventListener('storage',             sync)
    }
  }, [])

  useEffect(() => {
    if (loading) return
    isInternal.current = true
    saveCart(cart)
    window.dispatchEvent(new CustomEvent('charis-cart-updated'))
    // Reset flag after event propagates
    setTimeout(() => { isInternal.current = false }, 50)
  }, [cart])

  // Group by tipo_case
  const groups = cart.reduce<Record<string, {items: CartItem[]; indices: number[]}>>((acc, item, i) => {
    const k = item.tipo_case
    if (!acc[k]) acc[k] = { items: [], indices: [] }
    acc[k].items.push(item)
    acc[k].indices.push(i)
    return acc
  }, {})

  function removeItem(i: number) {
    updateCart(c => c.filter((_, j) => j !== i))
    setChecked(s => { const n = new Set(s); n.delete(i); return n })
  }
  function removeSelected() {
    setChecked(new Set())
  }
  function clearAll() { updateCart(() => []) }

  function updateQty(id: string, qty: number) {
    updateCart(c => c.map(it => it._id === id ? { ...it, cantidad: Math.max(1, qty) } : it))
  }

  const totalPiezas = cart.reduce((s, i) => s + i.cantidad, 0)

  async function handleCheckout() {
    if (selectedItems.length === 0) return
    setPlacing(true)
    try {
      const res = await fetch('/api/client/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedItems }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear el pedido')

      updateCart(() => [])
      setSuccess(true)
      setTimeout(() => router.push('/client/checkout'), 2000)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setPlacing(false)
    }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:'3px solid #e2eaf4',borderTopColor:'#1565c0',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (success) return (
    <div style={{textAlign:'center',padding:'60px 20px',animation:'fadeUp .4s ease-out'}}>
      <style>{CSS}</style>
      <div style={{fontSize:52,marginBottom:16}}>✅</div>
      <h2 style={{fontFamily:'Arial Black,sans-serif',fontWeight:900,fontSize:22,color:'#0d2137',marginBottom:8}}>¡Pedido creado!</h2>
      <p style={{fontSize:14,color:'#3a6080'}}>Redirigiendo a tus pedidos...</p>
    </div>
  )

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:24,animation:'fadeUp .3s ease-out'}}>
        <div>
          <h1 style={{fontFamily:'Arial Black,sans-serif',fontWeight:900,fontSize:22,color:'#0d2137',marginBottom:4}}>
            🛒 Carrito de compras
          </h1>
          <p style={{fontSize:13,color:'#8aaac4'}}>{totalPiezas} piezas en el carrito</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>

          <button onClick={clearAll} style={{padding:'7px 14px',borderRadius:9,border:'1.5px solid #e2eaf4',background:'white',color:'#8aaac4',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}
            onMouseEnter={e=>(e.currentTarget.style.borderColor='#ef4444')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#e2eaf4')}>
            Vaciar carrito
          </button>
        </div>
      </div>

      {cart.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',background:'white',borderRadius:16,border:'1px solid #e2eaf4'}}>
          <div style={{fontSize:48,marginBottom:16,opacity:.4}}>🛒</div>
          <h3 style={{fontFamily:'Arial Black,sans-serif',fontWeight:900,fontSize:18,color:'#0d2137',marginBottom:8}}>Carrito vacío</h3>
          <p style={{fontSize:14,color:'#8aaac4',marginBottom:20}}>Agrega productos desde el catálogo</p>
          <Link href="/client/catalog" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'11px 22px',borderRadius:100,background:'#1565c0',color:'white',fontSize:14,fontWeight:700,textDecoration:'none'}}>
            Ir al catálogo →
          </Link>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:20,alignItems:'start',animation:'fadeUp .3s ease-out .05s both'}}>

          {/* Items */}
          <div style={{background:'white',borderRadius:16,border:'1px solid #e2eaf4',overflow:'hidden'}}>
            {Object.entries(groups).map(([tipo, group]) => {
              return (
                <div key={tipo}>
                  <div className="group-header">
  <span style={{fontFamily:'Arial Black,sans-serif',fontWeight:900,fontSize:14,color:'#0d2137'}}>{tipo}</span>
                    <span style={{fontSize:12,color:'#8aaac4'}}>{group.items.length} artículo{group.items.length!==1?'s':''}</span>
                  </div>
                  {group.items.map((item, localIdx) => {
                      return (
                      <div key={item._id} className="cart-row">

                        <div>
                          <p style={{fontSize:13.5,fontWeight:700,color:'#0d2137',marginBottom:2}}>{item.modelo}</p>
                          <p style={{fontSize:11,color:'#8aaac4'}}>{item.marca} · {item.color}</p>
                        </div>
                        <div className="qty-ctrl">
                          <button className="qty-btn" style={{borderRadius:'6px 0 0 6px'}} onClick={()=>updateQty(item._id!,item.cantidad-1)}>−</button>
                          <input type="number" className="qty-input" value={item.cantidad} min={1}
                                 onChange={e=>updateQty(item._id!, parseInt(e.target.value)||1)}/>
                          <button className="qty-btn" style={{borderRadius:'0 6px 6px 0'}} onClick={()=>updateQty(item._id!,item.cantidad+1)}>+</button>
                        </div>
                        <span style={{fontSize:13,fontWeight:700,color:'#1565c0',minWidth:50,textAlign:'right'}}>{item.cantidad} pzas</span>
                        <button className="del-btn" onClick={()=>removeItem(item._id!)}>Eliminar</button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Resumen */}
          <div style={{background:'white',borderRadius:16,border:'1px solid #e2eaf4',padding:'20px',position:'sticky',top:80}}>
            <h3 style={{fontFamily:'Arial Black,sans-serif',fontWeight:900,fontSize:16,color:'#0d2137',marginBottom:16}}>
              Resumen del pedido
            </h3>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16,paddingBottom:16,borderBottom:'1px solid #f0f4f8'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#3a6080'}}>
                <span>Artículos</span>
                <span style={{fontWeight:600,color:'#0d2137'}}>{cart.length}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#3a6080'}}>
                <span>Total piezas</span>
                <span style={{fontWeight:600,color:'#0d2137'}}>{totalPiezas}</span>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <span style={{fontSize:14,fontWeight:700,color:'#0d2137'}}>Total seleccionado</span>
              <span style={{fontSize:16,fontWeight:900,color:'#1565c0'}}>{totalPiezas} pzas</span>
            </div>
            <button className="checkout-btn" disabled={cart.length===0 || placing} onClick={handleCheckout}>
              {placing
                ? <><div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',animation:'spin .7s linear infinite'}}/>Procesando...</>
                : `Confirmar pedido (${totalPiezas} pzas)`
              }
            </button>
            <Link href="/client/catalog" style={{display:'flex',alignItems:'center',justifyContent:'center',marginTop:10,padding:'9px',borderRadius:9,border:'1.5px solid #e2eaf4',fontSize:13,color:'#3a6080',textDecoration:'none',transition:'all .15s',fontWeight:500}}
              onMouseEnter={(e:any)=>e.currentTarget.style.borderColor='#1565c0'} onMouseLeave={(e:any)=>e.currentTarget.style.borderColor='#e2eaf4'}>
              Seguir comprando
            </Link>

          </div>
        </div>
      )}

      {/* Responsive: stack on mobile */}
      <style>{`
        @media(max-width:768px) {
          .cart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
