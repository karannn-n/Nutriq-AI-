const { supabaseAdmin, isConfigured } = require('./supabase');

(async () => {
  console.log('Testing Supabase configuration...');
  if (!isConfigured) {
    console.log('Notice: Supabase is currently using placeholder credentials.');
    console.log('Update backend/.env with your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to connect.');
    process.exit(0);
  }

  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('Supabase connection successful. Profiles table accessible.');
  } catch (error) {
    console.error('Supabase connection error:', error.message);
  } finally {
    process.exit(0);
  }
})();
