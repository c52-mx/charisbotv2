import { Pool } from 'pg'

declare global {
  var _pgPool: Pool | undefined
}

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  })
}

// Singleton para evitar múltiples conexiones en desarrollo
const pool = global._pgPool ?? createPool()

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pool
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
}

export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

// Ejecuta varias queries dentro de una misma transacción (BEGIN/COMMIT/ROLLBACK).
// Usar para operaciones de varios pasos donde la atomicidad importa (ej. reservas de stock).
export async function withTransaction<T>(
  fn: (tx: <U = any>(text: string, params?: any[]) => Promise<U[]>) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const tx = async <U = any>(text: string, params?: any[]): Promise<U[]> => {
      const result = await client.query(text, params)
      return result.rows as U[]
    }
    const result = await fn(tx)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export default pool
