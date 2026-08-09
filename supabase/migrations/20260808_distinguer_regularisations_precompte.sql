-- Distingue un versement libre d'une regularisation de precompte.
alter table public.cotisation_details
  add column if not exists id_precompte bigint references public.precomptes(id_precompte);

create index if not exists idx_cotisation_details_id_precompte
  on public.cotisation_details (id_precompte)
  where id_precompte is not null;

-- Reprise prudente des donnees historiques : un seul paiement candidat, meme
-- adherent, meme montant et meme date que la regularisation du precompte.
with candidats as (
  select
    d.id_cotisation_detail,
    p.id_precompte,
    count(*) over (partition by p.id_precompte) as nombre_candidats
  from public.precomptes p
  join public.cotisation_details origine
    on origine.id_cotisation_detail = p.id_cotisation_detail
   and origine.statut = 'REJETEE'
  join public.adherents a on a.matricule = p.matricule
  join public.cotisation_entetes e on e.id_adherent = a.id_adherent
  join public.cotisation_details d on d.id_cotisation_entete = e.id_cotisation_entete
  where p.statut_precompte in ('ENCAISSE', 'PARTIEL')
    and d.source = 'SPONTANEE'
    and d.statut = 'ENCAISSEE'
    and d.montant = p.montant_retour
    and d.date_valeur = p.date_retour
    and d.id_precompte is null
), uniques as (
  select id_cotisation_detail, id_precompte
  from candidats
  where nombre_candidats = 1
)
update public.cotisation_details d
set id_precompte = u.id_precompte,
    source = 'REGULARISATION_PRECOMPTE',
    updated_at = now()
from uniques u
where d.id_cotisation_detail = u.id_cotisation_detail;

update public.precomptes p
set statut_precompte = case
      when coalesce(r.montant_regularise, 0) >= p.montant_depart - 0.01 then 'REGULARISE'
      else 'REGULARISE_PARTIELLEMENT'
    end,
    updated_at = now()
from (
  select id_precompte, sum(montant) as montant_regularise
  from public.cotisation_details
  where source = 'REGULARISATION_PRECOMPTE'
    and statut = 'ENCAISSEE'
    and id_precompte is not null
  group by id_precompte
) r
where p.id_precompte = r.id_precompte;

create or replace function public.regulariser_precompte_esr(
  p_id_precompte bigint,
  p_id_adherent bigint,
  p_mode text,
  p_periode text,
  p_periode_deb date,
  p_periode_fin date,
  p_date_valeur date,
  p_montant numeric,
  p_reference text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_precompte public.precomptes%rowtype;
  v_entete_id bigint;
  v_detail_id bigint;
  v_total_regularise numeric;
  v_statut text;
begin
  if p_montant <= 0 then raise exception 'MONTANT_INVALIDE'; end if;

  select * into v_precompte
  from public.precomptes
  where id_precompte = p_id_precompte
  for update;
  if not found then raise exception 'PRECOMPTE_INTROUVABLE'; end if;
  if v_precompte.statut_precompte not in ('NON_PRECOMPTE', 'ECART', 'PARTIEL', 'REGULARISE_PARTIELLEMENT') then
    raise exception 'PRECOMPTE_NON_REGULARISABLE';
  end if;

  insert into public.cotisation_entetes
    (id_adherent, mode, periode_deb, periode_fin, reference, statut)
  values
    (p_id_adherent, p_mode, p_periode_deb, p_periode_fin, p_reference, 'OUVERT')
  returning id_cotisation_entete into v_entete_id;

  insert into public.cotisation_details
    (id_cotisation_entete, periode, date_valeur, montant, source, statut, id_precompte)
  values
    (v_entete_id, upper(p_periode), p_date_valeur, p_montant,
     'REGULARISATION_PRECOMPTE', 'ENCAISSEE', p_id_precompte)
  returning id_cotisation_detail into v_detail_id;

  select coalesce(sum(montant), 0) into v_total_regularise
  from public.cotisation_details
  where id_precompte = p_id_precompte
    and source = 'REGULARISATION_PRECOMPTE'
    and statut = 'ENCAISSEE';

  v_statut := case
    when v_total_regularise >= v_precompte.montant_depart - 0.01 then 'REGULARISE'
    else 'REGULARISE_PARTIELLEMENT'
  end;

  update public.precomptes
  set montant_retour = v_total_regularise,
      date_retour = p_date_valeur,
      statut_precompte = v_statut,
      updated_at = now()
  where id_precompte = p_id_precompte;

  return jsonb_build_object(
    'id_cotisation_entete', v_entete_id,
    'id_cotisation_detail', v_detail_id,
    'id_precompte', p_id_precompte,
    'statut_precompte', v_statut,
    'montant_regularise', v_total_regularise
  );
end;
$$;

revoke all on function public.regulariser_precompte_esr(bigint, bigint, text, text, date, date, date, numeric, text) from public;
grant execute on function public.regulariser_precompte_esr(bigint, bigint, text, text, date, date, date, numeric, text) to service_role;
