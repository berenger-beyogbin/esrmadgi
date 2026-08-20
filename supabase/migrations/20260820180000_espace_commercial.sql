-- Espace commercial : profil minimal et attribution des demandes d'adhesion.
alter table public.adherents
  add column if not exists commercial_id bigint references public.utilisateurs(id_utilisateur) on delete set null,
  add column if not exists source_adhesion varchar(30) not null default 'EN_LIGNE';

alter table public.adherents drop constraint if exists chk_adherents_source_adhesion;
alter table public.adherents add constraint chk_adherents_source_adhesion
  check (source_adhesion in ('EN_LIGNE', 'COMMERCIAL', 'BACKOFFICE'));

create index if not exists idx_adherents_commercial_id on public.adherents(commercial_id);
create index if not exists idx_adherents_commercial_statut
  on public.adherents(commercial_id, statut, etat)
  where adhesion_en_ligne = true;

insert into public.profils
  (code_profil, lib_profil, description, role_base, liste_fonctions, etat, systeme)
values
  ('COMMERCIAL', 'Commercial', 'Sensibilisation et inscription des agents a l ESR', 'GESTIONNAIRE',
   'DASHBOARD_COMMERCIAL,INSCRIPTION_ADHERENT,MES_ADHESIONS,AIDE', 1, true)
on conflict (code_profil) do update set
  lib_profil = excluded.lib_profil,
  description = excluded.description,
  role_base = excluded.role_base,
  liste_fonctions = excluded.liste_fonctions,
  etat = 1,
  systeme = true;
