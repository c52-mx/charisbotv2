'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SHARED_CSS, getThemeVars } from '@/components/shared'

export default function RepartidorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const tv = getThemeVars(true)
  const [user, setUser] = useState<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (!r.ok) { router.push('/login'); return }
      r.json().then(d => {
        if (d.user?.rolTipo !== 'REPARTIDOR') { router.push('/'); return }
        setUser(d.user); setReady(true)
      })
    })
  }, [])

  async function logout() {
    await fetch('/api/auth/me', { method: 'DELETE' }); router.push('/')
  }

  if (!ready) return (
    <div style={{ ...Object.fromEntries(Object.entries(tv)) as any, display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:'var(--blue)', animation:'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ ...Object.fromEntries(Object.entries(tv)) as any, minHeight:'100vh', background:'var(--bg)', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{SHARED_CSS}</style>
      <header style={{ position:'sticky', top:0, zIndex:10, background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'var(--txt)' }}>🛵 {user?.nombre}</div>
          <div style={{ fontSize:11, color:'var(--txt3)' }}>Mis entregas</div>
        </div>
        <button className="cbtn cbtn-danger cbtn-sm" onClick={logout}>Salir</button>
      </header>
      <main style={{ padding:'14px 14px 40px', maxWidth:520, margin:'0 auto' }}>
        {children}
      </main>
    </div>
  )
}
