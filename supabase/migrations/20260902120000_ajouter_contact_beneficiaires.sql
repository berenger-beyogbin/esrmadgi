alter table public.beneficiaires
  add column if not exists contact character varying(80);

comment on column public.beneficiaires.contact is
  'Coordonnee de contact du beneficiaire (generalement un numero de telephone).';
