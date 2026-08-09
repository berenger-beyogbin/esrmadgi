-- Circuit de validation des cheques issus des cotisations spontanees
-- et des regularisations de precompte.
alter table public.paiements
  add column if not exists numero_cheque varchar(80),
  add column if not exists banque_emettrice varchar(150),
  add column if not exists titulaire_cheque varchar(180),
  add column if not exists date_emission_cheque date,
  add column if not exists reference_bordereau varchar(120),
  add column if not exists date_depot_banque date,
  add column if not exists reference_avis_credit varchar(120),
  add column if not exists date_compensation date,
  add column if not exists motif_rejet varchar(500),
  add column if not exists id_precompte bigint references public.precomptes(id_precompte);

create unique index if not exists uq_paiement_cheque_banque_numero
  on public.paiements (upper(banque_emettrice), upper(numero_cheque))
  where moyen = 'CHEQUE' and numero_cheque is not null;

create index if not exists ix_paiements_id_precompte
  on public.paiements(id_precompte)
  where id_precompte is not null;
