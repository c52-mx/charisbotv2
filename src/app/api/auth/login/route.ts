import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { resolverPermisos } from '@/lib/roles'
import { logSesion } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo / teléfono y contraseña requeridos' }, { status: 400 })
    }

    const identifier = email.toLowerCase().trim()

    // Buscar por email O por teléfono (para cuentas sin correo)
    const user = await queryOne<any>(
      `SELECT id, nombre, email, telefono, password_hash, rol, activo
       FROM public.usuarios
       WHERE (email = $1 OR telefono = $1) AND activo = true
       LIMIT 1`,
      [identifier]
    )

    if (!user) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    // Actualizar último acceso y registrar sesión
    await queryOne('UPDATE public.usuarios SET ultimo_acceso = NOW() WHERE id = $1', [user.id])
    await logSesion({
      usuario_id: user.id,
      email: user.email || user.telefono,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    })

    const { tipo: rolTipo, permisos } = await resolverPermisos(user.rol)

    const token = await signToken({
      sub: user.id,
      email: user.email || user.telefono,
      nombre: user.nombre,
      rol: user.rol,
      rolTipo,
      permisos,
    })

    const response = NextResponse.json({
      ok: true,
      rol: user.rol,
      rolTipo,
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
