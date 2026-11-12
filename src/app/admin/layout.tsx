'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Package, Boxes, UserRound, BarChart3, Users, KeyRound,
  Settings, GalleryHorizontal, Sun, Moon, Menu, LogOut, PanelLeftClose, PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react'
import { SHARED_CSS, getThemeVars } from '@/components/shared'
import { CharisAppIcon, CharisLogotipo } from '@/components/CharisLogo'
import { can, type UserRol, type Permiso } from '@/lib/auth-shared'
import { ThemeContext } from '@/lib/theme-context'
import { NotifBell } from '@/components/NotifBell'

const NAV_ITEMS: { href:string; label:string; Icon:LucideIcon; exact:boolean; perm:Permiso }[] = [
  { href:'/admin',          label:'Dashboard',     Icon:LayoutDashboard,   exact:true,  perm:'dashboard' },
  { href:'/admin/orders',   label:'Pedidos',       Icon:Package,           exact:false, perm:'pedidos_ver' },
  { href:'/admin/catalog',  label:'Catálogo',      Icon:Boxes,             exact:false, perm:'catalogo_ver' },
  { href:'/admin/clients',  label:'Clientes',      Icon:UserRound,         exact:false, perm:'clientes_ver' },
  { href:'/admin/reportes', label:'Reportes',      Icon:BarChart3,         exact:false, perm:'reportes_ver' },
  { href:'/admin/users',    label:'Usuarios',      Icon:Users,             exact:false, perm:'usuarios' },
  { href:'/admin/roles',    label:'Roles',         Icon:KeyRound,          exact:false, perm:'roles_editar' },
  { href:'/admin/config',   label:'Configuración', Icon:Settings,          exact:false, perm:'config_editar' },
  { href:'/admin/landing',  label:'Landing',       Icon:GalleryHorizontal, exact:false, perm:'landing_editar' },
]

const ROL_STYLE: Record<string,{label:string;badgeClass:string}> = {
  ADMIN:    { label:'Admin',    badgeClass:'badge-blue' },
  VENDEDOR: { label:'Vendedor', badgeClass:'badge-ok'   },
  ALMACEN:  { label:'Almacén',  badgeClass:'badge-warn' },
}
// Roles personalizados (creados desde /admin/roles) no tienen un estilo
// dedicado — se muestran con un badge neutro y su clave tal cual.
function rolStyle(rol: string) {
  return ROL_STYLE[rol] || { label: rol, badgeClass: 'badge-gray' }
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
        // rolTipo viaja en el JWT desde el login (Fase C.5); tokens viejos
        // no lo traen, así que se replica el fallback de siempre.
        const rolTipo = d.user?.rolTipo || (d.user?.rol === 'CLIENTE' ? 'CLIENTE' : 'INTERNO')
        if (rolTipo !== 'INTERNO') { router.push('/'); return }
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
  const navItems = NAV_ITEMS.filter(n => can(user, n.perm))
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  if (!ready) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                  height:'100vh', background: tv['--bg'] }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:32, height:32, borderRadius:'50%', margin:'0 auto 12px',
                      border:`2px solid ${tv['--border2']}`,
                      borderTopColor:tv['--blue3'], animation:'spin .7s linear infinite' }}/>
        <span style={{ fontSize:13, color:tv['--txt3'], fontFamily:'system-ui' }}>Cargando…</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const SW = collapsed ? 64 : 240

  return (
    <div style={{
      ...Object.fromEntries(Object.entries(tv)) as any,
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: 'var(--txt)', background: 'var(--bg)',
      height: '100dvh', width: '100vw',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <style>{SHARED_CSS + `
        /* ── Shell ── */
        .shell        { display:flex; flex:1; overflow:hidden; min-height:0; }
        .sidebar      {
          display:flex; flex-direction:column; height:100%;
          background: var(--bg2); border-right: 1px solid var(--border);
          overflow: hidden; transition: width .2s var(--ease); flex-shrink: 0;
        }
        .main-scroll  { flex:1; overflow-y:auto; overflow-x:hidden; min-width:0; }
        .main-pad     { padding:24px 32px; max-width:1440px; margin:0 auto; }

        /* ── Topbar (mobile/tablet) ── */
        .topbar {
          display: none; align-items: center; justify-content: space-between;
          height: 52px; padding: 0 16px; background: var(--bg2);
          border-bottom: 1px solid var(--border); flex-shrink: 0; z-index: 50;
        }
        .icon-btn {
          display:inline-flex; align-items:center; justify-content:center;
          width:36px; height:36px; border-radius:8px; border:1px solid transparent;
          background:transparent; color:var(--txt2); cursor:pointer;
          transition: background-color .15s var(--ease), color .15s var(--ease);
        }
        .icon-btn:hover { background:var(--bg3); color:var(--txt); }
        .icon-btn:focus-visible { outline:2px solid var(--blue); outline-offset:2px; }

        /* ── Drawer ── */
        .drawer-mask {
          display:none; position:fixed; inset:0;
          background:rgba(0,0,0,.55); z-index:90;
        }
        .drawer {
          position:fixed; top:0; left:0; bottom:0; width:256px;
          background:var(--bg2); border-right:1px solid var(--border);
          z-index:100; display:flex; flex-direction:column;
          transform:translateX(-100%); transition:transform .2s var(--ease);
        }
        .shell.mob-open .drawer-mask { display:block; }
        .shell.mob-open .drawer      { transform:translateX(0); }

        .bell-strip { display:flex; justify-content:flex-end; padding:8px 24px 0; flex-shrink:0; }
        @media(max-width:1023px) { .bell-strip { display:none; } }

        /* ── Responsive ── */
        @media(max-width:1023px) {
          .sidebar     { display:none !important; }
          .topbar      { display:flex; }
          .main-scroll { height:calc(100dvh - 52px); }
          .main-pad    { padding:16px 20px; }
        }
        @media(max-width:639px) {
          .main-pad { padding: 16px; }
        }
        @media(min-width:640px) and (max-width:1023px) {
          .main-pad { padding: 20px 24px; }
        }
      `}</style>

      {/* ── TOPBAR (mobile/tablet) ── */}
      <header className="topbar">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <CharisLogotipo height={28} variant={dark ? 'white' : 'color'} />
          {user && (
            <span className={`badge ${rolStyle(rol).badgeClass}`}>
              {rolStyle(rol).label}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          <NotifBell />
          <button className="icon-btn" onClick={toggleTheme} aria-label={dark ? 'Modo claro' : 'Modo oscuro'}>
            {dark ? <Sun size={18} strokeWidth={1.5}/> : <Moon size={18} strokeWidth={1.5}/>}
          </button>
          <button className="icon-btn" onClick={() => setMobile(o => !o)} aria-label="Menú">
            <Menu size={18} strokeWidth={1.5}/>
          </button>
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
            logout={logout} rolStyle={rolStyle}
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
            logout={logout} rolStyle={rolStyle}
            showCollapse={false}
          />
        </div>

        {/* Main content */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:0 }}>
        <div className="bell-strip"><NotifBell /></div>
        <main className="main-scroll">
          <div className="main-pad page-anim">
            <ThemeContext.Provider value={{ dark, toggle: toggleTheme }}>
              {children}
            </ThemeContext.Provider>
          </div>
        </main>
        </div>
      </div>
    </div>
  )
}

// ── Sidebar inner ──────────────────────────────────────────────────────
function SidebarContent({
  collapsed, setCollapsed, navItems, isActive,
  dark, toggleTheme, user, rol, logout, rolStyle, showCollapse
}: any) {
  const center = { justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? 0 : undefined } as const
  return (
    <>
      {/* Logo */}
      <div style={{
        display:'flex', alignItems:'center',
        height:64, padding: collapsed ? '0 12px' : '0 16px',
        borderBottom:'1px solid var(--border)', flexShrink:0,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {collapsed
          ? <CharisAppIcon size={32} />
          : <CharisLogotipo height={32} variant={dark ? 'white' : 'color'} />
        }
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'16px 12px', display:'flex', flexDirection:'column',
                    gap:2, overflowY:'auto' }}>
        {navItems.map((item: any) => (
          <Link
            key={item.href} href={item.href}
            className={`nl${isActive(item.href, item.exact) ? ' act' : ''}`}
            title={collapsed ? item.label : undefined}
            aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
            style={center}
          >
            <item.Icon size={18} strokeWidth={1.5} style={{ flexShrink:0 }} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:'12px', borderTop:'1px solid var(--border)',
                    display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>

        {/* User */}
        {!collapsed && user && (
          <div style={{ padding:'8px 12px 12px', minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center',
                          justifyContent:'space-between', gap:8, marginBottom:4 }}>
              <span style={{
                fontSize:13, fontWeight:500, color:'var(--txt)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>{user.nombre}</span>
              <span className={`badge ${rolStyle(rol).badgeClass}`} style={{ flexShrink:0 }}>
                {rolStyle(rol).label}
              </span>
            </div>
            <div style={{
              fontSize:12, color:'var(--txt3)', overflow:'hidden',
              textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>{user.email}</div>
          </div>
        )}

        {/* Theme toggle */}
        <button className="cbtn2" onClick={toggleTheme} style={center}>
          {dark ? <Sun size={18} strokeWidth={1.5} style={{flexShrink:0}}/> : <Moon size={18} strokeWidth={1.5} style={{flexShrink:0}}/>}
          {!collapsed && <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>

        {/* Collapse (desktop only) */}
        {showCollapse && (
          <button className="cbtn2" onClick={() => setCollapsed((c: boolean) => !c)} style={center}>
            {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.5} style={{flexShrink:0}}/> : <PanelLeftClose size={18} strokeWidth={1.5} style={{flexShrink:0}}/>}
            {!collapsed && <span>Colapsar</span>}
          </button>
        )}

        {/* Logout */}
        <button className="cbtn2" onClick={logout} style={center}>
          <LogOut size={18} strokeWidth={1.5} style={{flexShrink:0}}/>
          {!collapsed && <span>Salir</span>}
        </button>
      </div>
    </>
  )
}
