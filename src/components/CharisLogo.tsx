'use client'
import React from 'react'

// ─────────────────────────────────────────────────────────────────────
// CHARIS LOGO — componente centralizado
// Paleta oficial:  azul oscuro #1565c0 · azul claro #4baef0
// ─────────────────────────────────────────────────────────────────────

interface IsotipoProps {
  /** Altura en px. El ancho se calcula proporcionalmente. */
  size?: number
  /** 'color' (default) | 'white' | 'mono' */
  variant?: 'color' | 'white' | 'mono'
}

/** Dos cases apiladas formando CH */
export function CharisIsotipo({ size = 48, variant = 'color' }: IsotipoProps) {
  const primary = variant === 'white' ? 'white'
                : variant === 'mono'  ? '#111'
                : '#1565c0'
  const accent  = variant === 'white' ? 'rgba(255,255,255,0.55)'
                : variant === 'mono'  ? '#555'
                : '#4baef0'
  const bg      = variant === 'white' ? 'rgba(255,255,255,0.08)'
                : 'transparent'

  const w = size * 0.88
  const h = size

  return (
    <svg width={w} height={h} viewBox="0 0 80 92" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Case trasera */}
      <rect x="26" y="1" width="52" height="68" rx="13" fill={bg} stroke={accent} strokeWidth="3.5"/>
      <rect x="40" y="5"  width="18" height="4.5" rx="2.25" fill={accent} opacity="0.65"/>
      <rect x="22.5" y="22" width="3.5" height="11" rx="1.75" fill={accent} opacity="0.5"/>
      <rect x="22.5" y="36" width="3.5" height="11" rx="1.75" fill={accent} opacity="0.5"/>
      <rect x="78.5" y="26" width="3.5" height="15" rx="1.75" fill={accent} opacity="0.45"/>
      {/* Case delantera */}
      <rect x="6"  y="18" width="52" height="68" rx="13" fill={variant === 'white' ? 'rgba(255,255,255,0.1)' : 'white'} stroke={primary} strokeWidth="3.5"/>
      <rect x="20" y="22" width="18" height="4.5" rx="2.25" fill={primary} opacity="0.6"/>
      <rect x="2.5" y="37" width="3.5" height="11" rx="1.75" fill={primary} opacity="0.6"/>
      <rect x="2.5" y="51" width="3.5" height="11" rx="1.75" fill={primary} opacity="0.6"/>
      <rect x="58.5" y="40" width="3.5" height="17" rx="1.75" fill={primary} opacity="0.55"/>
      {/* CH */}
      <text
        x="32" y="68"
        fontFamily="Arial Black, sans-serif"
        fontSize="22" fontWeight="900"
        fill={primary}
        textAnchor="middle" dominantBaseline="middle"
        letterSpacing="-1"
      >CH</text>
    </svg>
  )
}

interface LogotipoProps {
  height?: number
  variant?: 'color' | 'white' | 'mono'
  /** Mostrar solo isotipo sin texto */
  iconOnly?: boolean
}

export function CharisLogotipo({ height = 44, variant = 'color', iconOnly = false }: LogotipoProps) {
  const nameColor = variant === 'white' ? 'white'
                  : variant === 'mono'  ? '#111'
                  : '#1565c0'
  const subColor  = variant === 'white' ? 'rgba(255,255,255,0.55)'
                  : variant === 'mono'  ? '#555'
                  : '#4baef0'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: height * 0.22 }}>
      <CharisIsotipo size={height} variant={variant} />
      {!iconOnly && (
        <div style={{ lineHeight: 1.1 }}>
          <div style={{
            fontFamily: 'Arial Black, system-ui, sans-serif',
            fontWeight: 900,
            fontSize: height * 0.52,
            color: nameColor,
            letterSpacing: '0.05em',
          }}>
            CHARIS
          </div>
          <div style={{
            fontSize: height * 0.195,
            color: subColor,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            marginTop: 1,
          }}>
            Distribuidor Mayorista
          </div>
        </div>
      )}
    </div>
  )
}

/** Favicon cuadrado para usar en sidebar admin o app icon */
export function CharisAppIcon({ size = 36 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25,
      background: '#1565c0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 2px 10px rgba(21,101,192,0.35)',
    }}>
      <CharisIsotipo size={size * 0.78} variant="white" />
    </div>
  )
}

export default CharisLogotipo
