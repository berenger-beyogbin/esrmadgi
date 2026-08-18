SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict gQsAWABRHlljctVyH89bTcC6yWEsReCczP81VSdqXyy1eq30zxYAaxJKG4vhdL6

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: adherents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."adherents" ("id_adherent", "matricule", "nom", "prenoms", "civilite", "sexe", "date_naissance", "emploi", "situation_matrimoniale", "email", "telephone", "date_souscription", "statut", "etat", "decede", "adhesion_en_ligne", "retraite", "created_at", "updated_at") VALUES
	(6, '11816P', 'M''BRA', 'KONAN NOEL', 'Monsieur', 'M', '1990-12-26', 'INFORMATICIEN', 'Célibataire', 'MBRANOEL@GMAIL.COM', '0708707988', '2026-01-06', true, 'ACTIF', false, true, false, '2026-07-13 01:18:01.813+00', '2026-07-13 01:23:40.427294+00'),
	(13, '332219H', 'IRIE', 'BI BELLY JEAN', 'Monsieur', 'M', '1976-02-01', 'SERVICE D''ASSIETTE DES IMPÔTS DIVERS YOPOUGON 2', 'Célibataire', NULL, '0708688007', '2026-07-13', false, 'EN_ATTENTE', false, true, false, '2026-07-13 22:52:50.185+00', '2026-07-13 22:52:50.185+00'),
	(15, '231830V', 'DIOMANDE', 'MELAMA', 'Monsieur', 'M', '1973-10-24', 'CONTROLEUR', 'Célibataire', 'MELAMADIOM64@GMAIL.COM', '0708367979', '2026-07-14', true, 'ACTIF', false, true, false, '2026-07-14 14:46:51.246+00', '2026-07-14 15:07:58.025375+00'),
	(14, '308628U', 'MAHAN', 'ALEXANDRINE', 'Madame', 'F', '1979-11-19', 'CONTROLEUR', 'Célibataire', 'bberengeryao@gmail.com', '0708710354', '2026-07-13', true, 'ACTIF', false, true, false, '2026-07-13 23:26:24.361+00', '2026-07-14 20:58:35.885211+00'),
	(16, '00804P', 'ABITTHY', 'ABROH LUTHER CLEMENT', 'Monsieur', 'M', '1973-03-04', 'RESPONSABLE DE CELLULE ACCUEIL ET COURRIER', 'Célibataire', 'ABITTHY@GMAIL.COM', '0749498811', '2026-07-20', false, 'EN_ATTENTE', false, true, false, '2026-07-20 09:17:58.791+00', '2026-07-20 09:17:58.791+00'),
	(18, '03906P', 'KONE', 'PEGOBANAGNANA', 'Monsieur', 'M', '1979-12-16', 'Administrateur', 'Célibataire', 'PEGOBKONE1975@GMAIL.COM', '0759999021', '2026-07-20', true, 'ACTIF', false, false, false, '2026-07-20 14:14:06.704+00', '2026-07-20 14:14:06.704+00'),
	(19, '06408P', 'KPANGNI', 'KADJO BLAISE', 'Monsieur', 'M', '1985-11-27', 'Comptable', 'Célibataire', 'BLAISEKPANGNI@GMAIL.COM', '0708099790', '2026-07-20', true, 'ACTIF', false, false, false, '2026-07-20 14:15:18.882+00', '2026-07-20 14:15:18.882+00'),
	(21, '08014P', 'AHOLIA', 'AMOIKON JEAN SERGE', 'Monsieur', 'M', '1990-04-13', 'Administrateur', 'Célibataire', 'aholia@gmail.com', '0777058721', '2026-07-20', true, 'ACTIF', false, false, false, '2026-07-20 15:40:46.568+00', '2026-07-20 15:40:46.568+00'),
	(22, '00704P', 'BAROU', 'AYA LEA GERTRUDE', 'Madame', 'F', '1968-03-15', 'Agent des Impôts', 'Célibataire', 'BAROULEA@YAHOO.FR', '0707761722', '2026-07-20', true, 'ACTIF', false, false, false, '2026-07-20 16:05:52.802+00', '2026-07-20 16:05:52.802+00'),
	(20, '06708P', 'YOBOUE', 'ADJO FRANCOISE', 'Madame', 'F', '1977-05-24', 'CHEF DE SERVICE MOYENS GENERAUX', 'Célibataire', 'A.YOBOUE@MADGI.CI', '0708110161', '2026-07-20', true, 'ACTIF', false, true, false, '2026-07-20 15:27:52.783+00', '2026-08-11 10:17:14.356247+00'),
	(23, '349132B', 'GOLI', 'KONAN MICHEL', 'Monsieur', 'M', '1968-01-16', 'Administrateur', 'Célibataire', 'goli@madgi.ci', '0707661003', '2026-08-11', true, 'ACTIF', false, false, false, '2026-08-11 16:47:23.238+00', '2026-08-11 16:47:23.238+00');


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."audit_logs" ("id_audit", "objet_audit", "id_objet", "action", "payload_json", "utilisateur", "horodatage", "created_at") VALUES
	(1, 'UTILISATEUR', '1', 'CREATE', '{"email": "bberengeryao@gmail.com", "profil": "ADMINISTRATEUR", "source": "INITIALISATION_SUPABASE", "matricule": "ADMIN001"}', 'SYSTEM', '2026-06-16 00:33:09.20849+00', '2026-06-16 00:33:09.20849+00'),
	(2, 'ADHERENT', '1', 'CREATE', '{"nom": "KOUASSI", "prenoms": "JEAN TEST", "matricule": "TEST001", "id_compte_esr": 1, "id_utilisateur": 2, "id_info_cotisation": 1}', 'ADMIN001', '2026-06-16 00:37:10.333126+00', '2026-06-16 00:37:10.333126+00'),
	(3, 'ADHERENT', '2', 'CREATE', '{"nom": "BEYOGB", "prenoms": "BERENGER", "matricule": "A369543", "id_compte_esr": 2, "id_utilisateur": 3, "id_info_cotisation": 2}', 'A369543', '2026-06-16 20:08:21.766466+00', '2026-06-16 20:08:21.766466+00'),
	(4, 'ADHERENT', '3', 'CREATE', '{"nom": "ALIMO", "prenoms": "BERENGER", "matricule": "A289598", "id_compte_esr": 3, "id_utilisateur": 4, "id_info_cotisation": 3}', 'A289598', '2026-06-16 22:01:43.786326+00', '2026-06-16 22:01:43.786326+00'),
	(5, 'ADHERENT', '4', 'CREATE', '{"nom": "KONAN", "prenoms": "BERENGER", "matricule": "654321BCA", "id_compte_esr": 4, "id_utilisateur": 5, "id_info_cotisation": 4}', '654321BCA', '2026-06-17 08:38:05.530457+00', '2026-06-17 08:38:05.530457+00'),
	(8, 'ADHERENT', '1', 'UPDATE', '{"details": "activation de l''adherent TEST001. Motif : Verification Sprint adherents audit.", "action_metier": "ADHERENT_ACTIVER"}', 'administrateur@madgi.ci', '2026-07-12 22:53:03.759+00', '2026-07-12 22:53:03.835512+00'),
	(9, 'ADHERENT', '3', 'UPDATE', '{"details": "Modification de la fiche adherent A289598 par 395047y@madgi.ci.", "action_metier": "MODIFICATION_ADHERENT"}', '395047y@madgi.ci', '2026-07-12 22:55:19.821+00', '2026-07-12 22:55:19.900119+00'),
	(10, 'ADHERENT', '3', 'UPDATE', '{"details": "activation de l''adherent A289598. Motif : non renseigne.", "action_metier": "ADHERENT_ACTIVER"}', '395047y@madgi.ci', '2026-07-12 22:55:55.548+00', '2026-07-12 22:55:55.619016+00'),
	(12, 'ADHESION_EN_LIGNE', '6', 'UPDATE', '{"details": "Validation de l''adhesion en ligne 11816P par 395047y@madgi.ci.", "action_metier": "VALIDATION_ADHESION_EN_LIGNE"}', '395047y@madgi.ci', '2026-07-13 01:23:41.345+00', '2026-07-13 01:23:41.444226+00'),
	(13, 'utilisateurs', NULL, 'UPDATE', '{"details": "Acces utilisateur 11816P mis a jour avec le profil ADMINISTRATEUR.", "action_metier": "MODIFICATION_UTILISATEUR"}', '395047y@madgi.ci', '2026-07-13 16:43:13.811+00', '2026-07-13 16:43:14.009583+00'),
	(14, 'ADHESION_EN_LIGNE', '14', 'UPDATE', '{"details": "Modification de la demande en ligne 308628U par 395047y@madgi.ci.", "action_metier": "MODIFICATION_ADHESION_EN_LIGNE"}', '395047y@madgi.ci', '2026-07-13 23:27:50.979+00', '2026-07-13 23:27:51.092378+00'),
	(15, 'utilisateurs', '15', 'CREATE', '{"details": "Acces premiere connexion cree pour l''adherent 231830V.", "action_metier": "CREATION_ACCES_PREMIERE_CONNEXION"}', '395047y@madgi.ci', '2026-07-14 14:47:41.089+00', '2026-07-14 14:47:40.827829+00'),
	(16, 'ADHESION_EN_LIGNE', '15', 'UPDATE', '{"details": "Validation de l''adhesion en ligne 231830V par 395047y@madgi.ci.", "action_metier": "VALIDATION_ADHESION_EN_LIGNE"}', '395047y@madgi.ci', '2026-07-14 14:47:41.276+00', '2026-07-14 14:47:41.015582+00'),
	(17, 'ADHERENT', '15', 'UPDATE', '{"details": "Modification de la fiche adherent 231830V par 395047y@madgi.ci.", "action_metier": "MODIFICATION_ADHERENT"}', '395047y@madgi.ci', '2026-07-14 15:07:59.048+00', '2026-07-14 15:07:58.786471+00'),
	(18, 'utilisateurs', '14', 'CREATE', '{"details": "Acces premiere connexion cree pour l''adherent 308628U.", "action_metier": "CREATION_ACCES_PREMIERE_CONNEXION"}', '395047y@madgi.ci', '2026-07-14 20:58:39.916+00', '2026-07-14 20:58:39.679482+00'),
	(19, 'ADHESION_EN_LIGNE', '14', 'UPDATE', '{"details": "Validation de l''adhesion en ligne 308628U par 395047y@madgi.ci.", "action_metier": "VALIDATION_ADHESION_EN_LIGNE"}', '395047y@madgi.ci', '2026-07-14 20:58:40.097+00', '2026-07-14 20:58:39.862357+00'),
	(20, 'utilisateurs', NULL, 'UPDATE', '{"details": "Acces utilisateur 11816P mis a jour avec le profil ADMINISTRATEUR.", "action_metier": "MODIFICATION_UTILISATEUR"}', '395047y@madgi.ci', '2026-07-16 10:50:34.212+00', '2026-07-16 10:50:34.650457+00'),
	(21, 'ADHERENT', '03506P', 'CREATE', '{"details": "Creation de l''adherent 03506P - BEYOGB BERENGER.", "action_metier": "CREATION_ADHERENT"}', '395047y@madgi.ci', '2026-07-20 14:12:54.374+00', '2026-07-20 14:12:54.46599+00'),
	(22, 'ADHERENT', '03906P', 'CREATE', '{"details": "Creation de l''adherent 03906P - KONE PEGOBANAGNANA.", "action_metier": "CREATION_ADHERENT"}', '395047y@madgi.ci', '2026-07-20 14:14:07.979+00', '2026-07-20 14:14:08.087534+00'),
	(23, 'ADHERENT', '06408P', 'CREATE', '{"details": "Creation de l''adherent 06408P - KPANGNI KADJO BLAISE.", "action_metier": "CREATION_ADHERENT"}', '395047y@madgi.ci', '2026-07-20 14:15:20.141+00', '2026-07-20 14:15:20.256734+00'),
	(24, 'ADHERENT', '08014P', 'CREATE', '{"details": "Creation de l''adherent 08014P - AHOLIA AMOIKON JEAN SERGE.", "action_metier": "CREATION_ADHERENT"}', '395047y@madgi.ci', '2026-07-20 15:40:47.903+00', '2026-07-20 15:40:47.992485+00'),
	(25, 'ADHERENT', '00704P', 'CREATE', '{"details": "Creation de l''adherent 00704P - BAROU AYA LEA GERTRUDE.", "action_metier": "CREATION_ADHERENT"}', '11816p@madgi.ci', '2026-07-20 16:05:54.586+00', '2026-07-20 16:05:54.684326+00'),
	(26, 'COMPTE_ESR', '2', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-07-29\",\"nombreMouvements\":2,\"capitalVerse\":1600000,\"provision\":1627759.2,\"valeurRachat\":1469052.6779999998,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', 'codex@madgi.local', '2026-07-29 11:45:47.191+00', '2026-07-29 11:45:48.194343+00'),
	(27, 'PERIODE', '2026T2', 'CREATE', '{"details": "{\"periode\":\"2026T2\",\"annee\":2026,\"trimestre\":2}", "action_metier": "CREATION_PERIODE"}', '395047y@madgi.ci', '2026-08-05 22:38:51.261+00', '2026-08-05 22:38:51.367652+00'),
	(28, 'PRECOMPTE', '2026T2', 'UPDATE', '{"details": "{\"periode\":\"2026T2\",\"dateRetour\":\"2026-08-05\",\"total\":10,\"rapproches\":10,\"ecarts\":0,\"nonPrecomptes\":0,\"introuvables\":[],\"anomalies\":[]}", "action_metier": "IMPORT_RETOUR_DGI"}', '395047y@madgi.ci', '2026-08-05 23:24:44.52+00', '2026-08-05 23:24:44.621113+00'),
	(29, 'PRECOMPTE', '2026T2', 'UPDATE', '{"details": "{\"periode\":\"2026T2\",\"dateRetour\":\"2026-08-05\",\"total\":12,\"rapproches\":10,\"ecarts\":0,\"nonPrecomptes\":2,\"introuvables\":[],\"anomalies\":[{\"matricule\":\"A289598\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0},{\"matricule\":\"03906P\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0}]}", "action_metier": "IMPORT_RETOUR_DGI"}', '395047y@madgi.ci', '2026-08-05 23:36:05.223+00', '2026-08-05 23:36:05.318731+00'),
	(30, 'PERIODE', '2026T2', 'UPDATE', '{"details": "{\"periode\":\"2026T2\",\"periodeSuivante\":\"2026T3\",\"nbAdherents\":12}", "action_metier": "CLOTURE_PERIODE"}', '395047y@madgi.ci', '2026-08-08 16:53:28.039+00', '2026-08-08 16:53:27.560421+00'),
	(31, 'RENTE', NULL, 'UPDATE', '{"details": "{\"annee\":2026,\"trimestre\":3,\"rentesEligibles\":0,\"creees\":0}", "action_metier": "GENERATION_ECHEANCES_APS"}', '395047y@madgi.ci', '2026-08-08 23:29:16.831+00', '2026-08-08 23:29:16.82576+00'),
	(32, 'RENTE', NULL, 'UPDATE', '{"details": "{\"annee\":2026,\"trimestre\":1,\"rentesEligibles\":0,\"creees\":0}", "action_metier": "GENERATION_ECHEANCES_APS"}', '395047y@madgi.ci', '2026-08-08 23:29:28.567+00', '2026-08-08 23:29:28.547154+00'),
	(33, 'PRESTATION', '1', 'UPDATE', '{"details": "{\"ancienStatut\":\"VALIDE\",\"nouveauStatut\":\"PAYE\",\"observation\":\"\"}", "action_metier": "PRESTATION_PAYE"}', '395047y@madgi.ci', '2026-08-08 23:49:03.327+00', '2026-08-08 23:49:03.160247+00'),
	(34, 'RENTE_VERSEMENT', '3', 'UPDATE', '{"details": "{\"ancienStatut\":\"EN_CONTROLE\",\"nouveauStatut\":\"VALIDEE\",\"observation\":\"\"}", "action_metier": "ECHEANCE_APS_VALIDEE"}', '395047y@madgi.ci', '2026-08-08 23:49:29.13+00', '2026-08-08 23:49:28.960877+00'),
	(35, 'PERIODE', '2026T2', 'UPDATE', '{"details": "{\"periode\":\"2026T2\",\"dateArrete\":\"2026-07-01\",\"lignesCorrigees\":[{\"id_cotisation_detail\":24,\"id_adherent\":21,\"matricule\":\"08014P\",\"montant\":46600,\"date_valeur\":\"2026-08-31\",\"source\":\"PRECOMPTE\",\"statut_detail\":\"ENCAISSEE\"},{\"id_cotisation_detail\":26,\"id_adherent\":22,\"matricule\":\"00704P\",\"montant\":278000,\"date_valeur\":\"2026-08-31\",\"source\":\"PRECOMPTE\",\"statut_detail\":\"ENCAISSEE\"},{\"id_cotisation_detail\":27,\"id_adherent\":2,\"matricule\":\"A369543\",\"montant\":116600,\"date_valeur\":\"2026-08-31\",\"source\":\"PRECOMPTE\",\"statut_detail\":\"ENCAISSEE\"},{\"id_cotisation_detail\":28,\"id_adherent\":17,\"matricule\":\"03506P\",\"montant\":156200,\"date_valeur\":\"2026-08-31\",\"source\":\"PRECOMPTE\",\"statut_detail\":\"ENCAISSEE\"},{\"id_cotisation_detail\":29,\"id_adherent\":15,\"matricule\":\"231830V\",\"montant\":308600,\"date_valeur\":\"2026-08-31\",\"source\":\"PRECOMPTE\",\"statut_detail\":\"ENCAISSEE\"},{\"id_cotisation_detail\":30,\"id_adherent\":4,\"matricule\":\"654321BCA\",\"montant\":73500,\"date_valeur\":\"2026-08-31\",\"source\":\"PRECOMPTE\",\"statut_detail\":\"ENCAISSEE\"},{\"id_cotisation_detail\":32,\"id_adherent\":1,\"matricule\":\"TEST001\",\"montant\":50000,\"date_valeur\":\"2026-08-31\",\"source\":\"PRECOMPTE\",\"statut_detail\":\"ENCAISSEE\"},{\"id_cotisation_detail\":33,\"id_adherent\":19,\"matricule\":\"06408P\",\"montant\":62800,\"date_valeur\":\"2026-08-31\",\"source\":\"PRECOMPTE\",\"statut_detail\":\"ENCAISSEE\"},{\"id_cotisation_detail\":34,\"id_adherent\":6,\"matricule\":\"11816P\",\"montant\":66700,\"date_valeur\":\"2026-08-31\",\"source\":\"PRECOMPTE\",\"statut_detail\":\"ENCAISSEE\"},{\"id_cotisation_detail\":35,\"id_adherent\":14,\"matricule\":\"308628U\",\"montant\":153700,\"date_valeur\":\"2026-08-31\",\"source\":\"PRECOMPTE\",\"statut_detail\":\"ENCAISSEE\"}],\"capitalGlobal\":4312700,\"pmTotale\":4376086.87}", "action_metier": "CORRECTION_CLOTURE_DATE_VALEUR"}', 'CODEX-CORRECTION', '2026-08-09 00:04:37.128+00', '2026-08-09 00:04:36.968356+00'),
	(36, 'utilisateurs', NULL, 'UPDATE', '{"details": "Acces utilisateur 11816P mis a jour avec le profil ADHERENT.", "action_metier": "MODIFICATION_UTILISATEUR"}', '395047y@madgi.ci', '2026-08-10 12:41:35.289+00', '2026-08-10 12:41:35.701484+00'),
	(37, 'COMPTE_ESR', '21', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-08-06\",\"nombreMouvements\":3,\"capitalVerse\":593200,\"primesPeriodiques\":593200,\"cotisationUnique\":0,\"provision\":598323.73,\"valeurRachat\":568407.54,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-10 16:02:22.042+00', '2026-08-10 16:02:22.465269+00'),
	(38, 'COMPTE_ESR', '21', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-08-06\",\"nombreMouvements\":3,\"capitalVerse\":593200,\"primesPeriodiques\":593200,\"cotisationUnique\":0,\"provision\":598323.73,\"valeurRachat\":568407.54,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-10 16:02:22.524+00', '2026-08-10 16:02:22.955505+00'),
	(39, 'COMPTE_ESR', '3', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-08-05\",\"nombreMouvements\":3,\"capitalVerse\":702600,\"primesPeriodiques\":702600,\"cotisationUnique\":0,\"provision\":713895.9,\"valeurRachat\":678201.11,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-10 16:03:51.675+00', '2026-08-10 16:03:52.100253+00'),
	(40, 'COMPTE_ESR', '3', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-08-05\",\"nombreMouvements\":3,\"capitalVerse\":702600,\"primesPeriodiques\":702600,\"cotisationUnique\":0,\"provision\":713895.9,\"valeurRachat\":678201.11,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-10 16:03:52.148+00', '2026-08-10 16:03:52.581942+00'),
	(66, 'PRESTATION', '3', 'UPDATE', '{"details": "{\"ancienStatut\":\"DOSSIER_OUVERT\",\"nouveauStatut\":\"EN_CONTROLE\",\"observation\":\"\",\"dateCompletude\":\"2026-08-11\",\"echeancePaiement\":\"2026-09-01\"}", "action_metier": "PRESTATION_EN_CONTROLE"}', '395047y@madgi.ci', '2026-08-11 17:27:10.965+00', '2026-08-11 17:27:11.058864+00'),
	(68, 'RENTE', NULL, 'UPDATE', '{"details": "{\"annee\":2026,\"trimestre\":2,\"rentesEligibles\":0,\"creees\":0}", "action_metier": "GENERATION_ECHEANCES_APS"}', '395047y@madgi.ci', '2026-08-11 17:27:45.671+00', '2026-08-11 17:27:45.797408+00'),
	(41, 'COMPTE_ESR', '22', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-08-08\",\"nombreMouvements\":3,\"capitalVerse\":4278000,\"primesPeriodiques\":4278000,\"cotisationUnique\":0,\"provision\":4314950.99,\"valeurRachat\":4099203.44,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-10 16:04:25.508+00', '2026-08-10 16:04:25.939437+00'),
	(42, 'COMPTE_ESR', '22', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-08-08\",\"nombreMouvements\":3,\"capitalVerse\":4278000,\"primesPeriodiques\":4278000,\"cotisationUnique\":0,\"provision\":4314950.99,\"valeurRachat\":4099203.44,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-10 16:04:25.987+00', '2026-08-10 16:04:26.421637+00'),
	(43, 'COMPTE_ESR', '18', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-08-08\",\"nombreMouvements\":1,\"capitalVerse\":93700,\"primesPeriodiques\":93700,\"cotisationUnique\":0,\"provision\":94509.33,\"valeurRachat\":89783.86,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-10 16:05:16.162+00', '2026-08-10 16:05:16.600621+00'),
	(44, 'COMPTE_ESR', '18', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-08-08\",\"nombreMouvements\":1,\"capitalVerse\":93700,\"primesPeriodiques\":93700,\"cotisationUnique\":0,\"provision\":94509.33,\"valeurRachat\":89783.86,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-10 16:05:16.648+00', '2026-08-10 16:05:17.078518+00'),
	(45, 'utilisateurs', NULL, 'UPDATE', '{"details": "Acces utilisateur 11816P mis a jour avec le profil ADMINISTRATEUR.", "action_metier": "MODIFICATION_UTILISATEUR"}', '395047y@madgi.ci', '2026-08-10 17:40:58.257+00', '2026-08-10 17:40:58.698954+00'),
	(46, 'utilisateurs', '20', 'CREATE', '{"details": "Acces premiere connexion cree pour l''adherent 06708P.", "action_metier": "CREATION_ACCES_PREMIERE_CONNEXION"}', '395047y@madgi.ci', '2026-08-11 10:17:16.858+00', '2026-08-11 10:17:16.962077+00'),
	(47, 'ADHESION_EN_LIGNE', '20', 'UPDATE', '{"details": "Validation de l''adhesion en ligne 06708P par 395047y@madgi.ci.", "action_metier": "VALIDATION_ADHESION_EN_LIGNE"}', '395047y@madgi.ci', '2026-08-11 10:17:17.068+00', '2026-08-11 10:17:17.522693+00'),
	(48, 'PRECOMPTE', '2026T1', 'UPDATE', '{"details": "{\"periode\":\"2026T1\",\"dateRetour\":\"2026-08-11\",\"total\":8,\"rapproches\":0,\"ecarts\":0,\"nonPrecomptes\":8,\"introuvables\":[],\"anomalies\":[{\"matricule\":\"08014P\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0},{\"matricule\":\"00704P\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0},{\"matricule\":\"231830V\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0},{\"matricule\":\"03906P\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0},{\"matricule\":\"06408P\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0},{\"matricule\":\"11816P\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0},{\"matricule\":\"308628U\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0},{\"matricule\":\"06708P\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0}]}", "action_metier": "IMPORT_RETOUR_DGI"}', '395047y@madgi.ci', '2026-08-11 11:34:59.881+00', '2026-08-11 11:34:59.974092+00'),
	(49, 'PRECOMPTE', '2026T1', 'UPDATE', '{"details": "{\"periode\":\"2026T1\",\"dateRetour\":\"2026-08-11\",\"total\":8,\"rapproches\":6,\"ecarts\":0,\"nonPrecomptes\":2,\"introuvables\":[],\"anomalies\":[{\"matricule\":\"231830V\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0},{\"matricule\":\"308628U\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0}]}", "action_metier": "IMPORT_RETOUR_DGI"}', '395047y@madgi.ci', '2026-08-11 11:39:05.32+00', '2026-08-11 11:39:05.41227+00'),
	(50, 'PERIODE', '2026T1', 'UPDATE', '{"details": "{\"periode\":\"2026T1\",\"periodeSuivante\":\"2026T2\",\"nbAdherents\":8}", "action_metier": "CLOTURE_PERIODE"}', '395047y@madgi.ci', '2026-08-11 14:16:40.582+00', '2026-08-11 14:16:40.671275+00'),
	(51, 'PRECOMPTE', '2026T2', 'UPDATE', '{"details": "{\"periode\":\"2026T2\",\"dateRetour\":\"2026-08-11\",\"total\":8,\"rapproches\":8,\"ecarts\":0,\"nonPrecomptes\":0,\"introuvables\":[],\"anomalies\":[]}", "action_metier": "IMPORT_RETOUR_DGI"}', '395047y@madgi.ci', '2026-08-11 15:37:47.626+00', '2026-08-11 15:37:47.710536+00'),
	(52, 'RENTE', NULL, 'UPDATE', '{"details": "{\"annee\":2026,\"trimestre\":3,\"rentesEligibles\":0,\"creees\":0}", "action_metier": "GENERATION_ECHEANCES_APS"}', '11816p@madgi.ci', '2026-08-11 15:42:47.439+00', '2026-08-11 15:42:47.547329+00'),
	(53, 'RENTE', NULL, 'UPDATE', '{"details": "{\"annee\":2026,\"trimestre\":2,\"rentesEligibles\":0,\"creees\":0}", "action_metier": "GENERATION_ECHEANCES_APS"}', '11816p@madgi.ci', '2026-08-11 15:43:02.251+00', '2026-08-11 15:43:02.383943+00'),
	(67, 'RENTE', NULL, 'UPDATE', '{"details": "{\"annee\":2026,\"trimestre\":3,\"rentesEligibles\":0,\"creees\":0}", "action_metier": "GENERATION_ECHEANCES_APS"}', '395047y@madgi.ci', '2026-08-11 17:27:38.6+00', '2026-08-11 17:27:38.720128+00'),
	(54, 'COMPTE_ESR', '22', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-07-04\",\"nombreMouvements\":2,\"capitalVerse\":556000,\"primesPeriodiques\":556000,\"cotisationUnique\":0,\"provision\":565667.24,\"valeurRachat\":537383.88,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '11816p@madgi.ci', '2026-08-11 15:46:59.485+00', '2026-08-11 15:46:59.567374+00'),
	(55, 'PERIODE', '2026T2', 'UPDATE', '{"details": "{\"periode\":\"2026T2\",\"periodeSuivante\":\"2026T3\",\"nbAdherents\":8}", "action_metier": "CLOTURE_PERIODE"}', '395047y@madgi.ci', '2026-08-11 16:05:38.935+00', '2026-08-11 16:05:39.031256+00'),
	(56, 'utilisateurs', NULL, 'CREATE', '{"details": "Acces utilisateur GESTION01 configure avec le profil GESTIONNAIRE.", "action_metier": "CREATION_UTILISATEUR"}', '395047y@madgi.ci', '2026-08-11 16:28:48.771+00', '2026-08-11 16:28:48.876642+00'),
	(57, 'ADHERENT', '349132B', 'CREATE', '{"details": "Creation de l''adherent 349132B - GOLI KONAN MICHEL.", "action_metier": "CREATION_ADHERENT"}', '395047y@madgi.ci', '2026-08-11 16:47:24.311+00', '2026-08-11 16:47:24.402746+00'),
	(58, 'PRECOMPTE', '2026T3', 'UPDATE', '{"details": "{\"periode\":\"2026T3\",\"dateRetour\":\"2026-08-11\",\"total\":9,\"rapproches\":7,\"ecarts\":0,\"nonPrecomptes\":2,\"introuvables\":[],\"anomalies\":[{\"matricule\":\"11816P\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0},{\"matricule\":\"06408P\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0}]}", "action_metier": "IMPORT_RETOUR_DGI"}', '395047y@madgi.ci', '2026-08-11 17:12:55.904+00', '2026-08-11 17:12:56.016174+00'),
	(59, 'COMPTE_ESR', '21', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-08-11\",\"nombreMouvements\":3,\"capitalVerse\":593200,\"primesPeriodiques\":593200,\"cotisationUnique\":0,\"provision\":603901.21,\"valeurRachat\":573706.15,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-11 17:24:14.971+00', '2026-08-11 17:24:15.093426+00'),
	(60, 'PRESTATION', '21', 'CREATE', '{"details": "{\"type\":\"DECES\",\"montant\":573706.15,\"dateCalcul\":\"2026-08-11\",\"compte\":{\"nombreMouvements\":3,\"capitalVerse\":593200,\"primesPeriodiques\":593200,\"cotisationUnique\":0,\"provisionMathematique\":603901.21,\"valeurRachat\":573706.15,\"tauxTrimestriel\":0.008637445997713433,\"dateCalcul\":\"2026-08-11\"},\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "CREATION_PRESTATION_CALCULEE"}', '395047y@madgi.ci', '2026-08-11 17:24:15.896+00', '2026-08-11 17:24:15.997524+00'),
	(61, 'PRESTATION', '2', 'UPDATE', '{"details": "{\"ancienStatut\":\"DOSSIER_OUVERT\",\"nouveauStatut\":\"EN_CONTROLE\",\"observation\":\"\",\"dateCompletude\":\"2026-08-11\",\"echeancePaiement\":\"2026-09-01\"}", "action_metier": "PRESTATION_EN_CONTROLE"}', '395047y@madgi.ci', '2026-08-11 17:24:33.645+00', '2026-08-11 17:24:33.752659+00'),
	(62, 'PRESTATION', '2', 'UPDATE', '{"details": "{\"ancienStatut\":\"EN_CONTROLE\",\"nouveauStatut\":\"VALIDE\",\"observation\":\"\"}", "action_metier": "PRESTATION_VALIDE"}', '395047y@madgi.ci', '2026-08-11 17:24:45.711+00', '2026-08-11 17:24:46.139399+00'),
	(63, 'PRESTATION', '2', 'UPDATE', '{"details": "{\"ancienStatut\":\"VALIDE\",\"nouveauStatut\":\"PAYE\",\"observation\":\"\"}", "action_metier": "PRESTATION_PAYE"}', '395047y@madgi.ci', '2026-08-11 17:26:17.937+00', '2026-08-11 17:26:18.054276+00'),
	(64, 'COMPTE_ESR', '21', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-08-11\",\"nombreMouvements\":3,\"capitalVerse\":593200,\"primesPeriodiques\":593200,\"cotisationUnique\":0,\"provision\":603901.21,\"valeurRachat\":573706.15,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-11 17:26:56.157+00', '2026-08-11 17:26:56.29066+00'),
	(65, 'PRESTATION', '21', 'CREATE', '{"details": "{\"type\":\"RETRAITE\",\"montant\":603901.21,\"dateCalcul\":\"2026-08-11\",\"compte\":{\"nombreMouvements\":3,\"capitalVerse\":593200,\"primesPeriodiques\":593200,\"cotisationUnique\":0,\"provisionMathematique\":603901.21,\"valeurRachat\":573706.15,\"tauxTrimestriel\":0.008637445997713433,\"dateCalcul\":\"2026-08-11\"},\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "CREATION_PRESTATION_CALCULEE"}', '395047y@madgi.ci', '2026-08-11 17:26:56.772+00', '2026-08-11 17:26:57.222134+00'),
	(69, 'COMPTE_ESR', '18', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-09-30\",\"nombreMouvements\":3,\"capitalVerse\":281100,\"primesPeriodiques\":281100,\"cotisationUnique\":0,\"provision\":285167.68,\"valeurRachat\":270909.3,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-11 17:48:22.167+00', '2026-08-11 17:48:22.285855+00'),
	(70, 'COMPTE_ESR', '21', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-09-30\",\"nombreMouvements\":4,\"capitalVerse\":639800,\"primesPeriodiques\":639800,\"cotisationUnique\":0,\"provision\":650903.72,\"valeurRachat\":618358.53,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-11 18:03:58.449+00', '2026-08-11 18:03:58.56594+00'),
	(71, 'COMPTE_ESR', '6', 'UPDATE', '{"details": "{\"dateCalcul\":\"2026-08-11\",\"nombreMouvements\":3,\"capitalVerse\":200100,\"primesPeriodiques\":200100,\"cotisationUnique\":0,\"provision\":202995.56,\"valeurRachat\":192845.78,\"parametres\":{\"TAUX_GAR\":{\"valeur\":\"3.5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_RENTE\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"AGE_MAX\":{\"valeur\":\"106\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"FRAIS_GESTION_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_RACHAT\":{\"valeur\":\"5\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_INVALIDITE_AVANT_RETRAITE\":{\"valeur\":\"95\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_COUVERTURE_RETRAITE\":{\"valeur\":\"100\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_REMBOURSEMENT_SOINS\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"TAUX_DECES_PENDANT_RENTE\":{\"valeur\":\"80\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null},\"DELAI_MIN_RACHAT_ANNEES\":{\"valeur\":\"2\",\"dateDebut\":\"2024-01-01\",\"dateFin\":null}}}", "action_metier": "RECALCUL_COMPTE_ESR"}', '395047y@madgi.ci', '2026-08-11 18:04:24.456+00', '2026-08-11 18:04:24.558197+00'),
	(72, 'PERIODE', '2026T3', 'UPDATE', '{"details": "{\"periode\":\"2026T3\",\"periodeSuivante\":\"2026T4\",\"nbAdherents\":9}", "action_metier": "CLOTURE_PERIODE"}', '395047y@madgi.ci', '2026-08-11 21:09:44.963+00', '2026-08-11 21:09:44.887744+00'),
	(73, 'PRECOMPTE', '2026T1', 'UPDATE', '{"details": "{\"periode\":\"2026T1\",\"dateRetour\":\"2026-08-11\",\"total\":1,\"rapproches\":1,\"ecarts\":0,\"nonPrecomptes\":0,\"introuvables\":[],\"anomalies\":[]}", "action_metier": "IMPORT_RETOUR_DGI"}', '395047y@madgi.ci', '2026-08-11 22:36:02.22+00', '2026-08-11 22:36:02.156058+00'),
	(74, 'PERIODE', '2026T1', 'UPDATE', '{"details": "{\"periode\":\"2026T1\",\"periodeSuivante\":\"2026T2\",\"nbAdherents\":9}", "action_metier": "CLOTURE_PERIODE"}', '395047y@madgi.ci', '2026-08-11 22:36:38.491+00', '2026-08-11 22:36:38.424551+00'),
	(75, 'PRECOMPTE', '2026T2', 'UPDATE', '{"details": "{\"periode\":\"2026T2\",\"dateRetour\":\"2026-08-11\",\"total\":1,\"rapproches\":1,\"ecarts\":0,\"nonPrecomptes\":0,\"introuvables\":[],\"anomalies\":[]}", "action_metier": "IMPORT_RETOUR_DGI"}', '395047y@madgi.ci', '2026-08-11 22:38:03.428+00', '2026-08-11 22:38:03.364918+00'),
	(76, 'PERIODE', '2026T2', 'UPDATE', '{"details": "{\"periode\":\"2026T2\",\"periodeSuivante\":\"2026T3\",\"nbAdherents\":9}", "action_metier": "CLOTURE_PERIODE"}', '395047y@madgi.ci', '2026-08-11 22:38:34.777+00', '2026-08-11 22:38:34.712617+00'),
	(77, 'PRECOMPTE', '2026T3', 'UPDATE', '{"details": "{\"periode\":\"2026T3\",\"dateRetour\":\"2026-08-11\",\"total\":5,\"rapproches\":4,\"ecarts\":0,\"nonPrecomptes\":1,\"introuvables\":[],\"anomalies\":[{\"matricule\":\"11816P\",\"statut\":\"NON_PRECOMPTE\",\"motif\":\"\",\"montantRetour\":0}]}", "action_metier": "IMPORT_RETOUR_DGI"}', '395047y@madgi.ci', '2026-08-11 22:41:29.043+00', '2026-08-11 22:41:28.987118+00'),
	(78, 'PERIODE', '2026T3', 'UPDATE', '{"details": "{\"periode\":\"2026T3\",\"periodeSuivante\":\"2026T4\",\"nbAdherents\":9}", "action_metier": "CLOTURE_PERIODE"}', '395047y@madgi.ci', '2026-08-11 22:46:17.455+00', '2026-08-11 22:46:17.395178+00');


--
-- Data for Name: beneficiaires; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."beneficiaires" ("id_beneficiaire", "id_adherent", "nom_benef", "prenoms_benef", "lien", "pourcentage", "statut", "date_enreg", "created_at", "updated_at") VALUES
	(8, 6, 'M''BRA', 'Kylian', 'Enfant', 50.00, true, '2026-07-20', '2026-07-20 09:22:21.734249+00', NULL),
	(9, 6, 'M''BRA', 'Talia', 'Enfant', 25.00, true, '2026-07-20', '2026-07-20 09:22:46.860453+00', NULL),
	(10, 6, 'M''BRA', 'Rayan', 'Enfant', 25.00, true, '2026-07-20', '2026-07-20 09:23:09.824906+00', NULL);


--
-- Data for Name: civilites; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."civilites" ("id_civilite", "libelle_civilite", "sexe", "actif", "created_at", "updated_at") VALUES
	(3, 'Mademoiselle', 'F', true, '2026-06-16 00:14:51.272254+00', NULL),
	(2, 'Madame', 'F', true, '2026-06-16 00:14:51.272254+00', '2026-06-16 16:35:03.326605+00'),
	(1, 'Monsieur', 'M', true, '2026-06-16 00:14:51.272254+00', '2026-06-16 16:35:03.326605+00');


--
-- Data for Name: comptes_esr; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."comptes_esr" ("id_compte_esr", "id_adherent", "capital_acquis", "pm", "pp", "pu", "valeur_rachat", "date_calcul", "version_calc", "created_at", "updated_at") VALUES
	(20, 21, 46600.00, 47002.50, 46600.00, 0.00, 42419.76, '2026-09-30', 'ESR-PM-2|2024-01-01', '2026-08-11 12:46:24.109191+00', '2026-08-11 23:02:56.383236+00'),
	(21, 22, 278000.00, 280401.21, 278000.00, 0.00, 253062.09, '2026-09-30', 'ESR-PM-2|2024-01-01', '2026-08-11 12:46:24.109191+00', '2026-08-11 23:02:56.936137+00'),
	(16, 15, 308600.00, 311265.52, 308600.00, 0.00, 280917.13, '2026-09-30', 'ESR-PM-2|2024-01-01', '2026-08-11 12:46:24.109191+00', '2026-08-11 23:02:57.467477+00'),
	(23, 23, 0.00, 0.00, 0.00, 0.00, 0.00, '2026-09-30', 'ESR-PM-2|2024-01-01', '2026-08-11 16:47:24.009384+00', '2026-08-11 23:02:58.008061+00'),
	(18, 18, 0.00, 0.00, 0.00, 0.00, 0.00, '2026-09-30', 'ESR-PM-2|2024-01-01', '2026-08-11 12:46:24.109191+00', '2026-08-11 23:02:58.539325+00'),
	(19, 19, 0.00, 0.00, 0.00, 0.00, 0.00, '2026-09-30', 'ESR-PM-2|2024-01-01', '2026-08-11 12:46:24.109191+00', '2026-08-11 23:02:59.089139+00'),
	(15, 6, 200100.00, 203576.65, 700100.00, 0.00, 183727.93, '2026-09-30', 'ESR-PM-2|2024-01-01', '2026-08-11 12:46:24.109191+00', '2026-08-11 23:02:59.61301+00'),
	(17, 14, 153700.00, 155027.58, 153700.00, 0.00, 139912.39, '2026-09-30', 'ESR-PM-2|2024-01-01', '2026-08-11 12:46:24.109191+00', '2026-08-11 23:03:00.174175+00'),
	(22, 20, 0.00, 0.00, 0.00, 0.00, 0.00, '2026-09-30', 'ESR-PM-2|2024-01-01', '2026-08-11 12:46:24.109191+00', '2026-08-11 23:03:00.699345+00');


--
-- Data for Name: cotisation_entetes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."cotisation_entetes" ("id_cotisation_entete", "id_adherent", "mode", "periode_deb", "periode_fin", "reference", "taux_gar", "frais_rente", "table_code", "statut", "created_at", "updated_at") VALUES
	(84, 6, 'PRECOMPTE', '2026-01-01', '2026-03-31', 'PC26T1-11816P-F291', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 22:28:29.538338+00', NULL),
	(85, 6, 'PRECOMPTE', '2026-04-01', '2026-06-30', 'PC26T2-11816P-PTGF', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 22:36:51.357917+00', NULL),
	(86, 21, 'PRECOMPTE', '2026-07-01', '2026-09-30', 'PC26T3-08014P-SFB5', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 22:38:52.993023+00', NULL),
	(87, 22, 'PRECOMPTE', '2026-07-01', '2026-09-30', 'PC26T3-00704P-SFQM', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 22:38:53.54468+00', NULL),
	(88, 15, 'PRECOMPTE', '2026-07-01', '2026-09-30', 'PC26T3-231830V-SG5B', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 22:38:54.077597+00', NULL),
	(89, 6, 'PRECOMPTE', '2026-07-01', '2026-09-30', 'PC26T3-11816P-SGKY', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 22:38:54.636329+00', NULL),
	(90, 14, 'PRECOMPTE', '2026-07-01', '2026-09-30', 'PC26T3-308628U-SH0J', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 22:38:55.20611+00', NULL),
	(91, 6, 'ESPECES', '2026-07-01', '2026-09-30', 'RG26T3-11816P-16GS', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 22:45:41.441359+00', NULL),
	(92, 6, 'ESPECES', '2026-10-01', '2026-12-31', 'SP26T4-11816P-MEUV', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 23:02:12.093248+00', NULL),
	(93, 21, 'PRECOMPTE', '2026-10-01', '2026-12-31', 'PC26T4-08014P-NCQE', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 23:02:55.985569+00', NULL),
	(94, 22, 'PRECOMPTE', '2026-10-01', '2026-12-31', 'PC26T4-00704P-ND5G', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 23:02:56.535138+00', NULL),
	(95, 15, 'PRECOMPTE', '2026-10-01', '2026-12-31', 'PC26T4-231830V-NDKG', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 23:02:57.074712+00', NULL),
	(96, 23, 'PRECOMPTE', '2026-10-01', '2026-12-31', 'PC26T4-349132B-NDZD', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 23:02:57.613173+00', NULL),
	(97, 18, 'PRECOMPTE', '2026-10-01', '2026-12-31', 'PC26T4-03906P-NEEE', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 23:02:58.146717+00', NULL),
	(98, 19, 'PRECOMPTE', '2026-10-01', '2026-12-31', 'PC26T4-06408P-NESV', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 23:02:58.669891+00', NULL),
	(99, 6, 'PRECOMPTE', '2026-10-01', '2026-12-31', 'PC26T4-11816P-NF8C', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 23:02:59.227625+00', NULL),
	(100, 14, 'PRECOMPTE', '2026-10-01', '2026-12-31', 'PC26T4-308628U-NFMZ', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 23:02:59.768193+00', NULL),
	(101, 20, 'PRECOMPTE', '2026-10-01', '2026-12-31', 'PC26T4-06708P-NG29', 3.5000, 5.0000, 'CIMA-F', 'OUVERT', '2026-08-11 23:03:00.305072+00', NULL);


--
-- Data for Name: cotisation_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."cotisation_details" ("id_cotisation_detail", "id_cotisation_entete", "periode", "date_valeur", "montant", "source", "statut", "created_at", "updated_at", "id_precompte") VALUES
	(84, 84, '2026T1', '2026-03-31', 66700.00, 'PRECOMPTE', 'ENCAISSEE', '2026-08-11 22:28:29.718614+00', '2026-08-11 22:36:02.014069+00', NULL),
	(85, 85, '2026T2', '2026-06-30', 66700.00, 'PRECOMPTE', 'ENCAISSEE', '2026-08-11 22:36:51.49758+00', '2026-08-11 22:38:03.082497+00', NULL),
	(86, 86, '2026T3', '2026-09-30', 46600.00, 'PRECOMPTE', 'ENCAISSEE', '2026-08-11 22:38:53.127112+00', '2026-08-11 22:41:26.864877+00', NULL),
	(87, 87, '2026T3', '2026-09-30', 278000.00, 'PRECOMPTE', 'ENCAISSEE', '2026-08-11 22:38:53.679215+00', '2026-08-11 22:41:27.641165+00', NULL),
	(88, 88, '2026T3', '2026-09-30', 308600.00, 'PRECOMPTE', 'ENCAISSEE', '2026-08-11 22:38:54.213119+00', '2026-08-11 22:41:28.053284+00', NULL),
	(89, 89, '2026T3', NULL, 0.00, 'PRECOMPTE', 'REJETEE', '2026-08-11 22:38:54.773298+00', '2026-08-11 22:41:28.437316+00', NULL),
	(90, 90, '2026T3', '2026-09-30', 153700.00, 'PRECOMPTE', 'ENCAISSEE', '2026-08-11 22:38:55.340134+00', '2026-08-11 22:41:28.838679+00', NULL),
	(91, 91, '2026T3', '2026-08-11', 66700.00, 'REGULARISATION_PRECOMPTE', 'ENCAISSEE', '2026-08-11 22:45:41.441359+00', NULL, 70),
	(92, 92, '2026T4', '2026-08-11', 500000.00, 'SPONTANEE', 'ENCAISSEE', '2026-08-11 23:02:12.446363+00', NULL, NULL),
	(93, 93, '2026T4', NULL, 46600.00, 'PRECOMPTE', 'PREVUE', '2026-08-11 23:02:56.120138+00', '2026-08-11 23:02:56.383236+00', NULL),
	(94, 94, '2026T4', NULL, 278000.00, 'PRECOMPTE', 'PREVUE', '2026-08-11 23:02:56.669738+00', '2026-08-11 23:02:56.936137+00', NULL),
	(95, 95, '2026T4', NULL, 308600.00, 'PRECOMPTE', 'PREVUE', '2026-08-11 23:02:57.199977+00', '2026-08-11 23:02:57.467477+00', NULL),
	(96, 96, '2026T4', NULL, 288900.00, 'PRECOMPTE', 'PREVUE', '2026-08-11 23:02:57.740136+00', '2026-08-11 23:02:58.008061+00', NULL),
	(97, 97, '2026T4', NULL, 93700.00, 'PRECOMPTE', 'PREVUE', '2026-08-11 23:02:58.273129+00', '2026-08-11 23:02:58.539325+00', NULL),
	(98, 98, '2026T4', NULL, 62800.00, 'PRECOMPTE', 'PREVUE', '2026-08-11 23:02:58.797602+00', '2026-08-11 23:02:59.089139+00', NULL),
	(99, 99, '2026T4', '2026-12-31', 0.00, 'PRECOMPTE', 'ENCAISSEE', '2026-08-11 23:02:59.351834+00', '2026-08-11 23:02:59.61301+00', NULL),
	(100, 100, '2026T4', NULL, 153700.00, 'PRECOMPTE', 'PREVUE', '2026-08-11 23:02:59.89951+00', '2026-08-11 23:03:00.174175+00', NULL),
	(101, 101, '2026T4', NULL, 109300.00, 'PRECOMPTE', 'PREVUE', '2026-08-11 23:03:00.43888+00', '2026-08-11 23:03:00.699345+00', NULL);


--
-- Data for Name: emplois; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."emplois" ("id_emploi", "libelle_emploi", "actif", "created_at", "updated_at") VALUES
	(1, 'Agent des Impôts', true, '2026-06-16 00:35:08.783214+00', NULL),
	(2, 'Contrôleur des Impôts', true, '2026-06-16 00:35:08.783214+00', NULL),
	(3, 'Inspecteur des Impôts', true, '2026-06-16 00:35:08.783214+00', NULL),
	(5, 'Inspecteur', true, '2026-06-16 16:35:03.326605+00', NULL),
	(4, 'Administrateur', true, '2026-06-16 00:35:08.783214+00', '2026-06-16 16:35:03.326605+00'),
	(7, 'Agent de bureau', true, '2026-06-16 16:35:03.326605+00', NULL),
	(8, 'Comptable', true, '2026-06-18 21:10:54.614769+00', NULL);


--
-- Data for Name: fonctions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fonctions" ("id_fonction", "libelle_fonction", "actif", "created_at", "updated_at") VALUES
	(1, 'Agent', true, '2026-06-16 00:35:08.783214+00', '2026-06-16 16:35:03.326605+00'),
	(2, 'Chef de service', true, '2026-06-16 00:35:08.783214+00', '2026-06-16 16:35:03.326605+00'),
	(3, 'Gestionnaire ESR', true, '2026-06-16 00:35:08.783214+00', '2026-06-16 16:35:03.326605+00'),
	(4, 'Administrateur ESR', true, '2026-06-16 00:35:08.783214+00', '2026-06-16 16:35:03.326605+00');


--
-- Data for Name: grades; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."grades" ("id_grade", "libelle_grade", "age_retraite", "cotisation_annuelle", "actif", "created_at", "updated_at") VALUES
	(3, 'D1', 60, 600000.00, true, '2026-06-16 14:45:16.181656+00', NULL),
	(4, 'D2', 60, 600000.00, true, '2026-06-16 14:45:16.181656+00', NULL),
	(5, 'C1', 60, 600000.00, true, '2026-06-16 14:45:16.181656+00', NULL),
	(6, 'C2', 60, 660000.00, true, '2026-06-16 14:45:16.181656+00', NULL),
	(7, 'B1', 60, 600000.00, true, '2026-06-16 14:45:16.181656+00', NULL),
	(8, 'B3', 60, 600000.00, true, '2026-06-16 14:45:16.181656+00', NULL),
	(10, 'A4', 65, 600000.00, true, '2026-06-16 14:45:16.181656+00', NULL),
	(11, 'A5', 65, 600000.00, true, '2026-06-16 14:45:16.181656+00', NULL),
	(12, 'A6', 65, 600000.00, true, '2026-06-16 14:45:16.181656+00', NULL),
	(13, 'A7', 65, 600000.00, true, '2026-06-16 14:45:16.181656+00', NULL),
	(1, 'GRADE_TEST_60', 60, 600000.00, false, '2026-06-16 00:35:08.783214+00', '2026-06-16 14:48:02.265224+00'),
	(2, 'GRADE_TEST_65', 65, 600000.00, false, '2026-06-16 00:35:08.783214+00', '2026-06-16 14:48:02.265224+00'),
	(9, 'A3', 60, 600000.00, true, '2026-06-16 14:45:16.181656+00', '2026-06-17 08:42:47.483937+00');


--
-- Data for Name: periodes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."periodes" ("periode", "annee", "trimestre", "statut", "date_cloture", "cloture_par", "created_at", "updated_at", "date_ouverture", "date_cloture_prevue", "date_cloture_effective") VALUES
	('2026T1', 2026, 1, 'CLOTUREE', '2026-08-11 22:36:37.059689+00', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:27:15.258079+00', '2026-08-11 22:36:37.059689+00', '2026-01-01', '2026-03-31', '2026-08-11'),
	('2026T2', 2026, 2, 'CLOTUREE', '2026-08-11 22:38:33.31017+00', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:36:37.059689+00', '2026-08-11 22:38:33.31017+00', '2026-04-01', '2026-06-30', '2026-08-11'),
	('2026T3', 2026, 3, 'CLOTUREE', '2026-08-11 22:46:16.02795+00', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:38:33.31017+00', '2026-08-11 22:46:16.02795+00', '2026-07-01', '2026-09-30', '2026-08-11'),
	('2026T4', 2026, 4, 'OUVERTE', NULL, NULL, '2026-08-11 22:46:16.02795+00', '2026-08-11 22:46:16.02795+00', '2026-10-01', '2026-12-31', NULL);


--
-- Data for Name: historique_actuariel_esr; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."historique_actuariel_esr" ("id_historique", "id_adherent", "periode", "capital_acquis", "provision_mathematique", "taux_technique", "date_valeur", "date_cloture", "version_calc", "created_at") VALUES
	(57, 15, '2026T3', 308600.00, 311265.52, 3.50000000, '2026-09-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:46:16.02795+00'),
	(58, 14, '2026T3', 153700.00, 155027.58, 3.50000000, '2026-09-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:46:16.02795+00'),
	(59, 18, '2026T3', 0.00, 0.00, 3.50000000, '2026-09-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:46:16.02795+00'),
	(60, 19, '2026T3', 0.00, 0.00, 3.50000000, '2026-09-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:46:16.02795+00'),
	(61, 21, '2026T3', 46600.00, 47002.50, 3.50000000, '2026-09-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:46:16.02795+00'),
	(62, 22, '2026T3', 278000.00, 280401.21, 3.50000000, '2026-09-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:46:16.02795+00'),
	(63, 20, '2026T3', 0.00, 0.00, 3.50000000, '2026-09-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:46:16.02795+00'),
	(64, 23, '2026T3', 0.00, 0.00, 3.50000000, '2026-09-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:46:16.02795+00'),
	(38, 6, '2026T1', 66700.00, 67276.12, 3.50000000, '2026-03-31', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:36:37.059689+00'),
	(39, 15, '2026T1', 0.00, 0.00, 3.50000000, '2026-03-31', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:36:37.059689+00'),
	(40, 14, '2026T1', 0.00, 0.00, 3.50000000, '2026-03-31', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:36:37.059689+00'),
	(41, 18, '2026T1', 0.00, 0.00, 3.50000000, '2026-03-31', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:36:37.059689+00'),
	(42, 19, '2026T1', 0.00, 0.00, 3.50000000, '2026-03-31', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:36:37.059689+00'),
	(43, 21, '2026T1', 0.00, 0.00, 3.50000000, '2026-03-31', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:36:37.059689+00'),
	(44, 22, '2026T1', 0.00, 0.00, 3.50000000, '2026-03-31', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:36:37.059689+00'),
	(45, 20, '2026T1', 0.00, 0.00, 3.50000000, '2026-03-31', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:36:37.059689+00'),
	(46, 23, '2026T1', 0.00, 0.00, 3.50000000, '2026-03-31', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:36:37.059689+00'),
	(47, 6, '2026T2', 133400.00, 135133.33, 3.50000000, '2026-06-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:38:33.31017+00'),
	(48, 15, '2026T2', 0.00, 0.00, 3.50000000, '2026-06-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:38:33.31017+00'),
	(49, 14, '2026T2', 0.00, 0.00, 3.50000000, '2026-06-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:38:33.31017+00'),
	(50, 18, '2026T2', 0.00, 0.00, 3.50000000, '2026-06-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:38:33.31017+00'),
	(51, 19, '2026T2', 0.00, 0.00, 3.50000000, '2026-06-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:38:33.31017+00'),
	(52, 21, '2026T2', 0.00, 0.00, 3.50000000, '2026-06-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:38:33.31017+00'),
	(53, 22, '2026T2', 0.00, 0.00, 3.50000000, '2026-06-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:38:33.31017+00'),
	(54, 20, '2026T2', 0.00, 0.00, 3.50000000, '2026-06-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:38:33.31017+00'),
	(55, 23, '2026T2', 0.00, 0.00, 3.50000000, '2026-06-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:38:33.31017+00'),
	(56, 6, '2026T3', 200100.00, 203576.65, 3.50000000, '2026-09-30', '2026-08-11', 'ESR-PM-2|2024-01-01', '2026-08-11 22:46:16.02795+00');


--
-- Data for Name: historique_cotisations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: historique_cotisations_esr; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."historique_cotisations_esr" ("id_historique", "id_adherent", "periode", "montant_cotise", "interets_credites", "capital_cumule", "pm", "valeur_rachat", "date_valeur", "version_calc", "cree_par", "created_at") VALUES
	(44, 22, '2026T1', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-03-31', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:36:37.059689+00'),
	(45, 20, '2026T1', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-03-31', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:36:37.059689+00'),
	(46, 23, '2026T1', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-03-31', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:36:37.059689+00'),
	(47, 6, '2026T2', 66700.00, 1733.33, 133400.00, 135133.33, 121957.83, '2026-06-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:38:33.31017+00'),
	(48, 15, '2026T2', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-06-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:38:33.31017+00'),
	(49, 14, '2026T2', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-06-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:38:33.31017+00'),
	(50, 18, '2026T2', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-06-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:38:33.31017+00'),
	(51, 19, '2026T2', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-06-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:38:33.31017+00'),
	(52, 21, '2026T2', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-06-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:38:33.31017+00'),
	(53, 22, '2026T2', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-06-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:38:33.31017+00'),
	(54, 20, '2026T2', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-06-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:38:33.31017+00'),
	(55, 23, '2026T2', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-06-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:38:33.31017+00'),
	(38, 6, '2026T1', 66700.00, 576.12, 66700.00, 67276.12, 60716.70, '2026-03-31', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:36:37.059689+00'),
	(39, 15, '2026T1', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-03-31', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:36:37.059689+00'),
	(40, 14, '2026T1', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-03-31', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:36:37.059689+00'),
	(41, 18, '2026T1', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-03-31', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:36:37.059689+00'),
	(42, 19, '2026T1', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-03-31', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:36:37.059689+00'),
	(43, 21, '2026T1', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-03-31', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:36:37.059689+00'),
	(56, 6, '2026T3', 66700.00, 3476.65, 200100.00, 203576.65, 183727.93, '2026-09-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:46:16.02795+00'),
	(57, 15, '2026T3', 308600.00, 2665.52, 308600.00, 311265.52, 280917.13, '2026-09-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:46:16.02795+00'),
	(58, 14, '2026T3', 153700.00, 1327.58, 153700.00, 155027.58, 139912.39, '2026-09-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:46:16.02795+00'),
	(59, 18, '2026T3', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-09-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:46:16.02795+00'),
	(60, 19, '2026T3', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-09-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:46:16.02795+00'),
	(61, 21, '2026T3', 46600.00, 402.50, 46600.00, 47002.50, 42419.76, '2026-09-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:46:16.02795+00'),
	(62, 22, '2026T3', 278000.00, 2401.21, 278000.00, 280401.21, 253062.09, '2026-09-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:46:16.02795+00'),
	(63, 20, '2026T3', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-09-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:46:16.02795+00'),
	(64, 23, '2026T3', 0.00, 0.00, 0.00, 0.00, 0.00, '2026-09-30', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:46:16.02795+00');


--
-- Data for Name: precomptes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."precomptes" ("id_precompte", "matricule", "periode", "montant_depart", "montant_retour", "annee", "trimestre", "statut_precompte", "date_generation", "date_retour", "id_cotisation_detail", "created_at", "updated_at", "montant_cotisation_brut", "montant_credit_spontane") VALUES
	(65, '11816P', '2026T1', 66700.00, 66700.00, 2026, 1, 'ENCAISSE', '2026-08-11', '2026-03-31', 84, '2026-08-11 22:28:29.860259+00', '2026-08-11 22:36:01.697095+00', 66700.00, 0.00),
	(66, '11816P', '2026T2', 66700.00, 66700.00, 2026, 2, 'ENCAISSE', '2026-08-11', '2026-06-30', 85, '2026-08-11 22:36:51.630177+00', '2026-08-11 22:38:02.489875+00', 66700.00, 0.00),
	(67, '08014P', '2026T3', 46600.00, 46600.00, 2026, 3, 'ENCAISSE', '2026-08-11', '2026-09-30', 86, '2026-08-11 22:38:53.263635+00', '2026-08-11 22:41:26.43812+00', 46600.00, 0.00),
	(68, '00704P', '2026T3', 278000.00, 278000.00, 2026, 3, 'ENCAISSE', '2026-08-11', '2026-09-30', 87, '2026-08-11 22:38:53.813567+00', '2026-08-11 22:41:27.511269+00', 278000.00, 0.00),
	(69, '231830V', '2026T3', 308600.00, 308600.00, 2026, 3, 'ENCAISSE', '2026-08-11', '2026-09-30', 88, '2026-08-11 22:38:54.363639+00', '2026-08-11 22:41:27.917427+00', 308600.00, 0.00),
	(71, '308628U', '2026T3', 153700.00, 153700.00, 2026, 3, 'ENCAISSE', '2026-08-11', '2026-09-30', 90, '2026-08-11 22:38:55.478013+00', '2026-08-11 22:41:28.714828+00', 153700.00, 0.00),
	(70, '11816P', '2026T3', 66700.00, 66700.00, 2026, 3, 'REGULARISE', '2026-08-11', '2026-08-11', 89, '2026-08-11 22:38:54.906882+00', '2026-08-11 22:45:41.441359+00', 66700.00, 0.00),
	(72, '08014P', '2026T4', 46600.00, 0.00, 2026, 4, 'GENERE', '2026-08-11', NULL, 93, '2026-08-11 23:02:56.254894+00', '2026-08-11 23:02:56.383236+00', 46600.00, 0.00),
	(73, '00704P', '2026T4', 278000.00, 0.00, 2026, 4, 'GENERE', '2026-08-11', NULL, 94, '2026-08-11 23:02:56.802075+00', '2026-08-11 23:02:56.936137+00', 278000.00, 0.00),
	(74, '231830V', '2026T4', 308600.00, 0.00, 2026, 4, 'GENERE', '2026-08-11', NULL, 95, '2026-08-11 23:02:57.33325+00', '2026-08-11 23:02:57.467477+00', 308600.00, 0.00),
	(75, '349132B', '2026T4', 288900.00, 0.00, 2026, 4, 'GENERE', '2026-08-11', NULL, 96, '2026-08-11 23:02:57.874215+00', '2026-08-11 23:02:58.008061+00', 288900.00, 0.00),
	(76, '03906P', '2026T4', 93700.00, 0.00, 2026, 4, 'GENERE', '2026-08-11', NULL, 97, '2026-08-11 23:02:58.40523+00', '2026-08-11 23:02:58.539325+00', 93700.00, 0.00),
	(77, '06408P', '2026T4', 62800.00, 0.00, 2026, 4, 'GENERE', '2026-08-11', NULL, 98, '2026-08-11 23:02:58.945676+00', '2026-08-11 23:02:59.089139+00', 62800.00, 0.00),
	(78, '11816P', '2026T4', 0.00, 0.00, 2026, 4, 'ENCAISSE', '2026-08-11', '2026-12-31', 99, '2026-08-11 23:02:59.485511+00', '2026-08-11 23:02:59.61301+00', 66700.00, 66700.00),
	(79, '308628U', '2026T4', 153700.00, 0.00, 2026, 4, 'GENERE', '2026-08-11', NULL, 100, '2026-08-11 23:03:00.043696+00', '2026-08-11 23:03:00.174175+00', 153700.00, 0.00),
	(80, '06708P', '2026T4', 109300.00, 0.00, 2026, 4, 'GENERE', '2026-08-11', NULL, 101, '2026-08-11 23:03:00.569784+00', '2026-08-11 23:03:00.699345+00', 109300.00, 0.00);


--
-- Data for Name: imputations_paiements_spontanes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."imputations_paiements_spontanes" ("id_imputation", "id_cotisation_detail_spontanee", "id_precompte", "montant_impute", "created_at") VALUES
	(1, 92, 78, 66700.00, '2026-08-11 23:02:59.61301+00');


--
-- Data for Name: info_cotisations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."info_cotisations" ("id_info_cotisation", "id_adherent", "grade", "id_grade", "date_naissance", "date_retraite", "age_retraite", "cotisation_annuelle", "date_precompte", "date_effet", "nb_trimestre", "cotisation_es", "info_actif", "taux_gar", "frais_rente", "taux_rachat", "created_at", "updated_at") VALUES
	(6, 6, 'A3', 9, '1990-12-26', '2050-12-31', 60.00, 600000.00, '2026-03-31', '2026-06-30', 100, 66700.00, true, 3.5000, 5.0000, 5.0000, '2026-07-13 01:18:02.386559+00', '2026-08-11 21:03:29.23612+00'),
	(9, 13, 'A4', 10, '1976-02-01', '2041-12-31', 65.00, 600000.00, '2026-09-30', '2026-12-31', 62, 116200.00, false, 3.5000, 5.0000, 5.0000, '2026-07-13 22:52:51.122052+00', '2026-08-11 21:03:29.730172+00'),
	(10, 14, 'A3', 9, '1979-11-19', '2039-12-31', 60.00, 600000.00, '2026-09-30', '2026-12-31', 54, 153700.00, true, 3.5000, 5.0000, 5.0000, '2026-07-13 23:26:25.32902+00', '2026-08-11 21:03:29.932212+00'),
	(11, 15, 'A3', 9, '1973-10-24', '2033-12-31', 60.00, 600000.00, '2026-09-30', '2026-12-31', 30, 308600.00, true, 3.5000, 5.0000, 5.0000, '2026-07-14 14:46:51.667757+00', '2026-08-11 21:03:30.098319+00'),
	(12, 16, 'B3', 8, '1973-03-04', '2033-12-31', 60.00, 600000.00, '2026-12-31', '2027-03-31', 29, 320700.00, false, 3.5000, 5.0000, 5.0000, '2026-07-20 09:17:59.717539+00', '2026-08-11 21:03:30.246889+00'),
	(14, 18, 'A4', 10, '1979-12-16', '2044-12-31', 65.00, 600000.00, '2026-12-31', '2027-03-31', 73, 93700.00, true, 3.5000, 5.0000, 5.0000, '2026-07-20 14:14:06.918+00', '2026-08-11 21:03:30.394843+00'),
	(15, 19, 'A4', 10, '1985-11-27', '2050-12-31', 65.00, 600000.00, '2026-12-31', '2027-03-31', 97, 62800.00, true, 3.5000, 5.0000, 5.0000, '2026-07-20 14:15:19.075+00', '2026-08-11 21:03:30.521341+00'),
	(16, 20, 'A4', 10, '1977-05-24', '2042-12-31', 65.00, 600000.00, '2026-12-31', '2027-03-31', 65, 109300.00, true, 3.5000, 5.0000, 5.0000, '2026-07-20 15:27:54.3632+00', '2026-08-11 21:03:30.644362+00'),
	(17, 21, 'A4', 10, '1990-04-13', '2055-12-31', 65.00, 600000.00, '2026-09-30', '2026-12-31', 118, 46600.00, true, 3.5000, 5.0000, 5.0000, '2026-07-20 15:40:46.777+00', '2026-08-11 21:03:30.777356+00'),
	(18, 22, 'A6', 12, '1968-03-15', '2033-12-31', 65.00, 600000.00, '2026-09-30', '2026-12-31', 30, 278000.00, true, 3.5000, 5.0000, 5.0000, '2026-07-20 16:05:53.376+00', '2026-08-11 21:03:30.914695+00'),
	(19, 23, 'A4', 10, '1968-01-16', '2033-12-31', 65.00, 600000.00, '2026-12-31', '2027-03-31', 29, 288900.00, true, 3.5000, 5.0000, 5.0000, '2026-08-11 16:47:23.477+00', '2026-08-11 21:03:31.043691+00');


--
-- Data for Name: liens_beneficiaires; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."liens_beneficiaires" ("id_lien_beneficiaire", "libelle_lien", "actif", "created_at", "updated_at") VALUES
	(4, 'Conjoint(e)', true, '2026-06-16 16:35:03.326605+00', NULL),
	(3, 'Enfant', true, '2026-06-16 00:17:47.79451+00', '2026-06-16 16:35:03.326605+00'),
	(6, 'Parent', true, '2026-06-16 16:35:03.326605+00', NULL);


--
-- Data for Name: mortalite; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."mortalite" ("age_mort", "lx", "dx", "qx") VALUES
	(1, 997151.000000, 385, 0.0003861000),
	(2, 996766.000000, 296, 0.0002969604),
	(3, 996470.000000, 251, 0.0002518892),
	(4, 996219.000000, 215, 0.0002158160),
	(5, 996004.000000, 196, 0.0001967864),
	(6, 995808.000000, 177, 0.0001777451),
	(7, 995631.000000, 166, 0.0001667284),
	(8, 995465.000000, 167, 0.0001677608),
	(9, 995298.000000, 156, 0.0001567370),
	(10, 995142.000000, 167, 0.0001678152),
	(11, 994975.000000, 166, 0.0001668384),
	(12, 994809.000000, 196, 0.0001970227),
	(13, 994613.000000, 233, 0.0002342620),
	(14, 994380.000000, 287, 0.0002886221),
	(15, 994093.000000, 377, 0.0003792402),
	(16, 993716.000000, 478, 0.0004810227),
	(17, 993238.000000, 594, 0.0005980440),
	(18, 992644.000000, 703, 0.0007082096),
	(19, 991941.000000, 783, 0.0007893615),
	(20, 991158.000000, 829, 0.0008363954),
	(21, 990329.000000, 859, 0.0008673885),
	(22, 989470.000000, 876, 0.0008853224),
	(23, 988594.000000, 893, 0.0009033031),
	(24, 987701.000000, 911, 0.0009223439),
	(25, 986790.000000, 929, 0.0009414364),
	(26, 985861.000000, 955, 0.0009686964),
	(27, 984906.000000, 980, 0.0009950188),
	(28, 983926.000000, 1006, 0.0010224346),
	(29, 982920.000000, 1033, 0.0010509502),
	(30, 981887.000000, 1056, 0.0010754802),
	(31, 980831.000000, 1077, 0.0010980485),
	(32, 979754.000000, 1114, 0.0011370201),
	(33, 978640.000000, 1165, 0.0011904275),
	(34, 977475.000000, 1235, 0.0012634594),
	(35, 976240.000000, 1306, 0.0013377858),
	(36, 974934.000000, 1389, 0.0014247118),
	(37, 973545.000000, 1476, 0.0015161087),
	(38, 972069.000000, 1577, 0.0016223128),
	(39, 970492.000000, 1696, 0.0017475672),
	(40, 968796.000000, 1831, 0.0018899748),
	(41, 966965.000000, 1995, 0.0020631564),
	(42, 964970.000000, 2162, 0.0022404842),
	(43, 962808.000000, 2344, 0.0024345456),
	(44, 960464.000000, 2534, 0.0026383082),
	(45, 957930.000000, 2733, 0.0028530268),
	(46, 955197.000000, 2929, 0.0030663832),
	(47, 952268.000000, 3115, 0.0032711380),
	(48, 949153.000000, 3294, 0.0034704626),
	(49, 945859.000000, 3472, 0.0036707374),
	(50, 942387.000000, 3647, 0.0038699600),
	(51, 938740.000000, 3837, 0.0040873937),
	(52, 934903.000000, 4035, 0.0043159558),
	(53, 930868.000000, 4244, 0.0045591856),
	(54, 926624.000000, 4465, 0.0048185672),
	(55, 922159.000000, 4691, 0.0050869752),
	(56, 917468.000000, 4917, 0.0053593150),
	(57, 912551.000000, 5222, 0.0057224199),
	(58, 907329.000000, 5569, 0.0061377957),
	(59, 901760.000000, 6003, 0.0066569819),
	(60, 895757.000000, 6445, 0.0071950317),
	(61, 889312.000000, 6971, 0.0078386438),
	(62, 882341.000000, 7506, 0.0085069151),
	(63, 874835.000000, 8050, 0.0092017352),
	(64, 866785.000000, 8680, 0.0100140173),
	(65, 858105.000000, 9315, 0.0108553149),
	(66, 848790.000000, 9965, 0.0117402420),
	(67, 838825.000000, 10561, 0.0125902304),
	(68, 828264.000000, 11188, 0.0135077705),
	(69, 817076.000000, 11841, 0.0144919200),
	(70, 805235.000000, 12529, 0.0155594330),
	(71, 792706.000000, 13249, 0.0167136366),
	(72, 779457.000000, 13982, 0.0179381287),
	(73, 765475.000000, 14735, 0.0192494856),
	(74, 750740.000000, 15509, 0.0206582838),
	(75, 735231.000000, 16323, 0.0222011857),
	(76, 718908.000000, 17181, 0.0238987464),
	(77, 701727.000000, 18072, 0.0257536050),
	(78, 683655.000000, 19016, 0.0278151992),
	(79, 664639.000000, 20057, 0.0301772842),
	(80, 644582.000000, 21214, 0.0329112510),
	(81, 623368.000000, 22463, 0.0360348943),
	(82, 600905.000000, 23734, 0.0394970919),
	(83, 577171.000000, 24943, 0.0432159620),
	(84, 552228.000000, 26026, 0.0471290844),
	(85, 526202.000000, 26993, 0.0512977906),
	(86, 499209.000000, 27844, 0.0557762380),
	(87, 471365.000000, 28542, 0.0605518017),
	(88, 442823.000000, 29054, 0.0656108648),
	(89, 413769.000000, 29338, 0.0709042968),
	(90, 384431.000000, 29374, 0.0764090305),
	(91, 355057.000000, 30782, 0.0866959390),
	(92, 324275.000000, 33753, 0.1040875800),
	(93, 290522.000000, 36235, 0.1247237731),
	(94, 254287.000000, 37913, 0.1490953136),
	(95, 216374.000000, 38456, 0.1777293020),
	(96, 177918.000000, 37567, 0.2111478321),
	(97, 140351.000000, 35063, 0.2498236564),
	(98, 105288.000000, 30973, 0.2941740749),
	(99, 74315.000000, 25597, 0.3444392115),
	(100, 48718.000000, 19514, 0.4005501047),
	(101, 29204.000000, 13498, 0.4621969593),
	(102, 15706.000000, 8300, 0.5284604610),
	(103, 7406.000000, 4428, 0.5978935998),
	(104, 2978.000000, 1991, 0.6685695097),
	(105, 987.000000, 987, 1.0000000000),
	(106, 0.000000, 0, 0.0000000000);


--
-- Data for Name: paiements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: param_repartitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."param_repartitions" ("id_param_repartition", "date_effet", "taux_sante", "taux_retraite", "taux_actif", "created_at", "updated_at") VALUES
	(2, '2025-01-01', 25.0000, 75.0000, false, '2026-06-16 15:09:13.214103+00', '2026-06-17 17:19:25.679734+00'),
	(1, '2026-06-16', 100.0000, 0.0000, true, '2026-06-16 00:14:51.272254+00', '2026-06-17 17:19:29.260191+00');


--
-- Data for Name: parametre_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."parametre_versions" ("id_parametre_version", "code", "libelle", "valeur_num", "valeur_txt", "date_deb", "date_fin", "statut", "created_at", "updated_at") VALUES
	(1, 'TAUX_GAR', 'Taux technique garanti ESR', 3.500000, NULL, '2026-06-16', NULL, true, '2026-06-16 00:14:51.272254+00', NULL),
	(2, 'FRAIS_RENTE', 'Frais de gestion sur rente', 5.000000, NULL, '2026-06-16', NULL, true, '2026-06-16 00:14:51.272254+00', NULL),
	(3, 'TAUX_RACHAT', 'Pénalité de rachat', 5.000000, NULL, '2026-06-16', NULL, true, '2026-06-16 00:14:51.272254+00', NULL),
	(4, 'AGE_MAX', 'Âge maximum table de mortalité', 106.000000, NULL, '2026-06-16', NULL, true, '2026-06-16 00:14:51.272254+00', NULL),
	(5, 'TABLE_MORT', 'Table de mortalité utilisée', NULL, 'CIMA-F', '2026-06-16', NULL, true, '2026-06-16 00:14:51.272254+00', NULL);


--
-- Data for Name: parametres_generaux; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."parametres_generaux" ("id_parametre_generaux", "libelle", "valeur", "chemin_dossier", "created_at", "updated_at", "code", "description", "actif", "date_debut", "date_fin") VALUES
	(1, 'Taux technique garanti', '3.5', NULL, '2026-06-16 14:20:28.317786+00', NULL, 'TAUX_GAR', 'Taux technique annuel garanti en pourcentage', true, '2024-01-01', NULL),
	(2, 'Frais de gestion sur rente', '5', NULL, '2026-06-16 14:20:28.317786+00', NULL, 'FRAIS_RENTE', 'Frais de gestion sur rente en pourcentage', true, '2024-01-01', NULL),
	(3, 'Pénalité de rachat total', '5', NULL, '2026-06-16 14:20:28.317786+00', NULL, 'TAUX_RACHAT', 'Pénalité de rachat total en pourcentage', true, '2024-01-01', NULL),
	(5, 'Table de mortalité réglementaire', 'CIMA-F', NULL, '2026-06-16 14:20:28.317786+00', NULL, 'TABLE_MORT', 'Table de mortalité réglementaire utilisée', true, '2024-01-01', NULL),
	(6, 'Périodicité des cotisations', 'TRIMESTRIELLE', NULL, '2026-06-16 14:20:28.317786+00', NULL, 'PERIODICITE', 'Périodicité normale des cotisations ESR', true, '2024-01-01', NULL),
	(7, 'Mode calcul date d''effet', 'LENDEMAIN_PRECOMPTE', NULL, '2026-06-16 14:20:28.317786+00', NULL, 'MODE_DATE_EFFET', 'Règle de calcul de la date d''effet du contrat', true, '2024-01-01', NULL),
	(4, 'Âge maximum table mortalité', '106', NULL, '2026-06-16 14:20:28.317786+00', '2026-06-18 21:09:49.587529+00', 'AGE_MAX', 'Âge maximum de la table de mortalité', true, '2024-01-01', NULL),
	(8, 'Frais de gestion sur rachat', '5', NULL, '2026-07-29 11:28:43.328409+00', NULL, 'FRAIS_GESTION_RACHAT', 'Valeur provisoire en pourcentage, distincte de la pénalité de rachat.', true, '2024-01-01', NULL),
	(9, 'Part versée en cas de décès avant retraite', '95', NULL, '2026-07-29 11:28:43.328409+00', NULL, 'TAUX_DECES_AVANT_RETRAITE', 'Valeur provisoire en pourcentage de la valeur acquise du compte ESR.', true, '2024-01-01', NULL),
	(10, 'Part versée en cas d''invalidité totale avant retraite', '95', NULL, '2026-07-29 11:28:43.328409+00', NULL, 'TAUX_INVALIDITE_AVANT_RETRAITE', 'Valeur provisoire en pourcentage de la valeur acquise du compte ESR.', true, '2024-01-01', NULL),
	(11, 'Part de la cotisation maladie financée à la retraite', '100', NULL, '2026-07-29 11:28:43.328409+00', NULL, 'TAUX_COUVERTURE_RETRAITE', 'Valeur provisoire, distincte du taux de remboursement des soins.', true, '2024-01-01', NULL),
	(12, 'Taux de remboursement des soins', '80', NULL, '2026-07-29 11:28:43.328409+00', NULL, 'TAUX_REMBOURSEMENT_SOINS', 'Valeur provisoire ; ne pas confondre avec le financement de la cotisation.', true, '2024-01-01', NULL),
	(13, 'Part du capital restant versée en cas de décès pendant rente', '80', NULL, '2026-07-29 11:28:43.328409+00', NULL, 'TAUX_DECES_PENDANT_RENTE', 'Valeur provisoire en pourcentage du capital constitutif restant dû.', true, '2024-01-01', NULL),
	(14, 'Ancienneté minimale avant rachat total', '2', NULL, '2026-07-29 11:28:43.328409+00', NULL, 'DELAI_MIN_RACHAT_ANNEES', 'Valeur provisoire exprimée en années complètes de cotisation.', true, '2024-01-01', NULL);


--
-- Data for Name: prestations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."prestations" ("id_prestation", "id_adherent", "type_prestation", "date_evenement", "date_demande", "statut_prestation", "montant_du", "montant_paye", "date_validation", "date_paiement", "observation", "created_at", "updated_at") VALUES
	(2, 21, 'DECES', NULL, '2026-08-11', 'PAYE', 573706.15, 0.00, '2026-08-11', '2026-08-11', NULL, '2026-08-11 17:24:15.795827+00', '2026-08-11 17:26:17.822645+00'),
	(3, 21, 'RETRAITE', NULL, '2026-08-11', 'VALIDE', 603901.21, 0.00, '2026-08-11', NULL, NULL, '2026-08-11 17:26:56.684556+00', '2026-08-11 17:27:18.120671+00');


--
-- Data for Name: pieces_justificatives; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profils; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profils" ("id_profil", "code_profil", "lib_profil", "liste_fonctions", "etat", "created_at", "updated_at") VALUES
	(1, 'ADHERENT', 'Adhérent', 'CONSULTER_COMPTE,CONSULTER_RELEVES,CONSULTER_AVIS', 1, '2026-06-16 00:23:43.858284+00', NULL),
	(2, 'GESTIONNAIRE', 'Gestionnaire', 'GERER_ADHERENTS,GERER_COTISATIONS,GERER_PRECOMPTES,GERER_PRESTATIONS,CONSULTER_REPORTING', 1, '2026-06-16 00:23:43.858284+00', NULL),
	(3, 'ADMINISTRATEUR', 'Administrateur', 'TOUT', 1, '2026-06-16 00:23:43.858284+00', NULL);


--
-- Data for Name: provisions_maths; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rachats; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rachat_evenements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rentes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rente_versements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: resumes_cloture_esr; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."resumes_cloture_esr" ("id_resume", "periode", "nb_adherents", "capital_global", "pm_totale", "date_cloture", "version_calc", "cloture_par", "created_at") VALUES
	(5, '2026T1', 9, 66700.00, 67276.12, '2026-08-11', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:36:37.059689+00'),
	(6, '2026T2', 9, 133400.00, 135133.33, '2026-08-11', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:38:33.31017+00'),
	(7, '2026T3', 9, 987000.00, 997273.46, '2026-08-11', 'ESR-PM-2|2024-01-01', '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '2026-08-11 22:46:16.02795+00');


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."roles" ("id_role", "code_role", "libelle_role", "actif", "created_at", "updated_at") VALUES
	(1, 'ADHERENT_READ', 'Consulter son compte adhérent', true, '2026-06-16 00:23:43.858284+00', NULL),
	(2, 'ADHERENT_CREATE', 'Créer un adhérent', true, '2026-06-16 00:23:43.858284+00', NULL),
	(3, 'ADHERENT_UPDATE', 'Modifier un adhérent', true, '2026-06-16 00:23:43.858284+00', NULL),
	(4, 'BENEFICIAIRE_MANAGE', 'Gérer les bénéficiaires', true, '2026-06-16 00:23:43.858284+00', NULL),
	(5, 'COTISATION_GENERATE', 'Générer les cotisations', true, '2026-06-16 00:23:43.858284+00', NULL),
	(6, 'COTISATION_VALIDATE', 'Valider les cotisations', true, '2026-06-16 00:23:43.858284+00', NULL),
	(7, 'PRECOMPTE_MANAGE', 'Gérer les précomptes', true, '2026-06-16 00:23:43.858284+00', NULL),
	(8, 'PAIEMENT_MANAGE', 'Gérer les paiements', true, '2026-06-16 00:23:43.858284+00', NULL),
	(9, 'COMPTE_ESR_READ', 'Consulter les comptes ESR', true, '2026-06-16 00:23:43.858284+00', NULL),
	(10, 'ACTUARIEL_CALCULATE', 'Exécuter les calculs actuariels', true, '2026-06-16 00:23:43.858284+00', NULL),
	(11, 'PRESTATION_MANAGE', 'Gérer les prestations', true, '2026-06-16 00:23:43.858284+00', NULL),
	(12, 'RENTE_MANAGE', 'Gérer les rentes', true, '2026-06-16 00:23:43.858284+00', NULL),
	(13, 'REPORTING_EXPORT', 'Exporter les états', true, '2026-06-16 00:23:43.858284+00', NULL),
	(14, 'PARAMETRE_MANAGE', 'Gérer les paramètres techniques', true, '2026-06-16 00:23:43.858284+00', NULL),
	(15, 'USER_MANAGE', 'Gérer les utilisateurs', true, '2026-06-16 00:23:43.858284+00', NULL),
	(16, 'AUDIT_READ', 'Consulter le journal d’audit', true, '2026-06-16 00:23:43.858284+00', NULL);


--
-- Data for Name: situations_matrimoniales; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."situations_matrimoniales" ("id_situation_matrimoniale", "libelle_situation", "actif", "created_at", "updated_at") VALUES
	(1, 'Célibataire', true, '2026-06-16 00:14:51.272254+00', '2026-06-16 16:35:03.326605+00'),
	(2, 'Marié(e)', true, '2026-06-16 00:14:51.272254+00', '2026-06-16 16:35:03.326605+00'),
	(3, 'Divorcé(e)', true, '2026-06-16 00:14:51.272254+00', '2026-06-16 16:35:03.326605+00'),
	(8, 'Veuf(ve)', true, '2026-06-16 16:35:03.326605+00', NULL);


--
-- Data for Name: utilisateurs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."utilisateurs" ("id_utilisateur", "auth_user_id", "matricule", "email", "telephone", "user_actif", "profil", "id_adherent", "hash_pwd", "nb_echec_con", "date_blocage", "chang_mdp", "date_der_connexion", "date_creation", "cree_par", "date_modif", "modif_par", "created_at", "updated_at") VALUES
	(6, '4ded7f7e-edd4-41ff-be54-bacdf6fff062', '395047Y', '395047y@madgi.ci', NULL, true, 'ADMINISTRATEUR', NULL, NULL, 0, NULL, true, NULL, '2026-07-12 21:40:45.42504+00', NULL, NULL, NULL, '2026-07-12 21:40:45.42504+00', NULL),
	(8, 'c86d31aa-18fd-4684-91e1-a14d455c0def', '231830V', '231830v@madgi.ci', '0153312808', true, 'ADHERENT', 15, NULL, 0, NULL, true, NULL, '2026-07-14 14:47:40.908+00', 6, NULL, NULL, '2026-07-14 14:47:40.63805+00', NULL),
	(9, '6566ad24-a484-4b1d-acbf-df762c3e2713', '308628U', '308628u@madgi.ci', '0708710354', true, 'ADHERENT', 14, NULL, 0, NULL, true, NULL, '2026-07-14 20:58:39.735+00', 6, NULL, NULL, '2026-07-14 20:58:39.501302+00', NULL),
	(7, '38b0cccf-9d3c-411c-ab2b-659f4b410273', '11816P', '11816p@madgi.ci', '0708707988', true, 'ADMINISTRATEUR', NULL, NULL, 0, NULL, true, NULL, '2026-07-13 02:04:18.476+00', NULL, '2026-08-10 17:40:58.067+00', 6, '2026-07-13 02:04:18.608515+00', '2026-08-10 17:40:58.50753+00'),
	(10, '806883cd-0c37-4706-bf06-933bb101e476', '06708P', '06708p@madgi.ci', '0708110161', true, 'ADHERENT', 20, NULL, 0, NULL, true, NULL, '2026-08-11 10:17:16.646+00', 6, NULL, NULL, '2026-08-11 10:17:16.743868+00', NULL),
	(11, 'b638a20d-2d5b-4cf8-b23e-eee08043e807', 'GESTION01', 'gestion01@madgi.ci', '0101010101', true, 'GESTIONNAIRE', NULL, NULL, 0, NULL, true, NULL, '2026-08-11 16:28:48.226+00', 6, NULL, NULL, '2026-08-11 16:28:48.660311+00', NULL);


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: adherents_id_adherent_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."adherents_id_adherent_seq"', 23, true);


--
-- Name: audit_logs_id_audit_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."audit_logs_id_audit_seq"', 78, true);


--
-- Name: beneficiaires_id_beneficiaire_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."beneficiaires_id_beneficiaire_seq"', 10, true);


--
-- Name: civilites_id_civilite_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."civilites_id_civilite_seq"', 5, true);


--
-- Name: comptes_esr_id_compte_esr_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."comptes_esr_id_compte_esr_seq"', 23, true);


--
-- Name: cotisation_details_id_cotisation_detail_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."cotisation_details_id_cotisation_detail_seq"', 101, true);


--
-- Name: cotisation_entetes_id_cotisation_entete_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."cotisation_entetes_id_cotisation_entete_seq"', 101, true);


--
-- Name: emplois_id_emploi_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."emplois_id_emploi_seq"', 8, true);


--
-- Name: fonctions_id_fonction_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."fonctions_id_fonction_seq"', 8, true);


--
-- Name: grades_id_grade_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."grades_id_grade_seq"', 14, true);


--
-- Name: historique_actuariel_esr_id_historique_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."historique_actuariel_esr_id_historique_seq"', 64, true);


--
-- Name: historique_cotisations_esr_id_historique_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."historique_cotisations_esr_id_historique_seq"', 64, true);


--
-- Name: historique_cotisations_id_historique_cotisation_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."historique_cotisations_id_historique_cotisation_seq"', 1, false);


--
-- Name: imputations_paiements_spontanes_id_imputation_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."imputations_paiements_spontanes_id_imputation_seq"', 1, true);


--
-- Name: info_cotisations_id_info_cotisation_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."info_cotisations_id_info_cotisation_seq"', 19, true);


--
-- Name: liens_beneficiaires_id_lien_beneficiaire_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."liens_beneficiaires_id_lien_beneficiaire_seq"', 6, true);


--
-- Name: paiements_id_paiement_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."paiements_id_paiement_seq"', 1, false);


--
-- Name: param_repartitions_id_param_repartition_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."param_repartitions_id_param_repartition_seq"', 2, true);


--
-- Name: parametre_versions_id_parametre_version_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."parametre_versions_id_parametre_version_seq"', 5, true);


--
-- Name: parametres_generaux_id_parametre_generaux_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."parametres_generaux_id_parametre_generaux_seq"', 14, true);


--
-- Name: pieces_justificatives_id_piece_justificative_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."pieces_justificatives_id_piece_justificative_seq"', 1, false);


--
-- Name: precomptes_id_precompte_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."precomptes_id_precompte_seq"', 80, true);


--
-- Name: prestations_id_prestation_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."prestations_id_prestation_seq"', 3, true);


--
-- Name: profils_id_profil_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."profils_id_profil_seq"', 3, true);


--
-- Name: provisions_maths_id_provision_maths_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."provisions_maths_id_provision_maths_seq"', 1, false);


--
-- Name: rachat_evenements_id_evenement_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."rachat_evenements_id_evenement_seq"', 1, false);


--
-- Name: rachats_id_rachat_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."rachats_id_rachat_seq"', 1, false);


--
-- Name: rente_versements_id_rente_versement_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."rente_versements_id_rente_versement_seq"', 4, true);


--
-- Name: rentes_id_rente_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."rentes_id_rente_seq"', 1, true);


--
-- Name: resumes_cloture_esr_id_resume_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."resumes_cloture_esr_id_resume_seq"', 7, true);


--
-- Name: roles_id_role_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."roles_id_role_seq"', 16, true);


--
-- Name: situations_matrimoniales_id_situation_matrimoniale_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."situations_matrimoniales_id_situation_matrimoniale_seq"', 9, true);


--
-- Name: user_roles_id_user_role_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."user_roles_id_user_role_seq"', 16, true);


--
-- Name: utilisateurs_id_utilisateur_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."utilisateurs_id_utilisateur_seq"', 11, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict gQsAWABRHlljctVyH89bTcC6yWEsReCczP81VSdqXyy1eq30zxYAaxJKG4vhdL6

RESET ALL;
