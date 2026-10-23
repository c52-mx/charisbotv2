'use client'
import { useEffect, useState } from 'react'

// Campo de cantidad que se puede teclear: mantiene el texto local mientras se
// escribe (se puede borrar el "1" inicial y escribir 80) y solo confirma el
// valor —acotado a 1..max— al salir del campo o con Enter.
export default function QtyInput({ value, max, onCommit, className, style, ariaLabel }: {
  value: number
  max?: number
  onCommit: (n: number) => void
  className?: string
  style?: React.CSSProperties
  ariaLabel?: string
}) {
  const [txt, setTxt] = useState(String(value))
  useEffect(() => { setTxt(String(value)) }, [value])

  function commit() {
    let n = parseInt(txt, 10)
    if (!Number.isFinite(n) || n < 1) n = 1
    if (max !== undefined && n > max) n = Math.max(1, max)
    n = Math.min(n, 100000)
    setTxt(String(n))
    if (n !== value) onCommit(n)
  }

  return (
    <input
      type="text" inputMode="numeric" pattern="[0-9]*"
      className={className} style={style} aria-label={ariaLabel || 'Cantidad'}
      value={txt}
      onChange={e => setTxt(e.target.value.replace(/\D/g, '').slice(0, 6))}
      onFocus={e => e.target.select()}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
    />
  )
}
