import { createClient } from '@supabase/supabase-js';

// Environment variable validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Create the Supabase admin client with service role key (for server operations only)
export const createSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not available. Check environment variables.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false, // Don't persist auth state for server usage
      autoRefreshToken: false, // Don't try to refresh tokens for server usage
    },
  });
};

// Create the Supabase client with anon key (for client operations)
export const createSupabaseClient = () => {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials not available. Check environment variables.');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};
