// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendEmail, emailVerificacion } from '@/lib/email'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'charis-secret-2025')

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { nombre, empresa, telefono, email, password } = await req.json()

    // Validaciones base
    if (!nombre?.trim() || !password)
      return NextResponse.json({ error: 'Nombre y contraseña son obligatorios' }, { status: 400 })
    if (password.length < 8)
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })

    // Se requiere al menos uno: email o teléfono
    const tieneEmail    = !!email?.trim()
    const tieneTelefono = !!telefono?.trim()
    if (!tieneEmail && !tieneTelefono)
      return NextResponse.json({ error: 'Ingresa tu correo o número de teléfono (al menos uno)' }, { status: 400 })

    const emailLower = tieneEmail ? email.toLowerCase().trim() : null

    // Email duplicado (solo si viene email)
    if (emailLower) {
      const existing = await query(
        `SELECT id FROM public.usuarios WHERE email = $1 LIMIT 1`,
        [emailLower]
      )
      if (existing.length > 0)
        return NextResponse.json({ error: 'Ya existe una cuenta con ese correo electrónico' }, { status: 409 })
    }

    // Teléfono duplicado (solo si viene teléfono y no hay email que identifique)
    if (tieneTelefono && !emailLower) {
      const existingTel = await query(
        `SELECT id FROM public.usuarios WHERE telefono = $1 LIMIT 1`,
        [telefono.trim()]
      )
      if (existingTel.length > 0)
        return NextResponse.json({ error: 'Ya existe una cuenta con ese número de teléfono' }, { status: 409 })
    }

    const hash  = await bcrypt.hash(password, 12)
    // Token de verificación solo aplica si hay email
    const token  = tieneEmail ? crypto.randomBytes(32).toString('hex') : null
    const expira = tieneEmail ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
    // Si no hay email, la cuenta ya queda verificada desde el inicio
    const verificado = !tieneEmail

    // Detectar columnas opcionales (empresa)
    let hasEmpresa = true
    try { await query(`SELECT empresa FROM public.usuarios LIMIT 0`, []) }
    catch { hasEmpresa = false }

    let rows: any[]
    if (hasEmpresa) {
      rows = await query(`
        INSERT INTO public.usuarios
          (nombre, email, password_hash, rol, telefono, empresa, activo, verificado,
           verificacion_token, verificacion_token_expira, creado_en)
        VALUES ($1,$2,$3,'CLIENTE',$4,$5,true,$6,$7,$8,NOW())
        RETURNING id, nombre, email, rol
      `, [
        nombre.trim(), emailLower, hash,
        telefono?.trim() || null, empresa?.trim() || null,
        verificado, token, expira,
      ])
    } else {
      rows = await query(`
        INSERT INTO public.usuarios
          (nombre, email, password_hash, rol, telefono, activo, verificado, creado_en)
        VALUES ($1,$2,$3,'CLIENTE',$4,true,$5,NOW())
        RETURNING id, nombre, email, rol
      `, [nombre.trim(), emailLower, hash, telefono?.trim() || null, verificado])
    }

    const user = rows[0]

    // Vincular (o crear) cliente por teléfono
    if (tieneTelefono) {
      await query(`
        INSERT INTO public.clientes (usuario_id, nombre, telefono, email)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (telefono) DO UPDATE
          SET usuario_id = EXCLUDED.usuario_id, nombre = EXCLUDED.nombre,
              email = COALESCE(EXCLUDED.email, public.clientes.email)
      `, [user.id, nombre.trim(), telefono.trim(), emailLower]).catch(e => console.error('[register] clientes sync error:', e))
    }

    // Enviar email de verificación solo si tiene correo
    if (tieneEmail && emailLower) {
      sendEmail({
        to:      emailLower,
        subject: 'Verifica tu correo — Charis Portal',
        html:    emailVerificacion(nombre.trim(), token!),
      }).catch(e => console.error('[register] email error:', e))
    }

    // JWT — acceso inmediato
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
