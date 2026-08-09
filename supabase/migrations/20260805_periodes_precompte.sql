-- Referentiel transversal des periodes metier MADGI ESR.
-- Il est partage par les cotisations spontanees, les precomptes, les paiements
-- et les traitements de reporting.

create table if not exists public.periodes (
  periode text primary key,
  annee integer not null,
  trimestre integer not null check (trimestre between 1 and 4),
  statut text not null default 'OUVERTE' check (statut in ('OUVERTE', 'CLOTUREE')),
  date_cloture timestamptz,
  cloture_par uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_periodes_statut on public.periodes (statut);
