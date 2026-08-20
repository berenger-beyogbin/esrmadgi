import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const OUT='C:/PROJETS/madgi-esr/FORMATION';
const PREVIEW=`${OUT}/.build/presentation_preview`;
const P={navy:'#173A6A',blue:'#2E74B5',green:'#147A4B',gold:'#D89B2B',ink:'#172033',muted:'#637083',pale:'#E8EEF5',light:'#F5F7FA',white:'#FFFFFF',red:'#B42318',mint:'#E7F5EE',amber:'#FFF4D6'};
const deck=Presentation.create({slideSize:{width:1280,height:720}});

function box(slide,x,y,w,h,fill=P.white,line=P.pale,r=18){
  return slide.shapes.add({geometry:'roundRect',position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:line,width:1},borderRadius:r>10?'rounded-xl':'rounded-md'});
}
function text(slide,txt,x,y,w,h,size=24,color=P.ink,bold=false,align='left'){
  const s=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{style:'solid',fill:'none',width:0}});
  s.text=txt; s.text.style={fontSize:size,color,bold,alignment:align,fontFamily:'Aptos'}; return s;
}
function title(slide,kicker,heading,num){
  slide.background.fill=P.white;
  text(slide,kicker.toUpperCase(),70,44,700,26,13,P.green,true);
  text(slide,heading,70,78,1080,60,34,P.navy,true);
  slide.shapes.add({geometry:'rect',position:{left:70,top:150,width:1140,height:3},fill:P.gold,line:{style:'solid',fill:P.gold,width:0}});
  text(slide,String(num).padStart(2,'0'),1160,48,50,25,13,P.muted,true,'right');
}
function footer(slide){ text(slide,'MADGI ESR • Formation utilisateurs',70,680,520,18,10,P.muted,false); }
function notes(slide,body){slide.speakerNotes.textFrame.setText(`${body}\n\n[Sources]\n- Application MADGI ESR : code source local et documentation projet.\n[/Sources]`);slide.speakerNotes.setVisible(true);}
function card(slide,x,y,w,h,n,h1,body,color=P.blue){
  box(slide,x,y,w,h,P.light,P.pale); text(slide,n,x+20,y+18,48,42,26,color,true); text(slide,h1,x+74,y+20,w-94,30,18,P.navy,true); text(slide,body,x+20,y+68,w-40,h-82,14,P.muted,false);
}
function flow(slide,items,y,colors){
  const gap=14,w=(1140-gap*(items.length-1))/items.length;
  items.forEach((it,i)=>{const x=70+i*(w+gap);box(slide,x,y,w,92,colors?.[i]||P.light,P.pale);text(slide,String(i+1),x+16,y+16,34,30,20,P.green,true);text(slide,it,x+52,y+15,w-66,58,15,P.navy,true);if(i<items.length-1)text(slide,'→',x+w-2,y+28,20,30,20,P.gold,true,'center');});
}

// 1
{
 const s=deck.slides.add();s.background.fill=P.navy;
 s.shapes.add({geometry:'rect',position:{left:0,top:0,width:22,height:720},fill:P.gold,line:{style:'solid',fill:P.gold,width:0}});
 text(s,'MADGI',76,65,260,40,18,P.gold,true); text(s,'ÉPARGNE SANTÉ RETRAITE',76,190,920,70,44,P.white,true); text(s,'Présentation & formation utilisateurs',76,275,880,54,28,'#DCE8F8',false); text(s,'Parcours opérationnel • Contrôles • Mise en pratique',76,365,900,34,17,'#BFD0E8',false); text(s,'19 AOÛT 2026',76,610,300,24,13,P.gold,true); text(s,'SUPPORT FORMATEUR',930,610,260,24,13,P.white,true,'right');notes(s,'Accueillir les participants. Présenter le résultat attendu : être autonome sans compromettre la traçabilité des opérations.');
}
// 2
{
 const s=deck.slides.add(); title(s,'Point de départ','À la fin de la journée, vous saurez…',2);
 card(s,70,190,350,175,'01','Opérer','Créer un adhérent, traiter les cotisations et produire les justificatifs.');
 card(s,465,190,350,175,'02','Contrôler','Lire les statuts, vérifier les montants et identifier les blocages.',P.green);
 card(s,860,190,350,175,'03','Sécuriser','Respecter les rôles, la traçabilité et la clôture de période.',P.gold);
 addNote(s,'Objectif collectif', 'Chaque participant réalise au moins trois scénarios pratiques sur quatre.',70,420,1140,125); footer(s); notes(s,'Faire formuler les attentes. Insister sur la distinction entre une opération saisie et une opération encaissée.');
}
function addNote(s,h,b,x,y,w,hh){box(s,x,y,w,hh,P.mint,'#B7DEC9');text(s,h,x+24,y+20,w-48,26,18,P.green,true);text(s,b,x+24,y+57,w-48,45,16,P.ink,false);}
// 3 agenda
{
 const s=deck.slides.add();title(s,'Parcours','Une journée en huit séquences',3);
 const items=['Connexion & rôles','Adhérents','Précomptes','Versement spontané','Workflow chèques','Comptes & reçus','Clôture & reporting','Exercices & QCM'];
 items.forEach((it,i)=>{const col=i%4,row=Math.floor(i/4),x=70+col*285,y=195+row*170;card(s,x,y,255,135,String(i+1).padStart(2,'0'),it,i<4?'Matin':'Après-midi',i%3===0?P.green:P.blue);}); footer(s);notes(s,'Présenter le rythme de la journée et annoncer que la pratique occupe la plus grande partie.');
}
// 4 roles
{
 const s=deck.slides.add();title(s,'Accès','Trois rôles, trois niveaux de responsabilité',4);
 card(s,70,190,350,280,'A','Adhérent','Consulte son espace, son historique, ses droits et ses justificatifs.',P.green);
 card(s,465,190,350,280,'G','Gestionnaire','Saisit, contrôle et suit les opérations métier autorisées.',P.blue);
 card(s,860,190,350,280,'A','Administrateur','Paramètre, supervise, contrôle et clôture les périodes.',P.gold);
 text(s,'Principe : un compte nominatif, aucune délégation informelle, aucune validation hors habilitation.',70,525,1140,46,17,P.red,true,'center');footer(s);notes(s,'Faire identifier le rôle de chaque participant. Relier chaque action sensible au profil habilité.');
}
// 5 lifecycle
{
 const s=deck.slides.add();title(s,'Vue d’ensemble','Le cycle opérationnel ESR',5);flow(s,['Adhérent créé','Paramètres de cotisation','Période ouverte','Cotisations & paiements','Compte ESR mis à jour','Contrôles puis clôture'],225,[P.light,P.light,P.amber,P.mint,P.mint,P.pale]);
 text(s,'Chaque étape produit des données utilisées par la suivante : une erreur amont devient un écart de contrôle en fin de période.',90,410,1100,80,21,P.navy,true,'center');footer(s);notes(s,'Montrer les dépendances. Une clôture fiable commence par une fiche adhérent exacte et une période correctement sélectionnée.');
}
// 6 navigation
{
 const s=deck.slides.add();title(s,'Navigation','Le bon réflexe : contexte → recherche → action → contrôle',6);
 flow(s,['Vérifier le rôle','Vérifier la période','Rechercher le matricule','Exécuter une action','Relire le résultat'],210,[P.pale,P.amber,P.light,P.mint,P.pale]);
 addNote(s,'Avant de cliquer sur Valider','Contrôler toujours l’adhérent, le montant, la date, le moyen de paiement et le statut attendu.',120,390,1040,135);footer(s);notes(s,'Faire une démonstration rapide du tableau de bord et de la recherche par matricule.');
}
// 7 adherent
{
 const s=deck.slides.add();title(s,'Adhérents','Créer sans doublon, modifier avec contrôle',7);
 card(s,70,195,345,245,'1','Rechercher','Utiliser d’abord le matricule; vérifier nom et prénoms.',P.green);
 card(s,468,195,345,245,'2','Compléter','Saisir l’identité et les paramètres métier obligatoires.',P.blue);
 card(s,865,195,345,245,'3','Relire','Contrôler les champs sensibles et l’historique après enregistrement.',P.gold);
 text(s,'Risque principal : opérer sur un homonyme ou créer une seconde fiche pour la même personne.',70,495,1140,48,18,P.red,true,'center');footer(s);notes(s,'Démontrer une recherche existante avant une création. Faire expliquer le risque de doublon.');
}
// 8 precompte
{
 const s=deck.slides.add();title(s,'Cotisations trimestrielles','Une chaîne de traitement liée à la période',8);
 flow(s,['Ouvrir / sélectionner','Générer les lignes','Exporter / transmettre','Intégrer les retours','Régulariser les écarts','Contrôler avant clôture'],215,[P.amber,P.pale,P.light,P.mint,P.mint,P.pale]);
 text(s,'Ne pas confondre : généré ≠ précompté ≠ encaissé ≠ régularisé.',175,405,930,52,25,P.navy,true,'center');
 addNote(s,'Point de vigilance','Une ligne à montant nul ou un paiement en attente doit être analysé avant la clôture.',180,490,920,105);footer(s);notes(s,'Montrer la liste des précomptes et leurs statuts. Faire verbaliser les différences entre les états.');
}
// 9 spontaneous
{
 const s=deck.slides.add();title(s,'Versement spontané','Ce que le logiciel calcule réellement',9);
 card(s,70,190,340,260,'+','Capital acquis','Le montant encaissé augmente le capital déjà constitué.',P.green);
 card(s,470,190,340,260,'÷','Besoin restant','Le capital cible diminué du capital acquis devient la nouvelle base.',P.blue);
 card(s,870,190,340,260,'↻','Nouvelle échéance','Le montant trimestriel est recalculé selon le taux et les trimestres restants.',P.gold);
 text(s,'Ce n’est pas une soustraction directe du versement sur l’échéance du trimestre en cours.',90,500,1100,55,21,P.red,true,'center');footer(s);notes(s,'Présenter l’ancienne logique métier reprise : capital acquis, capital restant à constituer, nombre de trimestres et arrondi métier.');
}
//10 dates
{
 const s=deck.slides.add();title(s,'Date de valeur','Premier jour du trimestre suivant',10);
 const q=[['T1','01/04'],['T2','01/07'],['T3','01/10'],['T4','01/01 année suivante']];
 q.forEach((a,i)=>{const x=90+i*290;box(s,x,220,240,155,i===3?P.amber:P.pale,P.pale);text(s,a[0],x+20,245,200,35,24,P.green,true,'center');text(s,a[1],x+20,300,200,45,23,P.navy,true,'center');});
 text(s,'Sur les reçus et les écrans de consultation : JJ/MM/AAAA.',150,450,980,55,22,P.navy,true,'center');footer(s);notes(s,'Expliquer le cas particulier du quatrième trimestre : la date de valeur tombe au 1er janvier de l’année suivante.');
}
//11 cheque
{
 const s=deck.slides.add();title(s,'Paiement par chèque','La ligne reste visible jusqu’à la décision finale',11);
 flow(s,['SAISI','CONTRÔLÉ','DÉPOSÉ BANQUE','COMPENSÉ','VALIDÉ','ENCAISSÉ'],210,[P.light,P.amber,P.pale,P.pale,P.mint,P.mint]);
 addNote(s,'Capitalisation','Le compte ESR est crédité et le reçu devient disponible uniquement au statut ENCAISSÉ.',145,380,990,125);
 text(s,'Alternative depuis DÉPOSÉ BANQUE : IMPAYÉ + motif de rejet.',265,540,750,38,18,P.red,true,'center');footer(s);notes(s,'Répondre à la question utilisateur : la ligne se trouve dans Validation des paiements. Son statut indique l’action suivante.');
}
//12 evidence
{
 const s=deck.slides.add();title(s,'Traçabilité bancaire','Deux références rendent le chèque vérifiable',12);
 card(s,110,200,480,240,'01','Dépôt en banque','Référence du bordereau\nDate de dépôt\nStatut DÉPOSÉ BANQUE',P.blue);
 card(s,690,200,480,240,'02','Compensation','Référence de l’avis de crédit\nDate de compensation\nStatut COMPENSÉ',P.green);
 text(s,'Sans ces preuves, ne pas faire progresser artificiellement le workflow.',130,505,1020,46,21,P.red,true,'center');footer(s);notes(s,'Montrer les fenêtres de saisie des références. Insister sur la traçabilité et le rapprochement bancaire.');
}
//13 account receipt
{
 const s=deck.slides.add();title(s,'Compte ESR & reçu','Contrôler le résultat, puis remettre le justificatif',13);
 card(s,70,195,350,260,'1','Mouvement','Montant, origine, période, statut et date de valeur.',P.blue);
 card(s,465,195,350,260,'2','Capital acquis','Le total reflète uniquement les opérations effectivement encaissées.',P.green);
 card(s,860,195,350,260,'3','Reçu PDF','Nom, matricule, montant, paiement et date de valeur en JJ/MM/AAAA.',P.gold);
 footer(s);notes(s,'Télécharger un reçu. Faire vérifier les deux dates et rappeler l’archivage selon la procédure interne.');
}
//14 closing
{
 const s=deck.slides.add();title(s,'Clôture','Une décision définitive précédée de contrôles',14);
  flow(s,['Lancer le contrôle','Lire les alertes','Corriger les blocages','Faire valider les états','Clôturer avec le bon rôle'],220,[P.pale,P.amber,P.light,P.mint,P.mint]);
 text(s,'Clôture impossible = alerte métier non levée ou profil non habilité.',150,420,980,55,22,P.red,true,'center');
 addNote(s,'À vérifier','Paiements en attente • anomalies de précompte • montants incohérents • régularisations • période sélectionnée',160,500,960,100);footer(s);notes(s,'Ne pas clôturer la période de démonstration. Montrer le contrôle et expliquer qui est habilité.');
}
//15 demo
{
 const s=deck.slides.add();title(s,'Démonstration guidée','Le parcours que nous allons exécuter',15);
 flow(s,['Ouvrir un adhérent','Lire son trimestre','Verser 500 000 FCFA','Traiter un chèque','Télécharger le reçu','Contrôler la clôture'],215,[P.light,P.pale,P.mint,P.amber,P.mint,P.pale]);
 text(s,'Pendant la démonstration, notez le contrôle métier associé à chaque clic.',140,405,1000,50,21,P.navy,true,'center');footer(s);notes(s,'Suivre le document 03_Scenario_demonstration. Interroger le groupe après chaque résultat affiché.');
}
//16 exercises
{
 const s=deck.slides.add();title(s,'Mise en pratique','Quatre missions, 20 points',16);
 const ex=[['4 pts','Identifier un adhérent'],['6 pts','Saisir un versement spontané'],['6 pts','Traiter un chèque de bout en bout'],['4 pts','Analyser une clôture bloquée']];
 ex.forEach((a,i)=>{const x=70+(i%2)*575,y=190+Math.floor(i/2)*180;box(s,x,y,535,140,i===2?P.mint:P.light,P.pale);text(s,a[0],x+22,y+22,90,30,19,i===2?P.green:P.blue,true);text(s,a[1],x+125,y+22,380,72,20,P.navy,true);});footer(s);notes(s,'Distribuer le support d’exercices. Observer la méthode et les contrôles, pas uniquement le résultat final.');
}
//17 errors
{
 const s=deck.slides.add();title(s,'Incidents','Les cinq réflexes qui évitent les doubles opérations',17);
 flow(s,['Lire le message','Noter l’heure','Vérifier liste & statut','Faire une capture','Contacter le support'],220,[P.amber,P.light,P.pale,P.pale,P.mint]);
 text(s,'Ne cliquez pas plusieurs fois sur Valider et ne recréez pas l’opération avant d’avoir vérifié son existence.',110,415,1060,70,21,P.red,true,'center');footer(s);notes(s,'Faire simuler une erreur. Demander quelles informations transmettre au support.');
}
//18 close
{
 const s=deck.slides.add();s.background.fill=P.navy;
 text(s,'MADGI ESR',70,65,300,30,16,P.gold,true);text(s,'Vous êtes prêts à opérer, contrôler et sécuriser.',70,180,1050,120,42,P.white,true);text(s,'Prochaine étape : exercices pratiques, QCM et engagement de mise en œuvre.',70,350,1000,60,22,'#DCE8F8',false);
 box(s,70,505,1140,85,'#204A82','#315B91');text(s,'Règle finale : aucune opération sensible sans identité, période, montant, preuve et statut vérifiés.',95,530,1090,36,18,P.white,true,'center');text(s,'QUESTIONS',70,635,300,25,14,P.gold,true);notes(s,'Conclure par un tour de table. Recueillir les questions restantes et annoncer le suivi à J+7.');
}

await fs.mkdir(PREVIEW,{recursive:true});
for (const [i,s] of deck.slides.items.entries()){
 const blob=await deck.export({slide:s,format:'png',scale:1}); await fs.writeFile(`${PREVIEW}/slide-${String(i+1).padStart(2,'0')}.png`,new Uint8Array(await blob.arrayBuffer()));
 const layout=await s.export({format:'layout'}); await fs.writeFile(`${PREVIEW}/slide-${String(i+1).padStart(2,'0')}.layout.json`,await layout.text());
}
const montage=await deck.export({format:'webp',montage:true,scale:1});await fs.writeFile(`${PREVIEW}/montage.webp`,new Uint8Array(await montage.arrayBuffer()));
const pptx=await PresentationFile.exportPptx(deck);await pptx.save(`${OUT}/02_Presentation_formation_MADGI_ESR.pptx`);
console.log(`Slides: ${deck.slides.items.length}`);
