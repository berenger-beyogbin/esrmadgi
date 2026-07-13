import { config } from 'dotenv';
config();

function opt(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : undefined;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? '',
  PORT: parseInt(process.env.PORT ?? '4000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  FRONTEND_URLS: (process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  IS_DEV: process.env.NODE_ENV !== 'production',
  ENABLE_DEMO_AUTH: process.env.ENABLE_DEMO_AUTH === 'true',
  TRUST_PROXY: process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1',
  TURNSTILE_SECRET_KEY: opt('TURNSTILE_SECRET_KEY'),

  SUPABASE_URL: opt('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: opt('SUPABASE_SERVICE_ROLE_KEY'),

  MYSQL_HOST: opt('MYSQL_HOST'),
  MYSQL_PORT: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
  MYSQL_USER: opt('MYSQL_USER'),
  MYSQL_PASSWORD: opt('MYSQL_PASSWORD'),
  MYSQL_DATABASE: opt('MYSQL_DATABASE'),

  SIAPS_BASE_URL: opt('SIAPS_BASE_URL'),
  SIAPS_SLUG: opt('SIAPS_SLUG'),
  SIAPS_EMAIL: opt('SIAPS_EMAIL'),
  SIAPS_PASSWORD: opt('SIAPS_PASSWORD'),
  SIAPS_DATE_FORMAT: process.env.SIAPS_DATE_FORMAT === 'iso' ? 'iso' : 'compact',
};

export function validateEnv(): void {
  if (env.NODE_ENV === 'production' && env.ENABLE_DEMO_AUTH) {
    throw new Error('[env] ENABLE_DEMO_AUTH ne doit jamais etre active en production.');
  }

  const missingSupabase: string[] = [];
  if (!env.SUPABASE_URL) missingSupabase.push('SUPABASE_URL');
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missingSupabase.push('SUPABASE_SERVICE_ROLE_KEY');
  const missing = missingSupabase;
  if (missingSupabase.length > 0) {
    console.warn(
      `[env] Variables Supabase absentes : ${missing.join(', ')} — les routes Supabase ne fonctionneront pas.`,
    );
  }
}
