import { apiGet, apiPost, apiPut } from '../lib/apiClient';
import { UserProfile } from '../types';
type ApiResponse<T>={data:T;error:string|null};
export interface ProfilAcces {id_profil:number;code_profil:string;lib_profil:string;description:string|null;role_base:UserProfile;permissions:string[];actif:boolean;systeme:boolean;}
export interface ProfilPayload {code_profil:string;lib_profil:string;description?:string;role_base:'GESTIONNAIRE'|'ADMINISTRATEUR';permissions:string[];actif?:boolean;}
const result=<T>(data:ApiResponse<T>|null,error:string|null)=>({data:data?.data??null,error:error?new Error(error):data?.error?new Error(data.error):null});
export const profilService={
 async list(){const {data,error}=await apiGet<ApiResponse<ProfilAcces[]>>('/api/profils');return result(data,error);},
 async create(payload:ProfilPayload){const {data,error}=await apiPost<ApiResponse<ProfilAcces>>('/api/profils',payload);return result(data,error);},
 async update(id:number,payload:Partial<Omit<ProfilPayload,'code_profil'>>){const {data,error}=await apiPut<ApiResponse<ProfilAcces>>(`/api/profils/${id}`,payload);return result(data,error);},
};
