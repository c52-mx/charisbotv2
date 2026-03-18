'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const ESTADO_STEPS = ['PENDIENTE','CONFIRMADO','EN_PROCESO','COMPLETADO']
const ESTADO_EMOJI: Record<string,string> = {
  PENDIENTE:'📋', PENDIENTE_CONFIRMACION:'⏳', CONFIRMADO:'✅',
  EN_PROCESO:'⚙️', COMPLETADO:'🎉', CANCELADO:'❌',
}
const ESTADO_COLOR: Record<string,string> = {
  PENDIENTE:'#94a3b8', CONFIRMADO:'#34d399', EN_PROCESO:'#fbbf24',
  COMPLETADO:'#4baef0', CANCELADO:'#f87171', PENDIENTE_CONFIRMACION:'#a78bfa',
}

function TrackContent() {
  const params = useSearchParams()
  const tel    = params.get('tel') || ''
  const sig    = params.get('sig') || ''

  const [state,  setState]   = useState<'loading'|'error'|'ok'>('loading')
  const [cliente,setCliente] = useState<any>(null)
  const [pedidos,setPedidos] = useState<any[]>([])
  const [selected,setSelected]= useState<any>(null)
  const [detLoading,setDetLoading]=useState(false)

  useEffect(()=>{
    if (!tel||!sig) { setState('error'); return }
    fetch(`/api/track?tel=${encodeURIComponent(tel)}&sig=${sig}`)
      .then(r=>r.json())
      .then(d=>{
        if (!d.ok) { setState('error'); return }
        setCliente(d.cliente); setPedidos(d.pedidos||[]); setState('ok')
      })
      .catch(()=>setState('error'))
  },[tel,sig])

  async function loadDetail(id:string) {
    setDetLoading(true)
    const r = await fetch(`/api/track/${id}?tel=${encodeURIComponent(tel)}&sig=${sig}`)
    const d = await r.json(); setSelected(d); setDetLoading(false)
  }

  const css = `
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#070c14;color:#e8f4fd;font-family:'DM Sans',system-ui,sans-serif;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .card{background:#0f1a2e;border:1px solid rgba(26,143,227,0.15);border-radius:14px;transition:all .15s;}
    .card:active{transform:scale(0.99);}
    .chip{display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;}
    .prog-bar{height:4px;border-radius:2px;background:rgba(26,143,227,0.12);overflow:hidden;}
    .prog-fill{height:100%;border-radius:2px;background:#1a8fe3;transition:width .4s ease;}
    .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:50;display:flex;align-items:flex-end;justify-content:center;}
    .modal-card{background:#0f1a2e;border:1px solid rgba(26,143,227,0.2);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:88dvh;overflow-y:auto;padding:22px 18px;}
    @media(min-width:480px){.modal-bg{align-items:center;padding:16px;}.modal-card{border-radius:16px;}}
    .item-row{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(26,143,227,0.1);font-size:13px;}
    .item-row:last-child{border-bottom:none;}
  `

  if (state==='loading') return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',background:'#070c14'}}>
      <style>{css}</style>
      <div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid rgba(26,143,227,0.2)',borderTopColor:'#1a8fe3',animation:'spin .7s linear infinite'}}/>
    </div>
  )

  if (state==='error') return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',background:'#070c14',padding:24,flexDirection:'column',gap:16}}>
      <style>{css}</style>
      <div style={{fontSize:48}}>🔒</div>
      <h2 style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:'#e8f4fd',textAlign:'center'}}>Link inválido</h2>
      <p style={{fontSize:14,color:'#7a9ab8',textAlign:'center',maxWidth:280}}>Este link no es válido o ya expiró. Solicita uno nuevo a través de WhatsApp.</p>
    </div>
  )

  const nombre = cliente?.nombre || tel

  return (
    <div style={{minHeight:'100dvh',background:'#070c14',padding:'0 0 40px'}}>
      <style>{css}</style>

      {/* Header */}
      <div style={{background:'#0b1220',borderBottom:'1px solid rgba(26,143,227,0.12)',padding:'14px 18px',display:'flex',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:10}}>
        <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#1a8fe3,#0d5fa3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>🤖</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,color:'#e8f4fd',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            Hola{nombre!==tel ? `, ${nombre.split(' ')[0]}` : ''} 👋
          </div>
          <div style={{fontSize:11,color:'#7a9ab8'}}>Tus pedidos · Charis</div>
        </div>
        <div style={{fontSize:11,color:'#3d5a78',flexShrink:0}}>📱 {tel.slice(-4)}</div>
      </div>

      <div style={{padding:'18px 16px',maxWidth:480,margin:'0 auto',animation:'fadeUp .35s ease-out'}}>

        {pedidos.length===0 ? (
          <div className="card" style={{padding:36,textAlign:'center'}}>
            <div style={{fontSize:44,marginBottom:12}}>📦</div>
            <p style={{fontWeight:600,color:'#e8f4fd',marginBottom:6}}>Sin pedidos aún</p>
            <p style={{fontSize:13,color:'#7a9ab8'}}>Envíanos un mensaje por WhatsApp para hacer tu primer pedido.</p>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <p style={{fontSize:12,color:'#7a9ab8',marginBottom:4}}>{pedidos.length} pedido{pedidos.length!==1?'s':''}</p>
            {pedidos.map(p => {
              const idx     = ESTADO_STEPS.indexOf(p.estado)
              const pct     = idx<0 ? 0 : Math.round(((idx+1)/ESTADO_STEPS.length)*100)
              const esColor = ESTADO_COLOR[p.estado] || '#94a3b8'
              return (
                <div key={p.id} className="card" style={{padding:'14px 16px',cursor:'pointer'}}
                     onClick={()=>loadDetail(p.id)}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'}}>
                        <span style={{fontFamily:'monospace',fontSize:11,padding:'1px 7px',borderRadius:6,background:'rgba(26,143,227,0.1)',color:'#4baef0'}}>
                          #{p.id.slice(0,8).toUpperCase()}
                        </span>
                        <span style={{fontSize:11,color:'#7a9ab8'}}>{p.origen==='PORTAL'?'🌐':'📱'}</span>
                      </div>
                      <p style={{fontSize:13,fontWeight:500,color:'#e8f4fd',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.resumen || `${p.total_items} modelos`}</p>
                      <p style={{fontSize:11,color:'#7a9ab8',marginTop:3}}>
                        {new Date(p.creado_en).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}
                      </p>
                    </div>
                    <div style={{textAlign:'center',flexShrink:0}}>
                      <div style={{fontSize:24}}>{ESTADO_EMOJI[p.estado]||'📋'}</div>
                      <div style={{fontSize:10,fontWeight:600,color:esColor,marginTop:2,whiteSpace:'nowrap'}}>
                        {p.estado.replace(/_/g,' ')}
                      </div>
                    </div>
                  </div>
                  {p.estado!=='CANCELADO' && (
                    <div className="prog-bar"><div className="prog-fill" style={{width:`${pct}%`}}/></div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {(selected || detLoading) && (
        <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
          <div className="modal-card">
            {detLoading ? (
              <div style={{display:'flex',justifyContent:'center',padding:40}}>
                <div style={{width:24,height:24,borderRadius:'50%',border:'2px solid rgba(26,143,227,0.2)',borderTopColor:'#1a8fe3',animation:'spin .7s linear infinite'}}/>
              </div>
            ) : selected && (
              <>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                  <div>
                    <h2 style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:'#e8f4fd'}}>Pedido #{selected.id?.slice(0,8).toUpperCase()}</h2>
                    <p style={{fontSize:11,color:'#7a9ab8',marginTop:2}}>{selected.origen==='PORTAL'?'🌐 Portal':'📱 WhatsApp'}</p>
                  </div>
                  <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'#7a9ab8',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>
                </div>

                {/* Progress */}
                {selected.estado!=='CANCELADO' && (
                  <div style={{marginBottom:18}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      {ESTADO_STEPS.map(step=>{
                        const si   = ESTADO_STEPS.indexOf(selected.estado)
                        const ti   = ESTADO_STEPS.indexOf(step)
                        const done = ti<=si
                        return (
                          <div key={step} style={{flex:1,textAlign:'center'}}>
                            <div style={{fontSize:18,marginBottom:3}}>{ESTADO_EMOJI[step]}</div>
                            <p style={{fontSize:9,fontWeight:done?700:400,color:done?'#4baef0':'#3d5a78',lineHeight:1.2}}>
                              {step.replace(/_/g,' ')}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="prog-bar" style={{height:5}}>
                      <div className="prog-fill" style={{width:`${Math.round(((ESTADO_STEPS.indexOf(selected.estado)+1)/ESTADO_STEPS.length)*100)}%`}}/>
                    </div>
                  </div>
                )}

                {selected.resumen && (
                  <div style={{padding:'8px 11px',borderRadius:8,background:'rgba(26,143,227,0.07)',border:'1px solid rgba(26,143,227,0.12)',fontSize:12,color:'#7a9ab8',marginBottom:14}}>{selected.resumen}</div>
                )}

                <p style={{fontSize:11,fontWeight:600,color:'#7a9ab8',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Detalle</p>
                <div style={{border:'1px solid rgba(26,143,227,0.12)',borderRadius:10,overflow:'hidden',marginBottom:16}}>
                  {(selected.items||[]).map((it:any,i:number)=>(
                    <div key={i} className="item-row">
                      <div>
                        <span style={{fontWeight:600,color:'#e8f4fd'}}>{it.modelo}</span>
                        <span style={{fontSize:11,color:'#7a9ab8',marginLeft:7}}>{it.tipo_case}</span>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <span style={{fontWeight:600,color:'#e8f4fd'}}>{it.cantidad} pzas</span>
                        {it.color && <span style={{fontSize:11,color:'#7a9ab8',marginLeft:6}}>{it.color}</span>}
                      </div>
                    </div>
                  ))}
                  {(!selected.items||selected.items.length===0) && (
                    <div style={{padding:20,textAlign:'center',color:'#7a9ab8',fontSize:13}}>Sin items</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',background:'#070c14'}}>
        <div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid rgba(26,143,227,0.2)',borderTopColor:'#1a8fe3',animation:'spin .7s linear infinite'}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <TrackContent/>
    </Suspense>
  )
}
