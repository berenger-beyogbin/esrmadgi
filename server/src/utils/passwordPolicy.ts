import { randomBytes } from 'crypto';

export const PASSWORD_POLICY_MESSAGE =
  'Le mot de passe doit contenir au moins 12 caracteres, avec majuscule, minuscule, chiffre et caractere special.';

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function generateTemporaryPassword(seed: string): string {
  const normalizedSeed = seed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'MADGI';
  return `Madgi-${normalizedSeed}-${randomBytes(6).toString('base64url')}!1`;
}
