import { agentsRepository } from '../repositories/agents.repository';
import { adherentsRepository } from '../repositories/adherents.repository';
import { ExternalAgentInfo, SearchAgentResponse } from '../types';

export const agentsService = {
  async searchByMatricule(matricule: string): Promise<SearchAgentResponse> {
    let agent: ExternalAgentInfo | null = null;
    const existing = await adherentsRepository.findByMatricule(matricule) as {
      id_adherent?: string | number;
    } | null;
    const alreadyAdherent = Boolean(existing);
    const adherentId = existing?.id_adherent != null ? String(existing.id_adherent) : null;

    try {
      agent = await agentsRepository.searchInMysql(matricule);
    } catch (err) {
      console.error('[agents.service] MySQL:', err instanceof Error ? err.message : err);
    }

    if (!agent) {
      try {
        agent = await agentsRepository.searchInSiaps(matricule);
      } catch (err) {
        console.error('[agents.service] SIAPS:', err instanceof Error ? err.message : err);
      }
    }

    if (agent) {
      return { found: true, data: agent, error: null, alreadyAdherent, adherentId };
    }
    return { found: false, data: null, error: null, alreadyAdherent, adherentId };
  },
};
