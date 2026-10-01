// Re-export Supabase client for backwards compatibility
const { supabaseAdmin, supabaseAuth, isConfigured } = require('./supabase');

module.exports = {
  supabaseAdmin,
  supabaseAuth,
  isConfigured,
};
