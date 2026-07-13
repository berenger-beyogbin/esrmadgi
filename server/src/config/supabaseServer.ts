import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let _client: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour le client serveur. Vérifiez server/.env.',
    );
  }

  if (!_client) {
    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return _client;
}
