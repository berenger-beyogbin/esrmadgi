/**
 * MADGI ESR — Script d'administration local
 * Crée ou répare l'utilisateur Supabase Auth admin et sa liaison avec public.utilisateurs.
 *
 * Usage : node scripts/ensure-admin-auth.mjs
 * Prérequis : remplir .env.admin.local (voir .env.admin.local.example)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Parseur .env minimal (sans dépendance externe) ───────────────────────────
function loadEnvFile(filePath) {
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    console.error('[ERREUR] Fichier introuvable :', filePath);
    console.error('→ Copiez .env.admin.local.example vers .env.admin.local et remplissez les valeurs.');
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

loadEnvFile(resolve(ROOT, '.env.admin.local'));

// ── Lecture et validation des variables ──────────────────────────────────────
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MADGI_ADMIN_EMAIL,
  MADGI_ADMIN_PASSWORD,
  MADGI_ADMIN_MATRICULE,
} = process.env;

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MADGI_ADMIN_EMAIL',
  'MADGI_ADMIN_PASSWORD',
  'MADGI_ADMIN_MATRICULE',
];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('[ERREUR] Variables manquantes dans .env.admin.local :', missing.join(', '));
  process.exit(1);
}

// ── Client Supabase admin (service_role — jamais exposé au navigateur) ────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('\n══════════════════════════════════════════════════');
console.log('  MADGI ESR — Réparation accès admin Supabase');
console.log('══════════════════════════════════════════════════');
console.log('  Email      :', MADGI_ADMIN_EMAIL);
console.log('  Matricule  :', MADGI_ADMIN_MATRICULE);
console.log('  URL        :', SUPABASE_URL);
console.log('');

// ── Étape 1 : Recherche de l'utilisateur Auth par email ───────────────────────
console.log('[1/4] Recherche de l\'utilisateur Auth par email...');

let authUser = null;
let page = 1;
while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 50 });
  if (error) {
    console.error('[ERREUR] listUsers :', error.message);
    process.exit(1);
  }
  const found = data.users.find((u) => u.email === MADGI_ADMIN_EMAIL) ?? null;
  if (found) { authUser = found; break; }
  if (data.users.length < 50) break;
  page++;
}

// ── Étape 2 : Création ou mise à jour de l'utilisateur Auth ───────────────────
if (!authUser) {
  console.log('      → Utilisateur absent. Création en cours...');
  const { data, error } = await supabase.auth.admin.createUser({
    email: MADGI_ADMIN_EMAIL,
    password: MADGI_ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (error) {
    console.error('[ERREUR] createUser :', error.message);
    process.exit(1);
  }
  authUser = data.user;
  console.log('      → Créé avec succès.');
  console.log('      → auth_user_id :', authUser.id);
} else {
  console.log('      → Utilisateur trouvé.');
  console.log('      → auth_user_id :', authUser.id);
  console.log('[2/4] Mise à jour du mot de passe et confirmation de l\'email...');
  const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
    password: MADGI_ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (error) {
    console.error('[ERREUR] updateUserById :', error.message);
    process.exit(1);
  }
  console.log('      → Mot de passe mis à jour, email confirmé.');
}

// ── Étape 3 : Mise à jour de public.utilisateurs ─────────────────────────────
console.log('[3/4] Mise à jour de public.utilisateurs pour matricule =', MADGI_ADMIN_MATRICULE, '...');

const { error: updateError, count } = await supabase
  .from('utilisateurs')
  .update({
    auth_user_id: authUser.id,
    email: MADGI_ADMIN_EMAIL,
    user_actif: true,
    profil: 'ADMINISTRATEUR',
  })
  .eq('matricule', MADGI_ADMIN_MATRICULE)
  .select('id_utilisateur', { count: 'exact', head: true });

if (updateError) {
  console.error('[ERREUR] update utilisateurs :', updateError.message);
  process.exit(1);
}
if (count === 0) {
  console.error('[ERREUR] Aucune ligne trouvée pour matricule =', MADGI_ADMIN_MATRICULE);
  console.error('         Vérifiez que ce matricule existe bien dans public.utilisateurs.');
  process.exit(1);
}
console.log('      → Ligne mise à jour (', count, 'ligne(s) affectée(s)).');

// ── Étape 4 : Vérification et résumé ─────────────────────────────────────────
console.log('[4/4] Vérification en base...');

const { data: userRow, error: readError } = await supabase
  .from('utilisateurs')
  .select('id_utilisateur, auth_user_id, matricule, email, user_actif, profil, id_adherent')
  .eq('matricule', MADGI_ADMIN_MATRICULE)
  .maybeSingle();

if (readError) {
  console.error('[ERREUR] lecture vérification :', readError.message);
  process.exit(1);
}
if (!userRow) {
  console.error('[ERREUR] Ligne introuvable après mise à jour pour matricule =', MADGI_ADMIN_MATRICULE);
  process.exit(1);
}

console.log('\n══════════════════════════════════════════════════');
console.log('  RÉSUMÉ — État après réparation');
console.log('══════════════════════════════════════════════════');
console.log('  id_utilisateur :', userRow.id_utilisateur);
console.log('  auth_user_id   :', userRow.auth_user_id);
console.log('  matricule      :', userRow.matricule);
console.log('  email          :', userRow.email);
console.log('  profil         :', userRow.profil);
console.log('  user_actif     :', userRow.user_actif);
console.log('  id_adherent    :', userRow.id_adherent ?? '(null)');

if (userRow.auth_user_id !== authUser.id) {
  console.error('\n[ERREUR] INCOHÉRENCE : auth_user_id en base ne correspond pas !');
  console.error('  Attendu :', authUser.id);
  console.error('  En base :', userRow.auth_user_id);
  process.exit(1);
}

console.log('\n  ✓ Liaison Auth ↔ utilisateurs vérifiée et cohérente.');
console.log('\n══════════════════════════════════════════════════');
console.log('  Connexion frontend possible avec :');
console.log('    Email    :', MADGI_ADMIN_EMAIL);
console.log('    Mot de passe : (celui défini dans .env.admin.local)');
console.log('══════════════════════════════════════════════════\n');
