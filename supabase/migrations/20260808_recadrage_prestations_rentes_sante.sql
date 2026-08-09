-- Recadrage du module Prestations : rente sante et echeances trimestrielles APS.

alter table public.rentes
  add column if not exists id_prestation bigint references public.prestations(id_prestation),
  add column if not exists date_effet date,
  add column if not exists date_retraite date,
  add column if not exists cotisation_maladie_annuelle numeric(15,2) not null default 0,
  add column if not exists montant_trimestriel numeric(15,2) not null default 0,
  add column if not exists taux_couverture numeric(7,4) not null default 100,
  add column if not exists taux_frais_gestion numeric(7,4) not null default 5,
  add column if not exists organisme_beneficiaire text not null default 'APS',
  add column if not exists reference_aps text,
  add column if not exists date_suspension date,
  add column if not exists motif_suspension text,
  add column if not exists date_extinction date,
  add column if not exists motif_extinction text,
  add column if not exists version_calcul text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uq_rente_active_par_adherent
  on public.rentes (id_adherent)
  where statut_rente in ('EN_ATTENTE', 'ACTIVE', 'SUSPENDUE');

alter table public.rente_versements
  -- Colonnes historiques conservees pour compatibilite avec l'application existante.
  add column if not exists date_versement date,
  add column if not exists montant numeric(15,2) not null default 0,
  add column if not exists annee integer,
  add column if not exists trimestre integer,
  add column if not exists periode text,
  add column if not exists date_echeance date,
  add column if not exists montant_brut numeric(15,2),
  add column if not exists frais_gestion numeric(15,2) not null default 0,
  add column if not exists montant_a_payer numeric(15,2),
  add column if not exists organisme_beneficiaire text not null default 'APS',
  add column if not exists reference_appel_aps text,
  add column if not exists date_reception_appel date,
  add column if not exists statut text not null default 'GENEREE',
  add column if not exists date_validation date,
  add column if not exists date_paiement date,
  add column if not exists reference_paiement text,
  add column if not exists mode_paiement text,
  add column if not exists piece_justificative text,
  add column if not exists observation text,
  add column if not exists capital_avant numeric(15,2),
  add column if not exists capital_apres numeric(15,2),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.rente_versements
set montant_brut = coalesce(montant_brut, montant),
    montant_a_payer = coalesce(montant_a_payer, montant),
    date_echeance = coalesce(date_echeance, date_versement),
    annee = coalesce(annee, extract(year from date_versement)::integer),
    trimestre = coalesce(trimestre, extract(quarter from date_versement)::integer),
    periode = coalesce(periode,
      extract(year from date_versement)::integer || '-T' || extract(quarter from date_versement)::integer)
where date_versement is not null;

drop index if exists public.uq_echeance_rente_trimestre;
create unique index uq_echeance_rente_trimestre
  on public.rente_versements (id_rente, annee, trimestre);

create index if not exists idx_echeances_aps_statut_periode
  on public.rente_versements (annee, trimestre, statut);

create or replace function public.verifier_echeance_rente_sante()
returns trigger language plpgsql as $$
declare
  rente record;
begin
  if new.trimestre not between 1 and 4 then
    raise exception 'Le trimestre doit etre compris entre 1 et 4';
  end if;
  select * into rente from public.rentes where id_rente = new.id_rente;
  if rente.id_rente is null then raise exception 'Rente introuvable'; end if;
  if rente.statut_rente not in ('ACTIVE', 'SUSPENDUE') then
    raise exception 'Une echeance ne peut etre creee que pour une rente active ou suspendue';
  end if;
  if rente.date_extinction is not null and new.date_echeance > rente.date_extinction then
    raise exception 'Echeance posterieure a extinction de la rente';
  end if;
  return new;
end $$;

drop trigger if exists trg_verifier_echeance_rente_sante on public.rente_versements;
create trigger trg_verifier_echeance_rente_sante
before insert or update on public.rente_versements
for each row execute function public.verifier_echeance_rente_sante();

create or replace function public.payer_echeance_aps(
  p_id_versement bigint,
  p_date_paiement date,
  p_reference_paiement text,
  p_mode_paiement text,
  p_piece_justificative text default null
) returns public.rente_versements
language plpgsql security definer set search_path = public as $$
declare
  echeance public.rente_versements%rowtype;
  rente public.rentes%rowtype;
begin
  select * into echeance from public.rente_versements
  where id_rente_versement = p_id_versement for update;
  if echeance.id_rente_versement is null then raise exception 'Echeance introuvable'; end if;
  if echeance.statut <> 'VALIDEE' then raise exception 'Seule une echeance validee peut etre payee'; end if;
  if nullif(trim(p_reference_paiement), '') is null then raise exception 'Reference de paiement obligatoire'; end if;

  select * into rente from public.rentes where id_rente = echeance.id_rente for update;
  if rente.statut_rente <> 'ACTIVE' then raise exception 'La rente doit etre active'; end if;
  if coalesce(rente.capital_restant, 0) < coalesce(echeance.montant_a_payer, echeance.montant, 0) then
    raise exception 'Capital restant insuffisant';
  end if;

  update public.rente_versements set
    statut = 'PAYEE', date_paiement = p_date_paiement, date_versement = p_date_paiement,
    reference_paiement = trim(p_reference_paiement), mode_paiement = p_mode_paiement,
    piece_justificative = p_piece_justificative,
    capital_avant = rente.capital_restant,
    capital_apres = rente.capital_restant - coalesce(echeance.montant_a_payer, echeance.montant, 0),
    updated_at = now()
  where id_rente_versement = p_id_versement returning * into echeance;

  update public.rentes set capital_restant = echeance.capital_apres, updated_at = now()
  where id_rente = rente.id_rente;
  return echeance;
end $$;

comment on table public.rentes is
  'Rentes viageres servant a financer la cotisation maladie des retraites ESR.';
comment on table public.rente_versements is
  'Echeances trimestrielles de cotisation maladie dues et payees par ESR a APS.';
