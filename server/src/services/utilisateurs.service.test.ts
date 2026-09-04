import assert from 'node:assert/strict';
import test from 'node:test';
import { auditService } from './audit.service';
import { utilisateursRepository } from '../repositories/utilisateurs.repository';
import { hasProfessionalAccess, utilisateursService } from './utilisateurs.service';
import { AuthenticatedUser } from '../types';

const actor: AuthenticatedUser = {
  id_utilisateur: '7',
  auth_user_id: 'actor-auth-id',
  matricule: '11816P',
  email: 'admin@madgi.ci',
  role: 'ADMINISTRATEUR',
  profil_code: 'ADMINISTRATEUR',
  permissions: ['ADHERENTS'],
  id_adherent: null,
};

test('identifie les profils professionnels sans confondre un adherent', () => {
  assert.equal(hasProfessionalAccess('ADHERENT'), false);
  assert.equal(hasProfessionalAccess(null), false);
  assert.equal(hasProfessionalAccess('GESTIONNAIRE'), true);
  assert.equal(hasProfessionalAccess('ADMINISTRATEUR'), true);
  assert.equal(hasProfessionalAccess('COMMERCIAL'), true);
});

test('lier un gestionnaire a une fiche adherent preserve ses identifiants et son profil', async (t) => {
  const updates: Array<Record<string, unknown>> = [];
  let authUpdateCalled = false;

  t.mock.method(utilisateursRepository, 'findByMatricule', async () => ({
    id_utilisateur: 17,
    auth_user_id: 'professional-auth-id',
    matricule: '871088X',
    email: 'y.coulibaly@madgi.ci',
    telephone: '0700000000',
    user_actif: true,
    profil: 'ADMINISTRATEUR',
    id_adherent: null,
    date_creation: null,
    cree_par: null,
    date_modif: null,
    modif_par: null,
  }));
  t.mock.method(utilisateursRepository, 'getAuthUserById', async () => ({
    id: 'professional-auth-id',
    email: 'y.coulibaly@madgi.ci',
    user_metadata: {
      matricule: '871088X',
      profil: 'ADMINISTRATEUR',
      must_change_password: false,
    },
  }) as any);
  t.mock.method(utilisateursRepository, 'update', async (_id: number, payload: unknown) => {
    updates.push(payload as unknown as Record<string, unknown>);
    return {} as any;
  });
  t.mock.method(utilisateursRepository, 'updateAuthUser', async () => {
    authUpdateCalled = true;
    return {} as any;
  });
  t.mock.method(auditService, 'logEvent', async () => ({}));

  const result = await utilisateursService.ensureAdherentAccess(actor, {
    matricule: '871088x',
    idAdherent: 127,
    telephone: '0100000000',
  });

  assert.equal(authUpdateCalled, false);
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0], {
    auth_user_id: 'professional-auth-id',
    telephone: '0700000000',
    id_adherent: 127,
    auditUserId: 7,
  });
  assert.deepEqual(result, {
    login: 'y.coulibaly@madgi.ci',
    email: 'y.coulibaly@madgi.ci',
    must_change_password: false,
    access_preserved: true,
    profil: 'ADMINISTRATEUR',
  });
});
