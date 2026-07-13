import { agentsRepository } from '../repositories/agents.repository';
import { ExternalAgentInfo, SearchAgentResponse } from '../types';

export const agentsService = {
  async searchByMatricule(matricule: string): Promise<SearchAgentResponse> {
    let agent: ExternalAgentInfo | null = null;

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
      return { found: true, data: agent, error: null };
    }
    return { found: false, data: null, error: null };
  },
};
