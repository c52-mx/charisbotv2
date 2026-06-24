// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendEmail, emailVerificacion } from '@/lib/email'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'charis-secret-2025')
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || ''

export const dynamic = 'force-dynamic'

async function verifyHCaptcha(token: string): Promise<boolean> {
  if (!HCAPTCHA_SECRET || !token) return false
  try {
    const res = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${HCAPTCHA_SECRET}&response=${token}`,
    })
    const data = await res.json()
    return data.success === true
  } catch { return false }
}

export async function POST(req: NextRequest) {
  try {
    
    const { nombre, empresa, telefono, email, password, hcaptchaToken } = await req.json()

    // Validaciones básicas
    if (!nombre?.trim() || !email?.trim() || !password)
      return NextResponse.json({ error: 'Nombre, correo y contraseña son obligatorios' }, { status: 400 })
    if (password.length < 8)
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    if (!telefono?.trim())
      return NextResponse.json({ error: 'El teléfono de WhatsApp es obligatorio' }, { status: 400 })

    // Verificar hCaptcha
    const captchaOk = await verifyHCaptcha(hcaptchaToken)
    if (!captchaOk)
      return NextResponse.json({ error: 'Verificación de seguridad fallida. Intenta de nuevo.' }, { status: 400 })

    // Email duplicado
    const existing = await query(
      `SELECT id FROM public.usuarios WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    )
    if (existing.length > 0)
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo electrónico' }, { status: 409 })

    const hash  = await bcrypt.hash(password, 12)
    const token = crypto.randomBytes(32).toString('hex')
    const expira = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    // Detectar columnas opcionales
    let hasExtracols = true
    try { await query(`SELECT empresa FROM public.usuarios LIMIT 0`, []) }
    catch { hasExtracols = false }

    let rows: any[]
    if (hasExtracols) {
      rows = await query(`
        INSERT INTO public.usuarios
          (nombre, email, password_hash, rol, telefono, empresa, activo, verificado,
           verificacion_token, verificacion_token_expira, creado_en)
        VALUES ($1,$2,$3,'CLIENTE',$4,$5,true,false,$6,$7,NOW())
        RETURNING id, nombre, email, rol
      `, [
        nombre.trim(), email.toLowerCase().trim(), hash,
        telefono.trim(), empresa?.trim() || null,
        token, expira,
      ])
    } else {
      rows = await query(`
        INSERT INTO public.usuarios
          (nombre, email, password_hash, rol, telefono, activo, creado_en)
        VALUES ($1,$2,$3,'CLIENTE',$4,true,NOW())
        RETURNING id, nombre, email, rol
      `, [nombre.trim(), email.toLowerCase().trim(), hash, telefono.trim()])
    }

    const user = rows[0]

    // Vincula (o crea) el cliente por teléfono — así un cliente que ya
    // tenía pedidos por WhatsApp queda ligado a su cuenta del portal en
    // vez de duplicarse en /admin/clients.
    await query(`
      INSERT INTO public.clientes (usuario_id, nombre, telefono, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telefono) DO UPDATE SET usuario_id = EXCLUDED.usuario_id, nombre = EXCLUDED.nombre
    `, [user.id, nombre.trim(), telefono.trim(), email.toLowerCase().trim()]).catch(e => console.error('[register] clientes sync error:', e))

    // Enviar email de verificación (no bloqueante)
    sendEmail({
      to:      email.toLowerCase().trim(),
      subject: 'Verifica tu correo — Charis Portal',
      html:    emailVerificacion(nombre.trim(), token),
    }).catch(e => console.error('[register] email error:', e))

    // JWT — acceso inmediato aunque no haya verificado aún
    const jwt = await new SignJWT({
      id: user.id, nombre: user.nombre, email: user.email, rol: user.rol,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    const res = NextResponse.json({ ok: true, rol: user.rol, nombre: user.nombre })
    res.cookies.set('charis-token', jwt, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 24 * 7,
    })
    return res

  } catch (e: any) {
    console.error('[POST /api/auth/register]', e)
    return NextResponse.json({ error: 'Error interno al crear la cuenta' }, { status: 500 })
  }
}
