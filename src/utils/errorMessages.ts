export function toFrenchErrorMessage(message: unknown): string {
  const raw = message instanceof Error ? message.message : String(message ?? '').trim();
  if (!raw) return 'Une erreur est survenue. Veuillez réessayer.';

  const normalized = raw.toLowerCase();

  if (
    normalized.includes('ce matricule existe deja') ||
    normalized.includes('ce matricule existe déjà') ||
    (normalized.includes('matricule') && (
      normalized.includes('duplicate key') ||
      normalized.includes('violates unique constraint') ||
      normalized.includes('already exists')
    ))
  ) {
    return 'Ce matricule est déjà enregistré. Vérifiez le matricule ou recherchez la fiche existante.';
  }

  if (
    normalized.includes('cette adresse email existe deja') ||
    normalized.includes('cette adresse email existe déjà') ||
    (normalized.includes('email') && (
      normalized.includes('duplicate key') ||
      normalized.includes('violates unique constraint') ||
      normalized.includes('already exists')
    ))
  ) {
    return 'Cette adresse email est déjà utilisée. Renseignez une autre adresse ou vérifiez la fiche existante.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Identifiant ou mot de passe incorrect.';
  }

  if (normalized.includes('email not confirmed')) {
    return "Ce compte n'est pas encore activé. Contactez le service gestionnaire MADGI.";
  }

  if (
    normalized.includes('jwt expired') ||
    normalized.includes('invalid jwt') ||
    normalized.includes('session not found') ||
    normalized.includes('refresh token not found') ||
    normalized.includes('session from session_id claim in jwt does not exist')
  ) {
    return 'Votre session a expiré. Veuillez vous reconnecter.';
  }

  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'Un compte existe déjà avec ces informations.';
  }

  if (normalized.includes('password should be') || normalized.includes('password must')) {
    return 'Le mot de passe ne respecte pas les règles de sécurité.';
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('too many attempts')
  ) {
    return 'Trop de tentatives. Veuillez patienter avant de réessayer.';
  }

  if (
    normalized === 'failed to fetch' ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed')
  ) {
    return 'Service MADGI ESR indisponible. Veuillez réessayer dans un instant.';
  }

  if (
    normalized.includes('erreur serveur interne') ||
    normalized.includes('internal server error') ||
    normalized.includes('database error') ||
    normalized.includes('supabase')
  ) {
    return "Impossible d'enregistrer l'adhérent pour le moment. Veuillez réessayer. Si le problème persiste, contactez l'administrateur.";
  }

  if (
    normalized.includes('null value in column') ||
    normalized.includes('violates not-null constraint') ||
    normalized.includes('invalid input syntax') ||
    normalized.includes('date/time field value out of range')
  ) {
    return "Certaines informations de la fiche sont manquantes ou invalides. Vérifiez les champs obligatoires, les dates et le grade avant d'enregistrer.";
  }

  return raw;
}
