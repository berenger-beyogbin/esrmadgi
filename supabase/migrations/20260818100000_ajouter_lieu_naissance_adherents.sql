alter table public.adherents
  add column if not exists lieu_naissance character varying(160);

create or replace view public.v_adherents_complets
with (security_invoker = true) as
select
  a.id_adherent,
  a.matricule,
  a.nom,
  a.prenoms,
  a.civilite,
  a.sexe,
  a.date_naissance,
  a.telephone,
  a.email,
  a.emploi,
  a.situation_matrimoniale,
  a.date_souscription,
  a.statut,
  a.etat,
  a.decede,
  a.retraite,
  ic.id_info_cotisation,
  ic.grade,
  ic.id_grade,
  ic.age_retraite,
  ic.date_retraite,
  ic.date_precompte,
  ic.date_effet,
  ic.nb_trimestre,
  ic.cotisation_annuelle,
  ic.cotisation_es,
  ic.taux_gar,
  ic.frais_rente,
  ic.taux_rachat,
  ce.id_compte_esr,
  ce.capital_acquis,
  ce.pm,
  ce.pp,
  ce.pu,
  ce.valeur_rachat,
  ce.date_calcul,
  ce.version_calc,
  u.id_utilisateur,
  u.profil,
  u.user_actif,
  a.direction,
  a.lieu_naissance
from public.adherents a
left join public.info_cotisations ic
  on ic.id_adherent = a.id_adherent and ic.info_actif = true
left join public.comptes_esr ce
  on ce.id_adherent = a.id_adherent
left join public.utilisateurs u
  on u.id_adherent = a.id_adherent;
