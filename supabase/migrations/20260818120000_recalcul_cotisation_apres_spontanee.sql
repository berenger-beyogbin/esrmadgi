-- Reproduit le fonctionnement historique ESR : le versement spontane augmente
-- le capital acquis et remplace la prime trimestrielle par la prime actuarielle
-- recalculee. Toutes les ecritures sont atomiques.

create or replace function public.enregistrer_cotisation_spontanee_recalculee_esr(
  p_id_adherent bigint,
  p_mode text,
  p_date_paiement date,
  p_date_valeur date,
  p_montant numeric,
  p_periode text,
  p_reference text,
  p_nouvelle_cotisation numeric,
  p_taux_garanti numeric,
  p_frais_rente numeric,
  p_id_paiement_existant bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entete bigint;
  v_detail bigint;
  v_paiement bigint;
begin
  if p_montant <= 0 or p_nouvelle_cotisation < 0 then
    raise exception 'Montant spontane ou cotisation recalculee invalide';
  end if;

  perform 1 from public.comptes_esr where id_adherent = p_id_adherent for update;
  if not found then raise exception 'Compte ESR introuvable'; end if;
  perform 1 from public.info_cotisations
    where id_adherent = p_id_adherent and info_actif = true for update;
  if not found then raise exception 'Informations de cotisation actives introuvables'; end if;

  insert into public.cotisation_entetes(
    id_adherent, mode, periode_deb, periode_fin, reference,
    taux_gar, frais_rente, table_code, statut
  ) values (
    p_id_adherent, 'SPONTANEE', p_date_paiement, p_date_paiement, p_reference,
    p_taux_garanti, p_frais_rente, 'CIMA-F', 'CLOTURE'
  ) returning id_cotisation_entete into v_entete;

  insert into public.cotisation_details(
    id_cotisation_entete, periode, date_valeur, montant, source, statut
  ) values (v_entete, p_periode, p_date_valeur, p_montant, 'SPONTANEE', 'ENCAISSEE')
  returning id_cotisation_detail into v_detail;

  if p_id_paiement_existant is null then
    insert into public.paiements(
      id_cotisation_detail, id_adherent, date_paiement, montant_paiement,
      moyen, origine_paiement, date_valeur
    ) values (
      v_detail, p_id_adherent, p_date_paiement, p_montant,
      p_mode, 'SPONTANEE', p_date_valeur
    ) returning id_paiement into v_paiement;
  else
    update public.paiements
    set id_cotisation_detail = v_detail,
        origine_paiement = 'SPONTANEE',
        date_valeur = p_date_valeur,
        updated_at = now()
    where id_paiement = p_id_paiement_existant
      and id_adherent = p_id_adherent;
    if not found then raise exception 'Paiement existant introuvable'; end if;
    v_paiement := p_id_paiement_existant;
  end if;

  update public.comptes_esr
  set capital_acquis = capital_acquis + p_montant,
      date_calcul = current_date,
      version_calc = 'VersementSpontane',
      updated_at = now()
  where id_adherent = p_id_adherent;

  update public.info_cotisations
  set cotisation_es = p_nouvelle_cotisation,
      taux_gar = p_taux_garanti,
      frais_rente = p_frais_rente,
      updated_at = now()
  where id_adherent = p_id_adherent and info_actif = true;

  return jsonb_build_object(
    'entete', jsonb_build_object('id_cotisation_entete', v_entete, 'reference', p_reference),
    'detail', jsonb_build_object('id_cotisation_detail', v_detail, 'periode', p_periode,
      'date_valeur', p_date_valeur, 'montant', p_montant, 'source', 'SPONTANEE', 'statut', 'ENCAISSEE'),
    'paiement', jsonb_build_object('id_paiement', v_paiement),
    'capital_ajoute', p_montant,
    'nouvelle_cotisation_trimestrielle', p_nouvelle_cotisation
  );
end;
$$;

revoke all on function public.enregistrer_cotisation_spontanee_recalculee_esr(
  bigint,text,date,date,numeric,text,text,numeric,numeric,numeric,bigint
) from public, anon, authenticated;
grant execute on function public.enregistrer_cotisation_spontanee_recalculee_esr(
  bigint,text,date,date,numeric,text,text,numeric,numeric,numeric,bigint
) to service_role;

