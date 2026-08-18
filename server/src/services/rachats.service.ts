import { AppError } from '../middleware/errorHandler';
import { rachatsRepository } from '../repositories/rachats.repository';
import { AuthenticatedUser } from '../types';
import { auditService } from './audit.service';
import { comptesEsrService } from './comptes-esr.service';
import { genererLiquidationPdf } from './pdf-document.service';
import { ancienneteAnneesCompletes, rachatTransitionPermise, RachatStatut } from './rachat-workflow';
import { reglesActuariellesService } from './regles-actuarielles.service';
import { calculerValeurRachatDepuisProvision } from './moteur-actuariel.service';

const uid=(u:AuthenticatedUser)=>u.id_utilisateur;
const money=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;

export const rachatsService={
  list(filters?:{search?:string;statut?:string}){return rachatsRepository.list(filters);},
  async create(user:AuthenticatedUser,p:{adherentId:string;dateDemande:string;motif?:string}){
    const ad:any=await rachatsRepository.adherent(p.adherentId);
    if(!ad)throw new AppError(404,'Adherent introuvable');
    if(ad.statut!==true)throw new AppError(400,'Rachat impossible : le contrat ESR n est pas actif');
    if(ad.decede===true)throw new AppError(400,'Rachat impossible pour un adherent decede');
    if(ad.retraite===true || await rachatsRepository.renteActive(p.adherentId))throw new AppError(400,'Rachat impossible apres mise en service de la rente');
    const anciennete=ancienneteAnneesCompletes(String(ad.date_souscription),p.dateDemande);
    const regles=await reglesActuariellesService.getRegles(p.dateDemande);
    if(anciennete<regles.delaiMinimumRachatAnnees)throw new AppError(400,`Rachat non eligible avant ${regles.delaiMinimumRachatAnnees} annees completes`);
    const recalcul:any=await comptesEsrService.recalculerCompte(user,p.adherentId,p.dateDemande);
    if(recalcul.calcul.nombreMouvements<8)throw new AppError(400,'Rachat non eligible : huit cotisations trimestrielles encaissees sont requises');
    const dateArrete=String(recalcul.calcul.dateCalcul), pm=Number(recalcul.calcul.provisionMathematique), liquidation=calculerValeurRachatDepuisProvision(pm,regles.fraisGestionRachat,regles.penaliteRachat);
    const frais=liquidation.fraisGestion, penalite=liquidation.penalite, net=liquidation.montantNet;
    const mouvements=await rachatsRepository.cotisations(p.adherentId,dateArrete);
    const version=`ESR-RACHAT-2|${p.dateDemande}`;
    const row:any=await rachatsRepository.create({id_adherent:Number(p.adherentId),date_demande:p.dateDemande,date_arrete:dateArrete,motif:p.motif??null,
      capital_verse:recalcul.calcul.capitalVerse,provision_mathematique:pm,taux_frais_gestion:regles.fraisGestionRachat,frais_gestion:frais,
      taux_penalite:regles.penaliteRachat,penalite,montant_net:net,nombre_mouvements:recalcul.calcul.nombreMouvements,anciennete_annees:anciennete,
      version_calcul:version,parametres_json:regles.versions,mouvements_json:mouvements,cree_par:uid(user)});
    await rachatsRepository.event(String(row.id_rachat),null,'DOSSIER_OUVERT',uid(user),p.motif??'');
    await auditService.logEvent(user,{action:'CREATION_RACHAT',objetAudit:'RACHAT',idObjet:row.id_rachat,details:JSON.stringify({pm,frais,penalite,net,anciennete,version})});
    return row;
  },
  async transition(user:AuthenticatedUser,id:string,p:{statut:RachatStatut;observation?:string}){
    const r:any=await rachatsRepository.byId(id);if(!r)throw new AppError(404,'Rachat introuvable');
    const actuel=String(r.statut) as RachatStatut;if(!rachatTransitionPermise(actuel,p.statut))throw new AppError(400,`Transition de rachat interdite : ${actuel} vers ${p.statut}`);
    if(p.statut==='PAYE')throw new AppError(400,'Utiliser l operation de paiement avec une reference bancaire');
    const patch:Record<string,unknown>={statut:p.statut,observation:p.observation??null};
    if(p.statut==='EN_CONTROLE'){if(String(r.cree_par)===uid(user))throw new AppError(400,'Le createur ne peut pas controler son propre dossier');patch.controle_par=uid(user);patch.date_controle=new Date().toISOString();}
    if(p.statut==='VALIDE'){if(!r.controle_par)throw new AppError(400,'Controle prealable obligatoire');if(String(r.controle_par)===uid(user))throw new AppError(400,'Le controleur ne peut pas valider le meme dossier');patch.valide_par=uid(user);patch.date_validation=new Date().toISOString();}
    const updated=await rachatsRepository.update(id,patch);await rachatsRepository.event(id,actuel,p.statut,uid(user),p.observation??'');
    await auditService.logEvent(user,{action:`RACHAT_${p.statut}`,objetAudit:'RACHAT',idObjet:id,details:JSON.stringify({ancien:actuel,observation:p.observation??''})});return updated;
  },
  async pay(user:AuthenticatedUser,id:string,p:{datePaiement:string;referencePaiement:string;modePaiement:string;observation?:string}){
    const r:any=await rachatsRepository.byId(id);if(!r)throw new AppError(404,'Rachat introuvable');
    if(String(r.valide_par)===uid(user))throw new AppError(400,'Le valideur ne peut pas executer le paiement');
    const out=await rachatsRepository.pay(id,uid(user),p);await auditService.logEvent(user,{action:'RACHAT_PAYE_CONTRAT_RESILIE',objetAudit:'RACHAT',idObjet:id,details:JSON.stringify(p)});return out;
  },
  async pdf(id:string){const r:any=await rachatsRepository.byId(id);if(!r)throw new AppError(404,'Rachat introuvable');return genererLiquidationPdf({numero:`R-${id}`,type:'RACHAT TOTAL / RESILIATION',nom:r.nom,prenoms:r.prenoms,matricule:r.matricule,dateDemande:r.date_demande,montant:Number(r.montant_net),statut:r.statut});},
};
