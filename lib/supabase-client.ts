/**
 * SUPABASE CLIENT — Re-export from pg-client
 *
 * This file now re-exports from the self-hosted PostgreSQL adapter.
 * All existing imports like:
 *   import { getSupabaseClient } from '@/lib/supabase-client'
 * continue to work unchanged.
 *
 * @version 10.0.0 — migrated from Supabase Cloud to self-hosted PostgreSQL
 */

export { getSupabaseClient, isSupabaseConfigured, createClient } from './pg-client';
