'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

const ESTADO_META: Record<string,{label:string;color:string;bg:string;icon:string}> = {
  'PENDIENTE_PAGO':       {label:'Pendiente de pago', color:'#92400e',bg:'#fef3c7',icon:'⏳'},
  'PAGO_RECIBIDO':        {label:'Pago recibido',     color:'#065f46',bg:'#d1fae5',icon:'✅'},
  'CONFIRMADO':           {label:'Confirmado',        color:'#1565c0',bg:'#eff6ff',icon:'✓'},
  'EN_PREPARACION':       {label:'En preparación',    color:'#6b21a8',bg:'#fdf4ff',icon:'📦'},
  'EN_REPARTO':           {label:'En camino',         color:'#0369a1',bg:'#e0f2fe',icon:'🚚'},
  'ENTREGADO':            {label:'Entregado',         color:'#15803d',bg:'#f0fdf4',icon:'🎉'},
  'CANCELADO':            {label:'Cancelado',         color:'#991b1b',bg:'#fef2f2',icon:'✕'},
  'PENDIENTE_CONFIRMACION':{label:'Por confirmar',    color:'#854d0e',bg:'#fefce8',icon:'⏱'},
}

const TIMELINE_STEPS = ['PENDIENTE_PAGO','PAGO_RECIBIDO','CONFIRMADO','EN_PREPARACION','EN_REPARTO','ENTREGADO']

const CSS = `
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
`

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string }
  const router  = useRouter()
  const [order,    setOrder]    = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [canceling,setCanceling]= useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/client/orders/${id}`)
      .then(r => r.json())
      .then(d => { setOrder(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function handleCancel() {
    setCanceling(true)
    try {
      const res = await fetch(`/api/client/orders/${id}/cancel`, { method:'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrder((o: any) => ({ ...o, estado:'CANCELADO' }))
      setShowConfirm(false)
    } catch (e: any) { alert(e.message) }
    finally { setCanceling(false) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:28,height:28,borderRadius:'50%',border:'3px solid #e2eaf4',borderTopColor:'#1565c0',animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!order) return <div style={{ textAlign:'center', padding:40, color:'#8aaac4' }}>Pedido no encontrado</div>

  const meta = ESTADO_META[order.estado] || {label:order.estado,color:'#3a6080',bg:'#f0f4f8',icon:'•'}
  const currentStep = TIMELINE_STEPS.indexOf(order.estado)
  const canCancel = ['PENDIENTE_PAGO','PENDIENTE_CONFIRMACION'].includes(order.estado)
  const items = order.pedido_json?.items || []

  return (
    <>
      <style>{CSS}</style>

      {/* Breadcrumb + back */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, fontSize:13, color:'#8aaac4' }}>
        <Link href="/client/orders" style={{ color:'#8aaac4', textDecoration:'none' }}>Mis pedidos</Link>
        <span>›</span>
        <span style={{ color:'#0d2137', fontWeight:600 }}>#{(order.numero_pedido||id.slice(0,8)).toUpperCase()}</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20, alignItems:'start', animation:'fadeUp .3s ease-out' }}>

        {/* Left */}
        <div>
          {/* Header */}
          <div style={{ background:'white', borderRadius:14, border:'1px solid #e2eaf4', padding:'18px 20px', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:16 }}>
              <div>
                <h1 style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:20, color:'#0d2137', marginBottom:6 }}>
                  Pedido #{(order.numero_pedido||id.slice(0,8)).toUpperCase()}
                </h1>
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:100, fontSize:12, fontWeight:700, background:meta.bg, color:meta.color }}>
                  {meta.icon} {meta.label}
                </span>
              </div>
              {canCancel && (
                <button onClick={() => setShowConfirm(true)}
                  style={{ padding:'8px 16px', borderRadius:9, border:'1.5px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  Cancelar pedido
                </button>
              )}
            </div>

            {/* Progress timeline */}
            {order.estado !== 'CANCELADO' && (
              <div style={{ display:'flex', alignItems:'center', gap:0, overflowX:'auto' }}>
                {TIMELINE_STEPS.map((s, i) => {
                  const done = i <= currentStep
                  const m = ESTADO_META[s]
                  return (
                    <div key={s} style={{ display:'flex', alignItems:'center', flex: i<TIMELINE_STEPS.length-1?1:'none', minWidth:0 }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:done?'#1565c0':'#e2eaf4', color:done?'white':'#8aaac4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0, transition:'all .3s' }}>
                          {done?'✓':i+1}
                        </div>
                        <span style={{ fontSize:9, color:done?'#1565c0':'#8aaac4', whiteSpace:'nowrap', fontWeight:done?700:400 }}>
                          {m?.label?.split(' ')[0]}
                        </span>
                      </div>
                      {i<TIMELINE_STEPS.length-1 && (
                        <div style={{ flex:1, height:2, background:done?'#1565c0':'#e2eaf4', margin:'0 3px', marginBottom:14, minWidth:8 }}/>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Items */}
          <div style={{ background:'white', borderRadius:14, border:'1px solid #e2eaf4', overflow:'hidden', marginBottom:16 }}>
            <div style={{ padding:'12px 18px', background:'#f5f8fc', borderBottom:'1px solid #e2eaf4' }}>
              <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:13, color:'#0d2137' }}>
                Artículos del pedido
              </p>
            </div>
            {items.length === 0 ? (
              <div style={{ padding:'20px', color:'#8aaac4', fontSize:13 }}>Sin detalle de artículos</div>
            ) : items.map((item: any, i: number) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 18px', borderBottom: i<items.length-1?'1px solid #f0f4f8':'none', fontSize:13 }}>
                <div>
                  <span style={{ fontWeight:700, color:'#0d2137' }}>{item.modelo}</span>
                  <span style={{ color:'#8aaac4', marginLeft:8 }}>{item.tipo_case} · {item.color}</span>
                </div>
                <span style={{ fontWeight:700, color:'#1565c0' }}>{item.cantidad} pzas</span>
              </div>
            ))}
          </div>

          {/* Timeline history */}
          {order.timeline && order.timeline.length > 0 && (
            <div style={{ background:'white', borderRadius:14, border:'1px solid #e2eaf4', padding:'18px 20px' }}>
              <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:13, color:'#0d2137', marginBottom:14 }}>
                Historial de cambios
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {order.timeline.map((t: any, i: number) => {
                  const tm = ESTADO_META[t.estado] || {label:t.estado,color:'#3a6080',bg:'#f0f4f8',icon:'•'}
                  return (
                    <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:tm.bg, color:tm.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>
                        {tm.icon}
                      </div>
                      <div>
                        <p style={{ fontSize:13, fontWeight:600, color:'#0d2137' }}>{tm.label}</p>
                        {t.nota && <p style={{ fontSize:12, color:'#8aaac4' }}>{t.nota}</p>}
                        <p style={{ fontSize:11, color:'#b8d4ed' }}>{new Date(t.creado_en).toLocaleString('es-MX')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Pago */}
          <div style={{ background:'white', borderRadius:14, border:'1px solid #e2eaf4', padding:'16px' }}>
            <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:13, color:'#0d2137', marginBottom:10 }}>💳 Pago</p>
            <p style={{ fontSize:13, color:'#3a6080', marginBottom:4 }}>Transferencia bancaria</p>
            {order.referencia_pago && <p style={{ fontSize:12, color:'#8aaac4' }}>Ref: {order.referencia_pago}</p>}
            {!order.referencia_pago && order.estado==='PENDIENTE_PAGO' && (
              <p style={{ fontSize:11, color:'#f59e0b', marginTop:4 }}>⏳ Esperando comprobante de pago</p>
            )}
          </div>

          {/* Entrega */}
          {order.direccion_entrega && (
            <div style={{ background:'white', borderRadius:14, border:'1px solid #e2eaf4', padding:'16px' }}>
              <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:13, color:'#0d2137', marginBottom:10 }}>📍 Entrega</p>
              <p style={{ fontSize:13, color:'#0d2137', fontWeight:600 }}>{order.direccion_entrega.nombre}</p>
              <p style={{ fontSize:12, color:'#3a6080', lineHeight:1.6 }}>
                {order.direccion_entrega.calle}<br/>
                {order.direccion_entrega.colonia}, {order.direccion_entrega.ciudad}<br/>
                CP {order.direccion_entrega.cp}
              </p>
            </div>
          )}

          {/* Fecha */}
          <div style={{ background:'white', borderRadius:14, border:'1px solid #e2eaf4', padding:'16px' }}>
            <p style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:13, color:'#0d2137', marginBottom:6 }}>📅 Fecha</p>
            <p style={{ fontSize:13, color:'#3a6080' }}>
              {new Date(order.creado_en).toLocaleDateString('es-MX', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </p>
          </div>
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showConfirm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
             onClick={e => { if(e.target===e.currentTarget) setShowConfirm(false) }}>
          <div style={{ background:'white',borderRadius:16,padding:28,maxWidth:400,width:'100%' }}>
            <h3 style={{ fontFamily:'Arial Black,sans-serif',fontWeight:900,fontSize:18,color:'#0d2137',marginBottom:10 }}>¿Cancelar pedido?</h3>
            <p style={{ fontSize:14,color:'#3a6080',lineHeight:1.6,marginBottom:20 }}>
              Esta acción no se puede deshacer. ¿Estás seguro que deseas cancelar este pedido?
            </p>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={() => setShowConfirm(false)}
                style={{ flex:1,padding:'10px',borderRadius:9,border:'1.5px solid #e2eaf4',background:'white',color:'#3a6080',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}>
                No, regresar
              </button>
              <button onClick={handleCancel} disabled={canceling}
                style={{ flex:1,padding:'10px',borderRadius:9,border:'none',background:'#dc2626',color:'white',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:canceling?.6:1 }}>
                {canceling ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@media(max-width:768px){
        .order-detail-grid { grid-template-columns:1fr !important; }
      }`}</style>
    </>
  )
}
