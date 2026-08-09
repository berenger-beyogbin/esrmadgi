-- Alimente PP/PU depuis les mouvements encaisses et maintient les totaux a jour.

create or replace function public.actualiser_pp_pu_compte_esr(p_id_adherent bigint)
returns void language plpgsql set search_path = public as $$
declare
  v_pp numeric := 0;
  v_pu numeric := 0;
begin
  select
    coalesce(sum(d.montant) filter (
      where upper(coalesce(d.source, 'PRECOMPTE')) not in ('COTISATION_UNIQUE', 'UNIQUE')
    ), 0),
    coalesce(sum(d.montant) filter (
      where upper(coalesce(d.source, '')) in ('COTISATION_UNIQUE', 'UNIQUE')
    ), 0)
  into v_pp, v_pu
  from public.cotisation_entetes e
  join public.cotisation_details d on d.id_cotisation_entete = e.id_cotisation_entete
  join public.comptes_esr c on c.id_adherent = e.id_adherent
  where e.id_adherent = p_id_adherent
    and d.statut = 'ENCAISSEE'
    and d.date_valeur is not null
    and d.date_valeur <= c.date_calcul;

  update public.comptes_esr
  set pp = v_pp, pu = v_pu, updated_at = now()
  where id_adherent = p_id_adherent;
end $$;

create or replace function public.trg_actualiser_pp_pu_compte_esr()
returns trigger language plpgsql set search_path = public as $$
declare
  v_id_adherent bigint;
begin
  select id_adherent into v_id_adherent
  from public.cotisation_entetes
  where id_cotisation_entete = coalesce(new.id_cotisation_entete, old.id_cotisation_entete);
  if v_id_adherent is not null then
    perform public.actualiser_pp_pu_compte_esr(v_id_adherent);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists trg_cotisation_actualiser_pp_pu on public.cotisation_details;
create trigger trg_cotisation_actualiser_pp_pu
after insert or update or delete on public.cotisation_details
for each row execute function public.trg_actualiser_pp_pu_compte_esr();

do $$
declare r record;
begin
  for r in select id_adherent from public.comptes_esr loop
    perform public.actualiser_pp_pu_compte_esr(r.id_adherent);
  end loop;
end $$;

revoke all on function public.actualiser_pp_pu_compte_esr(bigint) from public;
grant execute on function public.actualiser_pp_pu_compte_esr(bigint) to service_role;
