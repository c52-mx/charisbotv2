'use client'
import { useState, useEffect, useContext } from 'react'
import { SHARED_CSS, getThemeVars, Combo } from '@/components/shared'
import { can, type SessionLike } from '@/lib/auth-shared'
import { ThemeContext } from '@/lib/theme-context'

// ── Types ─────────────────────────────────────────────────────────────
interface Product {
  producto_id:   string
  categoria:     string
  serie:         string | null
  modelo:        string | null
  color:         string | null
  nombre:        string
  marca:         string | null
  foto_url:      string | null
  atributos:     Record<string, any> | null
  activo:        boolean
  identificador: string | null
  ubicacion:     string | null
  stock:         number
  precio:        number
  creado_en:     string
}

interface FormState {
  categoria:     string
  serie:         string
  modelo:        string
  color:         string
  nombre:        string
  marca:         string
  foto_url:      string
  atributos:     string   // JSON string editado en textarea
  activo:        boolean
  identificador: string
  ubicacion:     string
  stock:         string
  precio:        string
}

const CATS = ['FUNDA', 'ACCESORIO', 'CARGADOR', 'MICA', 'OTRO']

const EMPTY_FORM: FormState = {
  categoria: 'FUNDA', serie: '', modelo: '', color: '', nombre: '',
  marca: '', foto_url: '', atributos: '', activo: true,
  identificador: '', ubicacion: '', stock: '0', precio: '0'
}

// ── Page ──────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const { dark }               = useContext(ThemeContext)
  const [userRol,   setUserRol]   = useState<SessionLike>({ rol:'VENDEDOR' })
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
  const [showImport, setShowImport]   = useState(false)
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const [stockBajoUmbral, setStockBajoUmbral] = useState(10)
  const [tiposList, setTiposList] = useState<string[]>([])
  const tiposOpts = tiposList.map(t => ({ value: t, label: t }))

  // ── Init ─────────────────────────────────────────────────────────
  // theme via ThemeContext (provided by admin layout)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUserRol(d.user || { rol:'VENDEDOR' }))
  }, [])

  useEffect(() => {
    fetch('/api/client/config').then(r => r.json()).then(d => {
      const n = parseInt(d.stock_bajo_umbral)
      if (Number.isFinite(n)) setStockBajoUmbral(n)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/tipos-case').then(r => r.json()).then(d => {
      setTiposList((d.items || []).map((t: any) => t.nombre))
    }).catch(() => {})
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
      categoria:    p.categoria || 'FUNDA',
      serie:        p.serie         || '',
      modelo:       p.modelo        || '',
      color:        p.color         || '',
      nombre:       p.nombre        || '',
      marca:        p.marca         || '',
      foto_url:     p.foto_url      || '',
      atributos:    p.atributos ? JSON.stringify(p.atributos, null, 2) : '',
      activo:       p.activo,
      identificador: p.identificador || '',
      ubicacion:    p.ubicacion || '',
      stock:        String(p.stock ?? 0),
      precio:       String(p.precio ?? 0),
    })
    setEditId(p.producto_id)
    setError('')
    setModal('edit')
  }

  // ── Save ──────────────────────────────────────────────────────────
  async function save() {
    if (form.categoria === 'FUNDA' && (!form.serie || !form.modelo || !form.color)) {
      setError('Para fundas, serie, modelo y color son obligatorios')
      return
    }
    if (form.categoria !== 'FUNDA' && !form.nombre.trim()) {
      setError('El nombre es obligatorio para accesorios/cargadores')
      return
    }

    let atributosObj: Record<string, any> | null = null
    if (form.atributos.trim()) {
      try { atributosObj = JSON.parse(form.atributos) }
      catch { setError('Los atributos deben ser JSON válido. Ej: {"material":"TPU"}'); return }
    }

    setSaving(true)
    setError('')

    const payload = {
      categoria:    form.categoria,
      serie:        form.serie.trim()   || null,
      modelo:       form.modelo.trim()  || null,
      color:        form.color.trim()   || null,
      nombre:       form.nombre.trim()  || null,
      marca:        form.marca.trim()   || null,
      foto_url:     form.foto_url.trim()|| null,
      atributos:    atributosObj,
      activo:       form.activo,
      identificador: form.identificador.trim() || null,
      ubicacion:    form.ubicacion.trim()     || null,
      stock:        Math.max(0, parseInt(form.stock) || 0),
      precio:       Math.max(0, parseFloat(form.precio) || 0),
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

  // ── Delete all ───────────────────────────────────────────────────
  async function deleteAll() {
    setDeletingAll(true)
    try {
      const res = await fetch('/api/catalog', { method: 'DELETE', headers: { 'x-confirm': 'BORRAR_TODO' } })
      if (!res.ok) throw new Error((await res.json()).error)
      setShowDeleteAll(false)
      fetchItems()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeletingAll(false)
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────
  async function toggleActivo(p: Product) {
    await fetch(`/api/catalog/${p.producto_id}`, {
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
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {canEdit && (
            <button className="cbtn cbtn-danger" onClick={() => setShowDeleteAll(true)}>🗑 Limpiar inventario</button>
          )}
          {canCreate && (
            <button className="cbtn cbtn-secondary" onClick={() => setShowImport(true)}>📥 Importar inventario</button>
          )}
          {canCreate && (
            <button className="cbtn cbtn-primary" onClick={openCreate}>+ Nuevo producto</button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="inp" style={inp({ maxWidth: 260 })}
          placeholder="🔍 Buscar modelo, color, identificador..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <div style={{ maxWidth: 160, width: 160 }}>
          <Combo
            value={filterTipo}
            onChange={setFilterTipo}
            options={[{ value:'', label:'Todos los tipos' }, ...tiposList.map(t => ({ value:t, label:t }))]}
          />
        </div>
        <div style={{ maxWidth: 140, width: 140 }}>
          <Combo
            value={filterAct}
            onChange={setFilterAct}
            options={[
              { value:'', label:'Todos' },
              { value:'true', label:'Activos' },
              { value:'false', label:'Inactivos' },
            ]}
          />
        </div>
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
                <th style={{ width: 48 }}></th>
                <th>Nombre / Producto</th>
                <th>Categoría</th>
                <th>Serie</th>
                <th>Modelo · Color</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Estado</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.producto_id}>
                  <td style={{ padding: '6px 8px' }}>
                    {p.foto_url
                      ? <img src={p.foto_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, background: 'var(--bg4)', border: '1px solid var(--border)' }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          {p.categoria === 'FUNDA' ? '📱' : p.categoria === 'CARGADOR' ? '🔌' : '📦'}
                        </div>
                    }
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)' }}>{p.nombre}</div>
                    {p.marca && <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{p.marca}</div>}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, background: 'rgba(26,143,227,0.1)',
                                   color: 'var(--blue3)', padding: '2px 8px',
                                   borderRadius: 4, fontWeight: 600 }}>
                      {p.categoria}
                    </span>
                  </td>
                  <td>
                    {p.serie
                      ? <span style={{ fontSize: 12, background: 'var(--bg4)', padding: '2px 7px', borderRadius: 4 }}>{p.serie}</span>
                      : <span style={{ color: 'var(--txt3)', fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {[p.modelo, p.color].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td>
                    <span className={`badge ${p.stock === 0 ? 'badge-red' : p.stock <= stockBajoUmbral ? 'badge-warn' : 'badge-ok'}`}>
                      {p.stock ?? 0}
                    </span>
                  </td>
                  <td>${Number(p.precio ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
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
                                onClick={() => toggleActivo(p as Product)}>
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

            {/* ── Row 1: categoria + activo ── */}
            <div className="g2" style={{ marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                  Categoría *
                </label>
                <Combo
                  value={form.categoria}
                  onChange={v => setForm(f => ({ ...f, categoria: v }))}
                  options={CATS.map(c => ({ value: c, label: c }))}
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

            {/* ── Row 2: nombre ── */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                Nombre{form.categoria !== 'FUNDA' ? ' *' : ''}
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--txt3)' }}>
                  {form.categoria === 'FUNDA' ? '(se autogenera de serie+modelo+color si se deja vacío)' : '(nombre visible en tienda)'}
                </span>
              </label>
              <input className="inp" style={inp()} placeholder="Ej: Cable USB-C 2m negro"
                     value={form.nombre}
                     onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>

            {/* ── Row 3: serie + marca ── */}
            <div className="g2" style={{ marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                  Serie{form.categoria === 'FUNDA' ? ' *' : ''}
                </label>
                <Combo
                  value={form.serie}
                  onChange={v => setForm(f => ({ ...f, serie: v }))}
                  options={[{ value: '', label: '— ninguna —' }, ...tiposOpts]}
                  placeholder="Seleccionar serie..."
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                  Marca
                </label>
                <input className="inp" style={inp()} placeholder="Ej: Motorola, Apple…"
                       value={form.marca}
                       onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} />
              </div>
            </div>

            {/* ── Row 4: modelo + color ── */}
            <div className="g2" style={{ marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                  Modelo{form.categoria === 'FUNDA' ? ' *' : ''}
                </label>
                <input className="inp" style={inp()} placeholder="Ej: SAMSUNG A07"
                       value={form.modelo}
                       onChange={e => setForm(f => ({ ...f, modelo: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                  Color{form.categoria === 'FUNDA' ? ' *' : ''}
                </label>
                <input className="inp" style={inp()} placeholder="Ej: NEGRO"
                       value={form.color}
                       onChange={e => setForm(f => ({ ...f, color: e.target.value.toUpperCase() }))} />
              </div>
            </div>

            {/* ── Row 5: foto ── */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                Foto del producto
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {form.foto_url && (
                  <img src={form.foto_url} alt="" style={{ width: 48, height: 48, objectFit: 'contain',
                    borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg4)', flexShrink: 0 }} />
                )}
                <input className="inp" style={inp({ flex: 1 })} placeholder="/api/files/catalog/foto.jpg"
                       value={form.foto_url}
                       onChange={e => setForm(f => ({ ...f, foto_url: e.target.value }))} />
                <label style={{ cursor: uploadingImg ? 'default' : 'pointer', flexShrink: 0 }}>
                  <span className="cbtn cbtn-secondary" style={{ pointerEvents: 'none', opacity: uploadingImg ? .5 : 1 }}>
                    {uploadingImg ? '…' : '📷 Subir'}
                  </span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingImg}
                    onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return
                      setUploadingImg(true)
                      try {
                        const fd = new FormData(); fd.append('file', f)
                        const res = await fetch('/api/upload/catalog-photo', { method: 'POST', body: fd })
                        const d = await res.json()
                        if (!res.ok) throw new Error(d.error)
                        setForm(frm => ({ ...frm, foto_url: d.url }))
                      } catch (err: any) {
                        setError(err.message)
                      } finally {
                        setUploadingImg(false)
                      }
                    }} />
                </label>
              </div>
            </div>

            {/* ── Row 6: identificador ── */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                Identificador
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--txt3)' }}>
                  (código de barras, SKU…)
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

            {/* ── Row 7: ubicacion + stock ── */}
            <div className="g2" style={{ marginBottom: 10 }}>
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

            {/* ── Row 8: precio ── */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                Precio por unidad (MXN)
              </label>
              <input
                type="number" min={0} step="0.01"
                className="inp"
                style={inp()}
                placeholder="0.00"
                value={form.precio}
                onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
              />
            </div>

            {/* ── Row 9: atributos ── */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>
                Atributos adicionales
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--txt3)' }}>
                  (JSON opcional — ej: {`{"material":"TPU","grosor":"1.5mm"}`})
                </span>
              </label>
              <textarea
                className="inp"
                style={{ ...inp(), minHeight: 68, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                placeholder={`{\n  "material": "TPU",\n  "grosor": "1.5mm"\n}`}
                value={form.atributos}
                onChange={e => setForm(f => ({ ...f, atributos: e.target.value }))}
              />
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

      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={() => fetchItems(page)} />}

      {/* Modal confirmación borrar todo */}
      {showDeleteAll && (
        <div className="modal-mask" onClick={e => { if (e.target === e.currentTarget) setShowDeleteAll(false) }}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'var(--txt)' }}>
                ⚠️ Limpiar inventario completo
              </div>
            </div>
            <div style={{ padding: '18px 22px 22px' }}>
              {error && <div style={{ padding:'9px 12px', borderRadius:8, background:'rgba(239,68,68,0.1)', color:'#f87171', fontSize:13, marginBottom:14 }}>{error}</div>}
              <p style={{ fontSize:13, color:'var(--txt2)', marginBottom:16 }}>
                Esto eliminará <strong style={{ color:'var(--txt)' }}>todos</strong> los productos del catálogo.
                Esta acción <strong style={{ color:'#f87171' }}>no se puede deshacer</strong>.
                Usa esta opción para hacer una carga limpia desde cero.
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <button className="cbtn cbtn-secondary" style={{ flex:1 }} onClick={() => setShowDeleteAll(false)}>Cancelar</button>
                <button className="cbtn cbtn-danger" style={{ flex:1 }} onClick={deleteAll} disabled={deletingAll}>
                  {deletingAll ? 'Borrando…' : '🗑 Sí, borrar todo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Importar inventario ────────────────────────────────────────────────
function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<{ creados: number; actualizados: number; errores: { fila: number; motivo: string }[] } | null>(null)

  async function handleImport() {
    if (!file) return
    setLoading(true); setError(''); setResultado(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/admin/catalog/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al importar')
      setResultado(data)
      onDone()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-mask" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>📥 Importar inventario</h2>
        <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 12 }}>
          Sube un archivo .xlsx con columnas <code>categoria, serie, nombre, marca, modelo, color, stock, precio, identificador, ubicacion</code>.
          Para fundas: <code>serie + modelo + color</code> obligatorios.
          Para accesorios/cargadores: <code>nombre</code> obligatorio.
          El stock del archivo <strong>remplaza</strong> el stock actual de cada producto.
        </p>
        <a href="/api/admin/catalog/import/template" style={{ fontSize: 13, color: 'var(--blue3)', display: 'inline-block', marginBottom: 14 }}>
          ⬇ Descargar plantilla
        </a>
        <input type="file" accept=".xlsx" className="inp" style={{ width: '100%', marginBottom: 14 }}
          onChange={e => { setFile(e.target.files?.[0] || null); setResultado(null) }} />

        {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>⚠ {error}</p>}

        {resultado && (
          <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: 'var(--bg4)', fontSize: 13 }}>
            <p>✅ {resultado.creados} creados · {resultado.actualizados} actualizados</p>
            {resultado.errores.length > 0 && (
              <div style={{ marginTop: 8, color: '#f87171' }}>
                <p style={{ fontWeight: 700 }}>{resultado.errores.length} fila(s) con error:</p>
                {resultado.errores.map((e, i) => <p key={i} style={{ fontSize: 12 }}>Fila {e.fila}: {e.motivo}</p>)}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="cbtn cbtn-secondary" onClick={onClose}>Cerrar</button>
          <button className="cbtn cbtn-primary" onClick={handleImport} disabled={!file || loading}>
            {loading ? 'Importando…' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  )
}
