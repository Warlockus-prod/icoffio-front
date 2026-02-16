/**
 * SUPABASE CLIENT
 * 
 * Singleton клиент для работы с Supabase Database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get Supabase client (singleton)
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    // Accept both naming conventions for env vars
    // Prefer NEXT_PUBLIC_SUPABASE_URL to avoid stale SUPABASE_URL overrides.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Supabase] Environment variables not configured. Database features disabled.');
      // Return mock client that does nothing (graceful degradation)
      return createMockClient();
    }

    try {
      supabaseInstance = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      console.log('[Supabase] Client initialized successfully');
    } catch (error) {
      console.error('[Supabase] Failed to initialize client:', error);
      return createMockClient();
    }
  }

  return supabaseInstance;
}

/**
 * Mock client for graceful degradation when Supabase is not configured.
 * Returns SupabaseClient-compatible shape that always resolves with error.
 */
function createMockClient(): SupabaseClient {
  const mockResponse = { data: null, error: new Error('Supabase not configured') };
  const mockBuilder = {
    select: () => Promise.resolve(mockResponse),
    insert: () => Promise.resolve(mockResponse),
    update: () => Promise.resolve(mockResponse),
    upsert: () => Promise.resolve(mockResponse),
    delete: () => Promise.resolve(mockResponse),
  };
  
  return {
    from: () => mockBuilder,
    rpc: () => Promise.resolve(mockResponse),
  } as unknown as SupabaseClient;
}

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!(url && key);
}







