/**
 * PostgreSQL Connection Pool
 *
 * Singleton pool for all database connections.
 * Replaces Supabase Cloud with direct PostgreSQL.
 *
 * @version 10.0.0
 */

import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * Get the shared PostgreSQL connection pool.
 * Lazily initializes from DATABASE_URL env var.
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        '[PG Pool] DATABASE_URL is not set. PostgreSQL features disabled.'
      );
    }

    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err) => {
      console.error('[PG Pool] Unexpected idle-client error:', err.message);
    });

    pool.on('connect', () => {
      console.log('[PG Pool] New client connected');
    });

    console.log('[PG Pool] Pool initialized (max=20)');
  }

  return pool;
}

/**
 * Gracefully shut down the pool (for testing / hot-reload).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[PG Pool] Pool closed');
  }
}
