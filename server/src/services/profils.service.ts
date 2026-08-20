import { AppError } from '../middleware/errorHandler';
import { profilsRepository, ProfilRow } from '../repositories/profils.repository';

export const FONCTIONNALITES = ['DASHBOARD','DASHBOARD_COMMERCIAL','INSCRIPTION_ADHERENT','MES_ADHESIONS','ADHESIONS_EN_LIGNE','ADHERENTS','PRECOMPTES','REGULARISATION_PRECOMPTES','COTISATION_SPONTANEE','COTISATIONS_LISTE','VALIDATION_PAIEMENTS','CLOTURE_PERIODE','PRESTATIONS','RACHATS','COMPTES','REPORTING','PARAMETRES','UTILISATEURS','AIDE'] as const;
const allowed = new Set<string>(FONCTIONNALITES);

function dto(row: ProfilRow) {
  return { ...row, actif: row.etat === 1, permissions: String(row.liste_fonctions ?? '').split(',').map(v => v.trim()).filter(v => allowed.has(v)) };
}
function permissions(values: string[]): string { return [...new Set(values.filter(v => allowed.has(v)))].join(','); }

export const profilsService = {
  async list() { return (await profilsRepository.list()).map(dto); },
  async find(code: string) { const row = await profilsRepository.findByCode(code); return row ? dto(row) : null; },
  async create(input: { code_profil:string; lib_profil:string; description?:string; role_base:'GESTIONNAIRE'|'ADMINISTRATEUR'; permissions:string[]; actif?:boolean }) {
    const code=input.code_profil.trim().toUpperCase().replace(/[^A-Z0-9_]/g,'_');
    if (!code || ['ADHERENT','GESTIONNAIRE','ADMINISTRATEUR','SUPERADMIN'].includes(code)) throw new AppError(400,'Code profil invalide ou reserve');
    if (await profilsRepository.findByCode(code)) throw new AppError(409,'Ce code profil existe deja');
    if (!input.permissions.length) throw new AppError(400,'Selectionnez au moins une fonctionnalite');
    return dto(await profilsRepository.create({ code_profil:code, lib_profil:input.lib_profil.trim(), description:input.description?.trim()||null, role_base:input.role_base, liste_fonctions:permissions(input.permissions), etat:input.actif===false?0:1 }));
  },
  async update(id:number,input:{lib_profil?:string;description?:string;role_base?:'GESTIONNAIRE'|'ADMINISTRATEUR';permissions?:string[];actif?:boolean}) {
    const rows=await profilsRepository.list(); const current=rows.find(p=>p.id_profil===id); if(!current)throw new AppError(404,'Profil introuvable');
    if(current.systeme && (input.role_base || input.actif===false))throw new AppError(400,'Le socle et le statut d un profil systeme sont proteges');
    if(input.permissions && !input.permissions.length)throw new AppError(400,'Selectionnez au moins une fonctionnalite');
    return dto(await profilsRepository.update(id,{lib_profil:input.lib_profil?.trim(),description:input.description?.trim()||null,role_base:input.role_base,liste_fonctions:input.permissions?permissions(input.permissions):undefined,etat:input.actif===undefined?undefined:(input.actif?1:0)}));
  },
};
