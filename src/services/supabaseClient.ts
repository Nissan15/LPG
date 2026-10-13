import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseConfig } from '../types/lpg';

const SUPABASE_STORAGE_KEY = 'smart_lpg_supabase_config_v1';

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  autoSync: true,
};

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

/**
 * Loads current Supabase configuration from localStorage with .env fallbacks
 */
export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!raw) return DEFAULT_SUPABASE_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      supabaseUrl: parsed.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: parsed.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      autoSync: parsed.autoSync !== undefined ? parsed.autoSync : true,
    };
  } catch {
    return DEFAULT_SUPABASE_CONFIG;
  }
}

/**
 * Saves Supabase configuration to localStorage and invalidates cache
 */
export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config));
    // Reset cache so new client is instantiated
    cachedClient = null;
  } catch (err) {
    console.error('Failed to save Supabase config:', err);
  }
}

/**
 * Returns true if both URL and Key are provided and non-empty
 */
export function isSupabaseConfigured(): boolean {
  const cfg = getStoredSupabaseConfig();
  return Boolean(
    cfg.supabaseUrl &&
    cfg.supabaseUrl.trim().startsWith('http') &&
    cfg.supabaseAnonKey &&
    cfg.supabaseAnonKey.trim().length > 10
  );
}

/**
 * Returns an active Supabase client instance or null if unconfigured
 */
export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getStoredSupabaseConfig();

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    return null;
  }

  const url = cfg.supabaseUrl.trim();
  const key = cfg.supabaseAnonKey.trim();

  if (!url.startsWith('http') || key.length < 10) {
    return null;
  }

  // Return cached client if credentials have not changed
  if (cachedClient && lastUsedUrl === url && lastUsedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

/**
 * Tests connection to the configured Supabase database
 */
export async function testSupabaseConnection(
  urlOverride?: string,
  keyOverride?: string
): Promise<{ success: boolean; message: string; rowCount?: number }> {
  const url = (urlOverride || getStoredSupabaseConfig().supabaseUrl).trim();
  const key = (keyOverride || getStoredSupabaseConfig().supabaseAnonKey).trim();

  if (!url || !url.startsWith('http')) {
    return { success: false, message: 'Invalid Supabase URL. Must start with https:// or http://' };
  }

  if (!key || key.length < 10) {
    return { success: false, message: 'Invalid Anon Public Key provided.' };
  }

  try {
    const client = createClient(url, key, {
      auth: { persistSession: false },
    });

    // Attempt a light query on lpg_readings or ping
    const { data, error, count } = await client
      .from('lpg_readings')
      .select('id', { count: 'exact', head: true });

    if (error) {
      // Check if table hasn't been created yet
      if (error.code === '42P01' || error.message.includes('relation "public.lpg_readings" does not exist')) {
        return {
          success: true,
          message: 'Connected to Supabase! Note: The "lpg_readings" table has not been created yet. Please execute the SQL schema in your Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Supabase query error: ${error.message} (Code: ${error.code})`,
      };
    }

    return {
      success: true,
      message: `Successfully connected to Supabase database! (${count ?? (data ? data.length : 0)} readings in cloud)`,
      rowCount: count ?? 0,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: false,
      message: `Network error connecting to Supabase: ${error.message}`,
    };
  }
}
