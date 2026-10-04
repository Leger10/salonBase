// /src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// ✅ Variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials missing');
}

// ✅ Client principal (UNIQUE)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  }
});

// ✅ Client admin (UNIQUE)
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// ✅ Helper functions
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, tenants(*)')
    .eq('id', user.id)
    .single();
    
  return { ...user, profile };
};

export const hasActiveSubscription = async (tenantId) => {
  const { data } = await supabase
    .from('tenants')
    .select('subscription_status, subscription_end')
    .eq('id', tenantId)
    .single();
    
  return data?.subscription_status === 'active' && 
         new Date(data.subscription_end) > new Date();
};

// ✅ Export par défaut
export default supabase;