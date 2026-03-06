'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_STEPS = ['PENDIENTE', 'CONFIRMADO', 'EN_PROCESO', 'COMPLETADO']
const ESTADO_EMOJI: Record<string, string> = {
  CONFIRMADO: '✅', PENDIENTE_CONFIRMACION: '⏳', EN_PROCESO: '⚙️', COMPLETADO: '🎉', CANCELADO: '❌', PENDIENTE: '📋',
}

export default function ClientPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (!r.ok) { router.push('/'); return }
      r.json().then(d => {
        if (d.user?.rol === 'ADMIN') { router.push('/admin'); return }
        setUser(d.user)
        loadOrders()
      })
    })
  }, [])

  async function loadOrders() {
    const r = await fetch('/api/orders?limit=20')
    const d = await r.json()
    setOrders(d.data || [])
    setLoading(false)
  }

  async function loadDetail(id: string) {
    const r = await fetch(`/api/orders/${id}`)
    setSelected(await r.json())
  }

  async function logout() {
    await fetch('/api/auth/me', { method: 'DELETE' })
    router.push('/')
  }

  return (
    <div className="gradient-mesh min-h-screen">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
            <span className="text-sm">📱</span>
          </div>
          <span className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>CharisBot</span>
        </div>
        <div className="flex items-center gap-4">
          {user && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Hola, {user.nombre}</span>}
          <button className="btn-secondary text-xs" onClick={logout}>Salir</button>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6 animate-slide-up">
          <h1 className="page-title">Mis Pedidos</h1>
          <p className="page-subtitle">Consulta el estado de tus pedidos</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">📦</div>
            <p className="font-semibold mb-1">Sin pedidos aún</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Envíanos un mensaje por WhatsApp para hacer tu pedido
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o.id} className="card p-4 cursor-pointer hover:glow-purple transition-all"
                   onClick={() => loadDetail(o.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs px-2 py-0.5 rounded"
                            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {o.origen === 'PORTAL' ? '🌐 Portal' : '📱 WhatsApp'}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{o.resumen || `${o.total_piezas} piezas`}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {format(new Date(o.creado_en), "dd 'de' MMMM 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl">{ESTADO_EMOJI[o.estado] || '📋'}</div>
                    <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {o.estado.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {o.estado !== 'CANCELADO' && (
                  <div className="mt-3">
                    <div className="flex gap-1">
                      {ESTADO_STEPS.map((step, i) => {
                        const currentIdx = ESTADO_STEPS.indexOf(o.estado)
                        const isActive = i <= currentIdx
                        return (
                          <div key={step} className="flex-1 h-1 rounded-full transition-all"
                               style={{ background: isActive ? 'var(--accent)' : 'var(--bg-hover)' }} />
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.8)' }}
             onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  Pedido #{selected.id.slice(0, 8).toUpperCase()}
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {selected.origen === 'PORTAL' ? '🌐 Portal' : '📱 WhatsApp'}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-xl" style={{ color: 'var(--text-secondary)' }}>✕</button>
            </div>

            {/* Status progress */}
            {selected.estado !== 'CANCELADO' && (
              <div className="mb-5">
                <div className="flex justify-between mb-2">
                  {ESTADO_STEPS.map(step => {
                    const idx = ESTADO_STEPS.indexOf(selected.estado)
                    const stepIdx = ESTADO_STEPS.indexOf(step)
                    return (
                      <div key={step} className="text-center flex-1">
                        <div className="text-lg mb-1">
                          {ESTADO_EMOJI[step]}
                        </div>
                        <p className="text-xs" style={{
                          color: stepIdx <= idx ? 'var(--accent-light)' : 'var(--text-secondary)',
                          fontWeight: stepIdx === idx ? 600 : 400,
                        }}>
                          {step.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-1">
                  {ESTADO_STEPS.map((step, i) => {
                    const currentIdx = ESTADO_STEPS.indexOf(selected.estado)
                    return (
                      <div key={step} className="flex-1 h-1.5 rounded-full"
                           style={{ background: i <= currentIdx ? 'var(--accent)' : 'var(--bg-hover)' }} />
                    )
                  })}
                </div>
              </div>
            )}

            {selected.resumen && (
              <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                {selected.resumen}
              </p>
            )}

            <p className="label mb-2">Detalle de items</p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {(selected.items || []).map((it: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 border-b last:border-0 text-sm"
                     style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <span className="font-medium">{it.modelo}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{it.tipo_case}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{it.cantidad} pzas</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{it.color}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
