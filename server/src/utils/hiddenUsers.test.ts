import assert from 'node:assert/strict';
import test from 'node:test';
import { isHiddenUserMatricule } from './hiddenUsers';

test('masque le compte technique 395047Y sans tenir compte de la casse', () => {
  assert.equal(isHiddenUserMatricule('395047Y'), true);
  assert.equal(isHiddenUserMatricule(' 395047y '), true);
});

test('ne masque pas les autres comptes', () => {
  assert.equal(isHiddenUserMatricule('ADMIN001'), false);
  assert.equal(isHiddenUserMatricule(null), false);
});
