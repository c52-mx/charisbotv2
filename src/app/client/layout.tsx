'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { CharisLogotipo } from '@/components/CharisLogo'

const NAV = [
  { href: '/client',          label: 'Inicio',      icon: '🏠', exact: true  },
  { href: '/client/catalog',  label: 'Catálogo',    icon: '📋', exact: false },
  { href: '/client/orders',   label: 'Mis pedidos', icon: '📦', exact: false },
  { href: '/client/account',  label: 'Mi cuenta',   icon: '👤', exact: false },
]

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── TOPBAR ── */
  .c-topbar {
    background: #07111f;
    height: 36px;
    display: flex;
    align-items: center;
    padding: 0 5%;
    gap: 20px;
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .c-topbar-item {
    color: rgba(255,255,255,.7);
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .c-topbar-sep { color: rgba(255,255,255,.18); }
  .c-topbar-badge {
    background: #1a7fe3;
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 9px;
    border-radius: 10px;
    margin-left: auto;
  }

  /* ── MAIN HEADER ── */
  .c-header {
    background: rgba(13,30,53,0.97);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 2px solid #1a7fe3;
    height: 60px;
    padding: 0 5%;
    display: flex;
    align-items: center;
    gap: 18px;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  /* ── SEARCH ── */
  .c-search {
    flex: 1;
    max-width: 480px;
    display: flex;
    height: 36px;
    border-radius: 6px;
    overflow: hidden;
    border: 2px solid #1a7fe3;
  }
  .c-search-input {
    flex: 1;
    border: none;
    padding: 0 12px;
    font-size: 12px;
    outline: none;
    background: white;
    color: #07111f;
    font-family: 'DM Sans', system-ui, sans-serif;
    min-width: 0;
  }
  .c-search-input::placeholder { color: #b0bac8; }
  .c-search-btn {
    background: #1a7fe3;
    border: none;
    padding: 0 16px;
    color: white;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    font-family: 'DM Sans', system-ui, sans-serif;
    transition: background .15s;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .c-search-btn:hover { background: #1569c4; }

  /* ── NAV LINKS (desktop) ── */
  .c-nav {
    background: #07111f;
    padding: 0 5%;
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid rgba(255,255,255,.07);
    overflow-x: auto;
  }
  .c-nav::-webkit-scrollbar { display: none; }
  .c-navlink {
    padding: 10px 14px;
    color: rgba(255,255,255,.65);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: color .15s;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .c-navlink:hover { color: white; }
  .c-navlink.act   { color: #4baef0; border-bottom-color: #4baef0; font-weight: 600; }
  .c-nav-mayoreo {
    margin-left: auto;
    display: flex;
    align-items: center;
    padding-left: 16px;
    border-left: 1px solid rgba(255,255,255,.08);
    color: #4baef0;
    font-size: 11px;
    font-weight: 700;
    gap: 5px;
    white-space: nowrap;
  }

  /* ── HEADER ACTIONS ── */
  .c-hact {
    display: flex;
    align-items: center;
    gap: 5px;
    color: white;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    text-decoration: none;
    transition: background .15s;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .c-hact:hover { background: rgba(255,255,255,.08); }
  .c-hact-lbl small { display: block; font-size: 9px; color: rgba(255,255,255,.45); line-height: 1; }
  .c-hact-lbl span  { display: block; font-size: 11px; font-weight: 600; line-height: 1.3; }
  .c-hact-icon { font-size: 18px; }
  .c-divider { width: 1px; height: 28px; background: rgba(255,255,255,.1); }

  /* ── CART BUTTON ── */
  .c-cart-wrap { position: relative; }
  .c-cart-badge {
    position: absolute;
    top: -2px;
    right: 5px;
    background: #4baef0;
    color: #07111f;
    border-radius: 50%;
    width: 15px;
    height: 15px;
    font-size: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }

  /* ── USER CHIP ── */
  .c-user-chip {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 10px 5px 5px;
    border-radius: 100px;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.12);
    font-size: 12px;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: all .15s;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .c-user-chip:hover { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.22); }
  .c-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1565c0, #4baef0);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 900;
    color: white;
    flex-shrink: 0;
  }

  /* ── DROPDOWN ── */
  .c-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: white;
    border: 1.5px solid #e2eaf4;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,.12);
    min-width: 200px;
    overflow: hidden;
    z-index: 100;
    animation: dropIn .18s ease-out;
  }
  @keyframes dropIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  .c-dd-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    font-size: 13px;
    color: #0d2137;
    text-decoration: none;
    transition: background .12s;
    cursor: pointer;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .c-dd-item:hover { background: #f0f4f8; }
  .c-dd-sep { height: 1px; background: #e2eaf4; }

  /* ── CART DRAWER ── */
  @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
  .c-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 360px;
    max-width: 100vw;
    background: white;
    box-shadow: -8px 0 40px rgba(0,0,0,.15);
    z-index: 200;
    display: flex;
    flex-direction: column;
    animation: slideIn .28s cubic-bezier(.4,0,.2,1);
  }
  .c-drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(7,17,31,.45);
    z-index: 199;
    backdrop-filter: blur(2px);
  }
  .c-drawer-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f4f8;
    transition: background .12s;
  }
  .c-drawer-item:hover { background: #fafcff; }
  .c-qty-ctrl { display: flex; align-items: center; }
  .c-qty-btn {
    width: 26px;
    height: 26px;
    border: 1px solid #d0dde8;
    background: #f5f8fc;
    cursor: pointer;
    font-size: 14px;
    color: #0d2137;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background .12s;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .c-qty-btn:first-child { border-radius: 5px 0 0 5px; }
  .c-qty-btn:last-child  { border-radius: 0 5px 5px 0; }
  .c-qty-btn:hover { background: #e2eaf4; }
  .c-qty-val {
    width: 36px;
    height: 26px;
    border: 1px solid #d0dde8;
    border-left: none;
    border-right: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #0d2137;
  }

  /* ── MOBILE BOTTOM NAV ── */
  .c-bottom-nav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #07111f;
    border-top: 1px solid rgba(255,255,255,.08);
    z-index: 50;
    padding: 8px 0 max(10px, env(safe-area-inset-bottom));
  }
  .c-bottom-nav-inner {
    display: flex;
    justify-content: space-around;
  }
  .c-bni {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    color: rgba(255,255,255,.4);
    cursor: pointer;
    text-decoration: none;
    min-width: 50px;
    font-family: 'DM Sans', system-ui, sans-serif;
    position: relative;
    transition: color .15s;
  }
  .c-bni.act { color: #4baef0; }
  .c-bni-icon { font-size: 20px; }
  .c-bni-label { font-size: 9px; }
  .c-bni-badge {
    position: absolute;
    top: -2px;
    right: 6px;
    background: #1a7fe3;
    color: white;
    border-radius: 50%;
    width: 13px;
    height: 13px;
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }

  /* ── MAIN + FOOTER ── */
  .c-main {
    max-width: 1240px;
    margin: 0 auto;
    padding: 28px 5%;
    animation: fadeUp .28s ease-out;
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .c-footer {
    background: #07111f;
    border-top: 1px solid rgba(255,255,255,.07);
    padding: 28px 5%;
    margin-top: 48px;
  }
  .c-footer-inner {
    max-width: 1240px;
    margin: 0 auto;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 24px;
  }
  .c-footer-col-title {
    font-size: 10px;
    font-weight: 700;
    color: rgba(255,255,255,.4);
    letter-spacing: .08em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .c-footer-link {
    display: block;
    font-size: 12px;
    color: rgba(255,255,255,.45);
    text-decoration: none;
    margin-bottom: 5px;
    transition: color .14s;
  }
  .c-footer-link:hover { color: #4baef0; }
  .c-footer-copy {
    max-width: 1240px;
    margin: 16px auto 0;
    padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,.06);
    font-size: 11px;
    color: rgba(255,255,255,.25);
    text-align: center;
  }
  .c-wa-strip {
    background: #075e54;
    padding: 12px 5%;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 2px;
  }
  .c-wa-strip-btn {
    margin-left: auto;
    background: white;
    color: #075e54;
    border: none;
    padding: 7px 18px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap;
    font-family: 'DM Sans', system-ui, sans-serif;
    transition: background .14s;
    flex-shrink: 0;
  }
  .c-wa-strip-btn:hover { background: #f0fdf4; }

  @media (max-width: 768px) {
    .c-topbar        { display: none; }
    .c-nav           { display: none; }
    .c-search        { max-width: none; flex: 1; }
    .c-hact-lbl      { display: none; }
    .c-mayoreo-label { display: none; }
    .c-bottom-nav    { display: block; }
    .c-main          { padding: 16px 4% 88px; }
    .c-footer        { padding-bottom: 88px; margin-top: 24px; }
    .c-wa-strip      { display: none; }
    .c-header        { height: 56px; padding: 0 4%; gap: 10px; }
    .c-user-chip span { display: none; }
    .c-user-chip      { padding: 4px; }
    .c-footer-inner  { flex-direction: column; gap: 16px; }
  }
`

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [user,      setUser]      = useState<any>(null)
  const [ddOpen,    setDdOpen]    = useState(false)
  const [ready,     setReady]     = useState(false)
  const [cartOpen,  setCartOpen]  = useState(false)
  const [cartItems, setCartItems] = useState<any[]>([])
  const [search,    setSearch]    = useState('')
  const isLocalWrite = useRef(false)

  const cartCount = cartItems.reduce((s: number, i: any) => s + (i.cantidad || 0), 0)

  function saveAndNotify(items: any[]) {
    isLocalWrite.current = true
    localStorage.setItem('charis-cart', JSON.stringify(items))
    window.dispatchEvent(new CustomEvent('charis-cart-updated'))
    setTimeout(() => { isLocalWrite.current = false }, 50)
  }
  function loadCart() {
    try { return JSON.parse(localStorage.getItem('charis-cart') || '[]') } catch { return [] }
  }

  useEffect(() => {
    setCartItems(loadCart())
    const onStorage  = () => { if (!isLocalWrite.current) setCartItems(loadCart()) }
    const onCartOpen = () => { setCartItems(loadCart()); setCartOpen(true) }
    window.addEventListener('storage',              onStorage)
    window.addEventListener('charis-cart-updated',  onStorage)
    window.addEventListener('charis-cart-open',     onCartOpen)

    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) { router.push('/login'); return }
      if (['ADMIN','VENDEDOR','ALMACEN'].includes(d.user.rol)) {
        router.push('/admin/orders'); return
      }
      setUser(d.user)
      setReady(true)
    })
    return () => {
      window.removeEventListener('storage',             onStorage)
      window.removeEventListener('charis-cart-updated', onStorage)
      window.removeEventListener('charis-cart-open',    onCartOpen)
    }
  }, [])

  useEffect(() => { setDdOpen(false) }, [pathname])

  async function logout() {
    await fetch('/api/auth/me', { method: 'DELETE' })
    router.push('/')
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) router.push(`/client/catalog?search=${encodeURIComponent(search.trim())}`)
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const initials = user?.nombre
    ?.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?'

  if (!ready) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:'#07111f' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid rgba(26,127,227,.2)', borderTopColor:'#1a7fe3', animation:'spin .7s linear infinite', margin:'0 auto 12px' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ fontSize:13, color:'rgba(255,255,255,.35)', fontFamily:'DM Sans,system-ui,sans-serif' }}>Cargando…</span>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'DM Sans', system-ui, sans-serif", background:'#f0f4f8', minHeight:'100dvh' }}>
      <style>{CSS}</style>

      {/* ── TOP BAR ── */}
      <div className="c-topbar">
        <span className="c-topbar-item">📍 Entregar en: CDMX</span>
        <span className="c-topbar-sep">|</span>
        <span className="c-topbar-item">🚚 Envío gratis en pedidos +$500</span>
        <span className="c-topbar-sep">|</span>
        <span className="c-topbar-item">⏱ Entrega CDMX 24h</span>
        <span className="c-topbar-badge">Portal Distribuidores</span>
      </div>

      {/* ── MAIN HEADER ── */}
      <header className="c-header">
        <Link href="/client" style={{ textDecoration:'none', flexShrink:0 }}>
          <CharisLogotipo height={34} variant="white" />
        </Link>

        {/* Search */}
        <form className="c-search" onSubmit={handleSearch}>
          <input
            className="c-search-input"
            type="text"
            placeholder="Buscar modelo, marca, tipo de case…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="c-search-btn">
            🔍 Buscar
          </button>
        </form>

        {/* Actions */}
        <div style={{ display:'flex', alignItems:'center', gap:4, marginLeft:'auto', flexShrink:0 }}>
          <Link href="/client/orders" className="c-hact">
            <span className="c-hact-icon">📦</span>
            <div className="c-hact-lbl"><small>Mis</small><span>Pedidos</span></div>
          </Link>

          <div className="c-divider" />

          {/* Cart */}
          <button
            className="c-hact c-cart-wrap"
            onClick={() => setCartOpen(o => !o)}
            style={{ background:'none', border:'none', cursor:'pointer' }}
          >
            <span className="c-hact-icon">🛒</span>
            {cartCount > 0 && <span className="c-cart-badge">{cartCount}</span>}
            <div className="c-hact-lbl"><small>Mi</small><span>Carrito</span></div>
          </button>

          <div className="c-divider" />

          {/* User */}
          <div style={{ position:'relative' }}>
            <div className="c-user-chip" onClick={() => setDdOpen(o => !o)}>
              <div className="c-avatar">{initials}</div>
              <span style={{ maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.nombre?.split(' ')[0]}
              </span>
              <span style={{ fontSize:9, opacity:.5 }}>▼</span>
            </div>
            {ddOpen && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:99 }} onClick={() => setDdOpen(false)} />
                <div className="c-dropdown">
                  <div style={{ padding:'10px 16px 8px' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0d2137' }}>{user?.nombre}</div>
                    <div style={{ fontSize:11, color:'#8aaac4', marginTop:2 }}>{user?.email}</div>
                  </div>
                  <div className="c-dd-sep" />
                  <Link href="/client/orders"  className="c-dd-item">📦 Mis pedidos</Link>
                  <Link href="/client/account" className="c-dd-item">👤 Mi cuenta</Link>
                  <div className="c-dd-sep" />
                  <button onClick={logout} className="c-dd-item" style={{ color:'#ef4444' }}>↩ Cerrar sesión</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── NAV ── */}
      <nav className="c-nav">
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`c-navlink${isActive(n.href, n.exact) ? ' act' : ''}`}
          >
            {n.icon} {n.label}
          </Link>
        ))}
        <div className="c-nav-mayoreo">
          % <span className="c-mayoreo-label">Mayoreo activo</span>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="c-main">{children}</main>

      {/* ── WA STRIP ── */}
      <div className="c-wa-strip">
        <span style={{ fontSize:22 }}>📱</span>
        <div>
          <div style={{ color:'white', fontSize:13, fontWeight:700 }}>¿Prefieres pedir por WhatsApp?</div>
          <div style={{ color:'rgba(255,255,255,.7)', fontSize:11 }}>CharisBot procesa tu pedido al instante — texto, foto o voz</div>
        </div>
        <a
          href="https://wa.me/521XXXXXXXXXX"
          target="_blank"
          rel="noreferrer"
          className="c-wa-strip-btn"
        >
          Abrir WhatsApp
        </a>
      </div>

      {/* ── FOOTER ── */}
      <footer className="c-footer">
        <div className="c-footer-inner">
          <div>
            <CharisLogotipo height={30} variant="white" />
            <p style={{ fontSize:12, color:'rgba(255,255,255,.35)', marginTop:8 }}>Portal de pedidos para distribuidores</p>
          </div>
          <div>
            <div className="c-footer-col-title">Catálogo</div>
            <Link href="/client/catalog" className="c-footer-link">Ver todo el catálogo</Link>
            <Link href="/client/catalog?filter=new" className="c-footer-link">Novedades</Link>
          </div>
          <div>
            <div className="c-footer-col-title">Mi cuenta</div>
            <Link href="/client/orders"  className="c-footer-link">Mis pedidos</Link>
            <Link href="/client/account" className="c-footer-link">Perfil</Link>
          </div>
          <div>
            <div className="c-footer-col-title">Contacto</div>
            <span className="c-footer-link">Lun–Vie 9:00–18:00</span>
            <span className="c-footer-link">ventas@charis.com.mx</span>
          </div>
        </div>
        <div className="c-footer-copy">
          © 2026 Charis · Distribuidor Mayorista · Todos los derechos reservados
        </div>
      </footer>

      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="c-bottom-nav">
        <div className="c-bottom-nav-inner">
          {[
            { href:'/client',         icon:'🏠', label:'Inicio',   exact:true  },
            { href:'/client/catalog', icon:'📋', label:'Catálogo', exact:false },
            { href:'/client/cart',    icon:'🛒', label:'Carrito',  exact:false, badge: cartCount },
            { href:'/client/orders',  icon:'📦', label:'Pedidos',  exact:false },
            { href:'/client/account', icon:'👤', label:'Cuenta',   exact:false },
          ].map(i => (
            <Link
              key={i.href}
              href={i.href}
              className={`c-bni${isActive(i.href, i.exact) ? ' act' : ''}`}
            >
              <span className="c-bni-icon">{i.icon}</span>
              <span className="c-bni-label">{i.label}</span>
              {i.badge ? <span className="c-bni-badge">{i.badge}</span> : null}
            </Link>
          ))}
        </div>
      </div>

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <>
          <div className="c-drawer-overlay" onClick={() => setCartOpen(false)} />
          <div className="c-drawer">
            {/* Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2eaf4', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div>
                <h3 style={{ fontWeight:900, fontSize:16, color:'#0d2137' }}>🛒 Carrito</h3>
                <p style={{ fontSize:12, color:'#8aaac4', marginTop:2 }}>
                  {cartItems.length} artículo{cartItems.length !== 1 ? 's' : ''} · {cartCount} piezas
                </p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                style={{ background:'#f0f4f8', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:16, color:'#3a6080', display:'flex', alignItems:'center', justifyContent:'center' }}
              >✕</button>
            </div>

            {/* Items */}
            <div style={{ flex:1, overflowY:'auto' }}>
              {cartItems.length === 0 ? (
                <div style={{ padding:40, textAlign:'center', color:'#8aaac4' }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>🛒</div>
                  <p style={{ fontSize:14 }}>El carrito está vacío</p>
                  <Link href="/client/catalog" onClick={() => setCartOpen(false)} style={{ display:'inline-block', marginTop:12, fontSize:13, color:'#1565c0', fontWeight:600, textDecoration:'none' }}>
                    Explorar catálogo →
                  </Link>
                </div>
              ) : cartItems.map((item: any, i: number) => (
                <div key={i} className="c-drawer-item">
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#0d2137', marginBottom:2 }}>{item.modelo}</p>
                    <p style={{ fontSize:11, color:'#8aaac4' }}>{item.tipo_case} · {item.marca} · {item.color}</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <div className="c-qty-ctrl">
                      <button className="c-qty-btn" onClick={() => {
                        const nc = [...cartItems]
                        nc[i] = { ...nc[i], cantidad: Math.max(1, nc[i].cantidad - 1) }
                        setCartItems(nc); saveAndNotify(nc)
                      }}>−</button>
                      <div className="c-qty-val">{item.cantidad}</div>
                      <button className="c-qty-btn" onClick={() => {
                        const nc = [...cartItems]
                        nc[i] = { ...nc[i], cantidad: nc[i].cantidad + 1 }
                        setCartItems(nc); saveAndNotify(nc)
                      }}>+</button>
                    </div>
                    <button
                      onClick={() => { const nc = cartItems.filter((_: any, j: number) => j !== i); setCartItems(nc); saveAndNotify(nc) }}
                      style={{ background:'rgba(239,68,68,.1)', border:'none', borderRadius:6, width:26, height:26, cursor:'pointer', color:'#ef4444', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div style={{ padding:'16px 20px', borderTop:'1px solid #e2eaf4', flexShrink:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:13 }}>
                  <span style={{ color:'#3a6080', fontWeight:600 }}>Total piezas:</span>
                  <span style={{ fontWeight:900, color:'#1a7fe3', fontSize:15 }}>{cartCount}</span>
                </div>
                {cartCount >= 50 && (
                  <div style={{ background:'#e8f5e9', border:'1px solid #c8e6c9', borderRadius:6, padding:'6px 10px', fontSize:11, color:'#1b5e20', fontWeight:600, marginBottom:10 }}>
                    % {cartCount >= 200 ? '15%' : cartCount >= 100 ? '10%' : '5%'} de descuento mayorista aplicado
                  </div>
                )}
                <Link
                  href="/client/cart"
                  onClick={() => setCartOpen(false)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:'12px', borderRadius:10, background:'#1565c0', color:'white', fontSize:14, fontWeight:700, textDecoration:'none', boxSizing:'border-box' as const, marginBottom:8 }}
                >
                  Ver carrito completo →
                </Link>
                <button
                  onClick={() => { setCartItems([]); saveAndNotify([]) }}
                  style={{ width:'100%', padding:'8px', borderRadius:9, border:'1.5px solid #e2eaf4', background:'transparent', color:'#8aaac4', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}
                >
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
