import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'your-anon-public-key'
);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    '[Nutriq] Notice: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are using placeholders in .env.\n' +
    'Provide your Supabase project credentials in .env to connect to live Supabase Auth and PostgreSQL.'
  );
}

// Client for Supabase operations with persistent session in localStorage
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'nutriq_supabase_auth_token',
    },
  }
);
