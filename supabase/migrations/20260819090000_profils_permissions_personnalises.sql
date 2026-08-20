-- Profils personnalisables et droits fonctionnels MADGI ESR.
alter table public.profils
  add column if not exists description varchar(240),
  add column if not exists role_base varchar(40) not null default 'GESTIONNAIRE',
  add column if not exists systeme boolean not null default false;

alter table public.profils drop constraint if exists chk_profils_role_base;
alter table public.profils add constraint chk_profils_role_base
  check (role_base in ('ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'));

alter table public.utilisateurs drop constraint if exists chk_utilisateurs_profil;

insert into public.profils (code_profil, lib_profil, description, role_base, liste_fonctions, etat, systeme)
values
  ('ADHERENT', 'Adherent', 'Acces personnel adherent', 'ADHERENT', 'DASHBOARD,COMPTES,AIDE', 1, true),
  ('GESTIONNAIRE', 'Gestionnaire', 'Operations metier courantes', 'GESTIONNAIRE', 'DASHBOARD,ADHESIONS_EN_LIGNE,ADHERENTS,PRECOMPTES,REGULARISATION_PRECOMPTES,COTISATION_SPONTANEE,COTISATIONS_LISTE,VALIDATION_PAIEMENTS,CLOTURE_PERIODE,PRESTATIONS,RACHATS,COMPTES,REPORTING,AIDE', 1, true),
  ('ADMINISTRATEUR', 'Administrateur', 'Administration complete', 'ADMINISTRATEUR', 'DASHBOARD,ADHESIONS_EN_LIGNE,ADHERENTS,PRECOMPTES,REGULARISATION_PRECOMPTES,COTISATION_SPONTANEE,COTISATIONS_LISTE,VALIDATION_PAIEMENTS,CLOTURE_PERIODE,PRESTATIONS,RACHATS,COMPTES,REPORTING,PARAMETRES,UTILISATEURS,AIDE', 1, true)
on conflict (code_profil) do update set
  role_base = excluded.role_base,
  liste_fonctions = excluded.liste_fonctions,
  systeme = true;

create index if not exists idx_profils_etat on public.profils(etat);
