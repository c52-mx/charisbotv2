'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { SHARED_CSS, getThemeVars } from '@/components/shared'
import { CharisAppIcon, CharisLogotipo } from '@/components/CharisLogo'
import type { UserRol } from '@/lib/auth-shared'

const NAV_ITEMS = [
  { href:'/admin',         label:'Dashboard', icon:'📊', exact:true,  roles:['ADMIN'] },
  { href:'/admin/orders',  label:'Pedidos',   icon:'📦', exact:false, roles:['ADMIN','VENDEDOR','ALMACEN'] },
  { href:'/admin/catalog', label:'Catálogo',  icon:'🗂️', exact:false, roles:['ADMIN','VENDEDOR','ALMACEN'] },
  { href:'/admin/clients', label:'Clientes',  icon:'👤', exact:false, roles:['ADMIN','VENDEDOR'] },
  { href:'/admin/users',   label:'Usuarios',  icon:'👥', exact:false, roles:['ADMIN'] },
  { href:'/admin/config',  label:'Configuración', icon:'⚙️', exact:false, roles:['ADMIN'] },
]

const ROL_STYLE: Record<string,{label:string;badgeClass:string}> = {
  ADMIN:    { label:'Admin',    badgeClass:'badge-blue' },
  VENDEDOR: { label:'Vendedor', badgeClass:'badge-ok'   },
  ALMACEN:  { label:'Almacén',  badgeClass:'badge-warn' },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [user,       setUser]      = useState<any>(null)
  const [collapsed,  setCollapsed] = useState(false)
  const [mobileOpen, setMobile]    = useState(false)
  const [dark,       setDark]      = useState(true)
  const [ready,      setReady]     = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('charis-theme')
    if (saved) setDark(saved === 'dark')
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (!r.ok) { router.push('/'); return }
      r.json().then(d => {
        const rol: string = d.user?.rol
        if (!['ADMIN','VENDEDOR','ALMACEN'].includes(rol)) { router.push('/'); return }
        setUser(d.user); setReady(true)
      })
    })
  }, [])

  useEffect(() => { setMobile(false) }, [pathname])

  function toggleTheme() {
    setDark(d => { const n = !d; localStorage.setItem('charis-theme', n ? 'dark' : 'light'); return n })
  }
  async function logout() {
    await fetch('/api/auth/me', { method: 'DELETE' }); router.push('/')
  }

  const tv       = getThemeVars(dark)
  const rol      = (user?.rol || 'VENDEDOR') as UserRol
  const navItems = NAV_ITEMS.filter(n => n.roles.includes(rol))
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  if (!ready) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                  height:'100vh', background: tv['--bg'] }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:32, height:32, borderRadius:'50%', margin:'0 auto 12px',
                      border:'2.5px solid rgba(26,143,227,0.15)',
                      borderTopColor:tv['--blue3'], animation:'spin .7s linear infinite' }}/>
        <span style={{ fontSize:12, color:tv['--blue3'], fontFamily:'system-ui' }}>Cargando…</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const SW = collapsed ? 60 : 224

  return (
    <div style={{
      ...Object.fromEntries(Object.entries(tv)) as any,
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: 'var(--txt)', background: 'var(--bg)',
      height: '100dvh', width: '100vw',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <style>{SHARED_CSS + `
        @keyframes spin { to { transform: rotate(360deg) } }

        /* ── Force title visibility ── */
        h1, h2, h3, h4, h5, h6 {
          color: var(--txt) !important;
          font-family: 'Syne', system-ui, sans-serif;
        }
        p { color: inherit; }
        .page-title {
          font-size: 22px; font-weight: 800;
          color: var(--txt) !important;
          letter-spacing: -.01em;
        }
        .page-sub {
          font-size: 13px;
          color: var(--txt2) !important;
          margin-top: 3px;
        }

        /* ── Shell ── */
        .shell        { display:flex; flex:1; overflow:hidden; min-height:0; }
        .sidebar      {
          display:flex; flex-direction:column; height:100%;
          background: var(--bg2); border-right: 1px solid var(--border);
          overflow: hidden; transition: width .22s ease; flex-shrink: 0;
        }
        .main-scroll  { flex:1; overflow-y:auto; overflow-x:hidden; min-width:0; }
        .main-pad     { padding:26px 30px; max-width:1320px; margin:0 auto; }

        /* ── Topbar (mobile/tablet) ── */
        .topbar {
          display: none; align-items: center; justify-content: space-between;
          padding: 11px 16px; background: var(--bg2);
          border-bottom: 1px solid var(--border); flex-shrink: 0; z-index: 50;
        }

        /* ── Drawer ── */
        .drawer-mask {
          display:none; position:fixed; inset:0;
          background:rgba(0,0,0,.55); backdrop-filter:blur(2px); z-index:90;
        }
        .drawer {
          position:fixed; top:0; left:0; bottom:0; width:236px;
          background:var(--bg2); border-right:1px solid var(--border);
          z-index:100; display:flex; flex-direction:column;
          transform:translateX(-100%); transition:transform .22s ease;
        }
        .shell.mob-open .drawer-mask { display:block; }
        .shell.mob-open .drawer      { transform:translateX(0); }

        /* ── Nav active indicator ── */
        .nl.act::before {
          content:''; position:absolute; left:0; top:50%;
          transform:translateY(-50%); width:3px; height:60%;
          background:var(--blue3); border-radius:0 3px 3px 0;
        }
        .nl { position:relative; }

        /* ── Responsive ── */
        @media(max-width:1023px) {
          .sidebar     { display:none !important; }
          .topbar      { display:flex; }
          .main-scroll { height:calc(100dvh - 52px); }
          .main-pad    { padding:18px 20px; }
        }
        @media(max-width:639px) {
          .main-pad { padding: 14px 14px; }
        }
        @media(min-width:640px) and (max-width:1023px) {
          .main-pad { padding: 20px 24px; }
        }
      `}</style>

      {/* ── TOPBAR (mobile/tablet) ── */}
      <header className="topbar">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <CharisLogotipo height={28} variant={dark ? 'white' : 'color'} />
          {user && ROL_STYLE[rol] && (
            <span className={`badge ${ROL_STYLE[rol].badgeClass}`} style={{ padding:'2px 7px', borderRadius:10 }}>
              {ROL_STYLE[rol].label}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={toggleTheme}
                  style={{ background:'transparent', border:'none', fontSize:17,
                           cursor:'pointer', padding:4, color:'var(--txt)' }}>
            {dark ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setMobile(o => !o)}
                  style={{
                    background:'var(--bg4)', border:'1px solid var(--border)',
                    borderRadius:8, padding:'5px 10px', cursor:'pointer',
                    color:'var(--txt)', fontSize:17, lineHeight:1,
                  }}>☰</button>
        </div>
      </header>

      {/* ── MAIN SHELL ── */}
      <div className={`shell${mobileOpen ? ' mob-open' : ''}`}>

        {/* Desktop sidebar */}
        <aside className="sidebar" style={{ width:SW, minWidth:SW }}>
          <SidebarContent
            collapsed={collapsed} setCollapsed={setCollapsed}
            navItems={navItems} isActive={isActive}
            dark={dark} toggleTheme={toggleTheme}
            user={user} rol={rol}
            logout={logout} ROL_STYLE={ROL_STYLE}
            showCollapse
          />
        </aside>

        {/* Mobile drawer */}
        <div className="drawer-mask" onClick={() => setMobile(false)} />
        <div className="drawer">
          <SidebarContent
            collapsed={false} setCollapsed={() => {}}
            navItems={navItems} isActive={isActive}
            dark={dark} toggleTheme={toggleTheme}
            user={user} rol={rol}
            logout={logout} ROL_STYLE={ROL_STYLE}
            showCollapse={false}
          />
        </div>

        {/* Main content */}
        <main className="main-scroll">
          <div className="main-pad page-anim">{children}</div>
        </main>
      </div>
    </div>
  )
}

// ── Sidebar inner ──────────────────────────────────────────────────────
function SidebarContent({
  collapsed, setCollapsed, navItems, isActive,
  dark, toggleTheme, user, rol, logout, ROL_STYLE, showCollapse
}: any) {
  return (
    <>
      {/* Logo */}
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding: collapsed ? '16px 12px' : '16px 14px',
        borderBottom:'1px solid var(--border)', flexShrink:0,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {collapsed
          ? <CharisAppIcon size={36} />
          : <CharisLogotipo height={36} variant={dark ? 'white' : 'color'} />
        }
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column',
                    gap:3, overflowY:'auto' }}>
        {navItems.map((item: any) => (
          <Link
            key={item.href} href={item.href}
            className={`nl${isActive(item.href, item.exact) ? ' act' : ''}`}
            title={collapsed ? item.label : undefined}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <span style={{ fontSize:16, flexShrink:0, width:20, textAlign:'center' }}>
              {item.icon}
            </span>
            {!collapsed && <span style={{ fontSize:13.5 }}>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:'10px 8px', borderTop:'1px solid var(--border)',
                    display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>

        {/* Theme toggle */}
        <button className="cbtn2" onClick={toggleTheme}
                style={{ width:'100%', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <span style={{ fontSize:14 }}>{dark ? '☀️' : '🌙'}</span>
          {!collapsed && <span style={{ fontSize:12 }}>{dark ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>

        {/* User card */}
        {!collapsed && user && ROL_STYLE[rol] && (
          <div style={{
            padding:'10px 12px', borderRadius:10,
            background:'var(--bg4)', border:'1px solid var(--border)',
          }}>
            <div style={{ display:'flex', alignItems:'center',
                          justifyContent:'space-between', marginBottom:3 }}>
              <span style={{
                fontSize:12, fontWeight:600, color:'var(--txt)',
                overflow:'hidden', textOverflow:'ellipsis',
                whiteSpace:'nowrap', maxWidth:120,
              }}>{user.nombre}</span>
              <span className={`badge ${ROL_STYLE[rol].badgeClass}`} style={{ padding:'2px 7px', borderRadius:10, flexShrink:0, marginLeft:4 }}>
                {ROL_STYLE[rol].label}
              </span>
            </div>
            <div style={{
              fontSize:11, color:'var(--txt3)', overflow:'hidden',
              textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>{user.email}</div>
          </div>
        )}

        {/* Collapse (desktop only) */}
        {showCollapse && (
          <button className="cbtn2"
                  onClick={() => setCollapsed((c: boolean) => !c)}
                  style={{ width:'100%', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <span style={{ fontSize:13 }}>{collapsed ? '→' : '←'}</span>
            {!collapsed && <span style={{ fontSize:12 }}>Colapsar</span>}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="cbtn cbtn-danger cbtn-sm"
          style={{ width:'100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          <span>↩</span>
          {!collapsed && <span>Salir</span>}
        </button>
      </div>
    </>
  )
}
