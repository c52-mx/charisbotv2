'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ImageUploader, SHARED_CSS } from '@/components/shared'

const METODO_LABEL: Record<string,string> = {
  transferencia: 'Transferencia', efectivo: 'Efectivo', stripe: 'Tarjeta', mercadopago: 'Mercado Pago',
}

export default function RepartidorPedidoDetalle() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [pedido, setPedido] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accion, setAccion] = useState<'entregado'|'fallida'|null>(null)
  const [montoCobrado, setMontoCobrado] = useState('')
  const [motivo, setMotivo] = useState('')
  const [evidencias, setEvidencias] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/repartidor/pedidos/${id}`).then(r => r.json()).then(d => {
      setPedido(d); setEvidencias(d.evidencias || [])
      setMontoCobrado(d.monto_total != null ? String(d.monto_total) : '')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  async function confirmar() {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/repartidor/pedidos/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, monto_cobrado: montoCobrado || undefined, motivo }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Error')
      router.push('/repartidor')
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
      <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid rgba(26,143,227,0.2)', borderTopColor:'var(--blue)', animation:'spin .7s linear infinite' }} />
    </div>
  )
  if (!pedido) return <div style={{ textAlign:'center', padding:40, color:'var(--txt3)' }}>Pedido no encontrado</div>

  const dir = pedido.direccion_entrega || {}
  const mapsQuery = encodeURIComponent(`${dir.calle || ''}, ${dir.colonia || ''}, ${dir.ciudad || ''}, ${dir.estado_mx || ''}`)
  const items = pedido.items || []

  return (
    <div>
      <style>{SHARED_CSS}</style>
      <button className="cbtn cbtn-ghost" style={{ marginBottom:12 }} onClick={() => router.push('/repartidor')}>← Volver</button>

      <div className="ccard" style={{ padding:16, marginBottom:14 }}>
        <div style={{ fontFamily:'monospace', fontWeight:700, fontSize:14, color:'var(--txt)', marginBottom:8 }}>
          #{(pedido.numero_pedido || pedido.id.slice(0,8)).toUpperCase()}
        </div>
        {dir.nombre_contacto && <div style={{ fontSize:14, fontWeight:600, color:'var(--txt)' }}>{dir.nombre_contacto}</div>}
        {dir.telefono_contacto && <div style={{ fontSize:13, color:'var(--txt2)' }}>📞 {dir.telefono_contacto}</div>}
        {dir.calle && (
          <>
            <div style={{ fontSize:13, color:'var(--txt2)', marginTop:4 }}>
              {dir.calle}, {dir.colonia}, {dir.ciudad}, {dir.estado_mx} {dir.cp}
            </div>
            {dir.instrucciones_entrega && <div style={{ fontSize:12, color:'var(--txt3)', marginTop:2 }}>ℹ️ {dir.instrucciones_entrega}</div>}
            <a href={`https://maps.google.com/?q=${mapsQuery}`} target="_blank" rel="noreferrer" className="cbtn cbtn-secondary cbtn-sm" style={{ marginTop:10, display:'inline-block', textDecoration:'none' }}>
              🗺️ Abrir en Maps
            </a>
          </>
        )}
      </div>

      <div className="ccard" style={{ padding:16, marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--txt2)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>
          Artículos ({items.length})
        </div>
        {items.map((it: any, i: number) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderTop: i>0 ? '1px solid var(--border)' : 'none' }}>
            <span>{it.modelo} <span style={{ color:'var(--txt3)' }}>{it.color}</span></span>
            <strong>{it.cantidad} pzas</strong>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)' }}>
          <span style={{ fontSize:13, color:'var(--txt2)' }}>{METODO_LABEL[pedido.metodo_pago] || pedido.metodo_pago}</span>
          <strong style={{ fontSize:15, color:'var(--blue)' }}>
            {pedido.monto_total != null ? `$${Number(pedido.monto_total).toLocaleString('es-MX',{minimumFractionDigits:2})}` : 'Sin monto'}
          </strong>
        </div>
      </div>

      {!accion ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button className="cbtn cbtn-primary" style={{ padding:'14px', fontSize:15 }} onClick={() => setAccion('entregado')}>
            ✅ Entregado
          </button>
          <button className="cbtn cbtn-secondary" style={{ padding:'14px', fontSize:15 }} onClick={() => setAccion('fallida')}>
            ✕ No se pudo entregar
          </button>
        </div>
      ) : (
        <div className="ccard" style={{ padding:16 }}>
          {accion === 'entregado' ? (
            <>
              {pedido.metodo_pago === 'efectivo' && (
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--txt2)', display:'block', marginBottom:5 }}>Monto cobrado en efectivo *</label>
                  <input type="number" min={0} step="0.01" className="cinput" value={montoCobrado} onChange={e => setMontoCobrado(e.target.value)} />
                </div>
              )}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--txt2)', display:'block', marginBottom:5 }}>Foto de evidencia (opcional)</label>
                <ImageUploader pedidoId={pedido.id} initialUrls={evidencias} tipo="evidencia_entrega" onUploaded={setEvidencias} />
              </div>
            </>
          ) : (
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--txt2)', display:'block', marginBottom:5 }}>Motivo *</label>
              <textarea className="cinput" style={{ minHeight:70 }} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="¿Por qué no se pudo entregar?" />
            </div>
          )}
          {error && <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,0.1)', color:'#f87171', fontSize:13, marginBottom:14 }}>{error}</div>}
          <div style={{ display:'flex', gap:10 }}>
            <button className="cbtn cbtn-secondary" style={{ flex:1 }} onClick={() => setAccion(null)}>Cancelar</button>
            <button className="cbtn cbtn-primary" style={{ flex:1 }} disabled={saving} onClick={confirmar}>
              {saving ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
