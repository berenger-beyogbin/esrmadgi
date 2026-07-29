# Recette MADGI ESR

## Contrôles automatisés

Depuis la racine :

```powershell
npm ci
npm run lint
npm run build
Set-Location server
npm ci
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Résultat attendu : aucune erreur TypeScript, build réussi, tous les tests réussis et aucune vulnérabilité de production connue.

## Scénarios métier à valider

| Lot | Scénario | Résultat attendu |
|---|---|---|
| Paramètres | Modifier un taux avec date d’effet future | L’ancien taux reste utilisé avant la date, le nouveau après |
| Précompte | Importer un retour DGI conforme | Ligne marquée encaissée et cotisation rapprochée |
| Précompte | Importer un montant différent | Statut écart, montant reçu conservé |
| Compte ESR | Recalculer un adhérent | Seules les cotisations encaissées alimentent capital et PM |
| Rachat | Demander avant le délai minimum | Calcul refusé |
| Rachat | Demander après le délai | Montant calculé avec les taux datés et tracé |
| Décès/invalidité | Créer un dossier | Montant déterminé automatiquement depuis le compte |
| Paiement | Tenter SAISI vers ENCAISSE | Transition refusée |
| Paiement | Suivre SAISI, CONTRÔLE, VALIDÉ, ENCAISSÉ | Cotisation créée une seule fois, reçu disponible |
| Documents | Télécharger reçu et liquidation | PDF lisible, montants et identité corrects |
| Reporting | Exporter CIMA C-20 | Classeur ouvert sans erreur et totaux cohérents |
| Audit | Consulter les opérations sensibles | Auteur, date, objet et détail présents |
| Sécurité | Démarrer en production avec OTP fixe | Démarrage refusé |
| PRA | Sauvegarder puis vérifier | Manifeste valide pour toutes les tables |

## Critères de mise en production

- Les paramètres officiels ont été confirmés et saisis avec leur date d’effet.
- Les scénarios ci-dessus sont signés par le responsable métier.
- Les secrets de production sont configurés.
- Le fournisseur SMS et les sources externes DGI/SIAPS sont disponibles.
- Une sauvegarde restaurable est conservée hors plateforme.
