'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    nombre: '', empresa: '', telefono: '', email: '', password: '', codigo: '',
  })
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.password) {
      setError('Nombre, correo y contraseña son obligatorios'); return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres'); return
    }
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear cuenta')
      router.push('/client')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to { transform: rotate(360deg) } }

        .reg-input {
          width: 100%; padding: 11px 14px;
          background: #f7f5f0; border: 1.5px solid #e0ddd8;
          border-radius: 10px; color: #1a1a1a; font-size: 14px;
          font-family: inherit; outline: none; transition: all .18s;
        }
        .reg-input:focus { border-color: #1a4731; background: white; box-shadow: 0 0 0 3px rgba(26,71,49,0.1); }
        .reg-input::placeholder { color: #aaa; }

        .reg-btn {
          width: 100%; padding: 13px;
          background: #1a4731; color: white;
          border: none; border-radius: 10px;
          font-size: 15px; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: all .18s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .reg-btn:hover:not(:disabled) { background: #245c3f; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(26,71,49,0.25); }
        .reg-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .field-label { display: block; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 6px; letter-spacing: .02em; }

        @media (max-width: 768px) { .left-panel { display: none !important; } }
      `}</style>

      {/* LEFT PANEL */}
      <div className="left-panel" style={{
        width: '40%', background: '#1a4731',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '48px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}/>
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }}/>

        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48, textDecoration: 'none', position: 'relative' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'white' }}>Charis</span>
        </Link>

        <div style={{ position: 'relative' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 30, color: 'white', lineHeight: 1.2, marginBottom: 14 }}>
            Crea tu cuenta<br />de cliente
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
            Accede al catálogo completo y haz pedidos directo desde el portal.
          </p>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['✓ Sin costo, tu cuenta es gratuita', '✓ Historial de pedidos completo', '✓ Seguimiento en tiempo real'].map(f => (
              <div key={f} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 8 }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        flex: 1, background: '#faf9f6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 440, animation: 'fadeUp 0.4s ease-out' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: '#1a1a1a', marginBottom: 6 }}>
              Crear cuenta nueva
            </h1>
            <p style={{ fontSize: 14, color: '#888' }}>
              Rellena los datos para empezar a ordenar
            </p>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 13, marginBottom: 18 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Row 1: nombre + empresa */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">NOMBRE *</label>
                <input className="reg-input" placeholder="Tu nombre" value={form.nombre} onChange={set('nombre')} required />
              </div>
              <div>
                <label className="field-label">EMPRESA</label>
                <input className="reg-input" placeholder="Nombre del negocio" value={form.empresa} onChange={set('empresa')} />
              </div>
            </div>

            {/* Row 2: telefono */}
            <div>
              <label className="field-label">TELÉFONO WHATSAPP *</label>
              <input className="reg-input" placeholder="55 1234 5678" value={form.telefono} onChange={set('telefono')} required type="tel" />
            </div>

            {/* Row 3: email */}
            <div>
              <label className="field-label">CORREO ELECTRÓNICO *</label>
              <input className="reg-input" type="email" placeholder="tu@correo.com" value={form.email} onChange={set('email')} required />
            </div>

            {/* Row 4: password */}
            <div>
              <label className="field-label">CONTRASEÑA *</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="reg-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={form.password} onChange={set('password')}
                  required style={{ paddingRight: 42 }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#999' }}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Row 5: codigo empleado (opcional) */}
            <div>
              <label className="field-label">CÓDIGO DE EMPLEADO <span style={{ color: '#bbb', fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
              <input className="reg-input" placeholder="Si te lo proporcionaron" value={form.codigo} onChange={set('codigo')} />
            </div>

            <div style={{ paddingTop: 4 }}>
              <button type="submit" className="reg-btn" disabled={loading}>
                {loading
                  ? <><div style={{ width:15, height:15, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin .7s linear infinite' }}/> Creando cuenta...</>
                  : 'Crear cuenta →'
                }
              </button>
            </div>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#888' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color: '#1a4731', fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
