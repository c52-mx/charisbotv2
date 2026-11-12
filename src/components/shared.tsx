'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Camera, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────
// THEME VARS
// Rampa neutra (grafito) para superficies, bordes y texto; un solo acento
// azul de marca. Los colores semánticos (ok/warn/err/info) existen en ambos
// temas con contraste suficiente sobre su propio fondo.
// ─────────────────────────────────────────────────────────────────────
export function getThemeVars(dark: boolean) {
  return dark ? {
    // Superficies: cada capa sube un escalón
    '--bg':      '#0e0f11',   // base
    '--bg2':     '#141517',   // sidebar / paneles
    '--bg3':     '#1a1b1e',   // inputs, encabezados de tabla
    '--bg4':     '#222327',   // hover, chips
    // Bordes: hairlines del color de texto
    '--border':  'rgba(255,255,255,0.08)',
    '--border2': 'rgba(255,255,255,0.16)',
    // Texto: primario, secundario, tenue
    '--txt':     '#ececee',
    '--txt2':    '#a1a5ad',
    '--txt3':    '#80848c',
    // Acento (selección, enlaces, foco)
    '--blue':    '#5aa9ee',
    '--blue2':   '#2f6fb3',
    '--blue3':   '#5aa9ee',
    '--glow':    'transparent',
    '--sel':     'rgba(90,169,238,0.12)', // fila/ítem seleccionado
    // Acción primaria: en oscuro, blanco roto con texto oscuro
    '--primary':       '#ececee',
    '--primary-ink':   '#0e0f11',
    '--primary-hover': '#ffffff',
    // Semánticos
    '--ok':   '#6fcf97', '--ok-bg':   'rgba(111,207,151,0.12)',
    '--warn': '#e0b252', '--warn-bg': 'rgba(224,178,82,0.12)',
    '--err':  '#ef8a8a', '--err-bg':  'rgba(239,138,138,0.12)',
    '--info': '#5aa9ee', '--info-bg': 'rgba(90,169,238,0.12)',
    // Superficies elevadas
    '--surface': '#141517',
    '--surface2':'#1a1b1e',
  } : {
    '--bg':      '#f6f7f8',
    '--bg2':     '#ffffff',
    '--bg3':     '#f1f2f4',
    '--bg4':     '#e8eaed',
    '--border':  'rgba(13,17,23,0.09)',
    '--border2': 'rgba(13,17,23,0.20)',
    '--txt':     '#14171c',
    '--txt2':    '#4a5260',
    '--txt3':    '#6b7280',
    '--blue':    '#1565c0',
    '--blue2':   '#0d4f99',
    '--blue3':   '#1565c0',
    '--glow':    'transparent',
    '--sel':     'rgba(21,101,192,0.08)',
    '--primary':       '#1565c0',
    '--primary-ink':   '#ffffff',
    '--primary-hover': '#1976d2',
    '--ok':   '#15803d', '--ok-bg':   'rgba(21,128,61,0.10)',
    '--warn': '#a15c07', '--warn-bg': 'rgba(161,92,7,0.10)',
    '--err':  '#b42318', '--err-bg':  'rgba(180,35,24,0.08)',
    '--info': '#1565c0', '--info-bg': 'rgba(21,101,192,0.08)',
    '--surface': '#ffffff',
    '--surface2':'#f1f2f4',
  }
}

// ─────────────────────────────────────────────────────────────────────
// SHARED CSS
// ─────────────────────────────────────────────────────────────────────
export const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

  :root { --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; --ease: cubic-bezier(.2,0,0,1); }

  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  @keyframes dropIn  { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }

  *, *::before, *::after { box-sizing: border-box; }

  .page-anim { animation: fadeUp .24s var(--ease); }
  @media (prefers-reduced-motion: reduce) { .page-anim { animation: none; } }

  .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .num  { font-variant-numeric: tabular-nums; }

  /* ── Page titles ── */
  h1, h2, h3, h4 { color: var(--txt); margin: 0; font-weight: 600; }
  p               { margin: 0; }
  .page-title     { font-size: 24px; font-weight: 600; line-height: 1.2; color: var(--txt); letter-spacing: -.01em; }
  .page-subtitle  { font-size: 14px; color: var(--txt2); margin-top: 4px; }
  .page-header    {
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 12px;
    margin-bottom: 24px; flex-wrap: wrap;
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar       { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 10px; }

  /* ── Focus visible ── */
  .cbtn:focus-visible, .nl:focus-visible, .cbtn2:focus-visible, .cinput:focus-visible, .field-input:focus-visible {
    outline: 2px solid var(--blue); outline-offset: 2px;
  }

  /* ── Nav link ── */
  .nl {
    display: flex; align-items: center; gap: 12px;
    height: 36px; padding: 0 12px; border-radius: 8px;
    text-decoration: none; font-size: 14px; font-weight: 500;
    color: var(--txt2);
    white-space: nowrap; overflow: hidden;
    border: 1px solid transparent; cursor: pointer;
    transition: background-color .15s var(--ease), color .15s var(--ease), border-color .15s var(--ease);
  }
  .nl:hover { background: var(--bg3); color: var(--txt); }
  .nl.act   { background: var(--bg4); color: var(--txt); border-color: var(--border); }

  /* ── Buttons ── */
  .cbtn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 8px 16px; border-radius: 8px;
    font-size: 13px; font-weight: 500; font-family: inherit;
    cursor: pointer; border: none; white-space: nowrap;
    transition: background-color .15s var(--ease), border-color .15s var(--ease), color .15s var(--ease), transform .15s var(--ease);
  }
  .cbtn:active:not(:disabled) { transform: scale(.98); }
  .cbtn:disabled { opacity: .45; cursor: not-allowed; }

  .cbtn-primary { background: var(--primary); color: var(--primary-ink); font-weight: 600; }
  .cbtn-primary:hover:not(:disabled) { background: var(--primary-hover); }
  .cbtn-secondary {
    background: var(--bg3); color: var(--txt);
    border: 1px solid var(--border) !important;
  }
  .cbtn-secondary:hover:not(:disabled) { background: var(--bg4); border-color: var(--border2) !important; }
  .cbtn-ghost {
    background: transparent; color: var(--txt2);
    border: 1px solid var(--border) !important;
    padding: 4px 12px; font-size: 12px; font-weight: 500;
  }
  .cbtn-ghost:hover:not(:disabled) { background: var(--bg3); color: var(--txt); }
  .cbtn-danger { background: var(--err-bg); color: var(--err); border: 1px solid transparent !important; }
  .cbtn-danger:hover:not(:disabled) { border-color: var(--err) !important; }
  .cbtn-sm { padding: 4px 12px; font-size: 12px; border-radius: 6px; }

  /* ── Card ── */
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 20px 24px;
  }
  .card-sm { border-radius: 8px; padding: 12px 16px; }

  /* ── Stat card: etiqueta, cifra grande, sin adornos ── */
  .stat-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 16px 20px;
  }

  /* ── Table ── */
  .tw  { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
  table { width: 100%; border-collapse: collapse; }
  th {
    font-size: 12px; font-weight: 500;
    padding: 8px 16px; height: 36px;
    color: var(--txt3); text-align: left;
    border-bottom: 1px solid var(--border);
    background: var(--bg3);
  }
  td {
    font-size: 13px; padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    color: var(--txt); vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--bg3); }
  tr.sel td { background: var(--sel); }
  tr:focus-visible { outline: 2px solid var(--blue); outline-offset: -2px; }

  /* ── Badge: estado en texto con fondo tenue ── */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 6px;
    font-size: 12px; font-weight: 500;
  }
  .badge-ok     { background: var(--ok-bg);   color: var(--ok); }
  .badge-warn   { background: var(--warn-bg); color: var(--warn); }
  .badge-red    { background: var(--err-bg);  color: var(--err); }
  .badge-blue   { background: var(--info-bg); color: var(--info); }
  .badge-purple { background: var(--bg4);     color: var(--txt); }   /* estado final: neutro y tranquilo */
  .badge-gray   { background: var(--bg4);     color: var(--txt2); }

  /* ── Inputs ── */
  .cinput {
    width: 100%; padding: 8px 12px;
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 8px; color: var(--txt); font-size: 14px;
    font-family: inherit; outline: none;
    transition: border-color .15s var(--ease), background-color .15s var(--ease), box-shadow .15s var(--ease);
    box-sizing: border-box;
  }
  .cinput:focus { border-color: var(--blue); background: var(--bg2); box-shadow: 0 0 0 3px var(--sel); }
  .cinput::placeholder, .field-input::placeholder { color: var(--txt3); }

  /* ── Card variants ── */
  .ccard {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px;
  }

  /* ── Table wrapper ── */
  .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
  .ctable { width: 100%; border-collapse: collapse; }

  /* ── Modal ── */
  .modal-mask, .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.6);
    z-index: 200; display: flex; align-items: center;
    justify-content: center; padding: 16px;
  }
  .modal-box {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 16px; width: 100%; max-width: 560px;
    max-height: 90dvh; overflow-y: auto; padding: 24px;
    box-shadow: 0 16px 48px rgba(0,0,0,.28);
  }

  /* ── Form ── */
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .field-label {
    display: block; font-size: 12px; font-weight: 500;
    color: var(--txt2); margin-bottom: 8px;
  }
  .field-input {
    width: 100%; padding: 8px 12px;
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 8px; color: var(--txt); font-size: 14px;
    font-family: inherit; outline: none;
    transition: border-color .15s var(--ease), background-color .15s var(--ease), box-shadow .15s var(--ease);
    box-sizing: border-box;
  }
  .field-input:focus { border-color: var(--blue); background: var(--bg2); box-shadow: 0 0 0 3px var(--sel); }

  /* ── Sidebar nav helper btn ── */
  .cbtn2 {
    display: flex; align-items: center; gap: 12px;
    height: 36px; padding: 0 12px; border-radius: 8px;
    border: 1px solid transparent; background: transparent;
    color: var(--txt2); font-size: 13px; font-weight: 500;
    cursor: pointer; font-family: inherit;
    white-space: nowrap; overflow: hidden;
    transition: background-color .15s var(--ease), color .15s var(--ease);
  }
  .cbtn2:hover { background: var(--bg3); color: var(--txt); }

  /* ── Divider ── */
  .divider { height: 1px; background: var(--border); margin: 16px 0; }

  /* ── Empty state ── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 56px 24px; gap: 8px;
    color: var(--txt3); text-align: center;
  }
  .empty-state-icon { color: var(--txt3); display: flex; }
  .empty-state-title { font-size: 16px; font-weight: 500; color: var(--txt2); }
  .empty-state-sub   { font-size: 14px; }

  /* ── Timeline: línea de ruta con puntos de estado ── */
  .timeline { display: flex; flex-direction: column; gap: 0; }
  .tl-item  { display: flex; gap: 16px; position: relative; padding-bottom: 20px; }
  .tl-item:last-child { padding-bottom: 0; }
  .tl-dot   {
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--blue); flex-shrink: 0; margin-top: 4px;
  }
  .tl-dot.done { background: var(--ok); }
  .tl-dot.gray { background: var(--txt3); }
  .tl-item:not(:last-child) .tl-dot::after {
    content: ''; position: absolute;
    left: 5px; top: 16px; bottom: 0;
    width: 1px; background: var(--border2);
  }
  .tl-content { flex: 1; min-width: 0; }
  .tl-title   { font-size: 14px; font-weight: 500; color: var(--txt); }
  .tl-time    { font-size: 12px; color: var(--txt3); margin-top: 2px; font-variant-numeric: tabular-nums; }
  .tl-desc    { font-size: 13px; color: var(--txt2); margin-top: 4px; }

  /* ── Folio de pedido ── */
  .order-num {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 12px; font-weight: 500;
    background: var(--bg4); color: var(--txt);
    padding: 2px 8px; border-radius: 6px;
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
    .modal-mask, .modal-overlay { align-items: flex-end !important; padding: 0 !important; }
    .modal-box  {
      border-radius: 16px 16px 0 0 !important;
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
      border-radius: 8px !important; background: var(--surface) !important;
    }
    .rtable td           { padding: 4px !important; font-size: 12px !important; border: none !important; }
    .rtable td:first-child { grid-column: 1/-1; font-weight: 500; font-size: 13px !important; }
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
  allowNew?: boolean
}

export function Combo({ value, onChange, options, placeholder = 'Seleccionar...', disabled, allowNew }: ComboProps): JSX.Element {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div style={{ position: 'relative' }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setOpen(false); setQuery('') } }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(o => !o); setQuery('') }}
        style={{
          width: '100%', padding: '8px 12px',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 8, color: selected ? 'var(--txt)' : 'var(--txt3)',
          fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'border-color .15s var(--ease)',
        }}
      >
        <span>{selected?.label ?? placeholder}</span>
        {open ? <ChevronUp size={14} strokeWidth={1.5} color="var(--txt3)" /> : <ChevronDown size={14} strokeWidth={1.5} color="var(--txt3)" />}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          marginTop: 4, background: 'var(--bg2)', border: '1px solid var(--border2)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.2)',
          overflow: 'hidden', animation: 'dropIn .15s var(--ease)',
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar"
              style={{
                width: '100%', padding: '4px 8px',
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--txt)', fontSize: 13,
                fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--txt3)' }}>Sin resultados</div>
              : filtered.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false); setQuery('') }}
                    style={{
                      width: '100%', padding: '8px 12px', textAlign: 'left',
                      background: o.value === value ? 'var(--sel)' : 'transparent',
                      color: 'var(--txt)', fontWeight: o.value === value ? 500 : 400,
                      border: 'none', fontSize: 14, fontFamily: 'inherit',
                      cursor: 'pointer', display: 'block',
                    }}
                    onMouseEnter={e => { if (o.value !== value) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
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

export function NumInput({ value, onChange, min = 0, max = 9999, style }: NumInputProps): JSX.Element {
  const stepBtn: React.CSSProperties = {
    width: 36, height: 36, border: '1px solid var(--border)', background: 'var(--bg3)',
    color: 'var(--txt)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, ...style }}>
      <button type="button" aria-label="Restar" onClick={() => onChange(Math.max(min, value - 1))}
        style={{ ...stepBtn, borderRadius: '8px 0 0 8px' }}>
        <Minus size={14} strokeWidth={1.5} />
      </button>
      <input
        type="number" value={value} min={min} max={max}
        onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        style={{
          width: 52, height: 36, textAlign: 'center',
          border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none',
          background: 'var(--bg2)', color: 'var(--txt)',
          fontSize: 14, fontFamily: 'inherit', outline: 'none', fontVariantNumeric: 'tabular-nums',
        }}
      />
      <button type="button" aria-label="Sumar" onClick={() => onChange(Math.min(max, value + 1))}
        style={{ ...stepBtn, borderRadius: '0 8px 8px 0' }}>
        <Plus size={14} strokeWidth={1.5} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// IMAGE UPLOADER
// ─────────────────────────────────────────────────────────────────────
interface ImageUploaderProps {
  value?: string
  onChange?: (v: string) => void
  label?: string
  // Modo "pedido": sube de verdad a /api/upload en vez de solo convertir a base64
  pedidoId?: string
  initialUrls?: string[]
  onUploaded?: (urls: string[]) => void
  tipo?: string
}

export function ImageUploader({ value, onChange, label = 'Imagen', pedidoId, initialUrls, onUploaded, tipo = 'evidencias' }: ImageUploaderProps): JSX.Element {
  const inp = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<string[]>(initialUrls || [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setUrls(initialUrls || []) }, [pedidoId])

  const dropStyle: React.CSSProperties = {
    border: '1px dashed var(--border2)', borderRadius: 8,
    padding: 16, textAlign: 'center',
    background: 'var(--bg3)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexDirection: 'column', gap: 8,
    transition: 'border-color .15s var(--ease)',
  }

  // ── Modo pedido: sube archivos reales a /api/upload ──
  if (pedidoId) {
    async function handleFiles(files: FileList | null) {
      if (!files?.length) return
      setUploading(true); setError('')
      try {
        const fd = new FormData()
        fd.append('pedido_id', pedidoId!)
        fd.append('tipo', tipo)
        Array.from(files).forEach(f => fd.append('files', f))
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al subir')
        const next = [...urls, ...data.urls]
        setUrls(next)
        onUploaded?.(next)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setUploading(false)
      }
    }

    return (
      <div>
        <label className="field-label">{label}</label>
        {urls.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {urls.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer">
                <img src={u} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border2)' }} />
              </a>
            ))}
          </div>
        )}
        <div
          onClick={() => !uploading && inp.current?.click()}
          style={{ ...dropStyle, cursor: uploading ? 'wait' : 'pointer', minHeight: 64 }}
        >
          <Camera size={20} strokeWidth={1.5} color="var(--txt3)" />
          <span style={{ fontSize: 13, color: 'var(--txt3)' }}>{uploading ? 'Subiendo…' : 'Clic para subir imágenes'}</span>
        </div>
        {error && <p style={{ fontSize: 12, color: 'var(--err)', marginTop: 8 }}>{error}</p>}
        <input ref={inp} type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={uploading}
               onChange={e => handleFiles(e.target.files)} />
      </div>
    )
  }

  // ── Modo simple: convierte a base64 y deja el manejo al caller ──
  return (
    <div>
      <label className="field-label">{label}</label>
      <div
        onClick={() => inp.current?.click()}
        style={{ ...dropStyle, cursor: 'pointer', minHeight: 80 }}
      >
        {value
          ? <img src={value} alt="" style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 6 }} />
          : <>
              <Camera size={20} strokeWidth={1.5} color="var(--txt3)" />
              <span style={{ fontSize: 13, color: 'var(--txt3)' }}>Clic para subir imagen</span>
            </>
        }
      </div>
      <input ref={inp} type="file" accept="image/*" style={{ display: 'none' }}
             onChange={e => {
               const f = e.target.files?.[0]
               if (!f) return
               const reader = new FileReader()
               reader.onload = ev => onChange?.(ev.target?.result as string)
               reader.readAsDataURL(f)
             }} />
    </div>
  )
}
