-- Numeros de police ESR : MADGI-ESR-AAAA-NNNNNN.
-- Le compteur est independant pour chaque annee de souscription.
create table if not exists public.compteurs_police_esr (
  annee integer primary key,
  derniere_valeur integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  constraint chk_compteurs_police_esr_annee check (annee between 1900 and 9999),
  constraint chk_compteurs_police_esr_valeur check (derniere_valeur between 0 and 999999)
);

alter table public.compteurs_police_esr enable row level security;
revoke all on table public.compteurs_police_esr from anon, authenticated;

alter table public.adherents
  add column if not exists numero_police character varying(21);

-- Attribution deterministe aux adherents existants.
with numerotation as (
  select id_adherent,
    extract(year from coalesce(date_souscription, created_at::date, current_date))::integer as annee,
    row_number() over (
      partition by extract(year from coalesce(date_souscription, created_at::date, current_date))::integer
      order by coalesce(date_souscription, created_at::date, current_date), created_at, id_adherent
    )::integer as numero
  from public.adherents
  where numero_police is null
    and coalesce(etat, '') not in ('EN_ATTENTE', 'REJETE')
)
update public.adherents a
set numero_police = 'MADGI-ESR-' || n.annee::text || '-' || lpad(n.numero::text, 6, '0')
from numerotation n
where n.id_adherent = a.id_adherent;

insert into public.compteurs_police_esr (annee, derniere_valeur)
select substring(numero_police from 11 for 4)::integer,
  max(substring(numero_police from 16)::integer)
from public.adherents
where numero_police ~ '^MADGI-ESR-[0-9]{4}-[0-9]{6}$'
group by substring(numero_police from 11 for 4)::integer
on conflict (annee) do update
set derniere_valeur = greatest(public.compteurs_police_esr.derniere_valeur, excluded.derniere_valeur),
    updated_at = now();

create or replace function public.attribuer_numero_police_esr()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_annee integer;
  v_numero integer;
begin
  if tg_op = 'UPDATE' and old.numero_police is not null then
    if new.numero_police is distinct from old.numero_police then
      raise exception 'Le numero de police est definitif et ne peut pas etre modifie';
    end if;
    return new;
  end if;

  -- Une demande en ligne ne devient un contrat qu'apres sa validation.
  if coalesce(new.etat, '') in ('EN_ATTENTE', 'REJETE') then
    new.numero_police := null;
    return new;
  end if;

  v_annee := extract(year from coalesce(new.date_souscription, current_date))::integer;
  insert into public.compteurs_police_esr (annee, derniere_valeur)
  values (v_annee, 1)
  on conflict (annee) do update
  set derniere_valeur = public.compteurs_police_esr.derniere_valeur + 1,
      updated_at = now()
  returning derniere_valeur into v_numero;

  if v_numero > 999999 then
    raise exception 'Le compteur annuel des numeros de police % est epuise', v_annee;
  end if;

  new.numero_police := 'MADGI-ESR-' || v_annee::text || '-' || lpad(v_numero::text, 6, '0');
  return new;
end;
$$;

drop trigger if exists trg_attribuer_numero_police_esr on public.adherents;
create trigger trg_attribuer_numero_police_esr
before insert or update of numero_police, etat on public.adherents
for each row execute function public.attribuer_numero_police_esr();

drop trigger if exists trg_interdire_modification_numero_police_esr on public.adherents;
alter table public.adherents drop constraint if exists chk_adherents_numero_police;
alter table public.adherents add constraint chk_adherents_numero_police
  check (numero_police is null or numero_police ~ '^MADGI-ESR-[0-9]{4}-[0-9]{6}$');
create unique index if not exists uq_adherents_numero_police on public.adherents(numero_police);

create or replace view public.v_adherents_complets
with (security_invoker = true) as
select
  a.id_adherent, a.matricule, a.nom, a.prenoms, a.civilite,
  a.sexe, a.date_naissance, a.telephone, a.email, a.emploi,
  a.situation_matrimoniale, a.date_souscription, a.statut, a.etat,
  a.decede, a.retraite,
  ic.id_info_cotisation, ic.grade, ic.id_grade, ic.age_retraite,
  ic.date_retraite, ic.date_precompte, ic.date_effet, ic.nb_trimestre,
  ic.cotisation_annuelle, ic.cotisation_es, ic.taux_gar, ic.frais_rente,
  ic.taux_rachat,
  ce.id_compte_esr, ce.capital_acquis, ce.pm, ce.pp, ce.pu,
  ce.valeur_rachat, ce.date_calcul, ce.version_calc,
  u.id_utilisateur, u.profil, u.user_actif,
  a.direction, a.lieu_naissance, a.adresse_geographique, a.adresse_postale,
  a.numero_police
from public.adherents a
left join public.info_cotisations ic
  on ic.id_adherent = a.id_adherent and ic.info_actif = true
left join public.comptes_esr ce on ce.id_adherent = a.id_adherent
left join public.utilisateurs u on u.id_adherent = a.id_adherent;
