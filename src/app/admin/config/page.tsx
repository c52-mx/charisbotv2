'use client'
import { useState, useEffect, useContext } from 'react'
import { SHARED_CSS, getThemeVars } from '@/components/shared'
import { ThemeContext } from '@/lib/theme-context'

interface ConfigForm {
  minimo_pedido_piezas: string
  politica_cancelacion: string
  datos_transferencia: string
  whatsapp_soporte: string
  tiempo_reserva_carrito_min: string
  tiempo_reserva_pago_min: string
  aviso_vencimiento_min: string
  tiempo_surtido_horas: string
  aviso_surtido_horas_antes: string
  pago_stripe_habilitado: string
  pago_mercadopago_habilitado: string
  pago_efectivo_habilitado: string
  pago_transferencia_habilitado: string
  instrucciones_efectivo: string
  stock_bajo_umbral: string
  venta_importante_piezas: string
  negocio_nombre: string
  negocio_direccion: string
}

const EMPTY: ConfigForm = {
  minimo_pedido_piezas: '1',
  politica_cancelacion: '',
  datos_transferencia: '',
  whatsapp_soporte: '',
  tiempo_reserva_carrito_min: '30',
  tiempo_reserva_pago_min: '1440',
  aviso_vencimiento_min: '120',
  tiempo_surtido_horas: '72',
  aviso_surtido_horas_antes: '24',
  pago_stripe_habilitado: 'false',
  pago_mercadopago_habilitado: 'false',
  pago_efectivo_habilitado: 'false',
  pago_transferencia_habilitado: 'true',
  instrucciones_efectivo: '',
  stock_bajo_umbral: '10',
  venta_importante_piezas: '100',
  negocio_nombre: '',
  negocio_direccion: '',
}

export default function ConfigPage() {
  const { dark }   = useContext(ThemeContext)
  const tv         = getThemeVars(dark)
  const [form,    setForm]    = useState<ConfigForm>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [pagosEnv, setPagosEnv] = useState({ stripe_configurado: false, mercadopago_configurado: false })
  const [puntos,       setPuntos]       = useState<{nombre:string; dir:string}[]>([])
  const [paqueterias,  setPaqueterias]  = useState<{nombre:string; dias_estimados:string; logo_url:string}[]>([])
  const [uploadingLogo, setUploadingLogo] = useState<number|null>(null)

  useEffect(() => {
    fetch('/api/admin/config').then(r => r.json()).then(d => {
      setForm(f => ({ ...f, ...(d.config || {}) }))
      setPagosEnv(d.pagos_env || { stripe_configurado: false, mercadopago_configurado: false })
      try {
        const ps = JSON.parse(d.config?.puntos_recoleccion || '[]')
        if (Array.isArray(ps) && ps.length > 0) setPuntos(ps)
      } catch {}
      try {
        const pqs = JSON.parse(d.config?.paqueterias || '[]')
        if (Array.isArray(pqs) && pqs.length > 0) setPaqueterias(pqs)
        else setPaqueterias([
          { nombre:'PAQUETEEXPRESS', dias_estimados:'2 a 3 días', logo_url:'' },
          { nombre:'FEDEX',          dias_estimados:'2 a 5 días', logo_url:'' },
          { nombre:'ESTAFETA',       dias_estimados:'2 a 5 días', logo_url:'' },
        ])
      } catch {}
      setLoading(false)
    })
  }, [])

  async function uploadLogo(idx: number, file: File) {
    setUploadingLogo(idx)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload/logo', { method:'POST', body: fd })
      const d = await res.json()
      if (d.url) setPaqueterias(ps => ps.map((p, i) => i===idx ? { ...p, logo_url: d.url } : p))
    } finally { setUploadingLogo(null) }
  }

  function set<K extends keyof ConfigForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function toggle(k: 'pago_stripe_habilitado' | 'pago_mercadopago_habilitado' | 'pago_efectivo_habilitado' | 'pago_transferencia_habilitado') {
    setForm(f => ({ ...f, [k]: f[k] === 'true' ? 'false' : 'true' }))
  }

  async function save() {
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, puntos_recoleccion: JSON.stringify(puntos), paqueterias: JSON.stringify(paqueterias) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      setMsg('✓ Configuración guardada correctamente')
      setTimeout(() => setMsg(''), 4500)
    } catch (e: any) {
      setMsg('⚠ ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const lbl: React.CSSProperties = { display:'block', fontSize:11, fontWeight:600, color:'var(--txt2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', background:'var(--bg4)', border:'1px solid var(--border)', borderRadius:8, color:'var(--txt)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }

  if (loading) return (
    <div style={{ ...Object.fromEntries(Object.entries(tv)) as any, display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
      <style>{SHARED_CSS}</style>
      <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid rgba(26,143,227,0.2)', borderTopColor:'var(--blue)', animation:'spin .7s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ ...Object.fromEntries(Object.entries(tv)) as any }}>
      <style>{SHARED_CSS}</style>

      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'var(--txt)', margin:0 }}>Configuración del portal</h1>
        <p style={{ fontSize:13, color:'var(--txt2)', marginTop:3 }}>Mínimo de pedido, política de cancelación, datos de transferencia y reservas de stock</p>
      </div>

      {msg && (
        <div style={{
          position:'fixed', bottom:24, right:24, zIndex:300,
          padding:'14px 20px', borderRadius:12, minWidth:260,
          background: msg.startsWith('✓') ? '#16a34a' : '#dc2626', color:'white',
          boxShadow:'0 10px 30px rgba(0,0,0,.25)', fontSize:14, fontWeight:600,
          display:'flex', alignItems:'center', gap:8,
        }}>
          {msg}
        </div>
      )}

      {/* ── Puntos de recolección (ilimitados) ── */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <h2 style={{ fontSize:15, fontWeight:700, color:'var(--txt)', margin:0 }}>🏢 Puntos de recolección</h2>
          <button type="button"
            onClick={() => setPuntos(p => [...p, { nombre:'', dir:'' }])}
            style={{ padding:'5px 12px', borderRadius:8, border:'1.5px solid var(--blue)', background:'transparent', color:'var(--blue)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Agregar punto
          </button>
        </div>
        <p style={{ fontSize:12, color:'var(--txt2)', margin:'0 0 14px' }}>
          Se muestran al cliente en el carrito al elegir "Recoger". Sin límite de puntos.
        </p>

        {puntos.length === 0 && (
          <p style={{ fontSize:13, color:'var(--txt3)', fontStyle:'italic' }}>Sin puntos configurados — haz clic en "+ Agregar punto"</p>
        )}

        {puntos.map((p, i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, marginBottom:8, alignItems:'flex-end' }}>
            <div>
              {i === 0 && <label style={lbl}>Nombre</label>}
              <input style={inp} placeholder="Ej: Plaza Teresa"
                value={p.nombre}
                onChange={e => setPuntos(ps => ps.map((x, j) => j===i ? {...x, nombre:e.target.value} : x))} />
            </div>
            <div>
              {i === 0 && <label style={lbl}>Dirección</label>}
              <input style={inp} placeholder="Calle, colonia, ciudad, CP"
                value={p.dir}
                onChange={e => setPuntos(ps => ps.map((x, j) => j===i ? {...x, dir:e.target.value} : x))} />
            </div>
            <button type="button"
              onClick={() => setPuntos(ps => ps.filter((_, j) => j !== i))}
              style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg4)', color:'var(--err)', cursor:'pointer', fontFamily:'inherit', fontSize:14, marginTop: i===0 ? 22 : 0 }}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ── Paqueterías ── */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <h2 style={{ fontSize:15, fontWeight:700, color:'var(--txt)', margin:0 }}>🚚 Paqueterías</h2>
          <button type="button"
            onClick={() => setPaqueterias(p => [...p, { nombre:'', dias_estimados:'', logo_url:'' }])}
            style={{ padding:'5px 12px', borderRadius:8, border:'1.5px solid var(--blue)', background:'transparent', color:'var(--blue)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Agregar
          </button>
        </div>
        <p style={{ fontSize:12, color:'var(--txt2)', margin:'0 0 14px' }}>
          Se muestran al cliente al elegir "Envío". El logo es opcional; sin logo se muestra un ícono genérico.
        </p>

        {paqueterias.length === 0 && (
          <p style={{ fontSize:13, color:'var(--txt3)', fontStyle:'italic' }}>Sin paqueterías configuradas — haz clic en "+ Agregar"</p>
        )}

        {paqueterias.map((p, i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto auto', gap:8, marginBottom:10, alignItems:'flex-end' }}>
            <div>
              {i === 0 && <label style={lbl}>Nombre</label>}
              <input style={inp} placeholder="Ej: ESTAFETA"
                value={p.nombre}
                onChange={e => setPaqueterias(ps => ps.map((x, j) => j===i ? {...x, nombre:e.target.value.toUpperCase()} : x))} />
            </div>
            <div>
              {i === 0 && <label style={lbl}>Días estimados</label>}
              <input style={inp} placeholder="Ej: 2 a 5 días"
                value={p.dias_estimados}
                onChange={e => setPaqueterias(ps => ps.map((x, j) => j===i ? {...x, dias_estimados:e.target.value} : x))} />
            </div>
            <div>
              {i === 0 && <label style={lbl}>Logo</label>}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {p.logo_url
                  ? <img src={p.logo_url} alt={p.nombre} style={{ height:32, borderRadius:6, border:'1px solid var(--border)', objectFit:'contain', background:'white', padding:2 }} />
                  : <span style={{ fontSize:22 }}>🚚</span>
                }
                <label style={{ cursor:'pointer', padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg3)', fontSize:11, fontWeight:600, color:'var(--txt2)', whiteSpace:'nowrap' }}
                  title="Formatos permitidos: PNG, JPG, WEBP, SVG">
                  {uploadingLogo === i ? 'Subiendo…' : 'Subir'}
                  <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" style={{ display:'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(i, f) }} />
                </label>
                <span style={{ fontSize:10, color:'var(--txt3)', whiteSpace:'nowrap' }}>PNG · JPG · WEBP · SVG</span>
                {p.logo_url && (
                  <button type="button" onClick={() => setPaqueterias(ps => ps.map((x, j) => j===i ? {...x, logo_url:''} : x))}
                    style={{ background:'none', border:'none', color:'var(--err)', cursor:'pointer', fontSize:12, padding:0 }}>✕</button>
                )}
              </div>
            </div>
            <button type="button"
              onClick={() => setPaqueterias(ps => ps.filter((_, j) => j !== i))}
              style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg4)', color:'var(--err)', cursor:'pointer', fontFamily:'inherit', fontSize:14, marginTop: i===0 ? 22 : 0 }}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ── Pedidos ── */}
      <div className="card" style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:15, fontWeight:700, color:'var(--txt)', margin:'0 0 14px' }}>🛒 Pedidos</h2>
        <div className="g2" style={{ marginBottom:12 }}>
          <div>
            <label style={lbl}>Mínimo de pedido (piezas)</label>
            <input type="number" min={1} style={inp} value={form.minimo_pedido_piezas} onChange={set('minimo_pedido_piezas')} />
          </div>
          <div>
            <label style={lbl}>WhatsApp de soporte</label>
            <input style={inp} placeholder="+52 55 1234 5678" value={form.whatsapp_soporte} onChange={set('whatsapp_soporte')} />
          </div>
        </div>
        <div>
          <label style={lbl}>Política de cancelación</label>
          <textarea style={{ ...inp, resize:'vertical' }} rows={3} value={form.politica_cancelacion} onChange={set('politica_cancelacion')} />
        </div>
      </div>

      {/* ── Reservas de stock ── */}
      <div className="card" style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:15, fontWeight:700, color:'var(--txt)', margin:'0 0 6px' }}>📦 Reserva de stock</h2>
        <p style={{ fontSize:12, color:'var(--txt2)', margin:'0 0 14px' }}>
          Tiempo que se aparta el inventario antes de liberarse automáticamente.
        </p>
        <div className="g2">
          <div>
            <label style={lbl}>Carrito sin finalizar (minutos)</label>
            <input type="number" min={1} style={inp} value={form.tiempo_reserva_carrito_min} onChange={set('tiempo_reserva_carrito_min')} />
          </div>
          <div>
            <label style={lbl}>Pedido sin pago (minutos)</label>
            <input type="number" min={1} style={inp} value={form.tiempo_reserva_pago_min} onChange={set('tiempo_reserva_pago_min')} />
          </div>
        </div>
        <div style={{ marginTop:12 }}>
          <label style={lbl}>Avisar antes de cancelar (minutos antes de vencer)</label>
          <input type="number" min={1} style={inp} value={form.aviso_vencimiento_min} onChange={set('aviso_vencimiento_min')} />
          <p style={{ fontSize:11, color:'var(--txt3)', marginTop:4 }}>
            Se manda un WhatsApp al cliente avisando que su reserva está por vencer, antes de cancelarse automáticamente.
          </p>
        </div>
        <div className="g2" style={{ marginTop:12 }}>
          <div>
            <label style={lbl}>Tiempo de surtido (horas)</label>
            <input type="number" min={1} style={inp} value={form.tiempo_surtido_horas} onChange={set('tiempo_surtido_horas')} />
          </div>
          <div>
            <label style={lbl}>Avisar antes de vencer surtido (horas)</label>
            <input type="number" min={1} style={inp} value={form.aviso_surtido_horas_antes} onChange={set('aviso_surtido_horas_antes')} />
          </div>
        </div>
        <p style={{ fontSize:11, color:'var(--txt3)', marginTop:4 }}>
          Si un pedido confirmado no avanza dentro de este tiempo, se manda un correo interno de atención antes de perder la venta.
        </p>
      </div>

      {/* ── Alertas ── */}
      <div className="card" style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:15, fontWeight:700, color:'var(--txt)', margin:'0 0 6px' }}>🔔 Alertas</h2>
        <p style={{ fontSize:12, color:'var(--txt2)', margin:'0 0 14px' }}>
          Aviso visual en el catálogo y por correo cuando se cruzan estos umbrales.
        </p>
        <div className="g2">
          <div>
            <label style={lbl}>Stock bajo (piezas)</label>
            <input type="number" min={0} style={inp} value={form.stock_bajo_umbral} onChange={set('stock_bajo_umbral')} />
          </div>
          <div>
            <label style={lbl}>Venta importante (piezas)</label>
            <input type="number" min={1} style={inp} value={form.venta_importante_piezas} onChange={set('venta_importante_piezas')} />
          </div>
        </div>
      </div>

      {/* ── Pasarelas de pago ── */}
      <div className="card" style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:15, fontWeight:700, color:'var(--txt)', margin:'0 0 6px' }}>💳 Métodos de pago</h2>
        <p style={{ fontSize:12, color:'var(--txt2)', margin:'0 0 14px' }}>
          Cada método se puede activar o desactivar de forma independiente. El cliente solo ve, al pagar, los que estén activos aquí.
        </p>

        <PagoToggle
          label="Efectivo"
          enabled={form.pago_efectivo_habilitado === 'true'}
          configurado={true}
          subtitle="Pago directo, sin pasarela externa — el cliente paga al recibir o entregar."
          onToggle={() => toggle('pago_efectivo_habilitado')}
        />
        <div style={{ marginTop:8, marginBottom:14 }}>
          <label style={lbl}>Instrucciones de pago en efectivo</label>
          <textarea style={{ ...inp, resize:'vertical' }} rows={3} value={form.instrucciones_efectivo} onChange={set('instrucciones_efectivo')}
            placeholder="Ej: Nuestro equipo de ventas se pondrá en contacto contigo para acordar el pago en efectivo." />
        </div>

        <PagoToggle
          label="Transferencia bancaria"
          enabled={form.pago_transferencia_habilitado === 'true'}
          configurado={true}
          subtitle="Pago directo, sin pasarela externa — el cliente sube su comprobante."
          onToggle={() => toggle('pago_transferencia_habilitado')}
        />
        <div style={{ marginTop:8, marginBottom:14 }}>
          <label style={lbl}>Datos de transferencia bancaria</label>
          <textarea style={{ ...inp, resize:'vertical', fontFamily:'monospace' }} rows={4} value={form.datos_transferencia} onChange={set('datos_transferencia')} />
        </div>

        <PagoToggle
          label="Stripe"
          enabled={form.pago_stripe_habilitado === 'true'}
          configurado={pagosEnv.stripe_configurado}
          onToggle={() => toggle('pago_stripe_habilitado')}
        />
        <div style={{ height:10 }} />
        <PagoToggle
          label="Mercado Pago"
          enabled={form.pago_mercadopago_habilitado === 'true'}
          configurado={pagosEnv.mercadopago_configurado}
          onToggle={() => toggle('pago_mercadopago_habilitado')}
        />
      </div>

      <DescuentosVolumen />

      <button className="cbtn cbtn-primary" onClick={save} disabled={saving}>
        {saving ? 'Guardando…' : '💾 Guardar configuración'}
      </button>
    </div>
  )
}

function PagoToggle({ label, enabled, configurado, subtitle, onToggle }: { label: string; enabled: boolean; configurado: boolean; subtitle?: string; onToggle: () => void }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:9, background:'var(--bg4)', border:'1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--txt)' }}>{label}</div>
        <div style={{ fontSize:11, color: subtitle ? 'var(--txt3)' : configurado ? '#34d399' : 'var(--txt3)', marginTop:2 }}>
          {subtitle ?? (configurado ? '✓ Credenciales detectadas en el servidor' : '⚠ Faltan variables de entorno — agrega las credenciales para habilitar')}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={!configurado}
        title={!configurado ? 'Agrega las credenciales en el servidor antes de activar' : undefined}
        style={{
          width:44, height:24, borderRadius:100, border:'none', cursor: configurado ? 'pointer' : 'not-allowed',
          background: enabled && configurado ? 'var(--blue)' : 'var(--border)',
          position:'relative', flexShrink:0, opacity: configurado ? 1 : 0.5, transition:'background .15s',
        }}
      >
        <span style={{
          position:'absolute', top:3, left: enabled && configurado ? 23 : 3,
          width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .15s',
        }} />
      </button>
    </div>
  )
}

function DescuentosVolumen() {
  const [items, setItems] = useState<{ id:string; piezas_minimas:number; porcentaje:number; activo:boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoPiezas, setNuevoPiezas] = useState('')
  const [nuevoPct, setNuevoPct] = useState('')
  const [error, setError] = useState('')

  function load() {
    fetch('/api/admin/descuentos').then(r => r.json()).then(d => { setItems(d.items || []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  async function addTier() {
    setError('')
    const res = await fetch('/api/admin/descuentos', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ piezas_minimas: nuevoPiezas, porcentaje: nuevoPct }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al agregar'); return }
    setNuevoPiezas(''); setNuevoPct('')
    load()
  }

  async function removeTier(id: string) {
    await fetch(`/api/admin/descuentos/${id}`, { method:'DELETE' })
    load()
  }

  const lbl: React.CSSProperties = { display:'block', fontSize:11, fontWeight:600, color:'var(--txt2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', background:'var(--bg4)', border:'1px solid var(--border)', borderRadius:8, color:'var(--txt)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }

  return (
    <div className="card" style={{ marginBottom:20 }}>
      <h2 style={{ fontSize:15, fontWeight:700, color:'var(--txt)', margin:'0 0 6px' }}>📦 Descuento por volumen</h2>
      <p style={{ fontSize:12, color:'var(--txt2)', margin:'0 0 14px' }}>
        A partir de cuántas piezas en el pedido se aplica cada porcentaje de descuento automático.
      </p>

      {loading ? (
        <p style={{ fontSize:13, color:'var(--txt2)' }}>Cargando…</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
          {items.map(it => (
            <div key={it.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:9, background:'var(--bg4)', border:'1px solid var(--border)' }}>
              <span style={{ fontSize:13, color:'var(--txt)' }}>{it.piezas_minimas}+ piezas → <strong>{it.porcentaje}%</strong></span>
              <button type="button" onClick={() => removeTier(it.id)} style={{ background:'transparent', border:'none', color:'#f87171', cursor:'pointer', fontSize:13 }}>Eliminar</button>
            </div>
          ))}
          {!items.length && <p style={{ fontSize:13, color:'var(--txt3)' }}>Sin franjas configuradas — no se aplicará ningún descuento.</p>}
        </div>
      )}

      {error && <p style={{ color:'#f87171', fontSize:12, marginBottom:10 }}>⚠ {error}</p>}

      <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
        <div style={{ flex:1 }}>
          <label style={lbl}>Piezas mínimas</label>
          <input type="number" min={1} style={inp} value={nuevoPiezas} onChange={e => setNuevoPiezas(e.target.value)} placeholder="50" />
        </div>
        <div style={{ flex:1 }}>
          <label style={lbl}>% Descuento</label>
          <input type="number" min={0} max={100} style={inp} value={nuevoPct} onChange={e => setNuevoPct(e.target.value)} placeholder="5" />
        </div>
        <button className="cbtn cbtn-secondary" onClick={addTier} disabled={!nuevoPiezas || !nuevoPct}>+ Agregar</button>
      </div>
    </div>
  )
}
