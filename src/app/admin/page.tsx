'use client'
import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { SHARED_CSS, getThemeVars } from '@/components/shared'
import { ThemeContext } from '@/lib/theme-context'
import { useContext } from 'react'
import Link from 'next/link'

const ESTADO_COLORS: Record<string,string> = {
  CONFIRMADO:'#22c55e', PENDIENTE_CONFIRMACION:'#f59e0b',
  EN_PROCESO:'#1a8fe3', COMPLETADO:'#818cf8',
  CANCELADO:'#ef4444',  PENDIENTE:'#6b7280',
}
const BADGE_CLASS: Record<string,string> = {
  CONFIRMADO:'badge-ok', PENDIENTE_CONFIRMACION:'badge-warn',
  PENDIENTE:'badge-warn', EN_PROCESO:'badge-blue',
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
    const hasta = format(addDays(new Date(fecha), 1), 'yyyy-MM-dd')
    const r = await fetch(`/api/orders?fecha_desde=${desde}&fecha_hasta=${hasta}&limit=20`)
    const d = await r.json()
    setDiaOrders(d.data || [])
    setLoadingDia(false)
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:64}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid rgba(26,143,227,0.2)',borderTopColor:'var(--blue)',animation:'spin 0.7s linear infinite'}}/>
    </div>
  )

  const st     = data?.stats || {}
  const porDia = (data?.porDia||[]).map((d:any)=>({
    rawFecha: d.fecha,
    fecha: format(new Date(d.fecha),'dd MMM',{locale:es}),
    pedidos: parseInt(d.pedidos),
  }))

  const stats = [
    {label:'Pedidos hoy',     value:st.pedidos_hoy??0,        icon:'📅', color:'#1a8fe3'},
    {label:'Esta semana',     value:st.pedidos_semana??0,      icon:'📆', color:'#818cf8'},
    {label:'Confirmados',     value:st.pedidos_confirmados??0, icon:'✅', color:'#22c55e'},
    {label:'Clientes únicos', value:st.clientes_unicos??0,     icon:'👥', color:'#f59e0b'},
    {label:'Stock bajo',      value:data?.stockBajo??0,        icon:'⚠️', color:'#ef4444', href:'/admin/catalog'},
    {label:'Ventas (mes)',    value:`$${Number(data?.ventasMes??0).toLocaleString('es-MX',{minimumFractionDigits:0})}`, icon:'💰', color:'#22c55e', href:'/admin/reportes'},
  ]

  return (
    <div className="page-anim" style={{...Object.fromEntries(Object.entries(tv)) as any}}>
      <style>{SHARED_CSS + `
        @keyframes spin{to{transform:rotate(360deg)}}

        /* ── Stat grid ── */
        .dash-stats { display:grid; grid-template-columns:repeat(6,1fr); gap:14px; margin-bottom:18px; }
        @media(max-width:1300px){ .dash-stats{ grid-template-columns:repeat(3,1fr); } }
        @media(max-width:900px){ .dash-stats{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:400px){ .dash-stats{ grid-template-columns:1fr 1fr; gap:10px; } }
        .dash-stat-link { text-decoration:none; display:block; }

        /* ── Chart grid ── */
        .dash-charts { display:grid; grid-template-columns:1fr 300px; gap:14px; margin-bottom:14px; }
        @media(max-width:700px){ .dash-charts{ grid-template-columns:1fr; } }

        /* ── Bottom grid ── */
        .dash-bottom { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media(max-width:700px){ .dash-bottom{ grid-template-columns:1fr; } }

        /* ── Stat card ── */
        .dash-stat {
          background:var(--bg2); border:1px solid var(--border);
          border-radius:14px; padding:16px 18px;
        }
        .dash-stat-val { font-family:Syne,sans-serif; font-size:30px; font-weight:800; color:var(--txt); line-height:1; }
        @media(max-width:400px){
          .dash-stat { padding:12px 14px; }
          .dash-stat-val { font-size:24px; }
        }

        /* ── Periodo tabs ── */
        .periodo-tab { padding:5px 14px; border-radius:8px; font-size:12px; font-weight:600; font-family:inherit; cursor:pointer; border:1px solid var(--border); background:transparent; color:var(--txt2); transition:all .15s; }
        .periodo-tab.active { background:var(--blue); color:#fff; border-color:var(--blue); }
        .periodo-tab:hover:not(.active) { background:var(--bg4); color:var(--txt); }

        /* ── Bar hover ── */
        .recharts-bar-rectangle { cursor: pointer; }
      `}</style>

      {/* Header */}
      <div style={{marginBottom:22}}>
        <h1 style={{fontFamily:'Syne,system-ui,sans-serif',fontSize:24,fontWeight:700,color:'var(--txt)',margin:0}}>Dashboard</h1>
        <p style={{fontSize:13,color:'var(--txt2)',marginTop:3}}>Resumen de actividad del sistema</p>
      </div>

      {/* Stat cards */}
      <div className="dash-stats">
        {stats.map(s=>{
          const card = (
            <div className="dash-stat" key={s.label}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                <div style={{minWidth:0}}>
                  <div className="dash-stat-val">{s.value}</div>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em',marginTop:5,lineHeight:1.3}}>{s.label}</div>
                </div>
                <div style={{width:38,height:38,borderRadius:10,background:s.color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                  {s.icon}
                </div>
              </div>
            </div>
          )
          return s.href ? <Link key={s.label} href={s.href} className="dash-stat-link">{card}</Link> : card
        })}
      </div>

      {/* Charts */}
      <div className="dash-charts">
        <div className="ccard" style={{padding:20,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:8,flexWrap:'wrap'}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.08em'}}>
              Pedidos por día
            </div>
            <div style={{display:'flex',gap:6}}>
              {([7,30] as Periodo[]).map(p=>(
                <button key={p} className={`periodo-tab${periodo===p?' active':''}`} onClick={()=>{setPeriodo(p);setDiaDetalle(null)}}>
                  {p} días
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={porDia} barSize={periodo===7?24:12} onClick={handleBarClick}>
              <XAxis dataKey="fecha" tick={{fill:'var(--txt2)',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--txt2)',fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false} width={24}/>
              <Tooltip contentStyle={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--txt)',fontSize:12}} cursor={{fill:'rgba(26,143,227,0.06)'}}/>
              <Bar dataKey="pedidos" fill="var(--blue3)" radius={[5,5,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
          <p style={{fontSize:10,color:'var(--txt3)',marginTop:8}}>Haz clic en una barra para ver los pedidos de ese día.</p>

          {/* Día detalle */}
          {diaDetalle && (
            <div style={{marginTop:14,borderTop:'1px solid var(--border)',paddingTop:14}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <span style={{fontSize:11,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.07em'}}>
                  {format(new Date(diaDetalle),"dd 'de' MMMM",{locale:es})} — {diaOrders.length} pedido{diaOrders.length!==1?'s':''}
                </span>
                <button onClick={()=>setDiaDetalle(null)} style={{background:'none',border:'none',color:'var(--txt3)',cursor:'pointer',fontSize:14}}>✕</button>
              </div>
              {loadingDia ? (
                <div style={{display:'flex',justifyContent:'center',padding:16}}>
                  <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid rgba(26,143,227,0.2)',borderTopColor:'var(--blue)',animation:'spin 0.7s linear infinite'}}/>
                </div>
              ) : diaOrders.length === 0 ? (
                <div style={{fontSize:12,color:'var(--txt3)',textAlign:'center',padding:8}}>Sin pedidos ese día</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:0,maxHeight:220,overflowY:'auto'}}>
                  {diaOrders.map((p:any,i:number)=>(
                    <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderTop:i>0?'1px solid var(--border)':'none',gap:8}}>
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{fontSize:12,fontWeight:500,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.cliente_nombre||p.telefono}</div>
                        <div style={{fontSize:10,color:'var(--txt3)',fontFamily:'monospace'}}>#{p.id.slice(0,8).toUpperCase()}</div>
                      </div>
                      <span className={`badge ${BADGE_CLASS[p.estado]||'badge-warn'}`} style={{fontSize:10,flexShrink:0}}>
                        {p.estado.replace(/_CONFIRMACION/,'').replace(/_/g,' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ccard" style={{padding:20,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>Por estado</div>
          <ResponsiveContainer width="100%" height={110}>
            <PieChart>
              <Pie data={data?.byEstado||[]} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" outerRadius={48} innerRadius={24}>
                {(data?.byEstado||[]).map((e:any,i:number)=>(
                  <Cell key={i} fill={ESTADO_COLORS[e.estado]||'#6b7280'}/>
                ))}
              </Pie>
              <Tooltip contentStyle={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:'flex',flexDirection:'column',gap:5,marginTop:8}}>
            {(data?.byEstado||[]).map((e:any)=>(
              <div key={e.estado} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:11}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:ESTADO_COLORS[e.estado],flexShrink:0}}/>
                  <span style={{color:'var(--txt2)'}}>{e.estado.replace(/_/g,' ')}</span>
                </div>
                <span style={{fontWeight:600,color:'var(--txt)'}}>{e.cantidad}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="dash-bottom">
        <div className="ccard" style={{padding:20,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Últimos pedidos</div>
          {(data?.ultimosPedidos||[]).map((p:any,i:number)=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderTop:i>0?'1px solid var(--border)':'none',gap:8}}>
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.cliente_nombre||p.telefono}</div>
                <div style={{fontSize:11,color:'var(--txt2)',marginTop:2}}>{format(new Date(p.creado_en),'dd MMM · HH:mm',{locale:es})}</div>
              </div>
              <span className={`badge ${BADGE_CLASS[p.estado]||'badge-warn'}`} style={{flexShrink:0}}>
                {p.estado.replace(/_CONFIRMACION/,'').replace(/_/g,' ')}
              </span>
            </div>
          ))}
          {!data?.ultimosPedidos?.length && <p style={{fontSize:12,color:'var(--txt2)'}}>Sin pedidos aún</p>}
        </div>

        <div className="ccard" style={{padding:20,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Top modelos (30 días)</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {(data?.topModelos||[]).map((m:any,i:number)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:11,width:18,textAlign:'center',fontWeight:700,color:'var(--txt3)',flexShrink:0}}>{i+1}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,gap:8}}>
                    <span style={{fontSize:12,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.modelo}</span>
                    <span style={{fontSize:11,color:'var(--txt2)',flexShrink:0}}>{m.total} pzas</span>
                  </div>
                  <div style={{height:3,borderRadius:2,background:'var(--bg4)'}}>
                    <div style={{height:'100%',borderRadius:2,background:'linear-gradient(90deg,var(--blue2),var(--blue))',width:`${Math.min(100,(m.total/(data.topModelos[0]?.total||1))*100)}%`}}/>
                  </div>
                </div>
              </div>
            ))}
            {!data?.topModelos?.length && <p style={{fontSize:12,color:'var(--txt2)'}}>Sin datos aún</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
