import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { getSupabaseServer } from '../config/supabaseServer';
import { AuthenticatedUser, UserProfile } from '../types';
import { canAccessRole, normalizeRole } from '../utils/roles';

function readBearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

function readDevDemoUser(req: Request): AuthenticatedUser | null {
  if (!env.ENABLE_DEMO_AUTH || env.NODE_ENV !== 'development') return null;

  const role = normalizeRole(req.header('x-madgi-demo-role'));
  const demoId = String(req.header('x-madgi-demo-id') ?? '').trim();

  if (!role || !demoId.startsWith('demo-')) return null;

  const matricule = String(req.header('x-madgi-demo-matricule') ?? '').trim();
  const email = String(req.header('x-madgi-demo-email') ?? `${role.toLowerCase()}@madgi.ci`).trim();
  const idAdherent = String(req.header('x-madgi-demo-id-adherent') ?? '').trim();

  return {
    id_utilisateur: demoId,
    auth_user_id: demoId,
    matricule,
    email,
    role,
    id_adherent: idAdherent || null,
    must_change_password: false,
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readBearerToken(req);
    if (!token) {
      const demoUser = readDevDemoUser(req);
      if (demoUser) {
        req.user = demoUser;
        next();
        return;
      }

      res.status(401).json({ data: null, error: 'Authentification requise' });
      return;
    }

    const supabase = getSupabaseServer();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      res.status(401).json({ data: null, error: 'Session invalide ou expiree' });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('utilisateurs')
      .select('id_utilisateur, auth_user_id, matricule, email, profil, user_actif, id_adherent')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[auth] profile lookup:', profileError.message);
      res.status(500).json({ data: null, error: 'Erreur lecture profil utilisateur' });
      return;
    }

    if (!profile) {
      res.status(403).json({ data: null, error: 'Profil metier introuvable' });
      return;
    }

    if (profile.user_actif !== true) {
      res.status(403).json({ data: null, error: 'Compte utilisateur desactive' });
      return;
    }

    const role = normalizeRole(profile.profil);
    if (!role) {
      res.status(403).json({ data: null, error: 'Profil utilisateur invalide' });
      return;
    }

    req.user = {
      id_utilisateur: String(profile.id_utilisateur),
      auth_user_id: String(profile.auth_user_id),
      matricule: String(profile.matricule ?? ''),
      email: String(profile.email ?? authData.user.email ?? ''),
      role,
      id_adherent: profile.id_adherent == null ? null : String(profile.id_adherent),
      must_change_password: Boolean(authData.user.user_metadata?.must_change_password),
    } satisfies AuthenticatedUser;

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRoles(...allowedRoles: UserProfile[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ data: null, error: 'Authentification requise' });
      return;
    }

    if (!canAccessRole(req.user.role, allowedRoles)) {
      res.status(403).json({ data: null, error: 'Acces refuse pour ce profil' });
      return;
    }

    next();
  };
}
