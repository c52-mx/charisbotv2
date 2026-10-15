'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)

  if (!token) {
    return (
      <div style={{ textAlign:'center', padding:'20px 0' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔗</div>
        <h2 style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:20, color:'var(--txt)', marginBottom:10 }}>Enlace no válido</h2>
        <p style={{ fontSize:15, color:'var(--txt2)', marginBottom:24 }}>
          Este enlace de recuperación no es válido.<br />Solicita uno nuevo desde la pantalla de login.
        </p>
        <Link href="/login" style={{ display:'inline-block', padding:'12px 28px', background:'var(--blue)', color:'white', borderRadius:10, fontWeight:700, fontSize:15, textDecoration:'none' }}>
          Ir al login
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ textAlign:'center', padding:'20px 0' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
        <h2 style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:20, color:'var(--txt)', marginBottom:10 }}>¡Contraseña actualizada!</h2>
        <p style={{ fontSize:15, color:'var(--txt2)', marginBottom:24 }}>
          Tu contraseña fue cambiada exitosamente.<br />Ya puedes iniciar sesión.
        </p>
        <Link href="/login" style={{ display:'inline-block', padding:'12px 28px', background:'var(--blue)', color:'white', borderRadius:10, fontWeight:700, fontSize:15, textDecoration:'none' }}>
          Iniciar sesión
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 8)  { setError('Mínimo 8 caracteres'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al cambiar contraseña'); return }
      setSuccess(true)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Arial Black, sans-serif', fontWeight:900, fontSize:22, color:'var(--txt)', marginBottom:6 }}>Nueva contraseña</h1>
        <p style={{ fontSize:14, color:'var(--txt2)' }}>Elige una contraseña segura de al menos 8 caracteres</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <label style={{ display:'block', fontSize:12.5, fontWeight:700, color:'var(--txt2)', marginBottom:6, letterSpacing:'.05em' }}>NUEVA CONTRASEÑA</label>
          <div style={{ position:'relative' }}>
            <input
              type={showPw ? 'text' : 'password'} required
              placeholder="Mínimo 8 caracteres"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ width:'100%', padding:'11px 44px 11px 14px', background:'var(--field-bg)', border:'1.5px solid var(--field-border)', borderRadius:10, fontSize:15, color:'var(--txt)', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--txt3)', fontSize:16, padding:4 }}>
              {showPw ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div>
          <label style={{ display:'block', fontSize:12.5, fontWeight:700, color:'var(--txt2)', marginBottom:6, letterSpacing:'.05em' }}>CONFIRMAR CONTRASEÑA</label>
          <input
            type={showPw ? 'text' : 'password'} required
            placeholder="Repite tu contraseña"
            value={confirm} onChange={e => setConfirm(e.target.value)}
            style={{ width:'100%', padding:'11px 14px', background:'var(--field-bg)', border:'1.5px solid var(--field-border)', borderRadius:10, fontSize:15, color:'var(--txt)', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
          />
        </div>

        {error && (
          <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13.5, color:'#991b1b' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ padding:'13px', background:'var(--blue)', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, fontFamily:'inherit', cursor:'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        :root { --field-bg: var(--bg3, #f4f7fa); --field-border: var(--border, #d0dae6); }
      `}</style>
      <div style={{ background:'white', borderRadius:20, padding:36, width:'100%', maxWidth:420, boxShadow:'0 24px 60px rgba(0,0,0,0.12)', animation:'fadeUp .35s ease' }}>
        <div style={{ marginBottom:20, display:'flex', justifyContent:'center' }}>
          <svg width="38" height="42" viewBox="0 0 80 88" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(18,0)"><rect x="2" y="2" width="46" height="62" rx="10" stroke="#4baef0" strokeWidth="3.5" fill="none"/></g>
            <g transform="translate(0,14)"><rect x="2" y="2" width="46" height="62" rx="10" stroke="#1565c0" strokeWidth="3.5" fill="none"/>
            <text x="25" y="42" fontFamily="Arial Black,sans-serif" fontSize="22" fontWeight="900" fill="#1565c0" textAnchor="middle" dominantBaseline="middle" letterSpacing="-1">CH</text></g>
          </svg>
        </div>
        <Suspense fallback={<div style={{ textAlign:'center', padding:20, color:'var(--txt3)' }}>Cargando...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
