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
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

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
 * Mock client for graceful degradation when Supabase is not configured
 */
function createMockClient(): any {
  const mockResponse = { data: null, error: new Error('Supabase not configured') };
  
  return {
    from: () => ({
      select: () => Promise.resolve(mockResponse),
      insert: () => Promise.resolve(mockResponse),
      update: () => Promise.resolve(mockResponse),
      upsert: () => Promise.resolve(mockResponse),
      delete: () => Promise.resolve(mockResponse),
    }),
    rpc: () => Promise.resolve(mockResponse),
  };
}

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}








