import { getSupabaseServer } from '../config/supabaseServer';

export interface AuditFilters {
  action?: string;
  utilisateur?: string;
  objetAudit?: string;
  idObjet?: string;
  date?: string;
}

export interface AuditPayload {
  action: string;
  utilisateur: string;
  objet_audit: string;
  details: string;
  date: string;
  id_objet?: string | null;
}

function mapAuditRow(row: any): unknown {
  const details =
    typeof row.details === 'string'
      ? row.details
      : typeof row.payload_json?.details === 'string'
      ? row.payload_json.details
      : row.payload_json
      ? JSON.stringify(row.payload_json)
      : '';

  return {
    id: String(row.id_audit ?? row.id ?? ''),
    id_audit: row.id_audit,
    action: row.payload_json?.action_metier ?? row.action,
    utilisateur: row.utilisateur,
    objet_audit: row.objet_audit,
    id_objet: row.id_objet ?? null,
    date: row.horodatage ?? row.date ?? row.created_at,
    details,
  };
}

function toStoredAction(action: string): string {
  const normalized = action.trim().toUpperCase();
  if (normalized === 'CREATE' || normalized.startsWith('CREATION')) return 'CREATE';
  if (normalized === 'DELETE' || normalized.startsWith('SUPPRESSION')) return 'DELETE';
  return 'UPDATE';
}

export const auditRepository = {
  async findLogs(filters?: AuditFilters): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase.from('audit_logs').select('*');

    if (filters?.action) {
      query = query.ilike('action', `%${filters.action}%`);
    }
    if (filters?.utilisateur) {
      query = query.ilike('utilisateur', `%${filters.utilisateur}%`);
    }
    if (filters?.objetAudit) {
      query = query.ilike('objet_audit', `%${filters.objetAudit}%`);
    }
    if (filters?.idObjet) {
      query = query.eq('id_objet', filters.idObjet);
    }
    if (filters?.date) {
      query = query.gte('horodatage', `${filters.date}T00:00:00`).lte('horodatage', `${filters.date}T23:59:59`);
    }

    const { data, error } = await query.order('horodatage', { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAuditRow);
  },

  async createLog(payload: AuditPayload): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([
        {
          objet_audit: payload.objet_audit,
          id_objet: payload.id_objet ?? null,
          action: toStoredAction(payload.action),
          payload_json: {
            action_metier: payload.action,
            details: payload.details,
          },
          utilisateur: payload.utilisateur,
          horodatage: payload.date,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapAuditRow(data);
  },
};
