'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email,setEmail]       = useState('')
  const [password,setPassword] = useState('')
  const [loading,setLoading]   = useState(false)
  const [error,setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res  = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})})
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión')
      // ADMIN / VENDEDOR / ALMACEN → portal, cualquier otro → /
      const portalRoles = ['ADMIN','VENDEDOR','ALMACEN']
      router.push(portalRoles.includes(data.rol) ? '/admin/orders' : '/')
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,
      background:'radial-gradient(ellipse at 20% 40%,rgba(26,143,227,0.08) 0%,transparent 55%),radial-gradient(ellipse at 80% 70%,rgba(13,95,163,0.06) 0%,transparent 45%),#070c14',
      fontFamily:'DM Sans,system-ui,sans-serif',
    }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .li{width:100%;padding:10px 14px;background:#0b1220;border:1px solid rgba(26,143,227,0.2);border-radius:9px;color:#e8f4fd;font-size:14px;font-family:inherit;outline:none;transition:all 0.15s;box-sizing:border-box;}
        .li:focus{border-color:#1a8fe3;box-shadow:0 0 0 3px rgba(26,143,227,0.15);}
        .li::placeholder{color:#3d5a78;}
        .lb{width:100%;padding:11px;background:#1a8fe3;color:white;border:none;border-radius:9px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;}
        .lb:hover:not(:disabled){background:#4baef0;box-shadow:0 0 24px rgba(26,143,227,0.3);transform:translateY(-1px);}
        .lb:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
      `}</style>

      <div style={{width:'100%',maxWidth:380,animation:'fadeUp 0.4s ease-out'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:72,height:72,borderRadius:20,margin:'0 auto 16px',background:'linear-gradient(135deg,#1a8fe3,#0d5fa3)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 32px rgba(26,143,227,0.35)',fontSize:32}}>
            🤖
          </div>
          <h1 style={{fontFamily:'Syne,system-ui,sans-serif',fontSize:28,fontWeight:800,color:'#e8f4fd',margin:0}}>CharisBot</h1>
          <p style={{fontSize:13,color:'#7a9ab8',marginTop:5}}>Portal de gestión de pedidos</p>
        </div>

        <div style={{background:'#0f1a2e',border:'1px solid rgba(26,143,227,0.2)',borderRadius:16,padding:28}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'#e8f4fd',margin:'0 0 20px'}}>Iniciar sesión</h2>

          {error && (
            <div style={{padding:'9px 12px',borderRadius:8,background:'rgba(239,68,68,0.1)',color:'#f87171',border:'1px solid rgba(239,68,68,0.2)',fontSize:13,marginBottom:16}}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:0}}>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'#7a9ab8',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>Correo electrónico</label>
              <input className="li" type="email" placeholder="usuario@charis.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
            </div>
            <div style={{marginBottom:22}}>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'#7a9ab8',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>Contraseña</label>
              <input className="li" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required/>
            </div>
            <button type="submit" className="lb" disabled={loading}>
              {loading
                ? <><div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',animation:'spin 0.7s linear infinite'}}/> Entrando...</>
                : 'Entrar →'}
            </button>
          </form>
        </div>
        <p style={{textAlign:'center',fontSize:11,color:'#3d5a78',marginTop:20}}>© 2025 Charis · Powered by CharisBot</p>
      </div>
    </div>
  )
}
