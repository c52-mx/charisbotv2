'use client'
import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────
// THEME CONTEXT
// ─────────────────────────────────────────────
export function getThemeVars(dark: boolean) {
  return dark ? {
    '--bg':         '#070c14',
    '--bg2':        '#0b1220',
    '--bg3':        '#0f1a2e',
    '--bg4':        '#162238',
    '--border':     'rgba(26,143,227,0.15)',
    '--border2':    'rgba(26,143,227,0.4)',
    '--txt':        '#e8f4fd',
    '--txt2':       '#7a9ab8',
    '--txt3':       '#3d5a78',
    '--blue':       '#1a8fe3',
    '--blue2':      '#0d5fa3',
    '--blue3':      '#4baef0',
    '--glow':       'rgba(26,143,227,0.25)',
  } : {
    '--bg':         '#f0f4f8',
    '--bg2':        '#ffffff',
    '--bg3':        '#ffffff',
    '--bg4':        '#e8eef5',
    '--border':     'rgba(26,100,180,0.18)',
    '--border2':    'rgba(26,100,180,0.45)',
    '--txt':        '#0d2137',
    '--txt2':       '#3a6080',
    '--txt3':       '#8aaac4',
    '--blue':       '#1a7fd4',
    '--blue2':      '#0d5fa3',
    '--blue3':      '#0d5fa3',
    '--glow':       'rgba(26,143,227,0.18)',
  }
}

// ─────────────────────────────────────────────
// SHARED INLINE STYLE BLOCKS
// ─────────────────────────────────────────────
export const SHARED_CSS = `
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes dropIn  { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

  .page-anim { animation:fadeUp 0.3s ease-out; }

  .nav-link { display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;text-decoration:none;font-size:13.5px;font-weight:500;color:var(--txt2);transition:all 0.15s;white-space:nowrap;overflow:hidden;border:1px solid transparent;cursor:pointer; }
  .nav-link:hover { background:var(--bg4);color:var(--txt);border-color:var(--border); }
  .nav-link.active { background:rgba(26,143,227,0.12);color:var(--blue3);border-color:var(--border2);font-weight:600; }

  .cbtn { display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;transition:all 0.15s;border:none;white-space:nowrap; }
  .cbtn:disabled { opacity:0.5;cursor:not-allowed;transform:none!important; }
  .cbtn-primary { background:var(--blue);color:#fff; }
  .cbtn-primary:hover:not(:disabled) { background:var(--blue3);box-shadow:0 0 20px var(--glow);transform:translateY(-1px); }
  .cbtn-secondary { background:var(--bg4);color:var(--txt);border:1px solid var(--border)!important; }
  .cbtn-secondary:hover:not(:disabled) { background:var(--bg3);border-color:var(--border2)!important; }
  .cbtn-ghost { background:transparent;color:var(--txt2);border:1px solid var(--border)!important;padding:5px 10px;font-size:12px; }
  .cbtn-ghost:hover:not(:disabled) { background:var(--bg4);color:var(--txt); }
  .cbtn-danger { background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.25)!important; }
  .cbtn-danger:hover:not(:disabled) { background:rgba(239,68,68,0.22); }
  .cbtn-sm { padding:5px 10px;font-size:12px;border-radius:6px; }

  .cinput { width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;color:var(--txt);font-size:13px;font-family:inherit;outline:none;transition:all 0.15s; }
  .cinput:focus { border-color:var(--blue);box-shadow:0 0 0 3px var(--glow); }
  .cinput::placeholder { color:var(--txt3); }
  select.cinput { cursor:pointer; }
  textarea.cinput { resize:vertical;min-height:70px; }

  .ccard { background:var(--bg3);border:1px solid var(--border);border-radius:14px;transition:border-color 0.15s; }
  .ccard:hover { border-color:var(--border2); }

  .badge { display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap; }
  .badge-ok     { background:rgba(34,197,94,0.12);  color:#4ade80;  border:1px solid rgba(34,197,94,0.25); }
  .badge-warn   { background:rgba(245,158,11,0.12); color:#fbbf24;  border:1px solid rgba(245,158,11,0.25); }
  .badge-blue   { background:rgba(26,143,227,0.12); color:#4baef0;  border:1px solid rgba(26,143,227,0.25); }
  .badge-purple { background:rgba(99,102,241,0.12); color:#818cf8;  border:1px solid rgba(99,102,241,0.25); }
  .badge-red    { background:rgba(239,68,68,0.12);  color:#f87171;  border:1px solid rgba(239,68,68,0.25); }

  .ctable { width:100%;border-collapse:collapse; }
  .ctable thead tr { background:var(--bg2); }
  .ctable thead th { padding:11px 14px;text-align:left;font-size:10.5px;font-weight:700;color:var(--txt2);text-transform:uppercase;letter-spacing:0.09em;white-space:nowrap; }
  .ctable tbody tr { border-top:1px solid var(--border);transition:background 0.1s; }
  .ctable tbody tr:hover { background:var(--bg4); }
  .ctable tbody td { padding:11px 14px;font-size:13px;color:var(--txt);vertical-align:middle; }
  .table-wrap { border-radius:14px;overflow:hidden;border:1px solid var(--border); }

  .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeUp 0.15s ease; }
  .modal-box { background:var(--bg3);border:1px solid var(--border2);border-radius:18px;width:100%;max-height:90vh;overflow-y:auto;animation:fadeUp 0.2s ease;box-shadow:0 24px 64px rgba(0,0,0,0.4); }

  .stat-card { background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:18px 20px;transition:border-color 0.2s,transform 0.2s; }
  .stat-card:hover { border-color:var(--border2);transform:translateY(-2px); }

  .collapse-btn { display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:7px;border-radius:8px;font-size:12px;color:var(--txt2);background:transparent;border:1px solid var(--border);cursor:pointer;transition:all 0.15s;font-family:inherit; }
  .collapse-btn:hover { background:var(--bg4);color:var(--txt); }

  .combo-dropdown { position:absolute;top:calc(100% + 4px);left:0;min-width:100%;width:max-content;max-width:min(260px,90vw);background:var(--bg3);border:1px solid var(--border2);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.3);z-index:300;max-height:180px;overflow-y:auto;animation:dropIn 0.15s ease; }
  .combo-option { padding:8px 12px;font-size:13px;color:var(--txt);cursor:pointer;transition:background 0.1s; }
  .combo-option:hover,.combo-option.highlighted { background:var(--bg4); }
  .combo-option.selected { color:var(--blue);font-weight:600; }

  .img-thumb { width:72px;height:72px;border-radius:8px;object-fit:cover;border:1px solid var(--border);cursor:pointer;transition:transform 0.15s; }
  .img-thumb:hover { transform:scale(1.05); }
  .upload-zone { border:2px dashed var(--border);border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:border-color 0.15s; }
  .upload-zone:hover { border-color:var(--border2); }

  .theme-toggle { display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:500;background:var(--bg4);border:1px solid var(--border);color:var(--txt2);cursor:pointer;font-family:inherit;transition:all 0.15s; }
  .theme-toggle:hover { background:var(--bg3);color:var(--txt); }
`

// ─────────────────────────────────────────────
// COMBOBOX with search + free input option
// ─────────────────────────────────────────────
interface ComboOption { value: string; label?: string }

interface ComboProps {
  value: string
  onChange: (v: string) => void
  options: ComboOption[]
  placeholder?: string
  allowNew?: boolean   // allow typing custom value not in list
  disabled?: boolean
  style?: React.CSSProperties
}

export function Combo({ value, onChange, options, placeholder = 'Seleccionar...', allowNew = false, disabled, style }: ComboProps) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState(value)
  const [hi,     setHi]     = useState(-1)
  const ref  = useRef<HTMLDivElement>(null)
  const inp  = useRef<HTMLInputElement>(null)

  // Sync external value
  useEffect(() => { setSearch(value) }, [value])

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        // If not allowing new values, revert to last known good
        if (!allowNew) {
          const match = options.find(o => o.value === value || o.label === value)
          setSearch(match ? (match.label || match.value) : value)
        }
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [value, options, allowNew])

  const filtered = options.filter(o =>
    !search || (o.label || o.value).toLowerCase().includes(search.toLowerCase())
  )

  function select(opt: ComboOption) {
    onChange(opt.value)
    setSearch(opt.label || opt.value)
    setOpen(false)
    setHi(-1)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open && e.key !== 'Tab') { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHi(h => Math.max(h - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (hi >= 0 && filtered[hi]) { select(filtered[hi]); return }
      if (allowNew && search) { onChange(search); setOpen(false); return }
      if (filtered[0]) select(filtered[0])
    }
    if (e.key === 'Escape') { setOpen(false) }
  }

  function handleInput(v: string) {
    setSearch(v)
    setOpen(true)
    setHi(-1)
    if (allowNew) onChange(v)
  }

  function handleBlur() {
    // Small delay to allow click on option
    setTimeout(() => {
      if (allowNew) return // keep typed value
      const match = options.find(o => (o.label || o.value).toLowerCase() === search.toLowerCase())
      if (match) onChange(match.value)
    }, 150)
  }

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inp}
          className="cinput"
          value={search}
          placeholder={placeholder}
          disabled={disabled}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKey}
          autoComplete="off"
          style={{ paddingRight: 28 }}
        />
        <span
          onClick={() => { if (!disabled) { setOpen(o => !o); inp.current?.focus() } }}
          style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'var(--txt3)', cursor:'pointer', fontSize:10, userSelect:'none' }}
        >
          {open ? '▲' : '▼'}
        </span>
      </div>
      {open && filtered.length > 0 && (
        <div className="combo-dropdown">
          {filtered.map((opt, i) => (
            <div
              key={opt.value}
              className={`combo-option ${i === hi ? 'highlighted' : ''} ${opt.value === value ? 'selected' : ''}`}
              onMouseDown={e => { e.preventDefault(); select(opt) }}
              onMouseEnter={() => setHi(i)}
            >
              {opt.label || opt.value}
            </div>
          ))}
          {allowNew && search && !options.find(o => o.value === search) && (
            <div
              className="combo-option"
              style={{ fontStyle:'italic', color:'var(--txt2)' }}
              onMouseDown={e => { e.preventDefault(); onChange(search); setOpen(false) }}
            >
              Usar "{search}"
            </div>
          )}
        </div>
      )}
      {open && filtered.length === 0 && allowNew && search && (
        <div className="combo-dropdown">
          <div
            className="combo-option"
            style={{ fontStyle:'italic', color:'var(--txt2)' }}
            onMouseDown={e => { e.preventDefault(); onChange(search); setOpen(false) }}
          >
            Usar "{search}"
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// NUMBER INPUT - fixes the "can't clear" bug
// ─────────────────────────────────────────────
interface NumInputProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  style?: React.CSSProperties
  placeholder?: string
}

export function NumInput({ value, onChange, min = 0, max, style, placeholder }: NumInputProps) {
  const [raw, setRaw] = useState(String(value))

  useEffect(() => {
    // Only update if external value actually changed (avoids cursor jump)
    if (value !== parseFloat(raw)) setRaw(String(value))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setRaw(v)
    if (v === '' || v === '-') return // allow clearing
    const n = parseFloat(v)
    if (!isNaN(n)) {
      if (min !== undefined && n < min) return
      if (max !== undefined && n > max) return
      onChange(n)
    }
  }

  function handleBlur() {
    const n = parseFloat(raw)
    if (isNaN(n)) { setRaw(String(min ?? 0)); onChange(min ?? 0) }
    else if (min !== undefined && n < min) { setRaw(String(min)); onChange(min) }
    else { setRaw(String(n)); onChange(n) }
  }

  return (
    <input
      className="cinput"
      type="number"
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
      min={min}
      max={max}
      placeholder={placeholder}
      style={style}
    />
  )
}

// ─────────────────────────────────────────────
// IMAGE UPLOADER (max 3)
// ─────────────────────────────────────────────
interface ImgUploaderProps {
  pedidoId: string
  initialUrls?: string[]
  onUploaded?: (urls: string[]) => void
}

export function ImageUploader({ pedidoId, initialUrls = [], onUploaded }: ImgUploaderProps) {
  const [urls,      setUrls]      = useState<string[]>(initialUrls)
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const remaining = 3 - urls.length
    if (remaining <= 0) return
    const toUpload = Array.from(files).slice(0, remaining)

    setUploading(true)
    const fd = new FormData()
    fd.append('pedido_id', pedidoId)
    toUpload.forEach(f => fd.append('files', f))

    try {
      const r    = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await r.json()
      if (data.urls) {
        const newUrls = [...urls, ...data.urls]
        setUrls(newUrls)
        onUploaded?.(newUrls)
      }
    } catch (e) { console.error(e) }
    setUploading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {urls.map((url, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img
              src={url}
              alt={`Evidencia ${i+1}`}
              className="img-thumb"
              onClick={() => setPreview(url)}
            />
            <button
              onClick={() => {
                const next = urls.filter((_,idx)=>idx!==i)
                setUrls(next); onUploaded?.(next)
              }}
              style={{ position:'absolute',top:-6,right:-6,width:18,height:18,borderRadius:'50%',background:'#ef4444',border:'none',color:'white',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}
            >✕</button>
          </div>
        ))}
        {urls.length < 3 && (
          <div
            className="upload-zone"
            style={{ width:72, height:72, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}
            onClick={() => fileRef.current?.click()}
          >
            {uploading
              ? <div style={{ width:16,height:16,borderRadius:'50%',border:'2px solid rgba(26,143,227,0.2)',borderTopColor:'var(--blue)',animation:'spin 0.7s linear infinite' }}/>
              : <>
                  <span style={{ fontSize:20 }}>📎</span>
                  <span style={{ fontSize:10, color:'var(--txt3)' }}>{3-urls.length} más</span>
                </>
            }
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }}
             onChange={e => handleFiles(e.target.files)} />

      {/* Lightbox */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out' }}
        >
          <img src={preview} style={{ maxWidth:'90vw',maxHeight:'90vh',borderRadius:12,boxShadow:'0 0 40px rgba(0,0,0,0.8)' }} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// COLORS MANAGER MODAL
// ─────────────────────────────────────────────
export function ColorsManager({ onClose }: { onClose: () => void }) {
  const [colors,  setColors]  = useState<{id:number,nombre:string}[]>([])
  const [newColor,setNewColor]= useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    const r = await fetch('/api/colors')
    const d = await r.json()
    setColors(d.data || [])
  }
  useEffect(() => { load() }, [])

  async function addColor() {
    if (!newColor.trim()) return
    setLoading(true)
    await fetch('/api/colors', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({nombre:newColor}) })
    setNewColor('')
    await load()
    setLoading(false)
  }

  async function deleteColor(nombre: string) {
    if (!confirm(`¿Eliminar el color "${nombre}"?`)) return
    await fetch(`/api/colors?nombre=${encodeURIComponent(nombre)}`, { method:'DELETE' })
    await load()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth:380 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px 14px',borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:'var(--txt)' }}>🎨 Catálogo de colores</div>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--txt2)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ padding:'16px 20px 20px' }}>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <input className="cinput" placeholder="Nuevo color (ej: TURQUESA)" value={newColor}
                   onChange={e=>setNewColor(e.target.value.toUpperCase())}
                   onKeyDown={e=>e.key==='Enter'&&addColor()} />
            <button className="cbtn cbtn-primary cbtn-sm" onClick={addColor} disabled={loading || !newColor.trim()} style={{flexShrink:0}}>
              + Agregar
            </button>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {colors.map(c => (
              <div key={c.id} style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 8px 4px 10px',borderRadius:20,background:'var(--bg4)',border:'1px solid var(--border)',fontSize:12,fontWeight:500,color:'var(--txt)' }}>
                {c.nombre}
                <button onClick={()=>deleteColor(c.nombre)} style={{ background:'transparent',border:'none',color:'var(--txt3)',cursor:'pointer',fontSize:13,lineHeight:1,padding:0,display:'flex',alignItems:'center' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
