'use client'
import { useState, useEffect } from 'react'
import { SHARED_CSS, getThemeVars, Combo } from '@/components/shared'
import { can, type UserRol } from '@/lib/auth-shared'

// ── Types ─────────────────────────────────────────────────────────────
interface Product {
  case_id:      string
  tipo_case:    string
  modelo:       string
  color:        string
  activo:       boolean
  identificador: string | null
  ubicacion:    string | null
  stock:        number
  creado_en:    string
}

interface FormState {
  tipo_case:    string
  modelo:       string
  color:        string
  activo:       boolean
  identificador: string
  ubicacion:    string
  stock:        string
}

const TIPOS = ['3 EN 1', 'ESCUDO', 'BLINDAJE', 'ANILLO'].map(t => ({ value: t, label: t }))
const TIPOS_LIST = ['3 EN 1', 'ESCUDO', 'BLINDAJE', 'ANILLO']
const EMPTY_FORM: FormState = {
  tipo_case: '', modelo: '', color: '', activo: true, identificador: '', ubicacion: '', stock: '0'
}

// ── Page ──────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const [dark,      setDark]      = useState(true)
  const [userRol,   setUserRol]   = useState<UserRol>('VENDEDOR')
  const [items,     setItems]     = useState<Product[]>([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filterTipo,setFilterTipo]= useState('')
  const [filterAct, setFilterAct] = useState('')
  const [page,      setPage]      = useState(1)
  const PAGE_SIZE = 50

  // Modal state
  const [modal,     setModal]     = useState<'create' | 'edit' | null>(null)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  // ── Init ─────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('charis-theme')
    if (saved) setDark(saved === 'dark')
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUserRol(d.user?.rol || 'VENDEDOR'))
  }, [])

  // ── Fetch catalog ─────────────────────────────────────────────────
  async function fetchItems(p = page) {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p), size: String(PAGE_SIZE),
      ...(search     ? { search }              : {}),
      ...(filterTipo ? { tipo: filterTipo }    : {}),
      ...(filterAct  ? { activo: filterAct }   : {}),
    })
    try {
      const r    = await fetch(`/api/catalog?${params}`)
      const text = await r.text()
      if (!text) { setError('El servidor devolvió una respuesta vacía'); setLoading(false); return }
      const d = JSON.parse(text)
      if (!r.ok)  { setError(d.error || `Error ${r.status}`); setLoading(false); return }
      setItems(d.items || [])
      setTotal(d.total || 0)
      setError('')
    } catch (e: any) {
      setError('Error al cargar el catálogo: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems(1); setPage(1) }, [search, filterTipo, filterAct])

  // ── Open modals ───────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setError('')
    setModal('create')
  }

  function openEdit(p: Product) {
    setForm({
      tipo_case:    p.tipo_case,
      modelo:       p.modelo,
      color:        p.color,
      activo:       p.activo,
      identificador: p.identificador || '',
      ubicacion:    p.ubicacion || '',
      stock:        String(p.stock ?? 0),
    })
    setEditId(p.case_id)
    setError('')
    setModal('edit')
  }

  // ── Save ──────────────────────────────────────────────────────────
  async function save() {
    if (!form.tipo_case || !form.modelo || !form.color) {
      setError('Tipo, modelo y color son obligatorios')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      tipo_case:    form.tipo_case,
      modelo:       form.modelo,
      color:        form.color,
      activo:       form.activo,
      identificador: form.identificador.trim() || null,
      ubicacion:    form.ubicacion.trim()     || null,
      stock:        Math.max(0, parseInt(form.stock) || 0),
    }

    const isEdit = modal === 'edit' && editId
    const res = await fetch(
      isEdit ? `/api/catalog/${editId}` : '/api/catalog',
      { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    )
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error || 'Error al guardar'); return }
    setModal(null)
    fetchItems()
  }

  // ── Toggle active ─────────────────────────────────────────────────
  async function toggleActivo(p: Product) {
    await fetch(`/api/catalog/${p.case_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !p.activo })
    })
    fetchItems()
  }

  const tv         = getThemeVars(dark)
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const canEdit    = can(userRol, 'catalogo_editar')
  const canCreate  = can(userRol, 'catalogo_crear')

  // ── Input helper ──────────────────────────────────────────────────
  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--txt)', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', ...style
  })

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{ ...Object.fromEntries(Object.entries(tv)) as any }}>
      <style>{SHARED_CSS + `
        .inp:focus { border-color: var(--border2) !important; }
        .tw { overflow-x: auto; border-radius: 10px; border: 1px solid var(--border); }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
             padding: 10px 12px; color: var(--txt2); text-align: left; border-bottom: 1px solid var(--border); }
        td { font-size: 13px; padding: 10px 12px; border-bottom: 1px solid var(--border);
             color: var(--txt); vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: var(--bg4); }
        .badge { display: inline-flex; align-items: center; padding: 2px 9px;
                 border-radius: 20px; font-size: 11px; font-weight: 600; }
        .modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 200;
                      display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal-box  { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px;
                      width: 100%; max-width: 520px; max-height: 90dvh; overflow-y: auto; padding: 24px; }
        .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media(max-width:500px) { .g2 { grid-template-columns: 1fr; } }
        @media(max-width:639px) {
          .modal-mask { align-items: flex-end !important; padding: 0 !important; }
          .modal-box  { border-radius: 18px 18px 0 0 !important; max-width: 100% !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Catálogo de Productos</h1>
          <p style={{ fontSize: 13, color: 'var(--txt2)', margin: '3px 0 0' }}>
            {total.toLocaleString()} productos registrados
          </p>
        </div>
        {canCreate && (
          <button className="cbtn cbtn-primary" onClick={openCreate}>+ Nuevo producto</button>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="inp" style={inp({ maxWidth: 260 })}
          placeholder="🔍 Buscar modelo, color, identificador..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className="inp" style={inp({ maxWidth: 160 })}
                value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPOS_LIST.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="inp" style={inp({ maxWidth: 140 })}
                value={filterAct} onChange={e => setFilterAct(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="tw">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt2)' }}>Cargando…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt2)' }}>Sin resultados</div>
        ) : (
          <table className="rtable">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Modelo</th>
                <th>Color</th>
                <th>Identificador</th>
                <th>Ubicación</th>
                <th>Stock</th>
                <th>Estado</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.case_id}>
                  <td>
                    <span style={{ fontSize: 11, background: 'rgba(26,143,227,0.1)',
                                   color: 'var(--blue3)', padding: '2px 8px',
                                   borderRadius: 4, fontWeight: 500 }}>
                      {p.tipo_case}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.modelo}</td>
                  <td>{p.color}</td>
                  <td style={{ fontSize: 12, color: p.identificador ? 'var(--txt)' : 'var(--txt3)',
                               fontFamily: p.identificador ? 'monospace' : 'inherit' }}>
                    {p.identificador || '—'}
                  </td>
                  <td style={{ fontSize: 12, color: p.ubicacion ? 'var(--txt)' : 'var(--txt3)' }}>
                    {p.ubicacion || '—'}
                  </td>
                  <td>
                    <span className={`badge ${p.stock === 0 ? 'badge-red' : p.stock < 10 ? 'badge-warn' : 'badge-ok'}`}>
                      {p.stock ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.activo ? 'badge-ok' : 'badge-red'}`}>
                      {p.activo ? '● Activo' : '○ Inactivo'}
                    </span>
                  </td>
                  {canEdit && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="cbtn cbtn-ghost"
                                onClick={() => openEdit(p)}>Editar</button>
                        <button className="cbtn cbtn-ghost"
                                style={{ color: p.activo ? '#f87171' : '#34d399' }}
                                onClick={() => toggleActivo(p)}>
                          {p.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button className="cbtn cbtn-ghost" disabled={page <= 1}
                  onClick={() => { setPage(p => p - 1); fetchItems(page - 1) }}>← Anterior</button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--txt2)' }}>
            {page} / {totalPages}
          </span>
          <button className="cbtn cbtn-ghost" disabled={page >= totalPages}
                  onClick={() => { setPage(p => p + 1); fetchItems(page + 1) }}>Siguiente →</button>
        </div>
      )}

      {/* ── Modal: Create / Edit ── */}
      {modal && (
        <div className="modal-mask" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal-box">
            <h2 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 700 }}>
              {modal === 'create' ? 'Nuevo producto' : 'Editar producto'}
            </h2>

            {/* ── Row 1: tipo + activo ── */}
            <div className="g2" style={{ marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                  Tipo de case *
                </label>
                <Combo
                  value={form.tipo_case}
                  onChange={v => setForm(f => ({ ...f, tipo_case: v }))}
                  options={TIPOS}
                  placeholder="Seleccionar tipo..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'flex', alignItems: 'center',
                                gap: 8, cursor: 'pointer', paddingBottom: 6 }}>
                  <input type="checkbox" checked={form.activo}
                         onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
                  Producto activo
                </label>
              </div>
            </div>

            {/* ── Row 2: modelo + color ── */}
            <div className="g2" style={{ marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                  Modelo *
                </label>
                <input className="inp" style={inp()} placeholder="Ej: SAMSUNG A07"
                       value={form.modelo}
                       onChange={e => setForm(f => ({ ...f, modelo: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                  Color *
                </label>
                <input className="inp" style={inp()} placeholder="Ej: NEGRO"
                       value={form.color}
                       onChange={e => setForm(f => ({ ...f, color: e.target.value.toUpperCase() }))} />
              </div>
            </div>

            {/* ── Row 3: identificador (full width) ── */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                Identificador
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--txt3)' }}>
                  (código de barras, SKU, referencia interna…)
                </span>
              </label>
              <input
                className="inp"
                style={inp({ fontFamily: 'monospace', letterSpacing: '0.03em' })}
                placeholder="Ej: 7501234567890"
                value={form.identificador}
                onChange={e => setForm(f => ({ ...f, identificador: e.target.value }))}
              />
            </div>

            {/* ── Row 4: ubicacion + stock ── */}
            <div className="g2" style={{ marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                  Ubicación
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--txt3)' }}>
                    (estante, anaquel…)
                  </span>
                </label>
                <input
                  className="inp"
                  style={inp()}
                  placeholder="Ej: Estante 62, Anaquel 3"
                  value={form.ubicacion}
                  onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                  Stock disponible
                </label>
                <input
                  type="number" min={0}
                  className="inp"
                  style={inp()}
                  placeholder="0"
                  value={form.stock}
                  onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                />
              </div>
            </div>

            {error && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>⚠ {error}</p>
            )}

            {/* ── Actions ── */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="cbtn cbtn-secondary" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button className="cbtn cbtn-primary" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : modal === 'create' ? 'Crear producto' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
