'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { CharisLogotipo } from '@/components/CharisLogo'

const NAV = [
  { href: '/client',         label: 'Inicio',      icon: '🏠', exact: true  },
  { href: '/client/catalog', label: 'Catálogo',    icon: '📋', exact: false },
  { href: '/client/orders',  label: 'Mis pedidos', icon: '📦', exact: false },
  { href: '/client/account', label: 'Mi cuenta',   icon: '👤', exact: false },
]

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

  .cnav-link {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 100px;
    font-size: 13.5px; font-weight: 500; text-decoration: none;
    color: #3a6080; border: 1.5px solid transparent;
    transition: all .18s; white-space: nowrap;
  }
  .cnav-link:hover { background: #e8eef5; color: #0d2137; }
  .cnav-link.act   {
    background: #1565c0; color: white;
    border-color: #1565c0; font-weight: 600;
  }

  .cart-btn {
    display: flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 100px;
    background: #f0f4f8; border: 1.5px solid #d0dde8;
    cursor: pointer; transition: all .18s; position: relative;
    text-decoration: none; color: #0d2137; font-size: 17px;
  }
  .cart-btn:hover { background: #e2eaf4; border-color: #b8d4ed; }

  .user-chip {
    display: flex; align-items: center; gap: 7px;
    padding: 5px 12px 5px 5px; border-radius: 100px;
    background: #f0f4f8; border: 1.5px solid #d0dde8;
    font-size: 13px; font-weight: 600; color: #0d2137;
    cursor: pointer; transition: all .18s;
  }
  .user-chip:hover { border-color: #b8d4ed; background: #e2eaf4; }
  .user-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: linear-gradient(135deg, #1565c0, #4baef0);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 900; color: white;
  }

  .dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: white; border: 1.5px solid #e2eaf4;
    border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    min-width: 180px; overflow: hidden; z-index: 100;
  }
  .dd-item {
    display: block; padding: 10px 16px; font-size: 13px;
    color: #0d2137; text-decoration: none;
    transition: background .12s; cursor: pointer;
    border: none; background: none; width: 100%;
    text-align: left; font-family: inherit;
  }
  .dd-item:hover { background: #f0f4f8; }
  .dd-sep { height: 1px; background: #e2eaf4; }



  @media(max-width: 768px) {
    .desk-nav  { display: none !important; }
  }
`

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [user,    setUser]    = useState<any>(null)
  const [ddOpen,  setDdOpen]  = useState(false)
  const [ready,   setReady]   = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cartItems, setCartItems] = useState<any[]>([])

  // Read cart from localStorage
  const cartCount = cartItems.reduce((s: number, i: any) => s + i.cantidad, 0)

  function loadCart() {
    try { return JSON.parse(localStorage.getItem('charis-cart') || '[]') } catch { return [] }
  }

  useEffect(() => {
    setCartItems(loadCart())
    // Sync cart when storage changes (other tabs or pages)
    const onStorage = () => setCartItems(loadCart())
    window.addEventListener('storage', onStorage)
    window.addEventListener('charis-cart-updated', onStorage)

    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) { router.push('/login'); return }
      // Admin/staff que entran por /client → redirigir a admin
      if (['ADMIN','VENDEDOR','ALMACEN'].includes(d.user.rol)) {
        router.push('/admin/orders'); return
      }
      setUser(d.user)
      setReady(true)
    })
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('charis-cart-updated', onStorage)
    }
  }, [])

  useEffect(() => { setDdOpen(false) }, [pathname])

  async function logout() {
    await fetch('/api/auth/me', { method: 'DELETE' })
    router.push('/')
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const initials = user?.nombre
    ?.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?'

  if (!ready) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:'#f0f4f8', fontFamily:'system-ui' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #e2eaf4', borderTopColor:'#1565c0', animation:'spin .7s linear infinite', margin:'0 auto 12px' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ fontSize:13, color:'#8aaac4' }}>Cargando...</span>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'DM Sans', system-ui, sans-serif", background:'#f0f4f8', minHeight:'100dvh' }}>
      <style>{CSS}</style>

      {/* ── TOP NAV ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2eaf4',
        padding: '0 5%', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16,
      }}>
        <Link href="/client" style={{ textDecoration:'none', flexShrink:0 }}>
          <CharisLogotipo height={34} variant="color" />
        </Link>

        {/* Desktop nav links */}
        <nav className="desk-nav" style={{ display:'flex', alignItems:'center', gap:2, flex:1, justifyContent:'center' }}>
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
                  className={`cnav-link${isActive(n.href, n.exact) ? ' act' : ''}`}>
              {n.icon} {n.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {/* Cart — opens drawer first, full page from drawer */}
          <button className="cart-btn" title="Carrito" onClick={() => setCartOpen(o => !o)}>
            🛒
            {cartCount > 0 && (
              <span style={{ position:'absolute', top:-4, right:-4, background:'#ef4444', color:'white', fontSize:9, fontWeight:700, borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {cartCount}
              </span>
            )}
          </button>

          {/* User dropdown */}
          <div style={{ position:'relative' }}>
            <div className="user-chip" onClick={() => setDdOpen(o => !o)}>
              <div className="user-avatar">{initials}</div>
              <span style={{ maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.nombre?.split(' ')[0]}
              </span>
              <span style={{ fontSize:9, color:'#8aaac4' }}>▼</span>
            </div>
            {ddOpen && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:99 }} onClick={() => setDdOpen(false)}/>
                <div className="dropdown">
                  <div style={{ padding:'10px 16px 8px' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0d2137' }}>{user?.nombre}</div>
                    <div style={{ fontSize:11, color:'#8aaac4', marginTop:2 }}>{user?.email}</div>
                  </div>
                  <div className="dd-sep"/>
                  <Link href="/client/orders"  className="dd-item">📦 Mis pedidos</Link>
                  <Link href="/client/account" className="dd-item">👤 Mi cuenta</Link>
                  <div className="dd-sep"/>
                  <button onClick={logout} className="dd-item" style={{ color:'#ef4444' }}>↩ Cerrar sesión</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="main-wrap" style={{ padding:'28px 5%', maxWidth:1200, margin:'0 auto', animation:'fadeUp .3s ease-out' }}>
        {children}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:'1px solid #e2eaf4', padding:'28px 5%', marginTop:40, background:'white' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
          <div>
            <CharisLogotipo height={30} variant="color" />
            <p style={{ fontSize:12, color:'#8aaac4', marginTop:8 }}>Portal de pedidos para clientes</p>
          </div>
          <div>
              <p style={{ fontSize:11, fontWeight:700, color:'#3a6080', letterSpacing:'.06em', marginBottom:8 }}>CONTACTO</p>
              <p style={{ fontSize:13, color:'#8aaac4', lineHeight:1.8 }}>
                Lun–Vie 9:00–18:00<br/>
                ventas@charis.com.mx
              </p>
            </div>
        </div>
        <div style={{ maxWidth:1200, margin:'20px auto 0', paddingTop:16, borderTop:'1px solid #e2eaf4', fontSize:12, color:'#b8d4ed', textAlign:'center' }}>
          © 2026 Charis · Distribuidor Mayorista · Todos los derechos reservados
        </div>
      </footer>
      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <>
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:199,backdropFilter:'blur(2px)'}} onClick={()=>setCartOpen(false)}/>
          <div style={{position:'fixed',top:0,right:0,bottom:0,width:360,background:'white',boxShadow:'-8px 0 40px rgba(0,0,0,0.15)',zIndex:200,display:'flex',flexDirection:'column',animation:'slideIn .3s cubic-bezier(.4,0,.2,1)'}}>
            <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
            {/* Header */}
            <div style={{padding:'16px 20px',borderBottom:'1px solid #e2eaf4',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div>
                <h3 style={{fontFamily:'Arial Black,sans-serif',fontWeight:900,fontSize:16,color:'#0d2137'}}>🛒 Carrito</h3>
                <p style={{fontSize:12,color:'#8aaac4',marginTop:2}}>{cartItems.length} artículo{cartItems.length!==1?'s':''} · {cartCount} piezas</p>
              </div>
              <button onClick={()=>setCartOpen(false)} style={{background:'#f0f4f8',border:'none',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:16,color:'#3a6080',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            {/* Items */}
            <div style={{flex:1,overflowY:'auto'}}>
              {cartItems.length === 0 ? (
                <div style={{padding:40,textAlign:'center',color:'#8aaac4'}}>
                  <div style={{fontSize:36,marginBottom:10}}>🛒</div>
                  <p style={{fontSize:14}}>El carrito está vacío</p>
                </div>
              ) : cartItems.map((item:any, i:number) => (
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 16px',borderBottom:'1px solid #f0f4f8'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:700,color:'#0d2137',marginBottom:2}}>{item.modelo}</p>
                    <p style={{fontSize:11,color:'#8aaac4'}}>{item.tipo_case} · {item.marca} · {item.color}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                    <div style={{display:'flex',alignItems:'center'}}>
                      <button onClick={()=>{ const nc=[...cartItems]; nc[i]={...nc[i],cantidad:Math.max(1,nc[i].cantidad-1)}; setCartItems(nc); localStorage.setItem('charis-cart',JSON.stringify(nc)) }} style={{width:26,height:26,border:'1px solid #d0dde8',background:'#f5f8fc',cursor:'pointer',borderRadius:'5px 0 0 5px',fontSize:13,color:'#0d2137',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                      <span style={{width:36,height:26,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #d0dde8',borderLeft:'none',borderRight:'none',fontSize:12,fontWeight:600,color:'#0d2137'}}>{item.cantidad}</span>
                      <button onClick={()=>{ const nc=[...cartItems]; nc[i]={...nc[i],cantidad:nc[i].cantidad+1}; setCartItems(nc); localStorage.setItem('charis-cart',JSON.stringify(nc)) }} style={{width:26,height:26,border:'1px solid #d0dde8',background:'#f5f8fc',cursor:'pointer',borderRadius:'0 5px 5px 0',fontSize:13,color:'#0d2137',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                    </div>
                    <button onClick={()=>{ const nc=cartItems.filter((_:any,j:number)=>j!==i); setCartItems(nc); localStorage.setItem('charis-cart',JSON.stringify(nc)) }} style={{background:'rgba(239,68,68,0.1)',border:'none',borderRadius:6,width:26,height:26,cursor:'pointer',color:'#ef4444',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            {/* Footer */}
            {cartItems.length > 0 && (
              <div style={{padding:'16px 20px',borderTop:'1px solid #e2eaf4',flexShrink:0}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:13}}>
                  <span style={{color:'#3a6080',fontWeight:600}}>Total piezas:</span>
                  <span style={{fontWeight:900,color:'#1565c0'}}>{cartCount}</span>
                </div>
                <Link href="/client/cart" onClick={()=>setCartOpen(false)}
                  style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,width:'100%',padding:'12px',borderRadius:10,background:'#1565c0',color:'white',fontSize:14,fontWeight:700,textDecoration:'none',boxSizing:'border-box' as const}}>
                  Ver carrito completo →
                </Link>
                <button onClick={()=>{ setCartItems([]); localStorage.removeItem('charis-cart') }} style={{width:'100%',marginTop:8,padding:'8px',borderRadius:9,border:'1.5px solid #e2eaf4',background:'transparent',color:'#8aaac4',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
                  Vaciar carrito
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
