'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const METODO_LABEL: Record<string,string> = {
  transferencia: 'Transferencia', efectivo: 'Efectivo', stripe: 'Tarjeta', mercadopago: 'Mercado Pago',
}

export default function RepartidorHome() {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/repartidor/pedidos').then(r => r.json()).then(d => { setPedidos(d.items || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
      <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid rgba(26,143,227,0.2)', borderTopColor:'var(--blue)', animation:'spin .7s linear infinite' }} />
    </div>
  )

  if (!pedidos.length) return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--txt3)' }}>
      <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
      No tienes entregas asignadas por ahora.
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {pedidos.map(p => {
        const dir = p.direccion_entrega || {}
        return (
          <Link key={p.id} href={`/repartidor/${p.id}`} style={{ textDecoration:'none' }}>
            <div className="ccard" style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:13, color:'var(--txt)' }}>
                  #{(p.numero_pedido || p.id.slice(0,8)).toUpperCase()}
                </span>
                <span className="badge badge-blue">{METODO_LABEL[p.metodo_pago] || p.metodo_pago}</span>
              </div>
              {p.cliente_nombre && <div style={{ fontSize:13, fontWeight:600, color:'var(--txt)' }}>{p.cliente_nombre}</div>}
              <div style={{ fontSize:12, color:'var(--txt2)', marginTop:2 }}>
                {dir.calle ? `${dir.calle}, ${dir.colonia || ''}` : 'Sin dirección registrada'}
              </div>
              {p.monto_total != null && (
                <div style={{ fontSize:13, fontWeight:700, color:'var(--blue)', marginTop:6 }}>
                  ${Number(p.monto_total).toLocaleString('es-MX',{minimumFractionDigits:2})}
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
