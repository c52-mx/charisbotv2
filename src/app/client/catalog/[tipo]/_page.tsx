'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Config  { tipo_case:string; descripcion:string|null; foto_url:string|null }
interface Modelos { [marca:string]: { [modelo:string]: { colores:string[]; foto_url:string|null } } }
interface CartItem { tipo_case:string; marca:string; modelo:string; color:string; cantidad:number }

const SERIE_META: Record<string,{emoji:string}> = {
  '3 EN 1':{'emoji':'🎯'}, 'ESCUDO':{'emoji':'🛡️'}, 'BLINDAJE':{'emoji':'🔐'}, 'ANILLO':{'emoji':'💍'},
}

const CSS = `
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  .marca-row {
    border:1.5px solid #e2eaf4; border-radius:10px; overflow:hidden;
    margin-bottom:8px; transition:border-color .18s;
  }
  .marca-row.open { border-color:#4baef0; }

  .marca-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 16px; cursor:pointer; background:white;
    font-weight:700; font-size:14px; color:#0d2137;
    user-select:none; transition:background .15s;
  }
  .marca-header:hover { background:#f5f8fc; }

  .modelo-item {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 16px; border-top:1px solid #f0f4f8;
    cursor:pointer; transition:background .12s; gap:10px;
  }
  .modelo-item:hover { background:#f5f8fc; }
  .modelo-item.sel  { background:#eff6ff; }

  .color-pill {
    display:inline-flex; align-items:center; gap:5px;
    padding:5px 12px; border-radius:100px; border:1.5px solid #e2eaf4;
    font-size:12px; font-weight:600; cursor:pointer; background:white;
    transition:all .15s; color:#0d2137;
  }
  .color-pill:hover { border-color:#1565c0; background:#f0f6ff; }
  .color-pill.sel   { border-color:#1565c0; background:#1565c0; color:white; }

  .add-btn {
    padding:10px 20px; background:#1565c0; color:white; border:none;
    border-radius:9px; font-size:13px; font-weight:700; font-family:inherit;
    cursor:pointer; transition:all .18s; display:flex; align-items:center; gap:6px;
  }
  .add-btn:hover:not(:disabled) { background:#1976d2; transform:translateY(-1px); }
  .add-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }

  .cart-drawer {
    position:fixed; top:0; right:0; bottom:0; width:360px;
    background:white; box-shadow:-8px 0 40px rgba(0,0,0,0.15);
    z-index:200; display:flex; flex-direction:column;
    animation:slideIn .3s cubic-bezier(.4,0,.2,1);
  }
  @media(max-width:600px) { .cart-drawer { width:100vw; } }

  .cart-item {
    display:flex; align-items:flex-start; gap:10px;
    padding:12px 16px; border-bottom:1px solid #f0f4f8;
  }
  .qty-ctrl {
    display:flex; align-items:center; gap:0;
  }
  .qty-btn {
    width:28px; height:28px; border:1px solid #d0dde8; background:#f5f8fc;
    cursor:pointer; font-size:14px; color:#0d2137; transition:all .14s;
    display:flex; align-items:center; justify-content:center;
  }
  .qty-btn:hover { background:#e2eaf4; }

  .img-carousel { position:relative; border-radius:16px; overflow:hidden; background:#f0f4f8; }
  .img-track { display:flex; transition:transform .4s cubic-bezier(.4,0,.2,1); }
  .img-dot { width:7px; height:7px; border-radius:50%; cursor:pointer; transition:all .2s; border:none; padding:0; }
`

function ImgCarousel({ fotos, title }: { fotos:string[]; title:string }) {
  const [idx, setIdx] = useState(0)
  if (!fotos.length) return (
    <div style={{height:280,background:'linear-gradient(135deg,#e2eaf4,#f5f8fc)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:60,opacity:.4}}>📱</div>
  )
  return (
    <div className="img-carousel">
      <div className="img-track" style={{transform:`translateX(-${idx*100}%)`}}>
        {fotos.map((f,i) => (
          <div key={i} style={{minWidth:'100%',height:280}}>
            <img src={f} alt={`${title} ${i+1}`} style={{width:'100%',height:'100%',objectFit:'contain',padding:12}}/>
          </div>
        ))}
      </div>
      {fotos.length > 1 && (
        <>
          <button onClick={()=>setIdx(i=>(i-1+fotos.length)%fotos.length)} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.8)',border:'1px solid #e2eaf4',borderRadius:'50%',width:30,height:30,cursor:'pointer',fontSize:14,color:'#0d2137',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
          <button onClick={()=>setIdx(i=>(i+1)%fotos.length)} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.8)',border:'1px solid #e2eaf4',borderRadius:'50%',width:30,height:30,cursor:'pointer',fontSize:14,color:'#0d2137',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
          <div style={{position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',display:'flex',gap:5}}>
            {fotos.map((_,i) => (
              <button key={i} className="img-dot" onClick={()=>setIdx(i)} style={{background:i===idx?'#1565c0':'#d0dde8'}}/>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function SeriesDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const tipo    = decodeURIComponent((params?.tipo as string) || '')

  const [config,   setConfig]   = useState<Config|null>(null)
  const [byMarca,  setByMarca]  = useState<Modelos>({})
  const [fotos,    setFotos]    = useState<string[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [openMarca,setOpenMarca]= useState<string|null>(null)
  const [selModel, setSelModel] = useState<string|null>(null)
  const [selMarca, setSelMarca] = useState<string|null>(null)
  const [selColor, setSelColor] = useState<string|null>(null)
  const [qty,      setQty]      = useState(50)
  const [cart,     setCart]     = useState<CartItem[]>([])
  const [drawerOpen, setDrawer] = useState(false)
  const [addMsg,   setAddMsg]   = useState('')

  useEffect(() => {
    if (!tipo) return
    fetch(`/api/client/catalog/${encodeURIComponent(tipo)}`)
      .then(r=>r.json())
      .then(d => {
        setConfig(d.config)
        setByMarca(d.byMarca || {})
        setFotos(d.fotos || [])
        setLoading(false)
        // Abrir la primera marca por defecto
        const firstMarca = Object.keys(d.byMarca||{})[0]
        if (firstMarca) setOpenMarca(firstMarca)
      })
  }, [tipo])

  // Filtro de búsqueda
  const filteredMarcas = Object.entries(byMarca).reduce<Modelos>((acc,[marca,modelos])=>{
    if (!search) { acc[marca]=modelos; return acc }
    const filt = Object.entries(modelos).filter(([mod])=>
      mod.toLowerCase().includes(search.toLowerCase()) ||
      marca.toLowerCase().includes(search.toLowerCase())
    )
    if (filt.length) acc[marca]=Object.fromEntries(filt)
    return acc
  }, {})

  function handleSelectModel(marca:string, modelo:string) {
    if (selModel===modelo && selMarca===marca) {
      setSelModel(null); setSelMarca(null); setSelColor(null)
    } else {
      setSelModel(modelo); setSelMarca(marca); setSelColor(null)
    }
  }

  function addToCart() {
    if (!selModel || !selMarca || !selColor) return
    setCart(c => {
      const existing = c.findIndex(i=>i.modelo===selModel && i.color===selColor)
      if (existing>=0) {
        const nc=[...c]; nc[existing]={...nc[existing],cantidad:nc[existing].cantidad+qty}; return nc
      }
      return [...c, {tipo_case:tipo, marca:selMarca!, modelo:selModel!, color:selColor!, cantidad:qty}]
    })
    setAddMsg(`✓ ${selModel} · ${selColor} · ${qty} pzas`)
    setTimeout(()=>setAddMsg(''), 2500)
    setDrawer(true)
  }

  // Excel download
  function downloadTemplate() {
    const header = 'tipo_case\tmarca\tmodelo\tcolor\tcantidad\n'
    const rows = Object.entries(byMarca).flatMap(([marca,mods])=>
      Object.entries(mods).flatMap(([mod,data])=>
        data.colores.map(c=>`${tipo}\t${marca}\t${mod}\t${c}\t0`)
      )
    ).join('\n')
    const blob = new Blob([header+rows], {type:'text/tab-separated-values'})
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob)
    a.download=`template_${tipo.replace(/\s/g,'_')}.tsv`; a.click()
  }

  const cartTotal = cart.reduce((s,i)=>s+i.cantidad,0)
  const meta = SERIE_META[tipo] || {emoji:'📦'}

  return (
    <>
      <style>{CSS}</style>

      {/* Breadcrumb */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,fontSize:13,color:'#8aaac4'}}>
        <Link href="/client" style={{color:'#8aaac4',textDecoration:'none'}}>Inicio</Link>
        <span>›</span>
        <Link href="/client/catalog" style={{color:'#8aaac4',textDecoration:'none'}}>Catálogo</Link>
        <span>›</span>
        <span style={{color:'#0d2137',fontWeight:600}}>{meta.emoji} {tipo}</span>
        <button onClick={()=>router.back()} style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:5,padding:'6px 14px',borderRadius:100,border:'1.5px solid #d0dde8',background:'white',fontSize:12,fontWeight:600,color:'#3a6080',cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}
          onMouseEnter={e=>(e.currentTarget.style.borderColor='#1565c0')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#d0dde8')}>
          ← Volver a series
        </button>
      </div>

      {loading ? (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
          <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid #e2eaf4',borderTopColor:'#1565c0',animation:'spin .7s linear infinite'}}/>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:24,alignItems:'start',animation:'fadeUp .3s ease-out'}}>

          {/* ── PANEL IZQUIERDO: foto + info ── */}
          <div style={{position:'sticky',top:80}}>
            <ImgCarousel fotos={fotos} title={tipo}/>
            <div style={{marginTop:16,padding:'16px',background:'white',borderRadius:14,border:'1px solid #e2eaf4'}}>
              <h1 style={{fontFamily:'Arial Black,sans-serif',fontWeight:900,fontSize:20,color:'#0d2137',marginBottom:8}}>
                {meta.emoji} {tipo}
              </h1>
              <p style={{fontSize:13,color:'#3a6080',lineHeight:1.65}}>
                {config?.descripcion || 'Cases de alta calidad para tu celular.'}
              </p>
            </div>
          </div>

          {/* ── PANEL DERECHO: selección ── */}
          <div>
            {/* Header con buscador + acciones */}
            <div style={{background:'white',borderRadius:14,border:'1px solid #e2eaf4',padding:'14px 16px',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:12}}>
                <h2 style={{fontFamily:'Arial Black,sans-serif',fontWeight:900,fontSize:15,color:'#0d2137'}}>
                  Seleccionar marca y modelo
                </h2>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:12,color:'#8aaac4'}}>Cantidad predeterminada:</span>
                  <div style={{display:'flex',alignItems:'center'}}>
                    <button className="qty-btn" style={{borderRadius:'7px 0 0 7px'}} onClick={()=>setQty(q=>Math.max(1,q-1))}>−</button>
                    <input type="number" value={qty} min={1} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))}
                      style={{width:56,height:28,textAlign:'center',border:'1px solid #d0dde8',borderLeft:'none',borderRight:'none',fontSize:13,color:'#0d2137',fontFamily:'inherit',outline:'none'}}/>
                    <button className="qty-btn" style={{borderRadius:'0 7px 7px 0'}} onClick={()=>setQty(q=>q+1)}>+</button>
                  </div>
                </div>
              </div>

              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <input placeholder="🔍 Buscar modelo..." value={search} onChange={e=>setSearch(e.target.value)}
                  style={{flex:1,minWidth:180,padding:'8px 12px',borderRadius:9,border:'1.5px solid #d0dde8',background:'#f5f8fc',fontSize:13,color:'#0d2137',fontFamily:'inherit',outline:'none',transition:'border-color .18s'}}
                  onFocus={e=>e.currentTarget.style.borderColor='#1565c0'} onBlur={e=>e.currentTarget.style.borderColor='#d0dde8'}
                />
                <button onClick={downloadTemplate} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:9,border:'1.5px solid #22c55e',background:'rgba(34,197,94,0.07)',color:'#16a34a',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s',whiteSpace:'nowrap'}}>
                  ↓ Descargar plantilla
                </button>
              </div>
            </div>

            {/* Marcas acordeón */}
            <div>
              {Object.entries(filteredMarcas).map(([marca, modelos]) => (
                <div key={marca} className={`marca-row${openMarca===marca?' open':''}`}>
                  <div className="marca-header" onClick={()=>setOpenMarca(m=>m===marca?null:marca)}>
                    <span>{marca} <span style={{fontSize:12,color:'#8aaac4',fontWeight:400}}>({Object.keys(modelos).length} modelos)</span></span>
                    <span style={{fontSize:12,color:'#8aaac4',transition:'transform .2s',transform:openMarca===marca?'rotate(180deg)':'none'}}>▼</span>
                  </div>

                  {openMarca === marca && (
                    <div>
                      {Object.entries(modelos).map(([modelo, data]) => (
                        <div key={modelo}>
                          <div className={`modelo-item${selModel===modelo&&selMarca===marca?' sel':''}`}
                               onClick={()=>handleSelectModel(marca,modelo)}>
                            <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                              {selModel===modelo&&selMarca===marca
                                ? <span style={{color:'#1565c0',fontWeight:900,fontSize:14}}>−</span>
                                : <span style={{color:'#8aaac4',fontSize:14}}>+</span>
                              }
                              <span style={{fontSize:13.5,fontWeight:600,color:'#0d2137'}}>{modelo}</span>
                            </div>
                            <button style={{padding:'4px 12px',borderRadius:100,background:selModel===modelo&&selMarca===marca?'#1565c0':'#f0f4f8',color:selModel===modelo&&selMarca===marca?'white':'#3a6080',border:'none',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                              Todos
                            </button>
                          </div>

                          {/* Colores expandidos */}
                          {selModel===modelo && selMarca===marca && (
                            <div style={{padding:'10px 16px 14px',background:'#fafcff',borderTop:'1px solid #f0f4f8'}}>
                              <p style={{fontSize:11,fontWeight:700,color:'#8aaac4',letterSpacing:'.06em',marginBottom:8}}>SELECCIONA EL COLOR</p>
                              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
                                {data.colores.map(c=>(
                                  <button key={c} className={`color-pill${selColor===c?' sel':''}`} onClick={e=>{e.stopPropagation();setSelColor(c)}}>
                                    <span style={{width:10,height:10,borderRadius:'50%',background:c==='NEGRO'?'#111':c==='BLANCO'||c==='TRANSPARENTE'?'#f0f0f0':c==='ROJO'?'#ef4444':c==='AZUL'?'#3b82f6':c==='VERDE'?'#22c55e':c==='ROSA'?'#ec4899':c==='MORADO'?'#a855f7':'#94a3b8',border:'1px solid rgba(0,0,0,0.1)',flexShrink:0}}/>
                                    {c}
                                  </button>
                                ))}
                              </div>
                              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                                <button className="add-btn" disabled={!selColor} onClick={addToCart}>
                                  🛒 Agregar al carrito
                                  {selColor&&<span style={{background:'rgba(255,255,255,0.2)',padding:'1px 7px',borderRadius:100,fontSize:11}}>{qty} pzas</span>}
                                </button>
                                {addMsg && <span style={{fontSize:12,color:'#22c55e',fontWeight:600}}>{addMsg}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CART BUTTON FLOTANTE ── */}
      {cart.length > 0 && !drawerOpen && (
        <button onClick={()=>setDrawer(true)} style={{position:'fixed',bottom:24,right:24,display:'flex',alignItems:'center',gap:8,padding:'12px 20px',borderRadius:100,background:'#1565c0',color:'white',border:'none',cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit',boxShadow:'0 8px 32px rgba(21,101,192,0.4)',zIndex:100,transition:'all .2s'}}
          onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-2px)')} onMouseLeave={e=>(e.currentTarget.style.transform='none')}>
          🛒 Ver carrito
          <span style={{background:'rgba(255,255,255,0.25)',padding:'2px 8px',borderRadius:100,fontSize:12}}>{cartTotal} pzas</span>
        </button>
      )}

      {/* ── CART DRAWER ── */}
      {drawerOpen && (
        <>
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:199,backdropFilter:'blur(2px)'}} onClick={()=>setDrawer(false)}/>
          <div className="cart-drawer">
            {/* Header */}
            <div style={{padding:'16px 20px',borderBottom:'1px solid #e2eaf4',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div>
                <h3 style={{fontFamily:'Arial Black,sans-serif',fontWeight:900,fontSize:16,color:'#0d2137'}}>🛒 Carrito</h3>
                <p style={{fontSize:12,color:'#8aaac4',marginTop:2}}>{cart.length} artículo{cart.length!==1?'s':''} · {cartTotal} piezas total</p>
              </div>
              <button onClick={()=>setDrawer(false)} style={{background:'#f0f4f8',border:'none',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:16,color:'#3a6080',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>

            {/* Items */}
            <div style={{flex:1,overflowY:'auto'}}>
              {cart.length === 0 ? (
                <div style={{padding:40,textAlign:'center',color:'#8aaac4'}}>
                  <div style={{fontSize:36,marginBottom:10}}>🛒</div>
                  <p style={{fontSize:14}}>El carrito está vacío</p>
                </div>
              ) : cart.map((item,i) => (
                <div key={i} className="cart-item">
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:700,color:'#0d2137',marginBottom:2}}>{item.modelo}</p>
                    <p style={{fontSize:11,color:'#8aaac4'}}>{item.tipo_case} · {item.marca} · {item.color}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                    <div className="qty-ctrl">
                      <button className="qty-btn" style={{borderRadius:'6px 0 0 6px'}} onClick={()=>setCart(c=>c.map((it,j)=>j===i?{...it,cantidad:Math.max(1,it.cantidad-1)}:it))}>−</button>
                      <span style={{width:40,height:28,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #d0dde8',borderLeft:'none',borderRight:'none',fontSize:12,fontWeight:600,color:'#0d2137'}}>{item.cantidad}</span>
                      <button className="qty-btn" style={{borderRadius:'0 6px 6px 0'}} onClick={()=>setCart(c=>c.map((it,j)=>j===i?{...it,cantidad:it.cantidad+1}:it))}>+</button>
                    </div>
                    <button onClick={()=>setCart(c=>c.filter((_,j)=>j!==i))} style={{background:'rgba(239,68,68,0.1)',border:'none',borderRadius:6,width:28,height:28,cursor:'pointer',color:'#ef4444',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div style={{padding:'16px 20px',borderTop:'1px solid #e2eaf4',flexShrink:0}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:13,color:'#0d2137'}}>
                  <span style={{fontWeight:600}}>Total piezas:</span>
                  <span style={{fontWeight:900,color:'#1565c0'}}>{cartTotal}</span>
                </div>
                <Link href="/client/checkout" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,width:'100%',padding:'13px',borderRadius:10,background:'#1565c0',color:'white',fontSize:14,fontWeight:700,textDecoration:'none',transition:'all .18s',boxSizing:'border-box'}}
                  onClick={()=>{ localStorage.setItem('charis-cart', JSON.stringify(cart)); setDrawer(false) }}>
                  Confirmar pedido →
                </Link>
                <button onClick={()=>setCart([])} style={{width:'100%',marginTop:8,padding:'9px',borderRadius:9,border:'1.5px solid #e2eaf4',background:'transparent',color:'#8aaac4',fontSize:12,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor='#ef4444')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#e2eaf4')}>
                  Vaciar carrito
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
