'use client'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SHARED_CSS, getThemeVars, Combo } from '@/components/shared'
import { ThemeContext } from '@/lib/theme-context'

type Tab = 'pedidos' | 'inventario' | 'ventas'

const ESTADOS = ['PENDIENTE_PAGO','PENDIENTE_CONFIRMACION','CONFIRMADO','EN_PREPARACION','POR_VALIDAR_SURTIDO','EN_REPARTO','LISTO_PARA_RECOGER','ENTREGA_FALLIDA','ENTREGADO','CANCELADO']

export default function ReportesPage() {
  const { dark } = useContext(ThemeContext)
  const tv       = getThemeVars(dark)
  const [tab, setTab] = useState<Tab>('pedidos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [estado, setEstado] = useState('')
  const [telefono, setTelefono] = useState('')
  const [soloStockBajo, setSoloStockBajo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  const buildParams = useCallback(() => {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta + 'T23:59:59')
    if (tab === 'pedidos') {
      if (estado) p.set('estado', estado)
      if (telefono) p.set('telefono', telefono)
    }
    if (tab === 'inventario' && soloStockBajo) p.set('soloStockBajo', 'true')
    return p
  }, [desde, hasta, estado, telefono, soloStockBajo, tab])

  const load = useCallback(async () => {
    setLoading(true)
    const endpoint = tab === 'pedidos' ? 'orders' : tab === 'inventario' ? 'inventory' : 'sales'
    const r = await fetch(`/api/admin/reports/${endpoint}?${buildParams()}`)
    setData(await r.json())
    setLoading(false)
  }, [tab, buildParams])

  useEffect(() => { load() }, [load])

  function exportXlsx() {
    const endpoint = tab === 'pedidos' ? 'orders' : tab === 'inventario' ? 'inventory' : 'sales'
    const params = buildParams()
    params.set('format', 'xlsx')
    window.open(`/api/admin/reports/${endpoint}?${params}`, '_blank')
  }

  const lbl: React.CSSProperties = { display:'block', fontSize:11, fontWeight:600, color:'var(--txt2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', background:'var(--bg4)', border:'1px solid var(--border)', borderRadius:8, color:'var(--txt)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ ...Object.fromEntries(Object.entries(tv)) as any }}>
      <style>{SHARED_CSS}</style>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'var(--txt)', margin:0 }}>Reportes</h1>
          <p style={{ fontSize:13, color:'var(--txt2)', marginTop:3 }}>Pedidos, inventario y ventas, exportables a Excel</p>
        </div>
        <button className="cbtn cbtn-primary" onClick={exportXlsx}>📊 Exportar a Excel</button>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {([['pedidos','📦 Pedidos'],['inventario','🗂️ Inventario'],['ventas','💰 Ventas']] as [Tab,string][]).map(([k,label]) => (
          <button key={k} className={tab===k ? 'cbtn cbtn-primary' : 'cbtn cbtn-secondary'} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      <div className="ccard" style={{ padding:'14px 16px', marginBottom:16, display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end' }}>
        <div style={{ minWidth:150 }}>
          <label style={lbl}>Desde</label>
          <input type="date" style={inp} value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div style={{ minWidth:150 }}>
          <label style={lbl}>Hasta</label>
          <input type="date" style={inp} value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        {tab === 'pedidos' && (
          <>
            <div style={{ minWidth:180 }}>
              <label style={lbl}>Estado</label>
              <Combo value={estado} onChange={setEstado} options={[{value:'',label:'Todos'}, ...ESTADOS.map(e=>({value:e,label:e.replace(/_/g,' ')}))]} />
            </div>
            <div style={{ minWidth:160 }}>
              <label style={lbl}>Teléfono</label>
              <input style={inp} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Buscar..." />
            </div>
          </>
        )}
        {tab === 'inventario' && (
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--txt2)', paddingBottom:9 }}>
            <input type="checkbox" checked={soloStockBajo} onChange={e => setSoloStockBajo(e.target.checked)} />
            Solo stock bajo
          </label>
        )}
        <button className="cbtn cbtn-secondary" onClick={load} disabled={loading}>{loading ? 'Cargando…' : '🔄 Aplicar'}</button>
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
          <div style={{ width:24, height:24, borderRadius:'50%', border:'2.5px solid var(--border)', borderTopColor:'var(--blue)', animation:'spin 0.7s linear infinite' }} />
        </div>
      ) : tab === 'pedidos' ? (
        <PedidosTab data={data} />
      ) : tab === 'inventario' ? (
        <InventarioTab data={data} />
      ) : (
        <VentasTab data={data} />
      )}
    </div>
  )
}

function PedidosTab({ data }: { data: any }) {
  const rows = data?.rows || []
  const t = data?.totales || { pedidos:0, piezas:0, monto:0 }
  return (
    <>
      <div style={{ display:'flex', gap:16, marginBottom:14, fontSize:13, color:'var(--txt2)' }}>
        <span><b style={{ color:'var(--txt)' }}>{t.pedidos}</b> pedidos</span>
        <span><b style={{ color:'var(--txt)' }}>{t.piezas}</b> piezas</span>
        <span><b style={{ color:'var(--txt)' }}>${t.monto.toLocaleString('es-MX')}</b> monto</span>
      </div>
      <div className="table-wrap">
        <table className="ctable rtable">
          <thead><tr><th>Pedido</th><th>Cliente/Tel</th><th>Tipo</th><th>Estado</th><th>Piezas</th><th>Monto</th><th>Fecha</th></tr></thead>
          <tbody>
            {rows.map((r:any) => (
              <tr key={r.id}>
                <td style={{ fontFamily:'monospace', fontSize:11 }}>#{(r.numero_pedido||r.id.slice(0,8)).toUpperCase()}</td>
                <td>{r.cliente_nombre || r.telefono}</td>
                <td>{r.tipo_case}</td>
                <td><span className="badge badge-blue">{r.estado.replace(/_/g,' ')}</span></td>
                <td>{r.total_piezas}</td>
                <td>{r.monto_total ? `$${Number(r.monto_total).toLocaleString('es-MX')}` : '—'}</td>
                <td style={{ fontSize:12, color:'var(--txt2)' }}>{new Date(r.creado_en).toLocaleDateString('es-MX')}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'var(--txt2)' }}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

function InventarioTab({ data }: { data: any }) {
  const stock = data?.stock || []
  const movimientos = data?.movimientos || []
  const umbral = data?.umbral ?? 10
  return (
    <>
      <div className="table-wrap" style={{ marginBottom:20 }}>
        <table className="ctable rtable">
          <thead><tr><th>Tipo</th><th>Modelo</th><th>Color</th><th>Stock</th><th>Ubicación</th></tr></thead>
          <tbody>
            {stock.map((r:any) => (
              <tr key={r.case_id}>
                <td>{r.tipo_case}</td><td>{r.modelo}</td><td>{r.color}</td>
                <td><span className={`badge ${r.stock===0?'badge-red':r.stock<=umbral?'badge-warn':'badge-ok'}`}>{r.stock}</span></td>
                <td>{r.ubicacion || '—'}</td>
              </tr>
            ))}
            {!stock.length && <tr><td colSpan={5} style={{ textAlign:'center', padding:32, color:'var(--txt2)' }}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize:14, fontWeight:700, color:'var(--txt)', margin:'0 0 10px' }}>Movimientos recientes</h3>
      <div className="table-wrap">
        <table className="ctable rtable">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Resultante</th><th>Motivo</th><th>Pedido</th><th>Por</th></tr></thead>
          <tbody>
            {movimientos.map((m:any) => (
              <tr key={m.id}>
                <td style={{ fontSize:12, color:'var(--txt2)' }}>{new Date(m.creado_en).toLocaleString('es-MX')}</td>
                <td><span className={`badge ${m.tipo==='SALIDA'?'badge-red':m.tipo==='ENTRADA'?'badge-ok':'badge-warn'}`}>{m.tipo}</span></td>
                <td>{m.modelo} {m.color}</td>
                <td>{m.cantidad}</td>
                <td>{m.stock_resultante}</td>
                <td style={{ fontSize:12 }}>{m.motivo || '—'}</td>
                <td style={{ fontFamily:'monospace', fontSize:11 }}>{m.numero_pedido ? `#${m.numero_pedido.toUpperCase()}` : '—'}</td>
                <td style={{ fontSize:12 }}>{m.realizado_por_nombre || 'Sistema'}</td>
              </tr>
            ))}
            {!movimientos.length && <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:'var(--txt2)' }}>Sin movimientos en el rango</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

function VentasTab({ data }: { data: any }) {
  if (!data) return null
  return (
    <>
      <div style={{ display:'flex', gap:16, marginBottom:18, fontSize:13, color:'var(--txt2)' }}>
        <span><b style={{ fontSize:18, color:'var(--txt)' }}>${Number(data.totalVentas).toLocaleString('es-MX')}</b> en ventas</span>
        <span><b style={{ fontSize:18, color:'var(--txt)' }}>{data.totalPedidos}</b> pedidos con monto</span>
      </div>
      <div className="dash-bottom" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className="ccard" style={{ padding:16 }}>
          <h3 style={{ fontSize:13, fontWeight:700, color:'var(--txt)', margin:'0 0 10px' }}>Top clientes</h3>
          {(data.topClientes||[]).map((c:any,i:number) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:12, borderTop:i>0?'1px solid var(--border)':'none' }}>
              <span>{c.cliente_nombre || c.telefono}</span>
              <b>${Number(c.total).toLocaleString('es-MX')}</b>
            </div>
          ))}
          {!data.topClientes?.length && <p style={{ fontSize:12, color:'var(--txt2)' }}>Sin datos</p>}
        </div>
        <div className="ccard" style={{ padding:16 }}>
          <h3 style={{ fontSize:13, fontWeight:700, color:'var(--txt)', margin:'0 0 10px' }}>Top modelos</h3>
          {(data.topModelos||[]).map((m:any,i:number) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:12, borderTop:i>0?'1px solid var(--border)':'none' }}>
              <span>{m.modelo} <span style={{ color:'var(--txt2)' }}>({m.tipo_case})</span></span>
              <b>{m.total_piezas} pzas</b>
            </div>
          ))}
          {!data.topModelos?.length && <p style={{ fontSize:12, color:'var(--txt2)' }}>Sin datos</p>}
        </div>
      </div>
    </>
  )
}
