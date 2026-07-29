# MADGI ESR - État des lieux documentaire et technique

Date de l'analyse : 29 juillet 2026  
Périmètre : documents du dossier `DOCUMENT ESR` et dépôt applicatif MADGI ESR.

## 1. Résultat immédiat

Le socle React / Express / TypeScript / Supabase compile correctement côté interface et côté API.
Le moteur de cotisation trimestrielle est déjà reproductible : les 60 cas de référence disponibles
pour les retraites à 60 et 65 ans sont conformes, sans écart, avec une tolérance de 100 FCFA.

Décision de pilotage du 29 juillet 2026 : les taux encore soumis à arbitrage sont rendus
paramétrables. Ils disposent de valeurs provisoires modifiables dans l'écran
`Paramètres > Paramètres généraux ESR`, sans modification du code.

Cette conformité ne couvre pas encore :

- la cotisation unique ;
- la provision mathématique individuelle ;
- le rachat et la résiliation ;
- le capital décès avant retraite ;
- le capital décès pendant le service de rente ;
- l'invalidité permanente totale ;
- les révisions de cotisation et changements d'âge ;
- la provision globale et sa réconciliation comptable.

## 2. Règles documentaires suffisamment étayées

| Sujet | Règle étayée | Sources concordantes |
|---|---|---|
| Taux technique | 3,5 % annuel | Note technique et classeurs |
| Taux trimestriel | `(1 + 3,5 %)^(1/4) - 1` | Note technique et classeurs |
| Frais de gestion sur rente | 5 % | Note technique et classeurs |
| Table de mortalité | CIMA F | Note technique et classeur de cotisation |
| Âge maximal | 106 ans | Classeurs actuariels |
| Rachat partiel | Non autorisé | Rapport projet |
| Décès avant retraite | Base égale à l'épargne/provision acquise | Documents et classeur décès |
| Décès pendant rente | 80 % du capital constitutif restant dû | Rapport, explication décès et note technique |
| Délai invalidité/décès | 15 jours ouvrés après complétude/preuve | Rapport projet |
| Paiement par chèque | Validation après encaissement | Bon de recette |

## 3. Décisions bloquantes à formaliser

Les valeurs numériques ci-dessous ne bloquent plus la construction technique : elles sont désormais
paramétrables. Leur validation formelle reste nécessaire avant recette et mise en production.

### D01 - Rachat avant deux années

- La note technique décrit un rachat/résiliation avant deux années avec pénalité.
- Le rapport projet indique que le rachat total ne peut intervenir qu'après deux années de cotisation.
- Décision attendue : opération interdite avant deux ans, ou autorisée avec pénalité.

### D02 - Retenue totale sur rachat/résiliation

- Le classeur `RACHAT TOTAL ESR.xlsx` déduit 5 % de frais de gestion, puis 5 % de pénalité sur le
  montant net des frais, ce qui produit environ 90,25 % du capital brut.
- Une partie du rapport parle d'un remboursement de 90 %.
- Une autre partie ne mentionne qu'une pénalité de 5 %.
- Décision attendue : formule exacte, base de calcul et règle d'arrondi.

### D03 - Décès avant retraite

- La note technique parle de la valeur du compte ESR, donc 100 %.
- Le rapport et le document explicatif imposent 95 %.
- Le classeur décès déduit 5 % de charges de gestion ; sa cellule de pénalité référence actuellement
  une cellule vide, ce qui rend la seconde retenue nulle.
- Décision attendue : 95 % ou 100 %, avec définition de la base.

### D04 - Invalidité permanente totale

- Le rapport contient à la fois une règle assimilée au décès à 95 % et une disposition indiquant le
  paiement du capital acquis.
- Décision attendue : 95 % ou 100 %, pièces médicales, date de complétude et circuit de validation.

### D05 - Couverture à la retraite

- Le contrat décrit le paiement de 100 % de la cotisation maladie par prélèvement sur l'épargne.
- Le rapport mentionne aussi un modèle de prise en charge à 80 %.
- Décision attendue : distinguer explicitement taux de remboursement des soins et taux de financement
  de la cotisation maladie.

### D06 - Date de décès pendant la rente

- La règle de 80 % est stable, mais la date d'arrêt de la rente et le traitement du trimestre du décès
  ne le sont pas.
- Décision attendue : paiement d'avance acquis ou proratisé, date de valeur et formule du capital restant.

### D07 - Architecture cible

- Le rapport demande WebDev et HFSQL.
- l'application opérationnelle utilise React, Express/TypeScript et Supabase/PostgreSQL.
- Décision attendue : homologuer l'architecture existante ou autoriser une réécriture complète.

## 4. Anomalies relevées dans les classeurs

1. `Capital décès Agent en activité.xlsx`
   - la pénalité en `I9` utilise `H12`, actuellement vide/zéro ;
   - le résultat d'exemple est donc 95 % de la provision, pas un double abattement.

2. `RACHAT TOTAL ESR.xlsx`
   - le résultat applique successivement les frais de 5 % puis la pénalité de 5 % ;
   - la durée est calculée différemment selon les deux blocs d'exemple ;
   - les règles d'arrondi et de date de valeur ne sont pas explicites.

3. `PM MADGI-ESR exemple.xlsx`
   - la feuille `Résutat d'exploitation 2022` contient une référence `#REF!` ;
   - plusieurs montants sont saisis par additions littérales, ce qui limite leur traçabilité ;
   - la synthèse 2023 existe en version initiale et corrigée sans journal formel des écarts ;
   - les états CIMA et les provisions sont exploitables comme références de réconciliation, mais pas
     encore comme source unique automatisable.

4. `Precompte ESR-MADGI.xlsx`
   - le format aller contient les colonnes utiles de base ;
   - il ne constitue pas un exemple de retour DGI avec réalisé, écart et motif.

## 5. État du code

### Validé

- compilation TypeScript du frontend ;
- compilation TypeScript de l'API ;
- moteur de cotisation trimestrielle ;
- table CIMA F chargée depuis Supabase ;
- paramètres 3,5 %, 5 % et âge maximal 106 ;
- génération de précomptes avec prévention de doublons ;
- structures adhérents, bénéficiaires, paiements, prestations, comptes ESR, utilisateurs et audit.

### Incomplet ou absent

- un calcul provisoire `calculateCotisationES` applique encore 20 % de façon générique ;
- un placeholder actuariel produit capital, PM et valeur de rachat fictifs ;
- le service backend des prestations ne calcule pas les liquidations ;
- le service des comptes ESR consulte les comptes mais ne centralise pas encore tous les mouvements ;
- la cotisation spontanée est immédiatement marquée encaissée, sans workflow de validation ;
- le précompte ne traite pas encore un retour DGI complet ;
- les moteurs PM, rachat, décès, invalidité et rente ne sont pas centralisés côté serveur ;
- aucun vrai corpus automatisé de tests métier n'est intégré au cycle `npm test`.

## 6. Ordre d'exécution recommandé

1. Faire signer D01 à D07.
2. Extraire les exemples Excel en cas de tests versionnés.
3. Déplacer le moteur actuariel côté serveur et supprimer les placeholders.
4. Implémenter PM individuelle et historique de calcul.
5. Implémenter rachat, décès, invalidité et rente avec workflows.
6. Finaliser le flux APS/DGI aller-retour.
7. Générer les documents officiels et états réglementaires.
8. Migrer et réconcilier l'historique.
9. Exécuter sécurité, PRA, recette et mise en production.

## 7. Pièces encore nécessaires pour fermer les blocages externes

- fichier réel de retour DGI ;
- dictionnaire de données et accès de test APS/SIAPS ;
- données historiques détaillées à migrer ;
- décision écrite sur l'architecture ;
- décisions signées D01 à D06 ;
- modèles définitifs des reportings si `LES REPORTING.docx` n'est pas la liste finale ;
- fiches et état de suivi des placements.
