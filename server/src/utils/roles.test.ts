import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessRole, isAdminRole, normalizeRole } from './roles';

test('normalisation des quatre profils', () => {
  assert.equal(normalizeRole('adherent'), 'ADHERENT');
  assert.equal(normalizeRole('gestionnaire'), 'GESTIONNAIRE');
  assert.equal(normalizeRole('administrateur'), 'ADMINISTRATEUR');
  assert.equal(normalizeRole('super-admin'), 'SUPERADMIN');
  assert.equal(normalizeRole('inconnu'), null);
});

test('un adherent ne peut pas acceder aux fonctions gestionnaire', () => {
  assert.equal(canAccessRole('ADHERENT', ['GESTIONNAIRE', 'ADMINISTRATEUR']), false);
});

test('le superadministrateur peut acceder aux routes protegees', () => {
  assert.equal(canAccessRole('SUPERADMIN', ['ADMINISTRATEUR']), true);
  assert.equal(isAdminRole('SUPERADMIN'), true);
  assert.equal(isAdminRole('GESTIONNAIRE'), false);
});
