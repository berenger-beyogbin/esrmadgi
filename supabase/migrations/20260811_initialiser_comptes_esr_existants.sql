-- Initialise les comptes ESR manquants pour les adhérents déjà créés ou validés.
-- Les comptes existants ne sont jamais modifiés.
insert into public.comptes_esr (
  id_adherent,
  capital_acquis,
  pp,
  pu,
  pm,
  valeur_rachat,
  date_calcul,
  version_calc
)
select
  a.id_adherent,
  0,
  0,
  0,
  0,
  0,
  current_date,
  'V1'
from public.adherents a
where (
  coalesce(a.adhesion_en_ligne, false) = false
  or (a.statut = true and coalesce(a.etat, 'ACTIF') <> 'REJETE')
)
and not exists (
  select 1
  from public.comptes_esr c
  where c.id_adherent = a.id_adherent
);
