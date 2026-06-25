'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Pedido {
  id: string; numero_pedido: string; estado: string; tipo_case: string
  resumen: string; creado_en: string; total_piezas: number
  metodo_pago: string; referencia_pago: string; pedido_json?: any
}

const ESTADO_META: Record<string,{label:string; color:string; bg:string; icon:string; step:number}> = {
  'PENDIENTE_PAGO':        { label:'Pendiente de pago',  color:'#92400e', bg:'#fef3c7', icon:'⏳', step:0 },
  'PENDIENTE_CONFIRMACION':{ label:'Por confirmar',       color:'#854d0e', bg:'#fefce8', icon:'⏱', step:0 },
  'PAGO_RECIBIDO':         { label:'Pago recibido',       color:'#065f46', bg:'#d1fae5', icon:'✅', step:1 },
  'CONFIRMADO':            { label:'Confirmado',          color:'var(--blue)', bg:'#eff6ff', icon:'✓',  step:1 },
  'EN_PREPARACION':        { label:'En preparación',      color:'#6b21a8', bg:'#fdf4ff', icon:'📦', step:2 },
  'EN_REPARTO':            { label:'En camino',           color:'#0369a1', bg:'#e0f2fe', icon:'🚚', step:3 },
  'ENTREGADO':             { label:'Entregado',           color:'#15803d', bg:'var(--ok-bg)', icon:'🎉', step:4 },
  'CANCELADO':             { label:'Cancelado',           color:'#991b1b', bg:'var(--err-bg)', icon:'✕',  step:-1 },
}

const TL_STEPS = [
  { icon:'✓',  label:'Confirmado'   },
  { icon:'📦', label:'Preparando'   },
  { icon:'🚚', label:'En camino'    },
  { icon:'🎉', label:'Entregado'    },
]

const CSS = `
  @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel { background:linear-gradient(90deg,var(--border) 25%,var(--bg) 50%,var(--border) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:12px; }

  .order-card {
    background:white; border-radius:14px; border:1.5px solid var(--border);
    overflow:hidden; transition:border-color .18s, box-shadow .18s; cursor:pointer;
  }
  .order-card:hover  { border-color:var(--blue2); box-shadow:0 6px 24px rgba(21,101,192,.08); }
  .order-card.open   { border-color:var(--blue); }

  .estado-badge {
    display:inline-flex; align-items:center; gap:4px;
    padding:3px 10px; border-radius:100px; font-size:11px; font-weight:700;
  }
  .filter-btn {
    padding:6px 16px; border-radius:100px; font-size:12px; font-weight:600;
    border:1.5px solid var(--border); background:white; color:var(--txt2);
    cursor:pointer; transition:all .15s; font-family:inherit; white-space:nowrap;
  }
  .filter-btn.act { border-color:var(--blue); background:var(--blue); color:white; }
  .filter-btn:hover:not(.act) { border-color:var(--blue2); color:var(--blue); }

  /* Timeline */
  .tl-dot {
    width:22px; height:22px; border-radius:50%;
    display:flex; align-items:center; justify-content:center; font-size:11px;
    flex-shrink:0; z-index:1;
  }
  .tl-dot.done    { background:var(--blue); color:white; }
  .tl-dot.current { background:white; border:2px solid var(--blue); color:var(--blue); }
  .tl-dot.pending { background:var(--bg); border:2px solid var(--field-border); color:#b0bac8; }
  .tl-line { flex:1; height:2px; margin-bottom:16px; }
  .tl-line.done    { background:var(--blue); }
  .tl-line.pending { background:var(--border); }

`

export default function OrdersPage() {
  const [orders,  setOrders]  = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('todos')
  const [open,    setOpen]    = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/client/orders')
      .then(r => r.json())
      .then(d => {
        // "Por validar surtido" es un estado interno de almacén/ventas —
        // de cara al cliente se ve igual que "En preparación".
        const items = (d.items || []).map((o: Pedido) =>
          o.estado === 'POR_VALIDAR_SURTIDO' ? { ...o, estado: 'EN_PREPARACION' } : o
        )
        setOrders(items); setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const FILTERS = [
    { key:'todos',     label:'Todos' },
    { key:'activos',   label:'Activos' },
    { key:'ENTREGADO', label:'Entregados' },
    { key:'CANCELADO', label:'Cancelados' },
  ]

  const filtered = orders.filter(o => {
    if (filter === 'todos')   return true
    if (filter === 'activos') return !['ENTREGADO','CANCELADO'].includes(o.estado)
    return o.estado === filter
  })

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
  }

  const [reordenando, setReordenando] = useState<string | null>(null)
  const [reordenarError, setReordenarError] = useState('')

  async function reordenar(pedido: Pedido) {
    setReordenarError('')
    try {
      const items = pedido.pedido_json?.items || []
      if (!items.length) return
      setReordenando(pedido.id)

      const cart: any[] = []
      const sinStock: string[] = []
      for (const it of items) {
        const res = await fetch('/api/client/cart/reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo_case: it.tipo_case, modelo: it.modelo, color: it.color || 'NEGRO', cantidad: it.cantidad }),
        })
        const data = await res.json()
        if (!res.ok) {
          // Reintenta con la cantidad disponible si quedó algo, si no se omite el artículo.
          if (data.disponible > 0) {
            const retry = await fetch('/api/client/cart/reserve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tipo_case: it.tipo_case, modelo: it.modelo, color: it.color || 'NEGRO', cantidad: data.disponible }),
            })
            if (retry.ok) {
              cart.push({ tipo_case: it.tipo_case, marca: it.marca || '', modelo: it.modelo, color: it.color || '', cantidad: data.disponible })
            }
          }
          sinStock.push(`${it.modelo} (${it.color || 'NEGRO'})`)
          continue
        }
        cart.push({ tipo_case: it.tipo_case, marca: it.marca || '', modelo: it.modelo, color: it.color || '', cantidad: it.cantidad })
      }

      if (!cart.length) {
        setReordenarError('Ninguno de los artículos de este pedido tiene stock disponible.')
        setReordenando(null)
        return
      }

      localStorage.setItem('charis-cart', JSON.stringify(cart))
      window.dispatchEvent(new CustomEvent('charis-cart-updated'))

      if (sinStock.length) {
        setReordenarError(`Algunos artículos ya no tienen el stock completo: ${sinStock.join(', ')}. Se ajustó la cantidad disponible en el carrito.`)
        setReordenando(null)
        return
      }

      window.location.href = '/client/cart'
    } catch {
      setReordenarError('No se pudo repetir el pedido, intenta de nuevo.')
      setReordenando(null)
    }
  }

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:24, animation:'fadeUp .3s ease-out' }}>
        <div>
          <h1 style={{ fontWeight:900, fontSize:'clamp(18px,4vw,24px)', color:'var(--txt)', marginBottom:4 }}>📦 Mis pedidos</h1>
          <p style={{ fontSize:13, color:'var(--txt3)' }}>
            {loading ? 'Cargando…' : `${orders.length} pedido${orders.length !== 1 ? 's' : ''} en total`}
          </p>
        </div>
        <Link href="/client/catalog" className="btn-sm">
          + Nuevo pedido
        </Link>
      </div>

      {reordenarError && (
        <div style={{ background:'var(--err-bg)', border:'1px solid var(--err-border)', color:'var(--err-text)', borderRadius:10, padding:'10px 14px', fontSize:13, marginBottom:16, display:'flex', alignItems:'flex-start', gap:8 }}>
          <span>⚠</span>
          <span style={{ flex:1 }}>{reordenarError}</span>
          <button onClick={() => setReordenarError('')} style={{ border:'none', background:'transparent', color:'inherit', cursor:'pointer', fontSize:14, lineHeight:1 }}>✕</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {FILTERS.map(f => (
          <button key={f.key} className={`filter-btn${filter === f.key ? ' act' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:90 }} className="skel" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'56px 20px', background:'white', borderRadius:14, border:'1px solid var(--border)' }}>
          <div style={{ fontSize:44, marginBottom:12, opacity:.25 }}>📦</div>
          <h3 style={{ fontWeight:900, fontSize:17, color:'var(--txt)', marginBottom:8 }}>
            {filter === 'todos' ? 'Aún no tienes pedidos' : 'Sin pedidos en esta categoría'}
          </h3>
          {filter === 'todos' && (
            <Link href="/client/catalog" className="btn-primary" style={{ marginTop:12 }}>
              Ir al catálogo →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10, animation:'fadeUp .3s ease-out' }}>
          {filtered.map(order => {
            const meta   = ESTADO_META[order.estado] || { label:order.estado, color:'var(--txt2)', bg:'var(--bg)', icon:'•', step:0 }
            const isOpen = open === order.id
            const items: any[] = order.pedido_json?.items || []

            return (
              <div key={order.id} className={`order-card${isOpen ? ' open' : ''}`}>
                {/* Header row */}
                <div
                  style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}
                  onClick={() => setOpen(isOpen ? null : order.id)}
                >
                  <div style={{ width:40, height:40, borderRadius:10, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:13, color:'var(--txt)' }}>
                        #{(order.numero_pedido || order.id.slice(0,8)).toUpperCase()}
                      </span>
                      <span className="estado-badge" style={{ color:meta.color, background:meta.bg }}>
                        {meta.label}
                      </span>
                    </div>
                    <p style={{ fontSize:12, color:'var(--txt3)' }}>
                      {order.tipo_case} · {order.total_piezas || '?'} pzas · {formatDate(order.creado_en)}
                    </p>
                  </div>
                  <span style={{ fontSize:13, color:'var(--txt3)', flexShrink:0 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Progress bar */}
                {!['CANCELADO','ENTREGADO'].includes(order.estado) && (
                  <div style={{ height:3, background:'var(--bg)' }}>
                    <div style={{ height:'100%', background:'var(--blue)', transition:'width .5s', width:
                      order.estado==='PENDIENTE_PAGO'||order.estado==='PENDIENTE_CONFIRMACION' ? '8%' :
                      order.estado==='PAGO_RECIBIDO'||order.estado==='CONFIRMADO' ? '35%' :
                      order.estado==='EN_PREPARACION' ? '62%' :
                      order.estado==='EN_REPARTO' ? '85%' : '100%'
                    }}/>
                  </div>
                )}

                {/* Expanded */}
                {isOpen && (
                  <div style={{ borderTop:'1px solid var(--border)', padding:'16px 18px', background:'#f9fbfe' }}>

                    {/* Timeline */}
                    {order.estado !== 'CANCELADO' && (
                      <div style={{ marginBottom:16 }}>
                        <div style={{ display:'flex', alignItems:'center' }}>
                          {TL_STEPS.map((s, i) => {
                            const step = meta.step
                            const done = i < step
                            const curr = i === step
                            const pend = i > step
                            return (
                              <div key={s.label} style={{ display:'flex', alignItems:'center', flex: i < 3 ? 1 : 'none' }}>
                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                                  <div className={`tl-dot ${done ? 'done' : curr ? 'current' : 'pending'}`}>
                                    {done ? '✓' : s.icon}
                                  </div>
                                  <div style={{ fontSize:9, color: curr ? 'var(--blue)' : 'var(--txt3)', marginTop:4, fontWeight: curr ? 700 : 400, textAlign:'center', whiteSpace:'nowrap' }}>
                                    {s.label}
                                  </div>
                                </div>
                                {i < 3 && (
                                  <div className={`tl-line ${done ? 'done' : 'pending'}`} style={{ margin:'0 4px', marginBottom:16 }} />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Items list */}
                    {items.length > 0 && (
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:'var(--txt2)', marginBottom:8, letterSpacing:'.04em', textTransform:'uppercase' }}>Artículos</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {items.slice(0,5).map((it: any, idx: number) => (
                            <div key={idx} style={{ display:'flex', alignItems:'center', gap:10, background:'white', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px' }}>
                              <span style={{ fontSize:16 }}>
                                {it.tipo_case==='BLINDAJE'?'🔐':it.tipo_case==='3 EN 1'?'🎯':it.tipo_case==='ESCUDO'?'🛡️':'💍'}
                              </span>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:12, fontWeight:700, color:'var(--txt)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{it.modelo}</div>
                                <div style={{ fontSize:10, color:'var(--txt3)' }}>{it.marca} · {it.color}</div>
                              </div>
                              <div style={{ fontSize:12, fontWeight:700, color:'var(--blue)', flexShrink:0 }}>{it.cantidad} pzas</div>
                            </div>
                          ))}
                          {items.length > 5 && (
                            <div style={{ fontSize:12, color:'var(--txt3)', textAlign:'center', padding:'4px 0' }}>
                              +{items.length - 5} artículo{items.length - 5 !== 1 ? 's' : ''} más
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
                      <Link href={`/client/orders/${order.id}`} className="btn-sm-ghost">
                        Ver detalle completo
                      </Link>
                      {order.estado !== 'CANCELADO' && (
                        <button className="btn-sm" disabled={reordenando===order.id} onClick={() => reordenar(order)}>
                          {reordenando===order.id ? 'Verificando stock…' : '🔄 Repetir pedido'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
