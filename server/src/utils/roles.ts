import { UserProfile } from '../types';

export const VALID_ROLES: UserProfile[] = ['ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR', 'SUPERADMIN'];

export function normalizeRole(value: unknown): UserProfile | null {
  const role = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (role === 'SUPER_ADMIN') return 'SUPERADMIN';
  return VALID_ROLES.includes(role as UserProfile) ? (role as UserProfile) : null;
}

export function canAccessRole(userRole: UserProfile, allowedRoles: UserProfile[]): boolean {
  if (userRole === 'SUPERADMIN') return true;
  return allowedRoles.includes(userRole);
}

export function isAdminRole(role: UserProfile): boolean {
  return role === 'ADMINISTRATEUR' || role === 'SUPERADMIN';
}

export function toStoredProfile(role: UserProfile): UserProfile {
  // The current database stores the historical administrator profile.
  return role === 'SUPERADMIN' ? 'ADMINISTRATEUR' : role;
}
