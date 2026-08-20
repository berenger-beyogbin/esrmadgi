import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
const OUT='C:/PROJETS/madgi-esr/FORMATION'; const PRE=`${OUT}/.build/workbook_preview`;
const wb=Workbook.create();
const navy='#173A6A', blue='#2E74B5', green='#147A4B', pale='#E8EEF5', light='#F5F7FA', gold='#D89B2B';
function base(sh,title,cols){sh.showGridLines=false;sh.getRange(`A1:${cols}1`).merge();sh.getRange('A1').values=[[title]];sh.getRange(`A1:${cols}1`).format={fill:navy,font:{bold:true,color:'#FFFFFF',size:16},rowHeight:30,verticalAlignment:'center'};}
function head(r){r.format={fill:pale,font:{bold:true,color:navy},wrapText:true,borders:{preset:'outside',style:'thin',color:'#C9D5E4'},verticalAlignment:'center'};}

const part=wb.worksheets.add('Participants');base(part,'SUIVI DES PARTICIPANTS — FORMATION MADGI ESR','L');
part.getRange('A3:L3').values=[['N°','Nom et prénoms','Matricule','Service','Profil','Présence matin','Présence après-midi','Score QCM /10','Score pratique /20','Total /30','Résultat','Signature']];head(part.getRange('A3:L3'));
const rows=Array.from({length:20},(_,i)=>[i+1,'','','','','','','','','','','']);part.getRange('A4:L23').values=rows;
part.getRange('J4').formulas=[['=IF(COUNTA(H4:I4)=0,"",SUM(H4:I4))']];part.getRange('J4:J23').fillDown();
part.getRange('K4').formulas=[['=IF(J4="","",IF(J4>=21,"VALIDÉ","À RENFORCER"))']];part.getRange('K4:K23').fillDown();
part.getRange('E4:E23').dataValidation={rule:{type:'list',values:['ADHERENT','GESTIONNAIRE','ADMINISTRATEUR']}};
part.getRange('F4:G23').dataValidation={rule:{type:'list',values:['OUI','NON']}};
part.getRange('H4:H23').dataValidation={rule:{type:'whole',operator:'between',formula1:0,formula2:10}};
part.getRange('I4:I23').dataValidation={rule:{type:'whole',operator:'between',formula1:0,formula2:20}};
part.getRange('K4:K23').conditionalFormats.add('containsText',{text:'VALIDÉ',format:{fill:'#E7F5EE',font:{color:green,bold:true}}});
part.getRange('K4:K23').conditionalFormats.add('containsText',{text:'RENFORCER',format:{fill:'#FDECEC',font:{color:'#B42318',bold:true}}});
part.freezePanes.freezeRows(3);part.getRange('A3:L23').format.borders={insideHorizontal:{style:'thin',color:'#E3E8EF'}};
const widths=[6,26,14,18,19,15,18,14,17,12,16,20];widths.forEach((w,i)=>part.getRangeByIndexes(0,i,23,1).format.columnWidth=w);

const q=wb.worksheets.add('QCM');base(q,'QCM DE VALIDATION — 10 POINTS','G');
q.getRange('A3:G3').values=[['N°','Question','A','B','C','D','Bonne réponse']];head(q.getRange('A3:G3'));
const qdata=[
[1,'À quel statut un chèque alimente-t-il le capital ESR ?','SAISI','DÉPOSÉ','COMPENSÉ','ENCAISSÉ','D'],
[2,'Quel est l’effet d’une cotisation spontanée ?','Annulation','Soustraction directe','Recalcul','Clôture','C'],
[3,'Identifiant de recherche prioritaire ?','Prénom','Matricule','Montant','Date','B'],
[4,'Données requises au dépôt banque ?','Mot de passe','Bordereau + date','Reçu','Âge retraite','B'],
[5,'Étape après COMPENSÉ ?','Supprimer','Clôturer','Valider','Recréer','C'],
[6,'Qui clôture définitivement ?','Tout utilisateur','Adhérent','Profil habilité','Banque','C'],
[7,'Format des dates du reçu ?','JJ/MM/AAAA','Montant','Trimestre','Heure','A'],
[8,'Que faire d’un chèque rejeté ?','Encaisser','Impayé + motif','Supprimer','Ignorer','B'],
[9,'Avant clôture ?','Ignorer alertes','Traiter blocages','Changer adhérent','Imprimer','B'],
[10,'En cas d’erreur persistante ?','Cliquer en boucle','Partager mot de passe','Documenter + support','Clôturer','C']];q.getRange('A4:G13').values=qdata;q.getRange('A3:G13').format.borders={insideHorizontal:{style:'thin',color:'#E3E8EF'}};q.getRange('B4:G13').format.wrapText=true;
[6,46,18,22,22,22,15].forEach((w,i)=>q.getRangeByIndexes(0,i,13,1).format.columnWidth=w);q.freezePanes.freezeRows(3);

const sat=wb.worksheets.add('Satisfaction');base(sat,'ÉVALUATION DE SATISFACTION','H');
sat.getRange('A3:H3').values=[['N°','Nom (facultatif)','Clarté /5','Utilité /5','Rythme /5','Pratique /5','Support /5','Commentaire / suggestion']];head(sat.getRange('A3:H3'));sat.getRange('A4:A23').values=Array.from({length:20},(_,i)=>[i+1]);
['C','D','E','F','G'].forEach(c=>sat.getRange(`${c}4:${c}23`).dataValidation={rule:{type:'whole',operator:'between',formula1:1,formula2:5}});
sat.getRange('A25:B25').values=[['Moyenne générale','']];sat.getRange('B25').formulas=[['=IFERROR(AVERAGE(C4:G23),0)']];sat.getRange('B25').format.numberFormat='0.0';sat.getRange('A25:B25').format={fill:'#E7F5EE',font:{bold:true,color:green}};
[6,25,13,13,13,13,13,40].forEach((w,i)=>sat.getRangeByIndexes(0,i,25,1).format.columnWidth=w);sat.getRange('B4:H23').format.wrapText=true;sat.freezePanes.freezeRows(3);

const syn=wb.worksheets.add('Synthèse');base(syn,'TABLEAU DE BORD FORMATION','H');
syn.getRange('A3:B8').values=[['Indicateur','Valeur'],['Participants inscrits',''],['Présents matin',''],['Présents après-midi',''],['Score moyen /30',''],['Taux de réussite','']];head(syn.getRange('A3:B3'));
syn.getRange('B4').formulas=[["=COUNTIF('Participants'!B4:B23,\"?*\")"]];
syn.getRange('B5').formulas=[["=COUNTIF('Participants'!F4:F23,\"OUI\")"]];
syn.getRange('B6').formulas=[["=COUNTIF('Participants'!G4:G23,\"OUI\")"]];
syn.getRange('B7').formulas=[["=IFERROR(AVERAGE('Participants'!J4:J23),0)"]];syn.getRange('B7').format.numberFormat='0.0';
syn.getRange('B8').formulas=[["=IFERROR(COUNTIF('Participants'!K4:K23,\"VALIDÉ\")/COUNTIF('Participants'!B4:B23,\"?*\"),0)"]];syn.getRange('B8').format.numberFormat='0%';
syn.getRange('D3:E8').values=[['Seuils de validation','Valeur'],['QCM minimum',7],['Pratique minimum',14],['Total minimum',21],['Satisfaction cible',4],['Suivi post-formation','J+7']];head(syn.getRange('D3:E3'));
syn.getRange('A10:H10').merge();syn.getRange('A10').values=[['Actions post-formation']];syn.getRange('A10:H10').format={fill:green,font:{bold:true,color:'#FFFFFF'}};
syn.getRange('A11:H14').values=[['Action','Responsable','Échéance','Statut','Observation','','',''],['Diffuser les supports','','','','','','',''],['Traiter les questions ouvertes','','','','','','',''],['Point d’accompagnement J+7','','','','','','','']];head(syn.getRange('A11:D11'));syn.getRange('D12:D14').dataValidation={rule:{type:'list',values:['À FAIRE','EN COURS','TERMINÉ']}};
[24,16,14,16,15,12,12,12].forEach((w,i)=>syn.getRangeByIndexes(0,i,14,1).format.columnWidth=w);syn.getRange('A1:H14').format.wrapText=true;

await fs.mkdir(PRE,{recursive:true});
for(const name of ['Participants','QCM','Satisfaction','Synthèse']){const b=await wb.render({sheetName:name,autoCrop:'all',scale:1,format:'png'});await fs.writeFile(`${PRE}/${name}.png`,new Uint8Array(await b.arrayBuffer()));}
console.log((await wb.inspect({kind:'table',range:'Synthèse!A1:H14',include:'values,formulas',tableMaxRows:20,tableMaxCols:10})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',options:{useRegex:true,maxResults:100},summary:'formula errors'})).ndjson);
const file=await SpreadsheetFile.exportXlsx(wb);await file.save(`${OUT}/06_Suivi_participants_et_evaluation.xlsx`);
