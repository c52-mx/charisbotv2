import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }

    const user = await queryOne<any>(
      'SELECT id, nombre, email, password_hash, rol, activo FROM public.usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    if (!user || !user.activo) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    // Actualizar último acceso
    await queryOne('UPDATE public.usuarios SET ultimo_acceso = NOW() WHERE id = $1', [user.id])

    const token = await signToken({
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    })

    const response = NextResponse.json({
      ok: true,
      rol: user.rol,
      nombre: user.nombre,
    })

    response.cookies.set('charis_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
