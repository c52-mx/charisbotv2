'use client'
import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────
// THEME VARS
// ─────────────────────────────────────────────────────────────────────
export function getThemeVars(dark: boolean) {
  return dark ? {
    // Backgrounds — menos negro puro, más azul profundo con más contraste entre capas
    '--bg':      '#060d18',   // base (ligeramente más azulado)
    '--bg2':     '#0c1628',   // sidebar / cards
    '--bg3':     '#111f38',   // inputs, hover rows
    '--bg4':     '#172540',   // hover states, badges bg
    // Borders — más visibles para definir mejor las secciones
    '--border':  'rgba(75,174,240,0.12)',
    '--border2': 'rgba(75,174,240,0.35)',
    // Text — más contraste en el texto principal
    '--txt':     '#eef4fc',
    '--txt2':    '#7fb3d4',
    '--txt3':    '#3d6080',
    // Blues
    '--blue':    '#1a8fe3',
    '--blue2':   '#0d5fa3',
    '--blue3':   '#4baef0',
    '--glow':    'rgba(26,143,227,0.22)',
    // Surface — para stat cards, modales
    '--surface': '#0e1d34',
    '--surface2':'#13243e',
  } : {
    // Claro — más cálido y aireado, menos frío
    '--bg':      '#f5f8fc',
    '--bg2':     '#ffffff',
    '--bg3':     '#edf2f8',
    '--bg4':     '#e2eaf4',
    '--border':  'rgba(26,100,180,0.14)',
    '--border2': 'rgba(26,100,180,0.38)',
    '--txt':     '#0a1e35',
    '--txt2':    '#3a6080',
    '--txt3':    '#8aaac4',
    '--blue':    '#1a7fd4',
    '--blue2':   '#0d5fa3',
    '--blue3':   '#1a7fd4',
    '--glow':    'rgba(26,127,212,0.15)',
    '--surface': '#ffffff',
    '--surface2':'#f0f5fb',
  }
}

// ─────────────────────────────────────────────────────────────────────
// SHARED CSS
// ─────────────────────────────────────────────────────────────────────
export const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes dropIn  { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pulse   { 0%,100% { opacity:1 } 50% { opacity:.5 } }

  *, *::before, *::after { box-sizing: border-box; }

  .page-anim { animation: fadeUp 0.28s ease-out; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar       { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 10px; }

  /* ── Nav link ── */
  .nl {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 10px;
    text-decoration: none; font-size: 13.5px; font-weight: 500;
    color: var(--txt2); transition: all .15s;
    white-space: nowrap; overflow: hidden;
    border: 1px solid transparent; cursor: pointer;
  }
  .nl:hover { background: var(--bg4); color: var(--txt); }
  .nl.act   {
    background: rgba(26,143,227,0.13); color: var(--blue3);
    border-color: var(--border2); font-weight: 600;
  }

  /* ── Buttons ── */
  .cbtn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 6px; padding: 9px 18px; border-radius: 9px;
    font-size: 13px; font-weight: 600; font-family: inherit;
    cursor: pointer; transition: all .15s; border: none;
    white-space: nowrap; letter-spacing: .01em;
  }
  .cbtn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }

  .cbtn-primary { background: var(--blue); color: #fff; }
  .cbtn-primary:hover:not(:disabled) {
    background: var(--blue3);
    box-shadow: 0 4px 20px var(--glow);
    transform: translateY(-1px);
  }
  .cbtn-secondary {
    background: var(--bg4); color: var(--txt);
    border: 1px solid var(--border) !important;
  }
  .cbtn-secondary:hover:not(:disabled) {
    background: var(--bg3); border-color: var(--border2) !important;
  }
  .cbtn-ghost {
    background: transparent; color: var(--txt2);
    border: 1px solid var(--border) !important;
    padding: 5px 12px; font-size: 12px; font-weight: 500;
  }
  .cbtn-ghost:hover:not(:disabled) { background: var(--bg4); color: var(--txt); }
  .cbtn-danger { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.2) !important; }
  .cbtn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.2); }
  .cbtn-sm { padding: 6px 12px; font-size: 12px; border-radius: 7px; }

  /* ── Card ── */
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 20px 22px;
  }
  .card-sm { border-radius: 10px; padding: 14px 16px; }

  /* ── Stat card ── */
  .stat-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 18px 20px;
    transition: border-color .2s, box-shadow .2s;
  }
  .stat-card:hover {
    border-color: var(--border2);
    box-shadow: 0 4px 24px var(--glow);
  }

  /* ── Table ── */
  .tw  { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
  table { width: 100%; border-collapse: collapse; }
  th {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .07em; padding: 11px 14px;
    color: var(--txt3); text-align: left;
    border-bottom: 1px solid var(--border);
    background: var(--bg3);
  }
  td {
    font-size: 13px; padding: 11px 14px;
    border-bottom: 1px solid var(--border);
    color: var(--txt); vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--bg4); transition: background .1s; }

  /* ── Badge ── */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 700; letter-spacing: .02em;
  }
  .badge-ok     { background: rgba(52,211,153,0.15); color: #34d399; }
  .badge-warn   { background: rgba(251,191,36,0.15);  color: #fbbf24; }
  .badge-red    { background: rgba(239,68,68,0.12);   color: #f87171; }
  .badge-blue   { background: rgba(75,174,240,0.15);  color: #4baef0; }
  .badge-purple { background: rgba(167,139,250,0.15); color: #a78bfa; }
  .badge-gray   { background: rgba(148,163,184,0.12); color: #94a3b8; }

  /* ── Modal ── */
  .modal-mask {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.65); backdrop-filter: blur(4px);
    z-index: 200; display: flex; align-items: center;
    justify-content: center; padding: 16px;
  }
  .modal-box {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 16px; width: 100%; max-width: 560px;
    max-height: 90dvh; overflow-y: auto; padding: 24px;
    box-shadow: 0 24px 60px rgba(0,0,0,.4);
  }

  /* ── Form ── */
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field-label {
    display: block; font-size: 11px; font-weight: 700;
    color: var(--txt3); text-transform: uppercase;
    letter-spacing: .07em; margin-bottom: 5px;
  }
  .field-input {
    width: 100%; padding: 9px 12px;
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 8px; color: var(--txt); font-size: 13px;
    font-family: inherit; outline: none; transition: border-color .15s;
    box-sizing: border-box;
  }
  .field-input:focus { border-color: var(--border2); background: var(--bg4); }

  /* ── Sidebar nav helper btn ── */
  .cbtn2 {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 10px; border-radius: 9px;
    border: 1px solid var(--border); background: transparent;
    color: var(--txt2); font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all .14s; font-family: inherit;
    white-space: nowrap; overflow: hidden;
  }
  .cbtn2:hover { background: var(--bg4); color: var(--txt); }

  /* ── Divider ── */
  .divider { height: 1px; background: var(--border); margin: 16px 0; }

  /* ── Empty state ── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 56px 24px; gap: 10px;
    color: var(--txt3); text-align: center;
  }
  .empty-state-icon { font-size: 36px; opacity: .5; }
  .empty-state-title { font-size: 15px; font-weight: 600; color: var(--txt2); }
  .empty-state-sub   { font-size: 13px; }

  /* ── Timeline ── */
  .timeline { display: flex; flex-direction: column; gap: 0; }
  .tl-item  { display: flex; gap: 14px; position: relative; padding-bottom: 18px; }
  .tl-item:last-child { padding-bottom: 0; }
  .tl-dot   {
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--blue); flex-shrink: 0; margin-top: 3px;
    box-shadow: 0 0 0 3px rgba(26,143,227,0.2);
  }
  .tl-dot.done { background: #34d399; box-shadow: 0 0 0 3px rgba(52,211,153,0.2); }
  .tl-dot.gray { background: var(--txt3); box-shadow: none; }
  .tl-item:not(:last-child) .tl-dot::after {
    content: ''; position: absolute;
    left: 5px; top: 15px; bottom: 0;
    width: 2px; background: var(--border);
  }
  .tl-content { flex: 1; min-width: 0; }
  .tl-title   { font-size: 13px; font-weight: 600; color: var(--txt); }
  .tl-time    { font-size: 11px; color: var(--txt3); margin-top: 2px; }
  .tl-desc    { font-size: 12px; color: var(--txt2); margin-top: 3px; }

  /* ── Order number chip ── */
  .order-num {
    font-family: 'DM Mono', monospace, system-ui;
    font-size: 12px; font-weight: 600;
    background: var(--bg4); color: var(--blue3);
    padding: 2px 8px; border-radius: 6px;
    border: 1px solid var(--border2);
    letter-spacing: .03em;
  }

  /* ─────── RESPONSIVE ─────── */

  /* Stat grid */
  .stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
  @media(max-width:900px) { .stat-grid { grid-template-columns: repeat(2,1fr); } }
  @media(max-width:420px) { .stat-grid { grid-template-columns: 1fr; } }

  /* Chart grid */
  .chart-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
  @media(max-width:900px) { .chart-grid { grid-template-columns: 1fr; } }

  /* Form grid */
  @media(max-width:500px) { .g2 { grid-template-columns: 1fr; } }

  /* Modal mobile */
  @media(max-width:639px) {
    .modal-mask { align-items: flex-end !important; padding: 0 !important; }
    .modal-box  {
      border-radius: 20px 20px 0 0 !important;
      max-height: 92dvh !important;
      width: 100% !important; max-width: 100% !important;
    }
  }

  /* Table → cards on mobile */
  @media(max-width:639px) {
    .rtable              { display: block !important; }
    .rtable thead        { display: none !important; }
    .rtable tbody        { display: flex !important; flex-direction: column; gap: 8px; }
    .rtable tr           {
      display: grid !important; grid-template-columns: 1fr 1fr;
      gap: 4px 8px; padding: 12px !important;
      border: 1px solid var(--border) !important;
      border-radius: 10px !important; background: var(--surface) !important;
    }
    .rtable td           { padding: 3px 4px !important; font-size: 12px !important; border: none !important; }
    .rtable td:first-child { grid-column: 1/-1; font-weight: 600; font-size: 13px !important; }
    .rtable td:last-child  { grid-column: 1/-1; }
    .no-mob { display: none !important; }
  }
`

// ─────────────────────────────────────────────────────────────────────
// COMBO COMPONENT (searchable dropdown)
// ─────────────────────────────────────────────────────────────────────
export interface ComboOption { value: string; label: string }

interface ComboProps {
  value: string
  onChange: (v: string) => void
  options: ComboOption[]
  placeholder?: string
  disabled?: boolean
}

export function Combo({ value, onChange, options, placeholder = 'Seleccionar...', disabled }: ComboProps) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const ref                   = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(o => !o); setQuery('') }}
        style={{
          width: '100%', padding: '9px 12px',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 8, color: selected ? 'var(--txt)' : 'var(--txt3)',
          fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'border-color .15s',
        }}
      >
        <span>{selected?.label ?? placeholder}</span>
        <span style={{ fontSize: 10, opacity: .6 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          marginTop: 4, background: 'var(--bg2)', border: '1px solid var(--border2)',
          borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.3)',
          overflow: 'hidden', animation: 'dropIn .15s ease-out',
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', padding: '6px 8px',
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--txt)', fontSize: 12,
                fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--txt3)' }}>Sin resultados</div>
              : filtered.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false); setQuery('') }}
                    style={{
                      width: '100%', padding: '9px 12px', textAlign: 'left',
                      background: o.value === value ? 'rgba(26,143,227,0.12)' : 'transparent',
                      color: o.value === value ? 'var(--blue3)' : 'var(--txt)',
                      border: 'none', fontSize: 13, fontFamily: 'inherit',
                      cursor: 'pointer', display: 'block',
                    }}
                    onMouseEnter={e => { if (o.value !== value) (e.currentTarget as HTMLElement).style.background = 'var(--bg4)' }}
                    onMouseLeave={e => { if (o.value !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {o.label}
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// NUM INPUT
// ─────────────────────────────────────────────────────────────────────
interface NumInputProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  style?: React.CSSProperties
}

export function NumInput({ value, onChange, min = 0, max = 9999, style }: NumInputProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, ...style }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 32, height: 34, borderRadius: '8px 0 0 8px',
          border: '1px solid var(--border)', background: 'var(--bg4)',
          color: 'var(--txt)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
        }}
      >−</button>
      <input
        type="number" value={value} min={min} max={max}
        onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        style={{
          width: 52, height: 34, textAlign: 'center',
          border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none',
          background: 'var(--bg3)', color: 'var(--txt)',
          fontSize: 13, fontFamily: 'inherit', outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 32, height: 34, borderRadius: '0 8px 8px 0',
          border: '1px solid var(--border)', background: 'var(--bg4)',
          color: 'var(--txt)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
        }}
      >+</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// IMAGE UPLOADER
// ─────────────────────────────────────────────────────────────────────
interface ImageUploaderProps {
  value?: string
  onChange: (v: string) => void
  label?: string
}

export function ImageUploader({ value, onChange, label = 'Imagen' }: ImageUploaderProps) {
  const inp = useRef<HTMLInputElement>(null)
  return (
    <div>
      <label className="field-label">{label}</label>
      <div
        onClick={() => inp.current?.click()}
        style={{
          border: '2px dashed var(--border2)', borderRadius: 10,
          padding: '16px', textAlign: 'center', cursor: 'pointer',
          background: 'var(--bg3)', transition: 'border-color .15s',
          minHeight: 80, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: 6,
        }}
      >
        {value
          ? <img src={value} alt="" style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 6 }} />
          : <>
              <span style={{ fontSize: 22 }}>📷</span>
              <span style={{ fontSize: 12, color: 'var(--txt3)' }}>Clic para subir imagen</span>
            </>
        }
      </div>
      <input ref={inp} type="file" accept="image/*" style={{ display: 'none' }}
             onChange={e => {
               const f = e.target.files?.[0]
               if (!f) return
               const reader = new FileReader()
               reader.onload = ev => onChange(ev.target?.result as string)
               reader.readAsDataURL(f)
             }} />
    </div>
  )
}
