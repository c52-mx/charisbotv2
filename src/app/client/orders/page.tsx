'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Pedido {
  id: string; numero_pedido: string; estado: string; tipo_case: string
  resumen: string; creado_en: string; total_piezas: number
  metodo_pago: string; referencia_pago: string
}

const ESTADO_META: Record<string,{label:string; color:string; bg:string; icon:string}> = {
  'PENDIENTE_PAGO':       {label:'Pendiente de pago',  color:'#92400e', bg:'#fef3c7', icon:'⏳'},
  'PAGO_RECIBIDO':        {label:'Pago recibido',       color:'#065f46', bg:'#d1fae5', icon:'✅'},
  'CONFIRMADO':           {label:'Confirmado',          color:'#1565c0', bg:'#eff6ff', icon:'✓'},
  'EN_PREPARACION':       {label:'En preparación',      color:'#6b21a8', bg:'#fdf4ff', icon:'📦'},
  'EN_REPARTO':           {label:'En camino',           color:'#0369a1', bg:'#e0f2fe', icon:'🚚'},
  'ENTREGADO':            {label:'Entregado',           color:'#15803d', bg:'#f0fdf4', icon:'🎉'},
  'CANCELADO':            {label:'Cancelado',           color:'#991b1b', bg:'#fef2f2', icon:'✕'},
  'PENDIENTE_CONFIRMACION':{label:'Por confirmar',      color:'#854d0e', bg:'#fefce8', icon:'⏱'},
}

const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel { background:linear-gradient(90deg,#e2eaf4 25%,#f0f4f8 50%,#e2eaf4 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:10px; }

  .order-card {
    background:white; border-radius:14px; border:1px solid #e2eaf4;
    transition:all .2s; overflow:hidden;
  }
  .order-card:hover { border-color:#4baef0; box-shadow:0 8px 24px rgba(21,101,192,0.08); }

  .estado-badge {
    display:inline-flex; align-items:center; gap:5px;
    padding:4px 12px; border-radius:100px; font-size:11px; font-weight:700;
  }

  .filter-btn {
    padding:6px 14px; border-radius:100px; font-size:12px; font-weight:600;
    border:1.5px solid #e2eaf4; background:white; color:#3a6080;
    cursor:pointer; transition:all .15s; font-family:inherit;
  }
  .filter-btn.act { border-color:#1565c0; background:#1565c0; color:white; }
`

export default function OrdersPage() {
  const [orders,  setOrders]  = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('todos')

  useEffect(() => {
    fetch('/api/client/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.items || []); setLoading(false) })
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
    return new Date(d).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' })
  }

  return (
    <>
      <style>{CSS}</style>

      <div style={{ marginBottom:24, animation:'fadeUp .3s ease-out' }}>
        <h1 style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:'clamp(18px,4vw,24px)', color:'#0d2137', marginBottom:4 }}>
          📦 Mis pedidos
        </h1>
        <p style={{ fontSize:13, color:'#8aaac4' }}>{orders.length} pedido{orders.length!==1?'s':''} en total</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {FILTERS.map(f => (
          <button key={f.key} className={`filter-btn${filter===f.key?' act':''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:100 }} className="skel"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px', background:'white', borderRadius:14, border:'1px solid #e2eaf4' }}>
          <div style={{ fontSize:40, marginBottom:12, opacity:.3 }}>📦</div>
          <h3 style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:16, color:'#0d2137', marginBottom:8 }}>
            {filter === 'todos' ? 'Aún no tienes pedidos' : 'Sin pedidos en esta categoría'}
          </h3>
          {filter === 'todos' && (
            <Link href="/client/catalog" style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:8, padding:'10px 20px', borderRadius:100, background:'#1565c0', color:'white', fontSize:13, fontWeight:700, textDecoration:'none' }}>
              Ir al catálogo →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'fadeUp .3s ease-out' }}>
          {filtered.map(order => {
            const meta = ESTADO_META[order.estado] || { label:order.estado, color:'#3a6080', bg:'#f0f4f8', icon:'•' }
            return (
              <Link key={order.id} href={`/client/orders/${order.id}`} style={{ textDecoration:'none' }}>
                <div className="order-card">
                  <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        {meta.icon}
                      </div>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:13, color:'#0d2137' }}>
                            #{(order.numero_pedido || order.id.slice(0,8)).toUpperCase()}
                          </span>
                          <span className="estado-badge" style={{ color:meta.color, background:meta.bg }}>
                            {meta.label}
                          </span>
                        </div>
                        <p style={{ fontSize:12, color:'#8aaac4' }}>
                          {order.tipo_case} · {order.total_piezas || '?'} pzas · {formatDate(order.creado_en)}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize:12, color:'#4baef0', fontWeight:600 }}>Ver detalle →</span>
                  </div>
                  {/* Progress bar */}
                  {!['CANCELADO','ENTREGADO'].includes(order.estado) && (
                    <div style={{ height:3, background:'#f0f4f8' }}>
                      <div style={{ height:'100%', background:'#1565c0', transition:'width .5s', width:
                        order.estado==='PENDIENTE_PAGO'?'10%':
                        order.estado==='PAGO_RECIBIDO'?'25%':
                        order.estado==='CONFIRMADO'?'40%':
                        order.estado==='EN_PREPARACION'?'65%':
                        order.estado==='EN_REPARTO'?'85%':'100%'
                      }}/>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
