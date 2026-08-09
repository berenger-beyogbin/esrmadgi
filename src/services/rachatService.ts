import { apiDownloadBlob,apiGet,apiPatch,apiPost } from '../lib/apiClient';
export type RachatStatut='DOSSIER_OUVERT'|'EN_CONTROLE'|'VALIDE'|'PAYE'|'REJETE'|'ANNULE';
export interface Rachat {id_rachat:string;id_adherent:string;matricule:string;nom:string;prenoms:string;date_demande:string;statut:RachatStatut;provision_mathematique:number;frais_gestion:number;penalite:number;montant_net:number;anciennete_annees:number;nombre_mouvements:number;reference_paiement?:string;}
type R<T>={data:T;error:string|null}; const err=(e:string|null|undefined)=>e?new Error(e):null;
export const rachatService={
 async list(filters?:{search?:string;statut?:string}){const q=new URLSearchParams();if(filters?.search)q.set('search',filters.search);if(filters?.statut)q.set('statut',filters.statut);const r=await apiGet<R<Rachat[]>>(`/api/rachats?${q}`);return {data:r.data?.data??[],error:r.error?new Error(r.error):err(r.data?.error)};},
 async create(p:{adherentId:string;dateDemande:string;motif?:string}){const r=await apiPost<R<Rachat>>('/api/rachats',p);return {data:r.data?.data??null,error:r.error?new Error(r.error):err(r.data?.error)};},
 async transition(id:string,statut:Exclude<RachatStatut,'DOSSIER_OUVERT'|'PAYE'>,observation=''){const r=await apiPatch<R<Rachat>>(`/api/rachats/${id}/statut`,{statut,observation});return {data:r.data?.data??null,error:r.error?new Error(r.error):err(r.data?.error)};},
 async pay(id:string,p:{datePaiement:string;referencePaiement:string;modePaiement:'VIREMENT'|'CHEQUE';observation?:string}){const r=await apiPatch<R<Rachat>>(`/api/rachats/${id}/paiement`,p);return {data:r.data?.data??null,error:r.error?new Error(r.error):err(r.data?.error)};},
 async pdf(id:string){const r=await apiDownloadBlob(`/api/rachats/${id}/liquidation.pdf`);return {data:r.data,error:r.error?new Error(r.error):null};}
};
