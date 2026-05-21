// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'charis-secret-2025'
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, empresa, telefono, email, password } = body

    // Validaciones
    if (!nombre?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: 'Nombre, correo y contraseña son obligatorios' },
        { status: 400 }
      )
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }
    if (!telefono?.trim()) {
      return NextResponse.json(
        { error: 'El teléfono de WhatsApp es obligatorio' },
        { status: 400 }
      )
    }

    // Verificar email duplicado
    const existing = await query(
      `SELECT id FROM public.usuarios WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    )
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese correo electrónico' },
        { status: 409 }
      )
    }

    const hash = await bcrypt.hash(password, 12)

    // Detectar si columnas empresa/verificado existen (migración 008)
    let hasExtracols = true
    try {
      await query(`SELECT empresa FROM public.usuarios LIMIT 0`, [])
    } catch {
      hasExtracols = false
    }

    let rows: any[]
    if (hasExtracols) {
      rows = await query(
        `INSERT INTO public.usuarios
           (nombre, email, password_hash, rol, telefono, empresa, activo, verificado, creado_en)
         VALUES ($1, $2, $3, 'CLIENTE', $4, $5, true, false, NOW())
         RETURNING id, nombre, email, rol`,
        [
          nombre.trim(),
          email.toLowerCase().trim(),
          hash,
          telefono.trim(),
          empresa?.trim() || null,
        ]
      )
    } else {
      rows = await query(
        `INSERT INTO public.usuarios
           (nombre, email, password_hash, rol, telefono, activo, creado_en)
         VALUES ($1, $2, $3, 'CLIENTE', $4, true, NOW())
         RETURNING id, nombre, email, rol`,
        [
          nombre.trim(),
          email.toLowerCase().trim(),
          hash,
          telefono.trim(),
        ]
      )
    }

    const user = rows[0]

    // Generar JWT
    const token = await new SignJWT({
      id:     user.id,
      nombre: user.nombre,
      email:  user.email,
      rol:    user.rol,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    const res = NextResponse.json({
      ok:     true,
      rol:    user.rol,
      nombre: user.nombre,
    })

    res.cookies.set('charis-token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 24 * 7,
    })

    return res

  } catch (e: any) {
    console.error('[POST /api/auth/register]', e)
    return NextResponse.json(
      { error: 'Error interno al crear la cuenta' },
      { status: 500 }
    )
  }
}
