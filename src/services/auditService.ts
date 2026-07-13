import { apiGet, apiPost } from '../lib/apiClient';
import { AuditLog } from '../types';

type ApiResponse<T> = { data: T; error: string | null };

function toError(error: string | null | undefined): Error | null {
  return error ? new Error(error) : null;
}

function appendParam(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value && value.trim()) {
    params.set(key, value.trim());
  }
}

export const auditService = {
  async getAuditLogs(filters?: {
    action?: string;
    utilisateur?: string;
    objetAudit?: string;
    idObjet?: string;
    date?: string;
  }): Promise<{ data: AuditLog[]; error: Error | null }> {
    const params = new URLSearchParams();
    appendParam(params, 'action', filters?.action);
    appendParam(params, 'utilisateur', filters?.utilisateur);
    appendParam(params, 'objetAudit', filters?.objetAudit);
    appendParam(params, 'idObjet', filters?.idObjet);
    appendParam(params, 'date', filters?.date);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const { data, error } = await apiGet<ApiResponse<AuditLog[]>>(`/api/audit${qs}`);

    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async logEvent(action: string, objetAudit: string, details: string, utilisateur: string): Promise<void> {
    const { error, data } = await apiPost<ApiResponse<unknown>>('/api/audit', {
      action,
      objetAudit,
      details,
      utilisateur,
    });

    if (error || data?.error) {
      console.error('Erreur logEvent:', error || data?.error);
    }
  },
};
