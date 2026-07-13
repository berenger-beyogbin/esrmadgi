import { AuthenticatedUser } from '../types';
import { AuditFilters, auditRepository } from '../repositories/audit.repository';

export const auditService = {
  async getLogs(filters?: AuditFilters): Promise<unknown[]> {
    return auditRepository.findLogs(filters);
  },

  async logEvent(
    user: AuthenticatedUser,
    payload: { action: string; objetAudit: string; details: string; idObjet?: string | number | null },
  ): Promise<unknown> {
    return auditRepository.createLog({
      action: payload.action,
      objet_audit: payload.objetAudit,
      id_objet: payload.idObjet == null ? null : String(payload.idObjet),
      details: payload.details,
      utilisateur: user.email || user.matricule || user.id_utilisateur,
      date: new Date().toISOString(),
    });
  },
};
