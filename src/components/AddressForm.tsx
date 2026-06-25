'use client'
import { useState } from 'react'

export interface AddressFormValues {
  nombre_contacto: string
  telefono_contacto: string
  calle: string
  colonia: string
  ciudad: string
  estado_mx: string
  cp: string
  instrucciones_entrega: string
}

const EMPTY: AddressFormValues = {
  nombre_contacto: '', telefono_contacto: '', calle: '', colonia: '',
  ciudad: '', estado_mx: '', cp: '', instrucciones_entrega: '',
}

// Reusa las clases .input-field / .field-label que ya definen tanto
// client/account/page.tsx como client/checkout/page.tsx — este componente
// no trae su propio CSS, depende de que la página host ya las tenga.
export function AddressForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<AddressFormValues>
  onSave: (values: AddressFormValues) => void
  onCancel?: () => void
  saving?: boolean
}) {
  const [form, setForm] = useState<AddressFormValues>({ ...EMPTY, ...initial })

  const set = (k: keyof AddressFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label className="field-label">QUIÉN RECIBE *</label>
          <input className="input-field" value={form.nombre_contacto} onChange={set('nombre_contacto')} required />
        </div>
        <div>
          <label className="field-label">TELÉFONO DE CONTACTO *</label>
          <input className="input-field" value={form.telefono_contacto} onChange={set('telefono_contacto')} required />
        </div>
      </div>
      <div>
        <label className="field-label">CALLE Y NÚMERO *</label>
        <input className="input-field" placeholder="Av. Ejemplo 123, Int. 4" value={form.calle} onChange={set('calle')} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label className="field-label">COLONIA *</label>
          <input className="input-field" value={form.colonia} onChange={set('colonia')} required />
        </div>
        <div>
          <label className="field-label">CIUDAD *</label>
          <input className="input-field" value={form.ciudad} onChange={set('ciudad')} required />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label className="field-label">ESTADO *</label>
          <input className="input-field" value={form.estado_mx} onChange={set('estado_mx')} required />
        </div>
        <div>
          <label className="field-label">CÓDIGO POSTAL *</label>
          <input className="input-field" value={form.cp} onChange={set('cp')} required />
        </div>
      </div>
      <div>
        <label className="field-label">INSTRUCCIONES DE ENTREGA <span style={{ color: 'var(--txt3)', fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
        <textarea className="input-field" placeholder="Ej: Dejar con recepción, casa color azul, tocar timbre 2 veces..."
          value={form.instrucciones_entrega} onChange={set('instrucciones_entrega')} rows={2} style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : '💾 Guardar dirección'}
        </button>
      </div>
    </form>
  )
}
