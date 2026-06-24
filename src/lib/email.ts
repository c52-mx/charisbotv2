// src/lib/email.ts
// Servicio de email con Resend

const RESEND_API_KEY  = process.env.RESEND_API_KEY  || ''
const FROM_EMAIL      = process.env.RESEND_FROM_EMAIL || 'noreply@charis.com.mx'
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.codigo52-crm.cloud'

interface SendEmailParams {
  to:      string
  subject: string
  html:    string
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurada')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('[email] Resend error:', err)
      return false
    }
    return true
  } catch (e) {
    console.error('[email] Error enviando email:', e)
    return false
  }
}

// ── Templates ─────────────────────────────────────────────────────────

export function emailVerificacion(nombre: string, token: string): string {
  const url = `${APP_URL}/verify-email?token=${token}`
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#1565c0;padding:28px 36px;text-align:center;">
          <p style="margin:0;font-size:28px;font-weight:900;color:white;letter-spacing:2px;">CHARIS</p>
          <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:3px;">DISTRIBUIDOR MAYORISTA</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px;">
          <p style="margin:0 0 16px;font-size:22px;font-weight:900;color:#0d2137;">¡Hola, ${nombre}!</p>
          <p style="margin:0 0 24px;font-size:15px;color:#3a6080;line-height:1.6;">
            Gracias por registrarte en el portal de Charis. Para activar tu cuenta, confirma tu correo electrónico haciendo clic en el botón:
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${url}" style="display:inline-block;padding:14px 36px;background:#1565c0;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:100px;letter-spacing:.5px;">
              ✓ Verificar mi correo
            </a>
          </div>
          <p style="margin:24px 0 0;font-size:12px;color:#8aaac4;text-align:center;line-height:1.6;">
            Este enlace expira en 24 horas.<br>
            Si no creaste esta cuenta, ignora este mensaje.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f5f8fc;padding:20px 36px;text-align:center;border-top:1px solid #e2eaf4;">
          <p style="margin:0;font-size:12px;color:#8aaac4;">© 2026 Charis · Distribuidor Mayorista</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function emailEstadoPedido(
  nombre: string,
  numeroPedido: string,
  estado: string,
  nota?: string
): string {
  const ESTADOS: Record<string,{label:string;icon:string;color:string}> = {
    'PAGO_RECIBIDO':   { label:'Pago recibido',   icon:'✅', color:'#065f46' },
    'CONFIRMADO':      { label:'Confirmado',       icon:'✓',  color:'#1565c0' },
    'EN_PREPARACION':  { label:'En preparación',   icon:'📦', color:'#6b21a8' },
    'EN_REPARTO':      { label:'En camino',        icon:'🚚', color:'#0369a1' },
    'ENTREGADO':       { label:'Entregado',        icon:'🎉', color:'#15803d' },
    'CANCELADO':       { label:'Cancelado',        icon:'✕',  color:'#991b1b' },
  }
  const meta = ESTADOS[estado] || { label: estado, icon: '•', color: '#3a6080' }
  const url  = `${APP_URL}/client/orders`

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#1565c0;padding:28px 36px;text-align:center;">
          <p style="margin:0;font-size:28px;font-weight:900;color:white;letter-spacing:2px;">CHARIS</p>
          <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:3px;">DISTRIBUIDOR MAYORISTA</p>
        </td></tr>
        <tr><td style="padding:36px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:900;color:#0d2137;">Hola, ${nombre}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#3a6080;">Tu pedido ha sido actualizado:</p>
          <div style="background:#f5f8fc;border-radius:12px;padding:20px 24px;border:2px solid #e2eaf4;text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;color:#8aaac4;letter-spacing:.06em;">PEDIDO</p>
            <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0d2137;font-family:monospace;">#${numeroPedido.toUpperCase()}</p>
            <p style="margin:0;font-size:22px;font-weight:900;color:${meta.color};">${meta.icon} ${meta.label}</p>
            ${nota ? `<p style="margin:12px 0 0;font-size:13px;color:#3a6080;">${nota}</p>` : ''}
          </div>
          <div style="text-align:center;">
            <a href="${url}" style="display:inline-block;padding:13px 32px;background:#1565c0;color:white;font-size:14px;font-weight:700;text-decoration:none;border-radius:100px;">
              Ver mis pedidos →
            </a>
          </div>
        </td></tr>
        <tr><td style="background:#f5f8fc;padding:20px 36px;text-align:center;border-top:1px solid #e2eaf4;">
          <p style="margin:0;font-size:12px;color:#8aaac4;">© 2026 Charis · Distribuidor Mayorista</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function emailStockBajo(items: { modelo: string; color: string; tipo_case: string; stock: number }[]): string {
  const filas = items.map(it => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2eaf4;font-size:13px;color:#0d2137;">${it.modelo} · ${it.color} <span style="color:#8aaac4;">(${it.tipo_case})</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2eaf4;font-size:13px;font-weight:700;color:${it.stock===0?'#991b1b':'#92400e'};text-align:right;">${it.stock} pzas</td>
    </tr>`).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#92400e;padding:24px 36px;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:900;color:white;">⚠️ Stock bajo</p>
        </td></tr>
        <tr><td style="padding:28px 36px;">
          <p style="margin:0 0 16px;font-size:14px;color:#0d2137;">Los siguientes productos quedaron en o por debajo del umbral configurado:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">${filas}</table>
          <a href="${APP_URL}/admin/catalog" style="display:inline-block;padding:12px 28px;background:#1565c0;color:white;font-size:14px;font-weight:700;text-decoration:none;border-radius:100px;">
            Ver catálogo →
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function emailNuevoPedido(
  numeroPedido: string,
  cliente: string,
  totalPiezas: number
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0d2137;padding:24px 36px;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:900;color:white;">🛒 Nuevo pedido recibido</p>
        </td></tr>
        <tr><td style="padding:28px 36px;">
          <p style="margin:0 0 16px;font-size:16px;color:#0d2137;">
            <strong>${cliente}</strong> realizó un nuevo pedido:
          </p>
          <div style="background:#f5f8fc;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 6px;font-size:13px;color:#8aaac4;">PEDIDO #${numeroPedido.toUpperCase()}</p>
            <p style="margin:0;font-size:20px;font-weight:900;color:#1565c0;">${totalPiezas} piezas</p>
          </div>
          <a href="${APP_URL}/admin/orders" style="display:inline-block;padding:12px 28px;background:#1565c0;color:white;font-size:14px;font-weight:700;text-decoration:none;border-radius:100px;">
            Ver en el portal →
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
