import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis dans le fichier .env');
}

if ((import.meta as any).env.DEV) {
  console.info('[SUPABASE]', {
    url: supabaseUrl,
    hasAnonKey: Boolean(supabaseAnonKey),
    keyPrefix: supabaseAnonKey?.slice(0, 8),
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
