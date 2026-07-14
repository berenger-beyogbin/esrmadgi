export const PASSWORD_POLICY_MESSAGE =
  'Le mot de passe doit contenir au moins 8 caracteres, avec majuscule, minuscule, chiffre et caractere special.';

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
