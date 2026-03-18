'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { SHARED_CSS, getThemeVars } from '@/components/shared'
import type { UserRol } from '@/lib/auth-shared'
import { ThemeContext } from '@/lib/theme-context'

const NAV_ITEMS = [
  { href:'/admin',         label:'Dashboard', icon:'📊', exact:true,  roles:['ADMIN'] },
  { href:'/admin/orders',  label:'Pedidos',   icon:'📦', exact:false, roles:['ADMIN','VENDEDOR','ALMACEN'] },
  { href:'/admin/catalog', label:'Catálogo',  icon:'🗂️', exact:false, roles:['ADMIN','VENDEDOR','ALMACEN'] },
  { href:'/admin/clients', label:'Clientes',  icon:'👤', exact:false, roles:['ADMIN','VENDEDOR'] },
  { href:'/admin/users',   label:'Usuarios',  icon:'👥', exact:false, roles:['ADMIN'] },
]

const ROL_STYLE: Record<string,{label:string,color:string,bg:string}> = {
  ADMIN:    { label:'Admin',    color:'#4baef0', bg:'rgba(26,143,227,0.15)' },
  VENDEDOR: { label:'Vendedor', color:'#34d399', bg:'rgba(52,211,153,0.15)' },
  ALMACEN:  { label:'Almacén',  color:'#fbbf24', bg:'rgba(251,191,36,0.15)' },
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

  // close drawer on route change
  useEffect(() => { setMobile(false) }, [pathname])

  function toggleTheme() {
    setDark(d => { const n=!d; localStorage.setItem('charis-theme',n?'dark':'light'); return n })
  }
  async function logout() {
    await fetch('/api/auth/me',{method:'DELETE'}); router.push('/')
  }

  const tv  = getThemeVars(dark)
  const rol: UserRol = user?.rol || 'VENDEDOR'
  const navItems = NAV_ITEMS.filter(n => n.roles.includes(rol))
  const isActive = (href: string, exact?: boolean) => exact ? pathname===href : pathname.startsWith(href)

  if (!ready) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:tv['--bg']}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid rgba(26,143,227,0.2)',borderTopColor:'#1a8fe3',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const SW = collapsed ? 60 : 216  // sidebar width

  return (
    <ThemeContext.Provider value={{ dark, toggle: toggleTheme }}>
    <div style={{ ...Object.fromEntries(Object.entries(tv)) as any,
                  fontFamily:"'DM Sans',system-ui,sans-serif", color:'var(--txt)', background:'var(--bg)',
                  height:'100dvh', width:'100%', overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <style>{SHARED_CSS + `
        @keyframes spin{to{transform:rotate(360deg)}}
        /* ── Shell ── */
        .shell{display:flex;flex:1;overflow:hidden;min-height:0;}
        .sidebar{display:flex;flex-direction:column;height:100%;background:var(--bg2);border-right:1px solid var(--border);overflow:hidden;transition:width .22s ease;flex-shrink:0;}
        .main-scroll{flex:1;overflow-y:auto;overflow-x:hidden;min-width:0;}
        .main-pad{padding:22px 26px;max-width:1280px;margin:0 auto;}

        /* ── Topbar (tablet/mobile only) ── */
        .topbar{display:none;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0;}

        /* ── Drawer ── */
        .drawer-mask{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:90;}
        .drawer{position:fixed;top:0;left:0;bottom:0;width:232px;background:var(--bg2);border-right:1px solid var(--border);z-index:100;display:flex;flex-direction:column;transform:translateX(-100%);transition:transform .22s ease;}
        .shell.mob-open .drawer-mask{display:block;}
        .shell.mob-open .drawer{transform:translateX(0);}

        /* ── Nav link ── */
        .nl{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:9px;text-decoration:none;font-size:13.5px;font-weight:500;color:var(--txt2);transition:all .14s;white-space:nowrap;overflow:hidden;border:1px solid transparent;cursor:pointer;}
        .nl:hover{background:var(--bg4);color:var(--txt);}
        .nl.act{background:rgba(26,143,227,0.12);color:var(--blue3);border-color:var(--border2);font-weight:600;}

        /* ── Responsive ── */
        @media(max-width:1023px){
          .sidebar{display:none!important;}
          .topbar{display:flex;}
          .main-scroll{height:calc(100dvh - 52px);}
          .main-pad{padding:16px 18px;}
        }
        @media(max-width:639px){
          .main-pad{padding:12px 12px;}
          /* tables → cards */
          .rtable{display:block!important;}
          .rtable thead{display:none!important;}
          .rtable tbody{display:flex!important;flex-direction:column;gap:8px;}
          .rtable tr{display:grid!important;grid-template-columns:1fr 1fr;gap:4px 6px;padding:10px!important;border:1px solid var(--border)!important;border-radius:10px!important;background:var(--bg3);}
          .rtable td{padding:3px 4px!important;font-size:12px!important;border:none!important;}
          .rtable td:first-child{grid-column:1/-1;font-weight:600;font-size:13px!important;}
          .rtable td:last-child{grid-column:1/-1;}
          .no-mob{display:none!important;}
          /* modal full bottom sheet */
          .modal-mask,.modal-overlay{align-items:flex-end!important;padding:0!important;}
          .modal-box{border-radius:18px 18px 0 0!important;max-height:92dvh!important;width:100%!important;max-width:100%!important;margin:0!important;}
          /* grid cols */
          .g2{grid-template-columns:1fr!important;}
        }
        @media(min-width:640px) and (max-width:1023px){
          .main-pad{padding:18px 22px;}
        }
        /* prevent horizontal overflow on mobile */
        *, *::before, *::after { box-sizing:border-box; }
        body { overflow-x:hidden; }
        /* stat grid */
        .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
        @media(max-width:900px){.stat-grid{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:420px){.stat-grid{grid-template-columns:1fr;}}
        /* modal */
        .modal-mask{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .modal-box{background:var(--bg2);border:1px solid var(--border);border-radius:14px;width:100%;max-width:560px;max-height:90dvh;overflow-y:auto;padding:22px;}
        /* form */
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        /* table wrap */
        .tw{overflow-x:auto;border-radius:10px;border:1px solid var(--border);}
        table{width:100%;border-collapse:collapse;}
        th{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;padding:10px 12px;color:var(--txt2);text-align:left;border-bottom:1px solid var(--border);}
        td{font-size:13px;padding:10px 12px;border-bottom:1px solid var(--border);color:var(--txt);vertical-align:middle;}
        tr:last-child td{border-bottom:none;}
        tr:hover td{background:var(--bg4);}
        /* badge */
        .badge{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;}
        /* collapse btn */
        .cbtn2{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--txt2);font-size:12px;font-weight:500;cursor:pointer;transition:all .14s;font-family:inherit;}
        .cbtn2:hover{background:var(--bg4);color:var(--txt);}
      `}</style>

      {/* ── TOPBAR (shown on tablet/mobile) ── */}
      <header className="topbar">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#1a8fe3,#0d5fa3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🤖</div>
          <span style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,color:'var(--txt)'}}>Charis</span>
          {user && ROL_STYLE[rol] && (
            <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10,background:ROL_STYLE[rol].bg,color:ROL_STYLE[rol].color}}>{ROL_STYLE[rol].label}</span>
          )}
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={toggleTheme} style={{background:'transparent',border:'none',fontSize:18,cursor:'pointer',padding:4,color:'var(--txt)'}}>{dark?'☀️':'🌙'}</button>
          <button onClick={()=>setMobile(o=>!o)}
                  style={{background:'var(--bg4)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',cursor:'pointer',color:'var(--txt)',fontSize:18,lineHeight:1}}>☰</button>
        </div>
      </header>

      {/* ── SHELL ── */}
      <div className={`shell${mobileOpen?' mob-open':''}`}>

        {/* Desktop sidebar */}
        <aside className="sidebar" style={{width:SW,minWidth:SW}}>
          <SidebarInner collapsed={collapsed} setCollapsed={setCollapsed}
                        navItems={navItems} isActive={isActive} dark={dark}
                        toggleTheme={toggleTheme} user={user} rol={rol}
                        logout={logout} ROL_STYLE={ROL_STYLE} showCollapse />
        </aside>

        {/* Mobile drawer */}
        <div className="drawer-mask" onClick={()=>setMobile(false)}/>
        <div className="drawer">
          <SidebarInner collapsed={false} setCollapsed={()=>{}}
                        navItems={navItems} isActive={isActive} dark={dark}
                        toggleTheme={toggleTheme} user={user} rol={rol}
                        logout={logout} ROL_STYLE={ROL_STYLE} showCollapse={false} />
        </div>

        {/* Main */}
        <main className="main-scroll">
          <div className="main-pad page-anim">{children}</div>
        </main>
      </div>
    </div>
    </ThemeContext.Provider>
  )
}

// ── Sidebar inner (reused for desktop + drawer) ───────────────────
function SidebarInner({collapsed,setCollapsed,navItems,isActive,dark,toggleTheme,user,rol,logout,ROL_STYLE,showCollapse}:any) {
  return <>
    {/* Logo */}
    <div style={{display:'flex',alignItems:'center',gap:9,padding:'14px 12px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
      <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#1a8fe3,#0d5fa3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🤖</div>
      {!collapsed && <span style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:'var(--txt)',whiteSpace:'nowrap'}}>Charis</span>}
    </div>

    {/* Nav */}
    <nav style={{flex:1,padding:'8px 6px',display:'flex',flexDirection:'column',gap:2,overflowY:'auto'}}>
      {navItems.map((item:any) => (
        <Link key={item.href} href={item.href}
              className={`nl${isActive(item.href,item.exact)?' act':''}`}
              title={collapsed?item.label:undefined}>
          <span style={{fontSize:15,flexShrink:0,width:20,textAlign:'center'}}>{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </Link>
      ))}
    </nav>

    {/* Footer */}
    <div style={{padding:'8px 6px',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:5,flexShrink:0}}>
      <button className="cbtn2" onClick={toggleTheme} style={{width:'100%'}}>
        <span style={{fontSize:14}}>{dark?'☀️':'🌙'}</span>
        {!collapsed && <span>{dark?'Modo claro':'Modo oscuro'}</span>}
      </button>

      {!collapsed && user && ROL_STYLE[rol] && (
        <div style={{padding:'8px 10px',borderRadius:9,background:'var(--bg4)',border:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:2}}>
            <span style={{fontSize:12,fontWeight:600,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:120}}>{user.nombre}</span>
            <span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:10,background:ROL_STYLE[rol].bg,color:ROL_STYLE[rol].color,flexShrink:0,marginLeft:4}}>{ROL_STYLE[rol].label}</span>
          </div>
          <div style={{fontSize:11,color:'var(--txt2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
        </div>
      )}

      {showCollapse && (
        <button className="cbtn2" onClick={()=>setCollapsed((c:boolean)=>!c)} style={{width:'100%'}}>
          <span>{collapsed?'→':'←'}</span>{!collapsed && <span>Colapsar</span>}
        </button>
      )}

      <button className="cbtn cbtn-danger cbtn-sm" style={{width:'100%',justifyContent:'center'}} onClick={logout}>
        <span>↩</span>{!collapsed && <span>Salir</span>}
      </button>
    </div>
  </>
}
