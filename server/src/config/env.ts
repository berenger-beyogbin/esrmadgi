import { config } from 'dotenv';
config();

function opt(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : undefined;
}

function sixDigitOtp(key: string): string | undefined {
  const value = opt(key);
  return value && /^\d{6}$/.test(value) ? value : undefined;
}

const firstLoginFixedOtp = sixDigitOtp('FIRST_LOGIN_FIXED_OTP') ?? (process.env.NODE_ENV !== 'production' ? '555555' : undefined);
const firstLoginSmsStandby = process.env.FIRST_LOGIN_SMS_STANDBY === 'true' || Boolean(firstLoginFixedOtp);

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

  SMTP_HOST: opt('SMTP_HOST'),
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: opt('SMTP_USER'),
  SMTP_PASSWORD: opt('SMTP_PASSWORD'),
  SMTP_FROM: opt('SMTP_FROM') ?? 'MADGI ESR <no-reply@madgi.ci>',

  SMS_API_URL: opt('SMS_API_URL'),
  SMS_API_USERNAME: opt('SMS_API_USERNAME'),
  SMS_API_PASSWORD: opt('SMS_API_PASSWORD'),
  SMS_API_SERVICE_ID: opt('SMS_API_SERVICE_ID'),
  FIRST_LOGIN_OTP_DEBUG: process.env.NODE_ENV !== 'production' && process.env.FIRST_LOGIN_OTP_DEBUG !== 'false',
  FIRST_LOGIN_FIXED_OTP: firstLoginFixedOtp,
  FIRST_LOGIN_SMS_STANDBY: firstLoginSmsStandby,

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
  if (missingSupabase.length > 0) {
    console.warn(
      `[env] Variables Supabase absentes : ${missingSupabase.join(', ')} - les routes Supabase ne fonctionneront pas.`,
    );
  }

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    console.warn(
      `[env] Variables SMTP absentes (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) - l'envoi d'email de reinitialisation de mot de passe est desactive` +
        (env.IS_DEV ? ' (le lien sera affiche dans la console en developpement).' : '.'),
    );
  }

  if (!env.SMS_API_URL || !env.SMS_API_USERNAME || !env.SMS_API_PASSWORD) {
    console.warn(
      `[env] Variables SMS absentes (SMS_API_URL, SMS_API_USERNAME, SMS_API_PASSWORD) - l'envoi d'OTP SMS est desactive` +
        (env.IS_DEV ? ' (le SMS sera simule dans la console en developpement).' : '.'),
    );
  }

  if (env.FIRST_LOGIN_FIXED_OTP) {
    console.warn(
      `[env] OTP fixe de premiere connexion actif (${env.FIRST_LOGIN_FIXED_OTP}). A desactiver des que le fournisseur SMS est retabli.`,
    );
  }

  if (env.FIRST_LOGIN_SMS_STANDBY) {
    console.warn("[env] Envoi SMS de premiere connexion en standby. L'OTP fixe est utilise.");
  }
}
