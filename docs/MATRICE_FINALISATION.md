# Matrice de finalisation MADGI ESR

Situation vérifiée le 29 juillet 2026 contre le plan de finalisation version 1.0.

## Livrables techniques réalisés

| Exigence du plan | Preuve actuelle | État |
|---|---|---|
| Paramètres actuariels datés | service des règles, écran Paramètres, migration SQL | Réalisé |
| Cotisation trimestrielle | moteur existant et corpus de 60 simulations | Réalisé |
| Cotisation unique | moteur serveur CIMA F et tests unitaires | Réalisé |
| Provision individuelle | calcul par mouvements encaissés et recalcul du compte | Réalisé |
| Rachat, décès et invalidité | calcul serveur paramétré, audit et liquidation | Réalisé techniquement |
| Décès pendant rente | calcul du capital restant au taux paramétré | Réalisé techniquement |
| Précompte aller/retour | génération, retour Excel, rapprochement et écarts | Réalisé techniquement |
| Paiement spontané | workflow contrôlé, alimentation du compte et reçu | Réalisé |
| Prestations | workflow ouvert/contrôle/validé/payé et échéance à 15 jours | Réalisé |
| État des non-précomptés | API dédiée avec téléphone, montant et statut | Réalisé |
| Reçu et liquidation | PDF serveur | Réalisé |
| Avis annuel | PDF serveur téléchargeable depuis le compte ESR | Réalisé |
| CIMA C-20 | données calculées depuis la base et export Excel | Réalisé techniquement |
| Audit | calculs, paramètres, paiements, prestations et retours DGI | Réalisé |
| Sauvegarde | export de 15 tables, SHA-256, volumes et relations | Réalisé |
| Documentation | architecture, modèle de données, exploitation, PRA, recette et profils | Réalisé |
| Sécurité logicielle | build, validation TypeScript, OTP fixe bloqué en production, audits npm | Réalisé techniquement |

## Vérifications exécutées

- Frontend : validation TypeScript et build de production réussis.
- Backend : validation TypeScript et build de production réussis.
- Tests automatisés : 15 réussis, 0 échec.
- Dépendances de production : 0 vulnérabilité npm détectée.
- Supabase : compte individuel recalculé sur les cotisations réellement encaissées.
- Reporting 2026 : extraction réelle réussie.
- Sauvegarde : 15 tables et 10 relations d’intégrité vérifiées.
- Documents : reçu, liquidation et avis annuel rendus en image et contrôlés visuellement.

## Points nécessitant une preuve externe

Ces points ne peuvent pas être déclarés terminés par le développeur seul :

| Point | Preuve nécessaire | Responsable prévu au plan |
|---|---|---|
| Règles D01 à D06 | procès-verbal signé et valeurs avec dates d’effet | Chef ESR et actuaire |
| Architecture cible | approbation React/Express/Supabase ou décision de réécriture | Direction et DSI |
| Format APS/DGI | fichiers réels aller/retour et test complet | APS/DGI |
| SIAPS | dictionnaire et accès de test | DSI/APS |
| Modèles officiels | validation des PDF et états produits | ESR/Finance |
| Historique | données détaillées, mapping validé et totaux de contrôle | ESR/Finance |
| Placement | choix du périmètre V1 ou V2 et données | Direction/Finance |
| Tests actuariels | signature des résultats et tolérance | Actuaire |
| Restauration réelle | environnement isolé de reprise et validation DSI | DSI |
| Production | domaine, certificats, secrets et fenêtre de mise en service | Direction/DSI |
| Recette/formation | PV signés par les utilisateurs et feuilles de présence | ESR/DSI |

## Conclusion de pilotage

Le socle logiciel peut poursuivre une recette contrôlée. La mise en production ne doit pas être prononcée tant que les preuves externes ci-dessus ne sont pas obtenues, conformément à la règle de pilotage du plan.
