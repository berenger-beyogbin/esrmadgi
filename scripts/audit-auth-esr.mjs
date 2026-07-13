/**
 * MADGI ESR — Script d'audit Auth non destructif
 * Vérifie l'état de l'utilisateur Auth, la liaison public.utilisateurs,
 * et teste réellement signInWithPassword.
 *
 * Usage : node scripts/audit-auth-esr.mjs
 * Prérequis : .env et .env.admin.local remplis
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Parseur .env minimal ──────────────────────────────────────────────────────
function loadEnvFile(filePath, optional = false) {
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    if (optional) return;
    console.error('[ERREUR] Fichier introuvable :', filePath);
    process.exit(1);
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(ROOT, '.env'));
loadEnvFile(resolve(ROOT, '.env.admin.local'));

// ── Variables ─────────────────────────────────────────────────────────────────
const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MADGI_ADMIN_EMAIL,
  MADGI_ADMIN_PASSWORD,
  MADGI_ADMIN_MATRICULE,
} = process.env;

const supabaseUrl = SUPABASE_URL || VITE_SUPABASE_URL;
const anonKey = VITE_SUPABASE_ANON_KEY;

const REQUIRED = {
  supabaseUrl: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY,
  MADGI_ADMIN_EMAIL,
  MADGI_ADMIN_PASSWORD,
  MADGI_ADMIN_MATRICULE,
  anonKey,
};

const missing = Object.entries(REQUIRED)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error('[ERREUR] Variables manquantes :', missing.join(', '));
  process.exit(1);
}

// ── Helpers sécurisés ─────────────────────────────────────────────────────────
function safePrefix(key, len = 8) {
  return key ? key.slice(0, len) + '...' : '(absent)';
}
function safeLen(key) {
  return key ? key.length : 0;
}
function maskToken(token) {
  return token ? `${token.slice(0, 6)}... (longueur: ${token.length})` : '(absent)';
}

// ── Clients ───────────────────────────────────────────────────────────────────
const supabaseAdmin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const supabaseAnon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('\n══════════════════════════════════════════════════');
console.log('  MADGI ESR — Audit Auth (non destructif)');
console.log('══════════════════════════════════════════════════');
console.log('  URL Supabase  :', supabaseUrl);
console.log('  Clé anon      :', safePrefix(anonKey), '| longueur:', safeLen(anonKey));
console.log('  Clé service   :', safePrefix(SUPABASE_SERVICE_ROLE_KEY), '| longueur:', safeLen(SUPABASE_SERVICE_ROLE_KEY));
console.log('  Email         :', MADGI_ADMIN_EMAIL);
console.log('  Matricule     :', MADGI_ADMIN_MATRICULE);
console.log('  Anon ≠ Service:', anonKey !== SUPABASE_SERVICE_ROLE_KEY ? '✓ OUI (correct)' : '✗ NON (même clé — ERREUR)');
console.log('');

// ── CONTRÔLE A : auth.users via service_role ─────────────────────────────────
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('[A] Recherche auth.users par email (service_role)...');

let authUser = null;
let page = 1;
while (true) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 50 });
  if (error) {
    console.error('    [ERREUR] listUsers :', error.message);
    break;
  }
  const found = data.users.find((u) => u.email === MADGI_ADMIN_EMAIL) ?? null;
  if (found) { authUser = found; break; }
  if (data.users.length < 50) break;
  page++;
}

if (!authUser) {
  console.log('    ✗ Utilisateur ABSENT de auth.users');
  console.log('    → Conclusion : ensure-admin-auth.mjs n\'a pas encore créé l\'utilisateur.');
} else {
  console.log('    ✓ Utilisateur trouvé dans auth.users');
  console.log('      id               :', authUser.id);
  console.log('      email            :', authUser.email);
  console.log('      email_confirmed  :', authUser.email_confirmed_at ?? '(non confirmé)');
  console.log('      created_at       :', authUser.created_at ?? '(inconnu)');
  console.log('      last_sign_in_at  :', authUser.last_sign_in_at ?? '(jamais connecté)');
}

// ── CONTRÔLE B : public.utilisateurs via service_role ────────────────────────
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('[B] Lecture public.utilisateurs (service_role) pour matricule =', MADGI_ADMIN_MATRICULE, '...');

const { data: userRow, error: userError } = await supabaseAdmin
  .from('utilisateurs')
  .select('id_utilisateur, auth_user_id, matricule, email, profil, user_actif, id_adherent')
  .eq('matricule', MADGI_ADMIN_MATRICULE)
  .maybeSingle();

if (userError) {
  console.error('    [ERREUR] lecture utilisateurs :', userError.message, '| code:', userError.code);
} else if (!userRow) {
  console.log('    ✗ Aucune ligne trouvée pour matricule =', MADGI_ADMIN_MATRICULE);
  console.log('    → Vérifiez que ce matricule existe bien dans public.utilisateurs.');
} else {
  console.log('    ✓ Ligne trouvée dans public.utilisateurs');
  console.log('      id_utilisateur :', userRow.id_utilisateur);
  console.log('      auth_user_id   :', userRow.auth_user_id ?? '(null)');
  console.log('      matricule      :', userRow.matricule);
  console.log('      email          :', userRow.email ?? '(null)');
  console.log('      profil         :', userRow.profil ?? '(null)');
  console.log('      user_actif     :', userRow.user_actif);
  console.log('      id_adherent    :', userRow.id_adherent ?? '(null)');
}

// ── CONTRÔLE C : Comparaison Auth ↔ utilisateurs ─────────────────────────────
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('[C] Comparaison Auth ↔ public.utilisateurs...');

if (!authUser || !userRow) {
  console.log('    ✗ Impossible de comparer — données manquantes (voir contrôles A et B)');
} else {
  const idMatch = authUser.id === userRow.auth_user_id;
  const emailMatch = (authUser.email ?? '').toLowerCase() === (userRow.email ?? '').toLowerCase();
  const profilOk = userRow.profil === 'ADMINISTRATEUR';
  const actifOk = userRow.user_actif === true;

  console.log('    auth.id === utilisateurs.auth_user_id :', idMatch ? '✓' : '✗', idMatch ? '' : `\n      Auth:    ${authUser.id}\n      Base:    ${userRow.auth_user_id}`);
  console.log('    auth.email === utilisateurs.email      :', emailMatch ? '✓' : '✗', emailMatch ? '' : `\n      Auth:    ${authUser.email}\n      Base:    ${userRow.email}`);
  console.log('    profil === ADMINISTRATEUR              :', profilOk ? '✓' : `✗ (valeur: "${userRow.profil}")`);
  console.log('    user_actif === true                    :', actifOk ? '✓' : `✗ (valeur: ${userRow.user_actif})`);
}

// ── CONTRÔLE D : signInWithPassword avec client anon ─────────────────────────
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('[D] Test signInWithPassword (client anon)...');
console.log('    Email utilisé :', MADGI_ADMIN_EMAIL);

const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
  email: MADGI_ADMIN_EMAIL,
  password: MADGI_ADMIN_PASSWORD,
});

let signInOk = false;

if (signInError) {
  console.log('    ✗ signInWithPassword ÉCHOUÉ');
  console.log('      error.message :', signInError.message);
  console.log('      error.status  :', signInError.status ?? '(absent)');
  console.log('      error.name    :', signInError.name ?? '(absent)');
  console.log('      → Conclusion  : Supabase Auth refuse l\'email/mot de passe fourni.');
} else if (!signInData?.session) {
  console.log('    ✗ signInWithPassword : pas de session retournée (user :', signInData?.user?.id ?? '(absent)', ')');
} else {
  signInOk = true;
  const { session } = signInData;
  console.log('    ✓ signInWithPassword RÉUSSI');
  console.log('      session.user.id    :', session.user.id);
  console.log('      session.user.email :', session.user.email);
  console.log('      access_token       :', maskToken(session.access_token));
  console.log('      refresh_token      :', maskToken(session.refresh_token));
}

// ── CONTRÔLE E : lecture public.utilisateurs avec client anon connecté ────────
if (signInOk && signInData?.session) {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[E] Lecture public.utilisateurs avec client anon connecté...');

  const { data: anonUserRow, error: anonUserError } = await supabaseAnon
    .from('utilisateurs')
    .select('id_utilisateur, auth_user_id, matricule, email, profil, user_actif, id_adherent')
    .eq('auth_user_id', signInData.session.user.id)
    .maybeSingle();

  if (anonUserError) {
    if (anonUserError.code === 'PGRST301' || anonUserError.message?.includes('RLS') || anonUserError.code === '42501') {
      console.log('    ✗ BLOQUÉ PAR RLS (Row Level Security)');
      console.log('      code    :', anonUserError.code);
      console.log('      message :', anonUserError.message);
      console.log('      → La policy RLS sur utilisateurs ne permet pas la lecture par l\'utilisateur connecté.');
    } else {
      console.log('    ✗ Erreur Supabase (non-RLS)');
      console.log('      code    :', anonUserError.code ?? '(absent)');
      console.log('      message :', anonUserError.message);
    }
  } else if (!anonUserRow) {
    console.log('    ✗ Ligne introuvable (maybeSingle retourne null)');
    console.log('      auth_user_id cherché :', signInData.session.user.id);
    console.log('      → Soit la RLS filtre sans erreur, soit la liaison auth_user_id est absente.');
  } else {
    const profilOk = anonUserRow.profil === 'ADMINISTRATEUR';
    const actifOk = anonUserRow.user_actif === true;
    if (profilOk && actifOk) {
      console.log('    ✓ Ligne trouvée et profil OK');
    } else if (!profilOk) {
      console.log('    ~ Ligne trouvée mais profil invalide :', anonUserRow.profil);
    } else {
      console.log('    ~ Ligne trouvée mais user_actif = false');
    }
    console.log('      id_utilisateur :', anonUserRow.id_utilisateur);
    console.log('      auth_user_id   :', anonUserRow.auth_user_id);
    console.log('      profil         :', anonUserRow.profil);
    console.log('      user_actif     :', anonUserRow.user_actif);
  }
}

// ── CONTRÔLE F : Déconnexion ──────────────────────────────────────────────────
if (signInOk) {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[F] Déconnexion...');
  const { error: signOutError } = await supabaseAnon.auth.signOut();
  if (signOutError) {
    console.log('    ✗ Erreur signOut :', signOutError.message);
  } else {
    console.log('    ✓ Déconnexion réussie.');
  }
}

// ── Résumé final ──────────────────────────────────────────────────────────────
console.log('');
console.log('══════════════════════════════════════════════════');
console.log('  RÉSUMÉ AUDIT');
console.log('══════════════════════════════════════════════════');
console.log('  A. auth.users trouvé          :', authUser ? '✓' : '✗');
console.log('  B. utilisateurs trouvé        :', userRow ? '✓' : '✗');
if (authUser && userRow) {
  console.log('  C. Liaison cohérente          :', authUser.id === userRow.auth_user_id ? '✓' : '✗');
  console.log('  C. Email cohérent             :', (authUser.email ?? '').toLowerCase() === (userRow.email ?? '').toLowerCase() ? '✓' : '✗');
  console.log('  C. Profil ADMINISTRATEUR      :', userRow.profil === 'ADMINISTRATEUR' ? '✓' : '✗');
  console.log('  C. user_actif                 :', userRow.user_actif ? '✓' : '✗');
}
console.log('  D. signInWithPassword OK      :', signInOk ? '✓' : '✗');
console.log('══════════════════════════════════════════════════\n');
