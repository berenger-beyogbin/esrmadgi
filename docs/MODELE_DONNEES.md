# Modèle de données opérationnel

## Entités principales

| Entité | Clé | Relations principales |
|---|---|---|
| `adherents` | `id_adherent` | parent des bénéficiaires, informations de cotisation, comptes et opérations |
| `beneficiaires` | `id_beneficiaire` | `id_adherent` vers `adherents` |
| `info_cotisations` | `id_info_cotisation` | contrat actuariel courant d’un adhérent |
| `cotisation_entetes` | `id_cotisation_entete` | lot de cotisations d’un adhérent |
| `cotisation_details` | `id_cotisation_detail` | échéance rattachée à une entête |
| `precomptes` | `id_precompte` | rapprochement DGI éventuellement rattaché à une échéance |
| `paiements` | `id_paiement` | paiement spontané d’un adhérent |
| `comptes_esr` | `id_compte_esr` | situation calculée du compte individuel |
| `prestations` | `id_prestation` | dossier de retraite, décès, invalidité ou rachat |
| `rentes` | `id_rente` | rente constituée pour un adhérent |
| `rente_versements` | `id_rente_versement` | échéance rattachée à une rente |
| `parametres_generaux` | `id_parametre_generaux` | valeur métier datée et activable |
| `mortalite` | âge | table CIMA F utilisée par le moteur |
| `audit_logs` | `id_audit` | traçabilité des calculs et opérations sensibles |

## Invariants

- Une cotisation ne capitalise le compte que si son statut est `ENCAISSEE`.
- Une prestation est calculée depuis le compte ESR et les paramètres datés.
- Un paiement ne crée une cotisation qu’au passage à `ENCAISSE`.
- Les paiements et prestations payés sont terminaux.
- Les taux sont interprétés en pourcentage et validés dans l’intervalle autorisé.
- Les mouvements futurs par rapport à la date de calcul sont refusés.

## Versionnement

Les changements de schéma sont placés dans `supabase/migrations` et appliqués dans l’ordre lexical. Les changements de règles métier sont portés par les paramètres datés ; la version et les dates d’effet utilisées sont inscrites dans l’audit et dans `version_calc`.

La procédure de sauvegarde exporte les tables critiques et vérifie les empreintes, les nombres de lignes et dix relations d’intégrité référentielle.
