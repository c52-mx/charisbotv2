'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { SHARED_CSS, getThemeVars } from '@/components/shared'
import { ThemeContext } from '@/lib/theme-context'
import { useContext } from 'react'

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

export default function DashboardPage() {
  const { dark }         = useContext(ThemeContext)
  const tv               = getThemeVars(dark)
  const [data,setData]   = useState<any>(null)
  const [loading,setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard').then(r=>r.json()).then(d=>{setData(d);setLoading(false)})
  },[])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:64}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid rgba(26,143,227,0.2)',borderTopColor:'var(--blue)',animation:'spin 0.7s linear infinite'}}/>
    </div>
  )

  const st     = data?.stats || {}
  const porDia = (data?.porDia||[]).map((d:any)=>({
    fecha: format(new Date(d.fecha),'dd MMM',{locale:es}),
    pedidos: parseInt(d.pedidos),
  }))

  const stats = [
    {label:'Pedidos hoy',     value:st.pedidos_hoy??0,        icon:'📅', color:'#1a8fe3'},
    {label:'Esta semana',     value:st.pedidos_semana??0,      icon:'📆', color:'#818cf8'},
    {label:'Confirmados',     value:st.pedidos_confirmados??0, icon:'✅', color:'#22c55e'},
    {label:'Clientes únicos', value:st.clientes_unicos??0,     icon:'👥', color:'#f59e0b'},
  ]

  return (
    <div className="page-anim" style={{...Object.fromEntries(Object.entries(tv)) as any}}>
      <style>{SHARED_CSS + `
        @keyframes spin{to{transform:rotate(360deg)}}

        /* ── Stat grid ── */
        .dash-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:18px; }
        @media(max-width:900px){ .dash-stats{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:400px){ .dash-stats{ grid-template-columns:1fr 1fr; gap:10px; } }

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
      `}</style>

      {/* Header */}
      <div style={{marginBottom:22}}>
        <h1 style={{fontFamily:'Syne,system-ui,sans-serif',fontSize:24,fontWeight:700,color:'var(--txt)',margin:0}}>Dashboard</h1>
        <p style={{fontSize:13,color:'var(--txt2)',marginTop:3}}>Resumen de actividad del sistema</p>
      </div>

      {/* Stat cards */}
      <div className="dash-stats">
        {stats.map(s=>(
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
        ))}
      </div>

      {/* Charts */}
      <div className="dash-charts">
        <div className="ccard" style={{padding:20,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>Pedidos — últimos 7 días</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={porDia} barSize={24}>
              <XAxis dataKey="fecha" tick={{fill:'var(--txt2)',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--txt2)',fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false} width={24}/>
              <Tooltip contentStyle={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--txt)',fontSize:12}} cursor={{fill:'rgba(26,143,227,0.06)'}}/>
              <Bar dataKey="pedidos" fill="var(--blue3)" radius={[5,5,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
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
