import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Create the Supabase admin client with service role key (for server operations only)
export const createSupabaseAdmin = (): SupabaseClient<Database> => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not available. Check environment variables.');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false, // Don't persist auth state for server usage
      autoRefreshToken: false, // Don't try to refresh tokens for server usage
    },
  });
};

// Create the Supabase client with anon key (for client operations)
export const createSupabaseClient = (): SupabaseClient<Database> => {
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials not available. Check environment variables.');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};
