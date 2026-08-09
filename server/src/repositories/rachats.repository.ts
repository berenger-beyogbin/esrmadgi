import { getSupabaseServer } from '../config/supabaseServer';
import { buildIlikeOrFilter } from '../utils/postgrestFilters';

export const rachatsRepository = {
  async list(filters?:{search?:string;statut?:string}) {
    const s=getSupabaseServer(); let q:any=s.from('v_rachats_details').select('*');
    if(filters?.statut && filters.statut!=='TOUS') q=q.eq('statut',filters.statut);
    if(filters?.search){const f=buildIlikeOrFilter(filters.search,['matricule','nom','prenoms']);if(f)q=q.or(f);}
    const {data,error}=await q.order('date_demande',{ascending:false}); if(error)throw new Error(error.message); return data??[];
  },
  async adherent(id:string){const s=getSupabaseServer();const {data,error}=await s.from('adherents').select('id_adherent,date_souscription,statut,retraite,decede').eq('id_adherent',id).maybeSingle();if(error)throw new Error(error.message);return data;},
  async renteActive(id:string){const s=getSupabaseServer();const {data,error}=await s.from('rentes').select('id_rente').eq('id_adherent',id).eq('statut_rente','ACTIVE').limit(1);if(error)throw new Error(error.message);return (data?.length??0)>0;},
  async cotisations(id:string,date:string){const s=getSupabaseServer();const {data,error}=await s.from('v_cotisations_details').select('montant,date_valeur,source').eq('id_adherent',id).eq('statut_detail','ENCAISSEE').not('date_valeur','is',null).lte('date_valeur',date).order('date_valeur');if(error)throw new Error(error.message);return data??[];},
  async create(row:Record<string,unknown>){const s=getSupabaseServer();const {data,error}=await s.from('rachats').insert(row).select().single();if(error)throw new Error(error.message);return data;},
  async byId(id:string){const s=getSupabaseServer();const {data,error}=await s.from('v_rachats_details').select('*').eq('id_rachat',id).maybeSingle();if(error)throw new Error(error.message);return data;},
  async update(id:string,patch:Record<string,unknown>){const s=getSupabaseServer();const {data,error}=await s.from('rachats').update({...patch,updated_at:new Date().toISOString()}).eq('id_rachat',id).select().single();if(error)throw new Error(error.message);return data;},
  async event(id:string,ancien:string|null,nouveau:string,user:string,observation:string){const s=getSupabaseServer();const {error}=await s.from('rachat_evenements').insert({id_rachat:id,ancien_statut:ancien,nouveau_statut:nouveau,utilisateur:user,observation});if(error)throw new Error(error.message);},
  async pay(id:string,user:string,p:{datePaiement:string;referencePaiement:string;modePaiement:string;observation?:string}){const s=getSupabaseServer();const {data,error}=await s.rpc('payer_rachat_esr',{p_id_rachat:Number(id),p_utilisateur:user,p_date_paiement:p.datePaiement,p_reference:p.referencePaiement,p_mode:p.modePaiement,p_observation:p.observation??null});if(error)throw new Error(error.message);return data;},
};
