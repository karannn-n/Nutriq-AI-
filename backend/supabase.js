const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  ((supabaseServiceRoleKey && supabaseServiceRoleKey !== 'your-supabase-service-role-key') ||
   (supabaseAnonKey && supabaseAnonKey !== 'your-supabase-anon-key'))
);

if (!isConfigured) {
  console.warn(
    '\x1b[33m%s\x1b[0m',
    '⚠️ [Nutriq Supabase] Supabase credentials not yet configured or using placeholders in backend/.env.\n' +
    'Please set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY to enable full live database functionality.'
  );
}

// Privileged admin client for backend operations
const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceRoleKey || supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Public client for user-level token validation
const supabaseAuth = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || supabaseServiceRoleKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = {
  supabaseAdmin,
  supabaseAuth,
  isConfigured,
};
