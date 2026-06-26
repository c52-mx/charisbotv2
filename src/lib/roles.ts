import { query } from '@/lib/db'
import { PERMISOS_DEFAULT, type Permiso } from '@/lib/auth-shared'

// Resuelve permisos y tipo de rol desde la BD para embeber en el JWT al
// iniciar sesión (ver src/app/api/auth/login/route.ts) — así can() y el
// middleware no necesitan tocar la base de datos en cada request.
export async function resolverPermisos(
  rolClave: string
): Promise<{ tipo: 'INTERNO' | 'CLIENTE' | 'REPARTIDOR'; permisos: Partial<Record<Permiso, boolean>> }> {
  const [rol] = await query<{ tipo: 'INTERNO' | 'CLIENTE' | 'REPARTIDOR' }>(
    `SELECT tipo FROM public.roles WHERE clave = $1`, [rolClave]
  )
  if (!rol) {
    return { tipo: 'INTERNO', permisos: PERMISOS_DEFAULT[rolClave] || {} }
  }
  const rows = await query<{ permiso: Permiso; valor: boolean }>(
    `SELECT pr.permiso, pr.valor FROM public.permisos_rol pr
     JOIN public.roles r ON r.id = pr.rol_id
     WHERE r.clave = $1`,
    [rolClave]
  )
  const permisos: Partial<Record<Permiso, boolean>> = {}
  for (const r of rows) permisos[r.permiso] = r.valor
  return { tipo: rol.tipo, permisos }
}

// Roles asignables a usuarios desde /admin/users — incluye REPARTIDOR
// para poder crear esas cuentas con la misma pantalla, sin construir
// una nueva.
export async function listarRolesAsignables(): Promise<{ clave: string; nombre: string }[]> {
  return query<{ clave: string; nombre: string }>(
    `SELECT clave, nombre FROM public.roles WHERE tipo IN ('INTERNO', 'REPARTIDOR') ORDER BY nombre`
  )
}

// Usuarios con un rol de tipo REPARTIDOR, para los selectores de
// asignación/reasignación en /admin/orders.
export async function listarRepartidores(): Promise<{ id: string; nombre: string }[]> {
  return query<{ id: string; nombre: string }>(
    `SELECT u.id, u.nombre FROM public.usuarios u
     JOIN public.roles r ON r.clave = u.rol
     WHERE r.tipo = 'REPARTIDOR' AND u.activo = true
     ORDER BY u.nombre`
  )
}
