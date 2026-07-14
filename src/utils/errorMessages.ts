export function toFrenchErrorMessage(message: unknown): string {
  const raw = message instanceof Error ? message.message : String(message ?? '').trim();
  if (!raw) return 'Une erreur est survenue. Veuillez reessayer.';

  const normalized = raw.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Identifiant ou mot de passe incorrect.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Ce compte n est pas encore active. Contactez le service gestionnaire MADGI.';
  }

  if (
    normalized.includes('jwt expired') ||
    normalized.includes('invalid jwt') ||
    normalized.includes('session not found') ||
    normalized.includes('refresh token not found') ||
    normalized.includes('session from session_id claim in jwt does not exist')
  ) {
    return 'Votre session a expire. Veuillez vous reconnecter.';
  }

  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'Un compte existe deja avec ces informations.';
  }

  if (normalized.includes('password should be') || normalized.includes('password must')) {
    return 'Le mot de passe ne respecte pas les regles de securite.';
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('too many attempts')
  ) {
    return 'Trop de tentatives. Veuillez patienter avant de reessayer.';
  }

  if (
    normalized === 'failed to fetch' ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed')
  ) {
    return 'Service MADGI ESR indisponible. Veuillez reessayer dans un instant.';
  }

  return raw;
}
