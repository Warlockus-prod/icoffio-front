/**
 * PostgreSQL Client — Drop-in replacement for Supabase JS client.
 *
 * Exports the same `getSupabaseClient()` / `isSupabaseConfigured()` API
 * so that all existing call-sites continue to work without changes.
 *
 * Under the hood queries go to a local PostgreSQL via `pg` Pool
 * instead of Supabase Cloud PostgREST.
 *
 * @version 10.0.0
 */

import { getPool } from './pg-pool';
import { PgQueryBuilder } from './pg-query-builder';

/* ------------------------------------------------------------------ */
/*  PgClient                                                           */
/* ------------------------------------------------------------------ */

export class PgClient {
  from(table: string): PgQueryBuilder {
    return new PgQueryBuilder(getPool(), table);
  }

  /**
   * Execute a PostgreSQL function (replaces supabase.rpc()).
   *
   * Maps to: SELECT * FROM function_name(param1, param2, ...)
   */
  async rpc(
    functionName: string,
    params?: Record<string, unknown>,
  ): Promise<{ data: any; error: any }> {
    const pool = getPool();

    try {
      // Validate function name (simple identifier only)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
        return {
          data: null,
          error: { message: `Invalid function name: ${functionName}`, code: 'INVALID_RPC' },
        };
      }

      const values: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;

      if (params) {
        // Named parameters as positional args — PostgreSQL functions
        // accept named parameters: SELECT * FROM func(param1 => $1, param2 => $2)
        for (const [key, val] of Object.entries(params)) {
          values.push(val);
          placeholders.push(`"${key}" => $${idx++}`);
        }
      }

      const sql = placeholders.length > 0
        ? `SELECT * FROM ${functionName}(${placeholders.join(', ')})`
        : `SELECT * FROM ${functionName}()`;

      const result = await pool.query(sql, values);
      return { data: result.rows, error: null };
    } catch (err: any) {
      console.error(`[PgClient] RPC error "${functionName}":`, err.message);
      return {
        data: null,
        error: {
          message: err.message || 'RPC call failed',
          code: err.code || 'RPC_ERROR',
        },
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                          */
/* ------------------------------------------------------------------ */

let instance: PgClient | null = null;

/**
 * Get the shared PgClient instance (Supabase-compatible API).
 *
 * Usage is identical to the previous Supabase client:
 *   const supabase = getSupabaseClient();
 *   const { data, error } = await supabase.from('table').select('*').eq('id', 1);
 */
export function getSupabaseClient(): PgClient {
  if (!instance) {
    instance = new PgClient();
    console.log('[PgClient] Client initialized (self-hosted PostgreSQL)');
  }
  return instance;
}

/**
 * Check whether the database is configured.
 */
export function isSupabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Helper: createClient() compatibility shim.
 *
 * Some files call createClient(url, key) directly.
 * This shim ignores the Supabase URL/key and returns the shared PgClient.
 */
export function createClient(_url?: string, _key?: string, _options?: any): PgClient {
  return getSupabaseClient();
}
