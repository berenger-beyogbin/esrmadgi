# Guide utilisateurs MADGI ESR

## Adhérent

L’adhérent consulte uniquement ses propres informations :

1. se connecter avec le matricule et terminer la procédure de première connexion ;
2. consulter son profil, ses bénéficiaires et son compte ESR ;
3. télécharger son avis annuel ;
4. signaler toute erreur au gestionnaire sans transmettre son mot de passe.

## Gestionnaire ESR

Le gestionnaire réalise les opérations courantes :

1. contrôler l’identité avant de créer ou modifier un adhérent ;
2. vérifier que la répartition des bénéficiaires atteint 100 % ;
3. générer les précomptes puis importer le retour DGI ;
4. traiter séparément les lignes encaissées, en écart et non précomptées ;
5. saisir les paiements spontanés et respecter le circuit de contrôle ;
6. recalculer le compte ESR après encaissement ;
7. ouvrir les dossiers de prestation et joindre les justificatifs dans le dossier d’archivage ;
8. mettre le dossier en contrôle uniquement lorsqu’il est complet ;
9. télécharger la liquidation et suivre l’échéance de 15 jours ouvrés ;
10. consulter le journal d’audit en cas d’anomalie.

Un montant de prestation ne doit jamais être remplacé par une saisie libre.

## Administrateur

L’administrateur gère la configuration et les accès :

1. créer, activer ou désactiver les comptes ;
2. attribuer le rôle minimal nécessaire ;
3. maintenir les référentiels, grades, paramètres et tables de mortalité ;
4. saisir les paramètres avec leur date d’effet ;
5. ne pas modifier rétroactivement un paramètre déjà utilisé sans décision formelle ;
6. contrôler quotidiennement `/api/health/ready` ;
7. exécuter les sauvegardes et vérifier leur manifeste ;
8. examiner les journaux de sécurité et les opérations sensibles.

## Superadministrateur

Le superadministrateur intervient uniquement pour les opérations exceptionnelles :

- configuration initiale ;
- gestion des administrateurs ;
- rotation des secrets ;
- reprise après incident ;
- diagnostic nécessitant l’accès technique le plus élevé.

Les opérations du superadministrateur doivent être justifiées et consignées.

## Contrôles communs

- Ne jamais partager un OTP, mot de passe ou secret technique.
- Ne pas contourner les transitions de statut.
- Vérifier matricule, montant, date de valeur et période avant validation.
- En cas de doute, laisser l’opération dans son état actuel et faire contrôler le dossier.
