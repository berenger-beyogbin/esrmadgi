-- Mise a niveau des bases ayant deja recu la table specialisee historique.
do $$
begin
  if to_regclass('public.periodes') is null
     and to_regclass('public.periodes_precompte') is not null then
    alter table public.periodes_precompte rename to periodes;
  end if;
end $$;

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

