'use client'
import { useEffect, useState, useCallback } from 'react'
import { LineChart, Line, Legend, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { X } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { SHARED_CSS, getThemeVars } from '@/components/shared'
import { ThemeContext } from '@/lib/theme-context'
import { labelEstado } from '@/lib/estados'
import { useContext } from 'react'
import Link from 'next/link'

// Color por significado: pendiente = warn, en curso = info, ok = confirmado,
// error = cancelado/fallido, final = neutro.
const ESTADO_TONE: Record<string,string> = {
  CONFIRMADO:'var(--ok)', PENDIENTE_CONFIRMACION:'var(--warn)', PENDIENTE_PAGO:'var(--warn)',
  PENDIENTE:'var(--warn)', POR_VALIDAR_SURTIDO:'var(--warn)',
  EN_PREPARACION:'var(--info)', EN_PROCESO:'var(--info)', EN_REPARTO:'var(--info)', LISTO_PARA_RECOGER:'var(--info)',
  ENTREGA_FALLIDA:'var(--err)', CANCELADO:'var(--err)',
  ENTREGADO:'var(--txt3)', COMPLETADO:'var(--txt3)',
}
const BADGE_CLASS: Record<string,string> = {
  CONFIRMADO:'badge-ok', PENDIENTE_CONFIRMACION:'badge-warn', PENDIENTE_PAGO:'badge-warn',
  PENDIENTE:'badge-warn', EN_PROCESO:'badge-blue', EN_PREPARACION:'badge-blue',
  POR_VALIDAR_SURTIDO:'badge-warn', EN_REPARTO:'badge-blue', LISTO_PARA_RECOGER:'badge-blue',
  ENTREGA_FALLIDA:'badge-red', ENTREGADO:'badge-purple',
  COMPLETADO:'badge-purple', CANCELADO:'badge-red',
}

type Periodo = 7 | 30

export default function DashboardPage() {
  const { dark }             = useContext(ThemeContext)
  const tv                   = getThemeVars(dark)
  const [data,setData]       = useState<any>(null)
  const [loading,setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>(7)
  const [diaDetalle, setDiaDetalle] = useState<string|null>(null)
  const [diaOrders, setDiaOrders]   = useState<any[]>([])
  const [loadingDia, setLoadingDia] = useState(false)

  const loadData = useCallback(async (p: Periodo) => {
    setLoading(true)
    fetch(`/api/dashboard?dias=${p}`).then(r=>r.json()).then(d=>{setData(d);setLoading(false)})
  }, [])

  useEffect(() => { loadData(periodo) }, [periodo])

  async function handleBarClick(entry: any) {
    if (!entry?.activePayload?.[0]?.payload?.rawFecha) return
    const fecha = entry.activePayload[0].payload.rawFecha
    setDiaDetalle(fecha)
    setLoadingDia(true)
    const desde = fecha
    const hasta = format(addDays(new Date(fecha+'T12:00:00'), 1), 'yyyy-MM-dd')
    const r = await fetch(`/api/orders?fecha_desde=${desde}&fecha_hasta=${hasta}&limit=20`)
    const d = await r.json()
    setDiaOrders(d.data || [])
    setLoadingDia(false)
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:64}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:'2px solid var(--border2)',borderTopColor:'var(--blue)',animation:'spin 0.7s linear infinite'}}/>
    </div>
  )

  const st     = data?.stats || {}
  const porDia = (data?.porDia||[]).map((d:any)=>{
    const dia = String(d.fecha).slice(0,10)
    return {
      rawFecha: dia,
      fecha: format(new Date(dia+'T12:00:00'),'dd MMM',{locale:es}),
      Pendientes: parseInt(d.pendientes),
      'En proceso': parseInt(d.en_proceso),
      Entregados: parseInt(d.entregados),
      Cancelados: parseInt(d.cancelados),
    }
  })

  const stats = [
    {label:'Pedidos hoy',     value:st.pedidos_hoy??0},
    {label:'Esta semana',     value:st.pedidos_semana??0},
    {label:'Confirmados',     value:st.pedidos_confirmados??0},
    {label:'Clientes únicos', value:st.clientes_unicos??0},
    {label:'Stock bajo',      value:data?.stockBajo??0, href:'/admin/catalog'},
    {label:'Ventas del mes',  value:`$${Number(data?.ventasMes??0).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0})}`, href:'/admin/reportes'},
  ]

  const byEstado: { estado:string; cantidad:number }[] = data?.byEstado || []
  const maxEstado = Math.max(1, ...byEstado.map(e => Number(e.cantidad)))

  return (
    <div className="page-anim" style={{...Object.fromEntries(Object.entries(tv)) as any}}>
      <style>{SHARED_CSS + `
        /* ── Stat grid ── */
        .dash-stats { display:grid; grid-template-columns:repeat(6,1fr); gap:16px; margin-bottom:24px; }
        @media(max-width:1300px){ .dash-stats{ grid-template-columns:repeat(3,1fr); } }
        @media(max-width:900px){ .dash-stats{ grid-template-columns:repeat(2,1fr); } }
        .dash-stat-link { text-decoration:none; display:block; }
        .dash-stat-link:hover .dash-stat { border-color:var(--border2); }
        .dash-stat-link:focus-visible { outline:2px solid var(--blue); outline-offset:2px; border-radius:12px; }

        /* ── Chart grid: gráfico principal ancho + lista angosta ── */
        .dash-charts { display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr); gap:16px; margin-bottom:16px; }
        @media(max-width:900px){ .dash-charts{ grid-template-columns:1fr; } }

        /* ── Bottom grid ── */
        .dash-bottom { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        @media(max-width:900px){ .dash-bottom{ grid-template-columns:1fr; } }

        /* ── Stat card ── */
        .dash-stat { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 20px; transition:border-color .15s var(--ease); }
        .dash-stat-lbl { font-size:13px; color:var(--txt2); }
        .dash-stat-val { font-size:28px; font-weight:600; letter-spacing:-.01em; color:var(--txt); line-height:1.1; margin-top:8px; font-variant-numeric:tabular-nums; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        @media(max-width:1400px){ .dash-stat-val { font-size:24px; } }

        .dash-h { font-size:14px; font-weight:500; color:var(--txt); }

        /* ── Periodo (segmentado) ── */
        .periodo-tab { padding:4px 12px; border-radius:6px; font-size:12px; font-weight:500; font-family:inherit; cursor:pointer; border:1px solid transparent; background:transparent; color:var(--txt2); transition:background-color .15s var(--ease), color .15s var(--ease); }
        .periodo-tab.active { background:var(--bg4); color:var(--txt); border-color:var(--border); }
        .periodo-tab:hover:not(.active) { background:var(--bg3); color:var(--txt); }
        .periodo-tab:focus-visible { outline:2px solid var(--blue); outline-offset:2px; }

        /* ── Filas de lista ── */
        .dash-row { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px 0; border-top:1px solid var(--border); }
        .dash-row:first-of-type { border-top:none; }
        .bar-track { height:4px; border-radius:2px; background:var(--bg4); }
        .bar-fill  { height:100%; border-radius:2px; }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen de actividad del sistema</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="dash-stats">
        {stats.map(s=>{
          const card = (
            <div className="dash-stat" key={s.label}>
              <div className="dash-stat-lbl">{s.label}</div>
              <div className="dash-stat-val">{s.value}</div>
            </div>
          )
          return s.href ? <Link key={s.label} href={s.href} className="dash-stat-link">{card}</Link> : card
        })}
      </div>

      {/* Charts */}
      <div className="dash-charts">
        <div className="ccard" style={{padding:24,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:8,flexWrap:'wrap'}}>
            <div className="dash-h">Pedidos por día y estado</div>
            <div style={{display:'flex',gap:4}}>
              {([7,30] as Periodo[]).map(p=>(
                <button key={p} className={`periodo-tab${periodo===p?' active':''}`} onClick={()=>{setPeriodo(p);setDiaDetalle(null)}}>
                  {p} días
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={porDia} onClick={handleBarClick} style={{cursor:'pointer'}}>
              <CartesianGrid stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="fecha" tick={{fill:'var(--txt3)',fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--txt3)',fontSize:12}} axisLine={false} tickLine={false} allowDecimals={false} width={28}/>
              <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:8,color:'var(--txt)',fontSize:13}}/>
              <Legend iconType="plainline" wrapperStyle={{fontSize:12}}/>
              <Line type="monotone" dataKey="Pendientes" stroke="var(--warn)" strokeWidth={1.5} dot={false} activeDot={{r:4}}/>
              <Line type="monotone" dataKey="En proceso" stroke="var(--blue)" strokeWidth={2.5} dot={false} activeDot={{r:5}}/>
              <Line type="monotone" dataKey="Entregados" stroke="var(--ok)" strokeWidth={1.5} dot={false} activeDot={{r:4}}/>
              <Line type="monotone" dataKey="Cancelados" stroke="var(--err)" strokeWidth={1.5} dot={false} activeDot={{r:4}}/>
            </LineChart>
          </ResponsiveContainer>
          <p style={{fontSize:12,color:'var(--txt3)',marginTop:8}}>Haz clic en un punto de la gráfica para listar los pedidos de ese día</p>

          {/* Día detalle */}
          {diaDetalle && (
            <div style={{marginTop:16,borderTop:'1px solid var(--border)',paddingTop:16}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <span className="dash-h">
                  {format(new Date(diaDetalle+'T12:00:00'),"dd 'de' MMMM",{locale:es})} · {diaOrders.length} pedido{diaOrders.length!==1?'s':''}
                </span>
                <button className="icon-btn" aria-label="Cerrar" onClick={()=>setDiaDetalle(null)} style={{width:28,height:28}}><X size={16} strokeWidth={1.5}/></button>
              </div>
              {loadingDia ? (
                <div style={{display:'flex',justifyContent:'center',padding:16}}>
                  <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid var(--border2)',borderTopColor:'var(--blue)',animation:'spin 0.7s linear infinite'}}/>
                </div>
              ) : diaOrders.length === 0 ? (
                <div style={{fontSize:13,color:'var(--txt3)',textAlign:'center',padding:8}}>Sin pedidos ese día</div>
              ) : (
                <div style={{maxHeight:240,overflowY:'auto'}}>
                  {diaOrders.map((p:any)=>(
                    <div key={p.id} className="dash-row">
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{fontSize:13,fontWeight:500,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.cliente_nombre||p.telefono}</div>
                        <div className="mono" style={{fontSize:12,color:'var(--txt3)'}}>#{p.id.slice(0,8).toUpperCase()}</div>
                      </div>
                      <span className={`badge ${BADGE_CLASS[p.estado]||'badge-warn'}`} style={{flexShrink:0}}>
                        {labelEstado(p.estado)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ccard" style={{padding:24,minWidth:0}}>
          <div className="dash-h" style={{marginBottom:16}}>Por estado</div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {byEstado.map((e)=>{
              const n = Number(e.cantidad)
              return (
                <div key={e.estado}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,fontSize:13,marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
                      <span style={{width:8,height:8,borderRadius:'50%',background:ESTADO_TONE[e.estado]||'var(--txt3)',flexShrink:0}}/>
                      <span style={{color:'var(--txt2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{labelEstado(e.estado)}</span>
                    </div>
                    <span className="num" style={{fontWeight:500,color:'var(--txt)'}}>{n}</span>
                  </div>
                  <div className="bar-track"><div className="bar-fill" style={{width:`${(n/maxEstado)*100}%`,background:n===maxEstado?'var(--blue)':'var(--txt3)'}}/></div>
                </div>
              )
            })}
            {!byEstado.length && <p style={{fontSize:13,color:'var(--txt3)'}}>Sin pedidos aún</p>}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="dash-bottom">
        <div className="ccard" style={{padding:24,minWidth:0}}>
          <div className="dash-h" style={{marginBottom:8}}>Últimos pedidos</div>
          {(data?.ultimosPedidos||[]).map((p:any)=>(
            <div key={p.id} className="dash-row">
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.cliente_nombre||p.telefono}</div>
                <div className="num" style={{fontSize:12,color:'var(--txt3)',marginTop:2}}>{format(new Date(p.creado_en),'dd MMM · HH:mm',{locale:es})}</div>
              </div>
              <span className={`badge ${BADGE_CLASS[p.estado]||'badge-warn'}`} style={{flexShrink:0}}>
                {labelEstado(p.estado)}
              </span>
            </div>
          ))}
          {!data?.ultimosPedidos?.length && <p style={{fontSize:13,color:'var(--txt3)'}}>Sin pedidos aún</p>}
        </div>

        <div className="ccard" style={{padding:24,minWidth:0}}>
          <div className="dash-h" style={{marginBottom:16}}>Top modelos, últimos 30 días</div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {(data?.topModelos||[]).map((m:any,i:number)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:16}}>
                <span className="num" style={{fontSize:12,width:16,textAlign:'right',color:'var(--txt3)',flexShrink:0}}>{i+1}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,gap:8}}>
                    <span style={{fontSize:13,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.modelo}</span>
                    <span className="num" style={{fontSize:13,color:'var(--txt2)',flexShrink:0}}>{m.total} pzas</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{background:i===0?'var(--blue)':'var(--txt3)',width:`${Math.min(100,(m.total/(data.topModelos[0]?.total||1))*100)}%`}}/>
                  </div>
                </div>
              </div>
            ))}
            {!data?.topModelos?.length && <p style={{fontSize:13,color:'var(--txt3)'}}>Sin datos aún</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
