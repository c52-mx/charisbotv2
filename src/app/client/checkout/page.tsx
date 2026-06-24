'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface CartItem {
  _id?: string; tipo_case: string; marca: string
  modelo: string; color: string; cantidad: number
}

const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }

  .input-field {
    width:100%; padding:10px 14px; background:var(--field-bg);
    border:1.5px solid var(--field-border); border-radius:9px;
    color:var(--txt); font-size:14px; font-family:inherit;
    outline:none; transition:all .18s; box-sizing:border-box;
  }
  .input-field:focus { border-color:var(--blue); background:white; box-shadow:0 0 0 3px rgba(21,101,192,0.1); }
  .input-field::placeholder { color:var(--txt3); }

  .field-label { font-size:11px; font-weight:700; color:var(--txt2); letter-spacing:.06em; margin-bottom:5px; display:block; }

  .section-card { background:white; border-radius:14px; border:1px solid var(--border); padding:20px; margin-bottom:16px; }
  .section-title { font-family:Arial Black,sans-serif; font-weight:900; font-size:15px; color:var(--txt); margin-bottom:16px; display:flex; align-items:center; gap:8px; }

  .payment-option {
    display:flex; align-items:flex-start; gap:12px; padding:14px 16px;
    border:2px solid var(--border); border-radius:10px; cursor:pointer;
    transition:all .18s; margin-bottom:8px;
  }
  .payment-option:hover { border-color:var(--blue2); }
  .payment-option.selected { border-color:var(--blue); background:#f0f6ff; }

  .status-badge {
    display:inline-flex; align-items:center; gap:5px;
    padding:4px 12px; border-radius:100px; font-size:11px; font-weight:700;
  }
`

const STEPS = ['Resumen', 'Entrega', 'Pago', 'Confirmar']

export default function CheckoutPage() {
  const router = useRouter()
  const [cart,    setCart]    = useState<CartItem[]>([])
  const [step,    setStep]    = useState(0)
  const [config,  setConfig]  = useState<any>({})
  const [placing, setPlacing] = useState(false)
  const [error,   setError]   = useState('')
  const [orderId, setOrderId] = useState('')

  const [entrega, setEntrega] = useState({
    nombre: '', telefono: '', calle: '', colonia: '',
    ciudad: '', estado_mx: '', cp: '', referencias: '',
  })
  const [pago, setPago] = useState({
    metodo: 'transferencia',
    referencia: '',
    comprobante: '',
  })

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem('charis-cart') || '[]')
      if (!c.length) { router.push('/client/catalog'); return }
      setCart(c)
    } catch { router.push('/client/catalog') }

    fetch('/api/client/config').then(r => r.json()).then(d => setConfig(d))
  }, [])

  const totalPiezas = cart.reduce((s, i) => s + i.cantidad, 0)
  const minimoOk    = totalPiezas >= (parseInt(config.minimo_pedido_piezas) || 1)

  const setE = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) =>
    setEntrega(f => ({ ...f, [k]: e.target.value }))

  async function handleConfirm() {
    setPlacing(true); setError('')
    try {
      const res = await fetch('/api/client/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          metodo_pago: pago.metodo,
          referencia_pago: pago.referencia,
          direccion_entrega: entrega,
          notas_cliente: entrega.referencias,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear el pedido')
      localStorage.removeItem('charis-cart')
      window.dispatchEvent(new CustomEvent('charis-cart-updated'))
      setOrderId(data.id || data.pedido_id || '')
      setStep(4)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setPlacing(false)
    }
  }

  // ── Success screen ──
  if (step === 4) return (
    <div style={{ maxWidth:560, margin:'40px auto', textAlign:'center', animation:'fadeUp .4s ease-out' }}>
      <style>{CSS}</style>
      <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
      <h1 style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:24, color:'var(--txt)', marginBottom:8 }}>
        ¡Pedido recibido!
      </h1>
      <p style={{ fontSize:14, color:'var(--txt2)', marginBottom:24, lineHeight:1.6 }}>
        Tu pedido fue registrado correctamente. Te notificaremos cuando sea confirmado.
      </p>
      <div style={{ background:'#f0f6ff', borderRadius:12, padding:'16px 20px', marginBottom:24, border:'1.5px solid #d0e4f7' }}>
        <p style={{ fontSize:12, color:'var(--txt3)', marginBottom:4 }}>NÚMERO DE PEDIDO</p>
        <p style={{ fontFamily:'monospace', fontWeight:700, fontSize:16, color:'var(--blue)' }}>
          #{orderId.slice(0,8).toUpperCase()}
        </p>
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
        <Link href="/client/orders" className="btn-primary">
          Ver mis pedidos →
        </Link>
        <Link href="/client" className="btn-ghost">
          Volver al inicio
        </Link>
      </div>
    </div>
  )

  return (
    <>
      <style>{CSS}</style>

      {/* Steps indicator */}
      <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:28, maxWidth:600, margin:'0 auto 28px' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : 'none' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{ width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, background: i < step ? 'var(--ok)' : i === step ? 'var(--blue)' : 'var(--border)', color: i <= step ? 'white' : 'var(--txt3)', transition:'all .3s' }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize:10, fontWeight:600, color: i === step ? 'var(--blue)' : 'var(--txt3)', whiteSpace:'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length-1 && <div style={{ flex:1, height:2, background: i < step ? 'var(--ok)' : 'var(--border)', margin:'0 6px', marginBottom:16, transition:'background .3s' }}/>}
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, alignItems:'start', maxWidth:960, margin:'0 auto', animation:'fadeUp .3s ease-out' }}>

        {/* Main content */}
        <div>
          {error && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--err-bg)', color:'var(--err-text)', border:'1px solid var(--err-border)', fontSize:13, marginBottom:16 }}>⚠ {error}</div>
          )}

          {/* STEP 0: Resumen */}
          {step === 0 && (
            <div className="section-card">
              <p className="section-title">🛒 Resumen del pedido</p>
              {!minimoOk && (
                <div style={{ padding:'10px 14px', borderRadius:10, background:'#fef3c7', color:'#92400e', border:'1px solid #fde68a', fontSize:13, marginBottom:14 }}>
                  ⚠ Mínimo de pedido: {config.minimo_pedido_piezas} piezas. Actualmente tienes {totalPiezas}.
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {cart.map((item, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'var(--field-bg)', borderRadius:9, fontSize:13 }}>
                    <div>
                      <span style={{ fontWeight:700, color:'var(--txt)' }}>{item.modelo}</span>
                      <span style={{ color:'var(--txt3)', marginLeft:8 }}>{item.tipo_case} · {item.color}</span>
                    </div>
                    <span style={{ fontWeight:700, color:'var(--blue)' }}>{item.cantidad} pzas</span>
                  </div>
                ))}
              </div>
              {config.politica_cancelacion && (
                <div style={{ marginTop:14, padding:'10px 14px', borderRadius:9, background:'var(--field-bg)', fontSize:12, color:'var(--txt3)', lineHeight:1.6 }}>
                  ℹ️ {config.politica_cancelacion}
                </div>
              )}
            </div>
          )}

          {/* STEP 1: Entrega */}
          {step === 1 && (
            <div className="section-card">
              <p className="section-title">📦 Datos de entrega</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label className="field-label">NOMBRE COMPLETO *</label>
                    <input className="input-field" placeholder="Quien recibe" value={entrega.nombre} onChange={setE('nombre')} required/>
                  </div>
                  <div>
                    <label className="field-label">TELÉFONO *</label>
                    <input className="input-field" placeholder="55 1234 5678" value={entrega.telefono} onChange={setE('telefono')} required/>
                  </div>
                </div>
                <div>
                  <label className="field-label">CALLE Y NÚMERO *</label>
                  <input className="input-field" placeholder="Av. Ejemplo 123, Int. 4" value={entrega.calle} onChange={setE('calle')} required/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label className="field-label">COLONIA *</label>
                    <input className="input-field" placeholder="Col. Centro" value={entrega.colonia} onChange={setE('colonia')} required/>
                  </div>
                  <div>
                    <label className="field-label">CIUDAD *</label>
                    <input className="input-field" placeholder="Ciudad de México" value={entrega.ciudad} onChange={setE('ciudad')} required/>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label className="field-label">ESTADO *</label>
                    <input className="input-field" placeholder="CDMX" value={entrega.estado_mx} onChange={setE('estado_mx')} required/>
                  </div>
                  <div>
                    <label className="field-label">CÓDIGO POSTAL *</label>
                    <input className="input-field" placeholder="06600" value={entrega.cp} onChange={setE('cp')} required/>
                  </div>
                </div>
                <div>
                  <label className="field-label">REFERENCIAS <span style={{ color:'var(--txt3)', fontWeight:400, textTransform:'none' }}>(opcional)</span></label>
                  <textarea className="input-field" placeholder="Entre calles, color de fachada, etc." value={entrega.referencias} onChange={setE('referencias')} rows={2} style={{ resize:'vertical' }}/>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Pago */}
          {step === 2 && (
            <div className="section-card">
              <p className="section-title">💳 Método de pago</p>

              <div className={`payment-option${pago.metodo==='transferencia'?' selected':''}`}
                   onClick={() => setPago(p => ({...p, metodo:'transferencia'}))}>
                <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${pago.metodo==='transferencia'?'var(--blue)':'var(--field-border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                  {pago.metodo==='transferencia' && <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--blue)' }}/>}
                </div>
                <div>
                  <p style={{ fontWeight:700, fontSize:14, color:'var(--txt)', marginBottom:3 }}>🏦 Transferencia bancaria</p>
                  <p style={{ fontSize:12, color:'var(--txt3)' }}>Realiza la transferencia y sube tu comprobante</p>
                </div>
              </div>

              {pago.metodo === 'transferencia' && config.datos_transferencia && (
                <div style={{ background:'#f0f6ff', borderRadius:10, padding:'14px 16px', margin:'12px 0', border:'1px solid #d0e4f7' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--blue)', letterSpacing:'.06em', marginBottom:8 }}>DATOS BANCARIOS</p>
                  <pre style={{ fontSize:13, color:'var(--txt)', fontFamily:'monospace', margin:0, whiteSpace:'pre-wrap', lineHeight:1.7 }}>
                    {config.datos_transferencia}
                  </pre>
                </div>
              )}

              <div style={{ marginTop:14 }}>
                <label className="field-label">REFERENCIA O NÚMERO DE OPERACIÓN</label>
                <input className="input-field" placeholder="Ej: 123456789" value={pago.referencia} onChange={e => setPago(p => ({...p, referencia: e.target.value}))}/>
              </div>

              <div style={{ marginTop:12 }}>
                <label className="field-label">URL DEL COMPROBANTE <span style={{ color:'var(--txt3)', fontWeight:400, textTransform:'none' }}>(opcional — puedes enviarlo después)</span></label>
                <input className="input-field" placeholder="https://... o deja vacío para enviar después" value={pago.comprobante} onChange={e => setPago(p => ({...p, comprobante: e.target.value}))}/>
                <p style={{ fontSize:11, color:'var(--txt3)', marginTop:4 }}>
                  También puedes enviar el comprobante por WhatsApp al {config.whatsapp_soporte || 'nuestro número de soporte'}.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Confirmar */}
          {step === 3 && (
            <div className="section-card">
              <p className="section-title">✅ Confirmar pedido</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                <div style={{ padding:'12px 14px', background:'var(--field-bg)', borderRadius:9 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--txt3)', letterSpacing:'.06em', marginBottom:4 }}>ENTREGA</p>
                  <p style={{ fontSize:13, color:'var(--txt)' }}>{entrega.nombre} · {entrega.telefono}</p>
                  <p style={{ fontSize:12, color:'var(--txt2)' }}>{entrega.calle}, {entrega.colonia}, {entrega.ciudad} {entrega.cp}</p>
                </div>
                <div style={{ padding:'12px 14px', background:'var(--field-bg)', borderRadius:9 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--txt3)', letterSpacing:'.06em', marginBottom:4 }}>PAGO</p>
                  <p style={{ fontSize:13, color:'var(--txt)' }}>Transferencia bancaria</p>
                  {pago.referencia && <p style={{ fontSize:12, color:'var(--txt2)' }}>Ref: {pago.referencia}</p>}
                </div>
                <div style={{ padding:'12px 14px', background:'var(--field-bg)', borderRadius:9 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--txt3)', letterSpacing:'.06em', marginBottom:4 }}>PEDIDO</p>
                  <p style={{ fontSize:13, color:'var(--txt)' }}>{cart.length} artículos · {totalPiezas} piezas totales</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display:'flex', gap:10, justifyContent:'space-between', marginTop:8 }}>
            {step > 0
              ? <button className="btn-ghost" onClick={() => setStep(s => s-1)}>← Anterior</button>
              : <Link href="/client/cart" className="btn-ghost">← Carrito</Link>
            }
            {step < 3 ? (
              <button className="btn-primary"
                disabled={step === 0 && !minimoOk}
                onClick={() => setStep(s => s+1)}>
                Continuar →
              </button>
            ) : (
              <button className="btn-primary" disabled={placing} onClick={handleConfirm}>
                {placing
                  ? <><div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', animation:'spin .7s linear infinite' }}/> Procesando...</>
                  : '✓ Confirmar pedido'
                }
              </button>
            )}
          </div>
        </div>

        {/* Order summary sidebar */}
        <div style={{ background:'white', borderRadius:14, border:'1px solid var(--border)', padding:20, position:'sticky', top:80 }}>
          <h3 style={{ fontFamily:'Arial Black,sans-serif', fontWeight:900, fontSize:15, color:'var(--txt)', marginBottom:14 }}>
            Tu pedido
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14, maxHeight:200, overflowY:'auto' }}>
            {cart.map((item, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--txt2)' }}>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{item.modelo} · {item.color}</span>
                <span style={{ fontWeight:700, flexShrink:0, marginLeft:6 }}>{item.cantidad} pzas</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--bg)', paddingTop:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--txt)', fontWeight:700 }}>
              <span>Total piezas</span>
              <span style={{ color:'var(--blue)', fontSize:16 }}>{totalPiezas}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`@media(max-width:768px){
        .checkout-grid { grid-template-columns:1fr !important; }
      }`}</style>
    </>
  )
}
