


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."actualiser_pp_pu_compte_esr"("p_id_adherent" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."actualiser_pp_pu_compte_esr"("p_id_adherent" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cloturer_periode_esr"("p_periode" "text", "p_user_id" "uuid", "p_snapshots" "jsonb", "p_resume" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_periode public.periodes%rowtype;
  v_annee integer;
  v_trimestre integer;
  v_periode_suivante text;
  v_date_ouverture date;
  v_date_cloture_prevue date;
begin
  select * into v_periode from public.periodes where periode = upper(p_periode) for update;
  if not found then raise exception 'PERIODE_INTROUVABLE'; end if;
  if v_periode.statut <> 'OUVERTE' then raise exception 'PERIODE_DEJA_CLOTUREE'; end if;

  insert into public.historique_actuariel_esr
    (id_adherent, periode, capital_acquis, provision_mathematique, taux_technique, date_valeur, date_cloture, version_calc)
  select id_adherent, v_periode.periode, capital_acquis, provision_mathematique, taux_technique,
         date_valeur, current_date, version_calc
  from jsonb_to_recordset(coalesce(p_snapshots, '[]'::jsonb)) as x(
    id_adherent bigint, capital_acquis numeric, provision_mathematique numeric,
    montant_cotise numeric, interets_credites numeric, valeur_rachat numeric,
    taux_technique numeric, date_valeur date, version_calc text
  );

  insert into public.historique_cotisations_esr
    (id_adherent, periode, montant_cotise, interets_credites, capital_cumule, pm, valeur_rachat, date_valeur, version_calc, cree_par)
  select id_adherent, v_periode.periode, montant_cotise, interets_credites, capital_acquis,
         provision_mathematique, valeur_rachat, date_valeur, version_calc, p_user_id
  from jsonb_to_recordset(coalesce(p_snapshots, '[]'::jsonb)) as x(
    id_adherent bigint, capital_acquis numeric, provision_mathematique numeric,
    montant_cotise numeric, interets_credites numeric, valeur_rachat numeric,
    taux_technique numeric, date_valeur date, version_calc text
  );

  update public.comptes_esr c
  set capital_acquis = x.capital_acquis,
      pm = x.provision_mathematique,
      valeur_rachat = x.valeur_rachat,
      date_calcul = x.date_valeur,
      version_calc = x.version_calc,
      updated_at = now()
  from jsonb_to_recordset(coalesce(p_snapshots, '[]'::jsonb)) as x(
    id_adherent bigint, capital_acquis numeric, provision_mathematique numeric,
    montant_cotise numeric, interets_credites numeric, valeur_rachat numeric,
    taux_technique numeric, date_valeur date, version_calc text
  ) where c.id_adherent = x.id_adherent;

  insert into public.comptes_esr (id_adherent, capital_acquis, pm, valeur_rachat, date_calcul, version_calc)
  select x.id_adherent, x.capital_acquis, x.provision_mathematique, x.valeur_rachat, x.date_valeur, x.version_calc
  from jsonb_to_recordset(coalesce(p_snapshots, '[]'::jsonb)) as x(
    id_adherent bigint, capital_acquis numeric, provision_mathematique numeric,
    montant_cotise numeric, interets_credites numeric, valeur_rachat numeric,
    taux_technique numeric, date_valeur date, version_calc text
  ) where not exists (select 1 from public.comptes_esr c where c.id_adherent = x.id_adherent);

  insert into public.resumes_cloture_esr
    (periode, nb_adherents, capital_global, pm_totale, date_cloture, version_calc, cloture_par)
  values (
    v_periode.periode,
    coalesce((p_resume->>'nb_adherents')::integer, 0),
    coalesce((p_resume->>'capital_global')::numeric, 0),
    coalesce((p_resume->>'pm_totale')::numeric, 0),
    current_date,
    coalesce(p_resume->>'version_calc', 'ESR-PM-1'),
    p_user_id
  );

  update public.periodes
  set statut = 'CLOTUREE', date_cloture = now(), date_cloture_effective = current_date,
      cloture_par = p_user_id, updated_at = now()
  where periode = v_periode.periode;

  if v_periode.trimestre < 4 then
    v_annee := v_periode.annee; v_trimestre := v_periode.trimestre + 1;
  else
    v_annee := v_periode.annee + 1; v_trimestre := 1;
  end if;
  v_periode_suivante := v_annee::text || 'T' || v_trimestre::text;
  v_date_ouverture := make_date(v_annee, ((v_trimestre - 1) * 3) + 1, 1);
  v_date_cloture_prevue := (make_date(v_annee, v_trimestre * 3, 1) + interval '1 month - 1 day')::date;

  insert into public.periodes
    (periode, annee, trimestre, statut, date_ouverture, date_cloture_prevue)
  values (v_periode_suivante, v_annee, v_trimestre, 'OUVERTE', v_date_ouverture, v_date_cloture_prevue)
  on conflict (periode) do update set statut = 'OUVERTE', updated_at = now();

  return jsonb_build_object('periode_suivante', v_periode_suivante);
end;
$$;


ALTER FUNCTION "public"."cloturer_periode_esr"("p_periode" "text", "p_user_id" "uuid", "p_snapshots" "jsonb", "p_resume" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_adherent_id"() RETURNS bigint
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.id_adherent
  from public.utilisateurs u
  where u.auth_user_id = auth.uid()
    and u.user_actif = true
  limit 1;
$$;


ALTER FUNCTION "public"."current_user_adherent_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_profile"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.profil
  from public.utilisateurs u
  where u.auth_user_id = auth.uid()
    and u.user_actif = true
  limit 1;
$$;


ALTER FUNCTION "public"."current_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."imputer_paiements_spontanes_precompte_esr"("p_id_precompte" bigint, "p_id_adherent" bigint, "p_date_limite" "date", "p_montant_brut" numeric) RETURNS TABLE("montant_brut" numeric, "montant_credit" numeric, "montant_net" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_restant numeric(15,2) := greatest(coalesce(p_montant_brut, 0), 0);
  v_credit numeric(15,2) := 0;
  v_disponible numeric(15,2);
  v_imputation numeric(15,2);
  v_detail_precompte bigint;
  v_credit_deja_impute numeric(15,2);
  r record;
begin
  if p_montant_brut is null or p_montant_brut < 0 then
    raise exception 'Montant brut de cotisation invalide';
  end if;

  -- Serialise toutes les imputations d'un meme adherent afin d'interdire la
  -- consommation concurrente d'un meme credit sur deux precomptes.
  perform pg_advisory_xact_lock(p_id_adherent);

  select p.id_cotisation_detail
    into v_detail_precompte
  from public.precomptes p
  join public.cotisation_details d
    on d.id_cotisation_detail = p.id_cotisation_detail
  join public.cotisation_entetes e
    on e.id_cotisation_entete = d.id_cotisation_entete
  where p.id_precompte = p_id_precompte
    and e.id_adherent = p_id_adherent
  for update;

  if v_detail_precompte is null then
    raise exception 'Precompte introuvable ou sans detail de cotisation';
  end if;

  select coalesce(sum(i.montant_impute), 0)
    into v_credit_deja_impute
  from public.imputations_paiements_spontanes i
  where i.id_precompte = p_id_precompte;

  if v_credit_deja_impute > 0 then
    select p.montant_cotisation_brut, p.montant_credit_spontane, p.montant_depart
      into montant_brut, montant_credit, montant_net
    from public.precomptes p
    where p.id_precompte = p_id_precompte;
    return next;
    return;
  end if;

  for r in
    select d.id_cotisation_detail, d.montant,
           coalesce((
             select sum(i.montant_impute)
             from public.imputations_paiements_spontanes i
             where i.id_cotisation_detail_spontanee = d.id_cotisation_detail
           ), 0) as deja_impute
    from public.cotisation_details d
    join public.cotisation_entetes e
      on e.id_cotisation_entete = d.id_cotisation_entete
    where e.id_adherent = p_id_adherent
      and upper(coalesce(d.source, '')) in ('SPONTANEE', 'DIRECT')
      and upper(coalesce(d.statut, '')) = 'ENCAISSEE'
      and d.date_valeur is not null
      and d.date_valeur <= p_date_limite
      and d.id_precompte is null
      and d.montant - coalesce((
        select sum(i.montant_impute)
        from public.imputations_paiements_spontanes i
        where i.id_cotisation_detail_spontanee = d.id_cotisation_detail
      ), 0) > 0
    order by d.date_valeur, d.id_cotisation_detail
    for update of d
  loop
    exit when v_restant <= 0;
    v_disponible := greatest(r.montant - r.deja_impute, 0);
    v_imputation := least(v_disponible, v_restant);
    if v_imputation > 0 then
      insert into public.imputations_paiements_spontanes(
        id_cotisation_detail_spontanee, id_precompte, montant_impute
      ) values (r.id_cotisation_detail, p_id_precompte, v_imputation);
      v_credit := v_credit + v_imputation;
      v_restant := v_restant - v_imputation;
    end if;
  end loop;

  update public.precomptes
  set montant_cotisation_brut = p_montant_brut,
      montant_credit_spontane = v_credit,
      montant_depart = greatest(p_montant_brut - v_credit, 0),
      statut_precompte = case
        when greatest(p_montant_brut - v_credit, 0) = 0 then 'ENCAISSE'
        else statut_precompte
      end,
      date_retour = case
        when greatest(p_montant_brut - v_credit, 0) = 0 then p_date_limite
        else date_retour
      end,
      updated_at = now()
  where id_precompte = p_id_precompte;

  update public.cotisation_details
  set montant = greatest(p_montant_brut - v_credit, 0),
      statut = case
        when greatest(p_montant_brut - v_credit, 0) = 0 then 'ENCAISSEE'
        else statut
      end,
      date_valeur = case
        when greatest(p_montant_brut - v_credit, 0) = 0 then p_date_limite
        else date_valeur
      end
  where id_cotisation_detail = v_detail_precompte;

  montant_brut := p_montant_brut;
  montant_credit := v_credit;
  montant_net := greatest(p_montant_brut - v_credit, 0);
  return next;
end;
$$;


ALTER FUNCTION "public"."imputer_paiements_spontanes_precompte_esr"("p_id_precompte" bigint, "p_id_adherent" bigint, "p_date_limite" "date", "p_montant_brut" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(public.current_user_profile() = 'ADMINISTRATEUR', false);
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_gestionnaire_or_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(public.current_user_profile() in ('GESTIONNAIRE', 'ADMINISTRATEUR'), false);
$$;


ALTER FUNCTION "public"."is_gestionnaire_or_admin"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."rente_versements" (
    "id_rente_versement" bigint NOT NULL,
    "id_rente" bigint NOT NULL,
    "periode" character varying(20),
    "date_echeance" "date",
    "montant" numeric(18,2) DEFAULT 0 NOT NULL,
    "statut_rente_vers" character varying(30) DEFAULT 'PREVU'::character varying,
    "date_paiement" "date",
    "observation" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "date_versement" "date",
    "annee" integer,
    "trimestre" integer,
    "montant_brut" numeric(15,2),
    "frais_gestion" numeric(15,2) DEFAULT 0 NOT NULL,
    "montant_a_payer" numeric(15,2),
    "organisme_beneficiaire" "text" DEFAULT 'APS'::"text" NOT NULL,
    "reference_appel_aps" "text",
    "date_reception_appel" "date",
    "statut" "text" DEFAULT 'GENEREE'::"text" NOT NULL,
    "date_validation" "date",
    "reference_paiement" "text",
    "mode_paiement" "text",
    "piece_justificative" "text",
    "capital_avant" numeric(15,2),
    "capital_apres" numeric(15,2),
    CONSTRAINT "chk_rente_versements_montant" CHECK (("montant" >= (0)::numeric))
);


ALTER TABLE "public"."rente_versements" OWNER TO "postgres";


COMMENT ON TABLE "public"."rente_versements" IS 'Echeances trimestrielles de cotisation maladie dues et payees par ESR a APS.';



CREATE OR REPLACE FUNCTION "public"."payer_echeance_aps"("p_id_versement" bigint, "p_date_paiement" "date", "p_reference_paiement" "text", "p_mode_paiement" "text", "p_piece_justificative" "text" DEFAULT NULL::"text") RETURNS "public"."rente_versements"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."payer_echeance_aps"("p_id_versement" bigint, "p_date_paiement" "date", "p_reference_paiement" "text", "p_mode_paiement" "text", "p_piece_justificative" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rachats" (
    "id_rachat" bigint NOT NULL,
    "id_adherent" bigint NOT NULL,
    "date_demande" "date" NOT NULL,
    "date_arrete" "date" NOT NULL,
    "motif" "text",
    "statut" character varying(30) DEFAULT 'DOSSIER_OUVERT'::character varying NOT NULL,
    "capital_verse" numeric(18,2) DEFAULT 0 NOT NULL,
    "provision_mathematique" numeric(18,2) DEFAULT 0 NOT NULL,
    "taux_frais_gestion" numeric(8,4) DEFAULT 0 NOT NULL,
    "frais_gestion" numeric(18,2) DEFAULT 0 NOT NULL,
    "taux_penalite" numeric(8,4) DEFAULT 0 NOT NULL,
    "penalite" numeric(18,2) DEFAULT 0 NOT NULL,
    "montant_net" numeric(18,2) DEFAULT 0 NOT NULL,
    "nombre_mouvements" integer DEFAULT 0 NOT NULL,
    "anciennete_annees" integer DEFAULT 0 NOT NULL,
    "version_calcul" character varying(100) NOT NULL,
    "parametres_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "mouvements_json" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "cree_par" character varying(100) NOT NULL,
    "controle_par" character varying(100),
    "valide_par" character varying(100),
    "paye_par" character varying(100),
    "date_controle" timestamp with time zone,
    "date_validation" timestamp with time zone,
    "date_paiement" "date",
    "reference_paiement" character varying(120),
    "mode_paiement" character varying(30),
    "observation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rachats_check" CHECK ((("montant_net" >= (0)::numeric) AND ("provision_mathematique" >= (0)::numeric))),
    CONSTRAINT "rachats_statut_check" CHECK ((("statut")::"text" = ANY ((ARRAY['DOSSIER_OUVERT'::character varying, 'EN_CONTROLE'::character varying, 'VALIDE'::character varying, 'PAYE'::character varying, 'REJETE'::character varying, 'ANNULE'::character varying])::"text"[])))
);


ALTER TABLE "public"."rachats" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."payer_rachat_esr"("p_id_rachat" bigint, "p_utilisateur" character varying, "p_date_paiement" "date", "p_reference" character varying, "p_mode" character varying, "p_observation" "text" DEFAULT NULL::"text") RETURNS "public"."rachats"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v public.rachats; v_matricule text; v_annee integer; v_trimestre integer;
begin
  select * into v from public.rachats where id_rachat=p_id_rachat for update;
  if not found then raise exception 'Rachat introuvable'; end if;
  if v.statut <> 'VALIDE' then raise exception 'Le rachat doit être validé avant paiement'; end if;
  if coalesce(trim(p_reference),'') = '' then raise exception 'Référence de paiement obligatoire'; end if;
  update public.rachats set statut='PAYE', paye_par=p_utilisateur,
    date_paiement=p_date_paiement, reference_paiement=p_reference,
    mode_paiement=p_mode, observation=coalesce(p_observation,observation), updated_at=now()
  where id_rachat=p_id_rachat returning * into v;
  update public.comptes_esr set capital_acquis=0, pp=0, pu=0, pm=0, valeur_rachat=0,
    date_calcul=p_date_paiement, version_calc='ESR-RACHAT-SOLDE', updated_at=now()
  where id_adherent=v.id_adherent;
  update public.adherents set statut=false, etat='RESILIE', updated_at=now()
  where id_adherent=v.id_adherent;
  select matricule into v_matricule from public.adherents where id_adherent=v.id_adherent;
  v_annee := extract(year from p_date_paiement)::integer;
  v_trimestre := extract(quarter from p_date_paiement)::integer;
  update public.precomptes set statut_precompte='ANNULE', updated_at=now()
  where matricule=v_matricule
    and (annee>v_annee or (annee=v_annee and trimestre>=v_trimestre))
    and statut_precompte in ('GENERE','INITIE','NON_PRECOMPTE');
  insert into public.rachat_evenements(id_rachat,ancien_statut,nouveau_statut,utilisateur,observation)
  values(p_id_rachat,'VALIDE','PAYE',p_utilisateur,p_observation);
  return v;
end $$;


ALTER FUNCTION "public"."payer_rachat_esr"("p_id_rachat" bigint, "p_utilisateur" character varying, "p_date_paiement" "date", "p_reference" character varying, "p_mode" character varying, "p_observation" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regulariser_precompte_esr"("p_id_precompte" bigint, "p_id_adherent" bigint, "p_mode" "text", "p_periode" "text", "p_periode_deb" "date", "p_periode_fin" "date", "p_date_valeur" "date", "p_montant" numeric, "p_reference" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."regulariser_precompte_esr"("p_id_precompte" bigint, "p_id_adherent" bigint, "p_mode" "text", "p_periode" "text", "p_periode_deb" "date", "p_periode_fin" "date", "p_date_valeur" "date", "p_montant" numeric, "p_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_creer_adherent_complet"("p_matricule" character varying, "p_nom" character varying, "p_prenoms" character varying, "p_civilite" character varying, "p_telephone" character varying, "p_email" character varying, "p_date_naissance" "date", "p_emploi" character varying, "p_situation_matrimoniale" character varying, "p_date_souscription" "date", "p_statut" boolean, "p_etat" character varying, "p_grade" character varying, "p_id_grade" bigint, "p_date_effet" "date", "p_date_retraite" "date", "p_age_retraite" numeric, "p_cotisation_annuelle" numeric, "p_date_precompte" "date", "p_cotisation_es" numeric, "p_nb_trimestre" numeric, "p_utilisateur" character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id_adherent bigint;
  v_id_compte_esr bigint;
  v_id_utilisateur bigint;
  v_id_info_cotisation bigint;
  v_matricule varchar;
  v_sexe varchar(1);
  v_utilisateur varchar;
begin
  -- =====================================================
  -- 1. Sécurité d'accès
  -- =====================================================

  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.is_gestionnaire_or_admin() then
    raise exception 'Accès refusé : profil gestionnaire ou administrateur requis.';
  end if;


  -- =====================================================
  -- 2. Normalisation et contrôles
  -- =====================================================

  v_matricule := upper(trim(p_matricule));
  v_utilisateur := coalesce(nullif(trim(p_utilisateur), ''), v_matricule);

  if v_matricule is null or v_matricule = '' then
    raise exception 'Le matricule est obligatoire.';
  end if;

  if p_nom is null or trim(p_nom) = '' then
    raise exception 'Le nom est obligatoire.';
  end if;

  if exists (
    select 1
    from public.adherents
    where matricule = v_matricule
  ) then
    raise exception 'Ce matricule existe déjà.';
  end if;

  if p_civilite = 'Monsieur' then
    v_sexe := 'M';
  else
    v_sexe := 'F';
  end if;


  -- =====================================================
  -- 3. Création adhérent
  -- Equivalent WebDev : HAjoute(Adherent)
  -- =====================================================

  insert into public.adherents (
    matricule,
    nom,
    prenoms,
    civilite,
    sexe,
    telephone,
    email,
    date_naissance,
    emploi,
    situation_matrimoniale,
    date_souscription,
    statut,
    etat,
    decede,
    adhesion_en_ligne,
    retraite
  )
  values (
    v_matricule,
    upper(trim(p_nom)),
    upper(trim(coalesce(p_prenoms, ''))),
    p_civilite,
    v_sexe,
    p_telephone,
    p_email,
    p_date_naissance,
    p_emploi,
    p_situation_matrimoniale,
    p_date_souscription,
    coalesce(p_statut, true),
    coalesce(p_etat, 'ACTIF'),
    false,
    false,
    false
  )
  returning id_adherent into v_id_adherent;


  -- =====================================================
  -- 4. Création Compte ESR
  -- Equivalent WebDev : CreerCompteERS()
  -- =====================================================

  insert into public.comptes_esr (
    id_adherent,
    capital_acquis,
    pm,
    pp,
    pu,
    valeur_rachat,
    date_calcul,
    version_calc
  )
  values (
    v_id_adherent,
    0,
    0,
    0,
    0,
    0,
    current_date,
    'V1'
  )
  returning id_compte_esr into v_id_compte_esr;


  -- =====================================================
  -- 5. Création utilisateur adhérent
  -- Equivalent WebDev : CreerUtilisateurAdherent()
  -- Mot de passe géré par Supabase Auth, pas ici.
  -- =====================================================

  insert into public.utilisateurs (
    matricule,
    email,
    telephone,
    user_actif,
    profil,
    id_adherent,
    hash_pwd,
    chang_mdp,
    nb_echec_con,
    date_creation
  )
  values (
    v_matricule,
    p_email,
    p_telephone,
    true,
    'ADHERENT',
    v_id_adherent,
    null,
    true,
    0,
    now()
  )
  returning id_utilisateur into v_id_utilisateur;


  -- =====================================================
  -- 6. Création InfoCotisation
  -- Equivalent WebDev : HAjoute(InfoCotisation)
  -- =====================================================

  insert into public.info_cotisations (
    id_adherent,
    grade,
    id_grade,
    date_naissance,
    date_effet,
    date_retraite,
    age_retraite,
    cotisation_annuelle,
    date_precompte,
    cotisation_es,
    nb_trimestre,
    info_actif,
    taux_gar,
    taux_rachat,
    frais_rente
  )
  values (
    v_id_adherent,
    p_grade,
    p_id_grade,
    p_date_naissance,
    p_date_effet,
    p_date_retraite,
    p_age_retraite,
    coalesce(p_cotisation_annuelle, 0),
    p_date_precompte,
    coalesce(p_cotisation_es, 0),
    coalesce(p_nb_trimestre, 0),
    true,
    3.5,
    5,
    5
  )
  returning id_info_cotisation into v_id_info_cotisation;


  -- =====================================================
  -- 7. Audit
  -- =====================================================

  insert into public.audit_logs (
    objet_audit,
    id_objet,
    action,
    payload_json,
    utilisateur,
    horodatage
  )
  values (
    'ADHERENT',
    v_id_adherent::varchar,
    'CREATE',
    jsonb_build_object(
      'matricule', v_matricule,
      'nom', upper(trim(p_nom)),
      'prenoms', upper(trim(coalesce(p_prenoms, ''))),
      'id_compte_esr', v_id_compte_esr,
      'id_utilisateur', v_id_utilisateur,
      'id_info_cotisation', v_id_info_cotisation
    ),
    v_utilisateur,
    now()
  );


  -- =====================================================
  -- 8. Retour
  -- =====================================================

  return jsonb_build_object(
    'success', true,
    'message', 'Adhérent créé avec succès.',
    'id_adherent', v_id_adherent,
    'id_compte_esr', v_id_compte_esr,
    'id_utilisateur', v_id_utilisateur,
    'id_info_cotisation', v_id_info_cotisation
  );
end;
$$;


ALTER FUNCTION "public"."rpc_creer_adherent_complet"("p_matricule" character varying, "p_nom" character varying, "p_prenoms" character varying, "p_civilite" character varying, "p_telephone" character varying, "p_email" character varying, "p_date_naissance" "date", "p_emploi" character varying, "p_situation_matrimoniale" character varying, "p_date_souscription" "date", "p_statut" boolean, "p_etat" character varying, "p_grade" character varying, "p_id_grade" bigint, "p_date_effet" "date", "p_date_retraite" "date", "p_age_retraite" numeric, "p_cotisation_annuelle" numeric, "p_date_precompte" "date", "p_cotisation_es" numeric, "p_nb_trimestre" numeric, "p_utilisateur" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_actualiser_pp_pu_compte_esr"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."trg_actualiser_pp_pu_compte_esr"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verifier_echeance_rente_sante"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."verifier_echeance_rente_sante"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."adherents" (
    "id_adherent" bigint NOT NULL,
    "matricule" character varying(10) NOT NULL,
    "nom" character varying(80) NOT NULL,
    "prenoms" character varying(120),
    "civilite" character varying(50),
    "sexe" character varying(1),
    "date_naissance" "date",
    "emploi" character varying(80),
    "situation_matrimoniale" character varying(80),
    "email" character varying(120),
    "telephone" character varying(20),
    "date_souscription" "date",
    "statut" boolean DEFAULT true,
    "etat" character varying(30),
    "decede" boolean DEFAULT false,
    "adhesion_en_ligne" boolean DEFAULT false,
    "retraite" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "chk_adherents_sexe" CHECK ((("sexe" IS NULL) OR (("sexe")::"text" = ANY ((ARRAY['M'::character varying, 'F'::character varying])::"text"[]))))
);


ALTER TABLE "public"."adherents" OWNER TO "postgres";


ALTER TABLE "public"."adherents" ALTER COLUMN "id_adherent" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."adherents_id_adherent_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id_audit" bigint NOT NULL,
    "objet_audit" character varying(80),
    "id_objet" character varying(80),
    "action" character varying(40) NOT NULL,
    "payload_json" "jsonb",
    "utilisateur" character varying(80),
    "horodatage" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_audit_logs_action" CHECK ((("action")::"text" = ANY ((ARRAY['CREATE'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying, 'LOGIN'::character varying, 'LOGOUT'::character varying, 'CALCUL'::character varying, 'VALIDATION'::character varying, 'ANNULATION'::character varying, 'EXPORT'::character varying, 'IMPORT'::character varying])::"text"[])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


ALTER TABLE "public"."audit_logs" ALTER COLUMN "id_audit" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."audit_logs_id_audit_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."beneficiaires" (
    "id_beneficiaire" bigint NOT NULL,
    "id_adherent" bigint NOT NULL,
    "nom_benef" character varying(80) NOT NULL,
    "prenoms_benef" character varying(120),
    "lien" character varying(80),
    "pourcentage" numeric(5,2),
    "statut" boolean DEFAULT true,
    "date_enreg" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "chk_beneficiaires_pourcentage" CHECK ((("pourcentage" IS NULL) OR (("pourcentage" >= (0)::numeric) AND ("pourcentage" <= (100)::numeric))))
);


ALTER TABLE "public"."beneficiaires" OWNER TO "postgres";


ALTER TABLE "public"."beneficiaires" ALTER COLUMN "id_beneficiaire" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."beneficiaires_id_beneficiaire_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."civilites" (
    "id_civilite" bigint NOT NULL,
    "libelle_civilite" character varying(50) NOT NULL,
    "sexe" character varying(1),
    "actif" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."civilites" OWNER TO "postgres";


ALTER TABLE "public"."civilites" ALTER COLUMN "id_civilite" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."civilites_id_civilite_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."comptes_esr" (
    "id_compte_esr" bigint NOT NULL,
    "id_adherent" bigint NOT NULL,
    "capital_acquis" numeric(18,2) DEFAULT 0 NOT NULL,
    "pm" numeric(18,2) DEFAULT 0 NOT NULL,
    "pp" numeric(18,2) DEFAULT 0 NOT NULL,
    "pu" numeric(18,2) DEFAULT 0 NOT NULL,
    "valeur_rachat" numeric(18,2) DEFAULT 0 NOT NULL,
    "date_calcul" "date",
    "version_calc" character varying(50) DEFAULT 'V1'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "chk_comptes_esr_montants" CHECK ((("capital_acquis" >= (0)::numeric) AND ("pm" >= (0)::numeric) AND ("pp" >= (0)::numeric) AND ("pu" >= (0)::numeric) AND ("valeur_rachat" >= (0)::numeric)))
);


ALTER TABLE "public"."comptes_esr" OWNER TO "postgres";


ALTER TABLE "public"."comptes_esr" ALTER COLUMN "id_compte_esr" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."comptes_esr_id_compte_esr_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cotisation_details" (
    "id_cotisation_detail" bigint NOT NULL,
    "id_cotisation_entete" bigint NOT NULL,
    "periode" character varying(20),
    "date_valeur" "date",
    "montant" numeric(18,2) DEFAULT 0 NOT NULL,
    "source" character varying(40),
    "statut" character varying(30) DEFAULT 'PREVUE'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "id_precompte" bigint,
    CONSTRAINT "chk_cotisation_details_montant" CHECK (("montant" >= (0)::numeric))
);


ALTER TABLE "public"."cotisation_details" OWNER TO "postgres";


ALTER TABLE "public"."cotisation_details" ALTER COLUMN "id_cotisation_detail" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cotisation_details_id_cotisation_detail_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cotisation_entetes" (
    "id_cotisation_entete" bigint NOT NULL,
    "id_adherent" bigint NOT NULL,
    "mode" character varying(30) NOT NULL,
    "periode_deb" "date",
    "periode_fin" "date",
    "reference" character varying(20),
    "taux_gar" numeric(8,4) DEFAULT 3.5,
    "frais_rente" numeric(8,4) DEFAULT 5,
    "table_code" character varying(40) DEFAULT 'CIMA-F'::character varying,
    "statut" character varying(30) DEFAULT 'OUVERT'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."cotisation_entetes" OWNER TO "postgres";


ALTER TABLE "public"."cotisation_entetes" ALTER COLUMN "id_cotisation_entete" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cotisation_entetes_id_cotisation_entete_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."emplois" (
    "id_emploi" bigint NOT NULL,
    "libelle_emploi" character varying(80) NOT NULL,
    "actif" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."emplois" OWNER TO "postgres";


ALTER TABLE "public"."emplois" ALTER COLUMN "id_emploi" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."emplois_id_emploi_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."fonctions" (
    "id_fonction" bigint NOT NULL,
    "libelle_fonction" character varying(80) NOT NULL,
    "actif" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."fonctions" OWNER TO "postgres";


ALTER TABLE "public"."fonctions" ALTER COLUMN "id_fonction" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fonctions_id_fonction_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."grades" (
    "id_grade" bigint NOT NULL,
    "libelle_grade" character varying(80) NOT NULL,
    "age_retraite" integer NOT NULL,
    "cotisation_annuelle" numeric(18,2) DEFAULT 0 NOT NULL,
    "actif" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."grades" OWNER TO "postgres";


ALTER TABLE "public"."grades" ALTER COLUMN "id_grade" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."grades_id_grade_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."historique_actuariel_esr" (
    "id_historique" bigint NOT NULL,
    "id_adherent" bigint NOT NULL,
    "periode" "text" NOT NULL,
    "capital_acquis" numeric(18,2) DEFAULT 0 NOT NULL,
    "provision_mathematique" numeric(18,2) DEFAULT 0 NOT NULL,
    "taux_technique" numeric(12,8) DEFAULT 0 NOT NULL,
    "date_valeur" "date" NOT NULL,
    "date_cloture" "date" NOT NULL,
    "version_calc" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."historique_actuariel_esr" OWNER TO "postgres";


ALTER TABLE "public"."historique_actuariel_esr" ALTER COLUMN "id_historique" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."historique_actuariel_esr_id_historique_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."historique_cotisations" (
    "id_historique_cotisation" bigint NOT NULL,
    "id_adherent" bigint NOT NULL,
    "periode" character varying(20),
    "montant_cotise" numeric(18,2) DEFAULT 0 NOT NULL,
    "interets_credites" numeric(18,2) DEFAULT 0 NOT NULL,
    "capital_cumule" numeric(18,2) DEFAULT 0 NOT NULL,
    "pm" numeric(18,2) DEFAULT 0 NOT NULL,
    "valeur_rachat" numeric(18,2) DEFAULT 0 NOT NULL,
    "date_valeur" "date",
    "statut" boolean DEFAULT true,
    "version_calc" character varying(50) DEFAULT 'ESR_V1'::character varying,
    "date_creation" timestamp with time zone DEFAULT "now"(),
    "creer_par" character varying(80),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "chk_historique_cotisations_montants" CHECK ((("montant_cotise" >= (0)::numeric) AND ("interets_credites" >= (0)::numeric) AND ("capital_cumule" >= (0)::numeric) AND ("pm" >= (0)::numeric) AND ("valeur_rachat" >= (0)::numeric)))
);


ALTER TABLE "public"."historique_cotisations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historique_cotisations_esr" (
    "id_historique" bigint NOT NULL,
    "id_adherent" bigint NOT NULL,
    "periode" "text" NOT NULL,
    "montant_cotise" numeric(18,2) DEFAULT 0 NOT NULL,
    "interets_credites" numeric(18,2) DEFAULT 0 NOT NULL,
    "capital_cumule" numeric(18,2) DEFAULT 0 NOT NULL,
    "pm" numeric(18,2) DEFAULT 0 NOT NULL,
    "valeur_rachat" numeric(18,2) DEFAULT 0 NOT NULL,
    "date_valeur" "date" NOT NULL,
    "version_calc" "text" NOT NULL,
    "cree_par" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."historique_cotisations_esr" OWNER TO "postgres";


ALTER TABLE "public"."historique_cotisations_esr" ALTER COLUMN "id_historique" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."historique_cotisations_esr_id_historique_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."historique_cotisations" ALTER COLUMN "id_historique_cotisation" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."historique_cotisations_id_historique_cotisation_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."imputations_paiements_spontanes" (
    "id_imputation" bigint NOT NULL,
    "id_cotisation_detail_spontanee" bigint NOT NULL,
    "id_precompte" bigint NOT NULL,
    "montant_impute" numeric(15,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "imputations_paiements_spontanes_montant_impute_check" CHECK (("montant_impute" > (0)::numeric))
);


ALTER TABLE "public"."imputations_paiements_spontanes" OWNER TO "postgres";


ALTER TABLE "public"."imputations_paiements_spontanes" ALTER COLUMN "id_imputation" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."imputations_paiements_spontanes_id_imputation_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."info_cotisations" (
    "id_info_cotisation" bigint NOT NULL,
    "id_adherent" bigint NOT NULL,
    "grade" character varying(80),
    "id_grade" bigint,
    "date_naissance" "date",
    "date_retraite" "date",
    "age_retraite" numeric(5,2),
    "cotisation_annuelle" numeric(18,2) DEFAULT 0 NOT NULL,
    "date_precompte" "date",
    "date_effet" "date",
    "nb_trimestre" numeric(6,0) DEFAULT 0 NOT NULL,
    "cotisation_es" numeric(18,2) DEFAULT 0 NOT NULL,
    "info_actif" boolean DEFAULT true,
    "taux_gar" numeric(8,4) DEFAULT 3.5,
    "frais_rente" numeric(8,4) DEFAULT 5,
    "taux_rachat" numeric(8,4) DEFAULT 5,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "chk_info_cotisations_montants" CHECK ((("cotisation_annuelle" >= (0)::numeric) AND ("cotisation_es" >= (0)::numeric) AND ("nb_trimestre" >= (0)::numeric))),
    CONSTRAINT "chk_info_cotisations_taux" CHECK ((("taux_gar" >= (0)::numeric) AND ("frais_rente" >= (0)::numeric) AND ("taux_rachat" >= (0)::numeric)))
);


ALTER TABLE "public"."info_cotisations" OWNER TO "postgres";


ALTER TABLE "public"."info_cotisations" ALTER COLUMN "id_info_cotisation" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."info_cotisations_id_info_cotisation_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."liens_beneficiaires" (
    "id_lien_beneficiaire" bigint NOT NULL,
    "libelle_lien" character varying(80) NOT NULL,
    "actif" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."liens_beneficiaires" OWNER TO "postgres";


ALTER TABLE "public"."liens_beneficiaires" ALTER COLUMN "id_lien_beneficiaire" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."liens_beneficiaires_id_lien_beneficiaire_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."mortalite" (
    "age_mort" integer NOT NULL,
    "lx" numeric(18,6) NOT NULL,
    "dx" integer,
    "qx" numeric(14,10)
);


ALTER TABLE "public"."mortalite" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paiements" (
    "id_paiement" bigint NOT NULL,
    "id_cotisation_detail" bigint,
    "id_adherent" bigint,
    "date_paiement" "date" NOT NULL,
    "montant_paiement" numeric(18,2) DEFAULT 0 NOT NULL,
    "moyen" character varying(30),
    "origine_paiement" character varying(60),
    "observation_dgi" character varying(120),
    "date_valeur" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "numero_cheque" character varying(80),
    "banque_emettrice" character varying(150),
    "titulaire_cheque" character varying(180),
    "date_emission_cheque" "date",
    "reference_bordereau" character varying(120),
    "date_depot_banque" "date",
    "reference_avis_credit" character varying(120),
    "date_compensation" "date",
    "motif_rejet" character varying(500),
    "id_precompte" bigint,
    CONSTRAINT "chk_paiements_montant" CHECK (("montant_paiement" >= (0)::numeric))
);


ALTER TABLE "public"."paiements" OWNER TO "postgres";


ALTER TABLE "public"."paiements" ALTER COLUMN "id_paiement" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."paiements_id_paiement_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."param_repartitions" (
    "id_param_repartition" bigint NOT NULL,
    "date_effet" "date" NOT NULL,
    "taux_sante" numeric(8,4),
    "taux_retraite" numeric(8,4),
    "taux_actif" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."param_repartitions" OWNER TO "postgres";


ALTER TABLE "public"."param_repartitions" ALTER COLUMN "id_param_repartition" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."param_repartitions_id_param_repartition_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."parametre_versions" (
    "id_parametre_version" bigint NOT NULL,
    "code" character varying(20) NOT NULL,
    "libelle" character varying(120),
    "valeur_num" numeric(18,6),
    "valeur_txt" character varying(120),
    "date_deb" "date",
    "date_fin" "date",
    "statut" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."parametre_versions" OWNER TO "postgres";


ALTER TABLE "public"."parametre_versions" ALTER COLUMN "id_parametre_version" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."parametre_versions_id_parametre_version_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."parametres_generaux" (
    "id_parametre_generaux" bigint NOT NULL,
    "libelle" character varying(120) NOT NULL,
    "valeur" "text",
    "chemin_dossier" character varying(200),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "code" character varying(80),
    "description" "text",
    "actif" boolean DEFAULT true,
    "date_debut" "date",
    "date_fin" "date"
);


ALTER TABLE "public"."parametres_generaux" OWNER TO "postgres";


ALTER TABLE "public"."parametres_generaux" ALTER COLUMN "id_parametre_generaux" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."parametres_generaux_id_parametre_generaux_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."periodes" (
    "periode" "text" NOT NULL,
    "annee" integer NOT NULL,
    "trimestre" integer NOT NULL,
    "statut" "text" DEFAULT 'OUVERTE'::"text" NOT NULL,
    "date_cloture" timestamp with time zone,
    "cloture_par" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date_ouverture" "date",
    "date_cloture_prevue" "date",
    "date_cloture_effective" "date",
    CONSTRAINT "periodes_precompte_statut_check" CHECK (("statut" = ANY (ARRAY['OUVERTE'::"text", 'CLOTUREE'::"text"]))),
    CONSTRAINT "periodes_precompte_trimestre_check" CHECK ((("trimestre" >= 1) AND ("trimestre" <= 4)))
);


ALTER TABLE "public"."periodes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pieces_justificatives" (
    "id_piece_justificative" bigint NOT NULL,
    "id_prestation" bigint NOT NULL,
    "libelle_piece" character varying(120) NOT NULL,
    "obligatoire" boolean DEFAULT true,
    "recue" boolean DEFAULT false,
    "date_reception" "date",
    "fichier_url" "text",
    "observation" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."pieces_justificatives" OWNER TO "postgres";


ALTER TABLE "public"."pieces_justificatives" ALTER COLUMN "id_piece_justificative" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pieces_justificatives_id_piece_justificative_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."precomptes" (
    "id_precompte" bigint NOT NULL,
    "matricule" character varying(10) NOT NULL,
    "periode" character varying(20),
    "montant_depart" numeric(18,2) DEFAULT 0 NOT NULL,
    "montant_retour" numeric(18,2) DEFAULT 0,
    "annee" integer,
    "trimestre" integer,
    "statut_precompte" character varying(30) DEFAULT 'GENERE'::character varying,
    "date_generation" "date",
    "date_retour" "date",
    "id_cotisation_detail" bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "montant_cotisation_brut" numeric(15,2) NOT NULL,
    "montant_credit_spontane" numeric(15,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "chk_precomptes_montants" CHECK ((("montant_depart" >= (0)::numeric) AND ("montant_retour" >= (0)::numeric))),
    CONSTRAINT "chk_precomptes_trimestre" CHECK ((("trimestre" IS NULL) OR (("trimestre" >= 1) AND ("trimestre" <= 4))))
);


ALTER TABLE "public"."precomptes" OWNER TO "postgres";


ALTER TABLE "public"."precomptes" ALTER COLUMN "id_precompte" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."precomptes_id_precompte_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."prestations" (
    "id_prestation" bigint NOT NULL,
    "id_adherent" bigint NOT NULL,
    "type_prestation" character varying(30) NOT NULL,
    "date_evenement" "date",
    "date_demande" "date" DEFAULT CURRENT_DATE,
    "statut_prestation" character varying(30) DEFAULT 'DOSSIER_OUVERT'::character varying,
    "montant_du" numeric(18,2) DEFAULT 0 NOT NULL,
    "montant_paye" numeric(18,2) DEFAULT 0 NOT NULL,
    "date_validation" "date",
    "date_paiement" "date",
    "observation" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "chk_prestations_montants" CHECK ((("montant_du" >= (0)::numeric) AND ("montant_paye" >= (0)::numeric))),
    CONSTRAINT "chk_prestations_type" CHECK ((("type_prestation")::"text" = ANY ((ARRAY['RETRAITE'::character varying, 'DECES'::character varying, 'INVALIDITE'::character varying, 'RACHAT'::character varying])::"text"[])))
);


ALTER TABLE "public"."prestations" OWNER TO "postgres";


ALTER TABLE "public"."prestations" ALTER COLUMN "id_prestation" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."prestations_id_prestation_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profils" (
    "id_profil" bigint NOT NULL,
    "code_profil" character varying(40) NOT NULL,
    "lib_profil" character varying(80) NOT NULL,
    "liste_fonctions" character varying(500),
    "etat" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."profils" OWNER TO "postgres";


ALTER TABLE "public"."profils" ALTER COLUMN "id_profil" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."profils_id_profil_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."provisions_maths" (
    "id_provision_maths" bigint NOT NULL,
    "id_adherent" bigint NOT NULL,
    "date_calcul" "date" NOT NULL,
    "trimestre_courus" numeric(6,0) DEFAULT 0,
    "pp" numeric(18,2) DEFAULT 0 NOT NULL,
    "ip" numeric(18,8) DEFAULT 0 NOT NULL,
    "pm_calculee" numeric(18,2) DEFAULT 0 NOT NULL,
    "source_calc" character varying(80),
    "hash_params" character varying(128),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "chk_provisions_maths_montants" CHECK ((("trimestre_courus" >= (0)::numeric) AND ("pp" >= (0)::numeric) AND ("ip" >= (0)::numeric) AND ("pm_calculee" >= (0)::numeric)))
);


ALTER TABLE "public"."provisions_maths" OWNER TO "postgres";


ALTER TABLE "public"."provisions_maths" ALTER COLUMN "id_provision_maths" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."provisions_maths_id_provision_maths_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."rachat_evenements" (
    "id_evenement" bigint NOT NULL,
    "id_rachat" bigint NOT NULL,
    "ancien_statut" character varying(30),
    "nouveau_statut" character varying(30) NOT NULL,
    "utilisateur" character varying(100) NOT NULL,
    "observation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rachat_evenements" OWNER TO "postgres";


ALTER TABLE "public"."rachat_evenements" ALTER COLUMN "id_evenement" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."rachat_evenements_id_evenement_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."rachats" ALTER COLUMN "id_rachat" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."rachats_id_rachat_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."rente_versements" ALTER COLUMN "id_rente_versement" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."rente_versements_id_rente_versement_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."rentes" (
    "id_rente" bigint NOT NULL,
    "id_adherent" bigint NOT NULL,
    "date_debut" "date",
    "date_fin" "date",
    "couverture_pourc" numeric(8,4) DEFAULT 100,
    "frais_rente" numeric(8,4) DEFAULT 5,
    "table_code" character varying(40) DEFAULT 'CIMA-F'::character varying,
    "statut_rente" character varying(30) DEFAULT 'ACTIVE'::character varying,
    "capital_initial" numeric(18,2) DEFAULT 0 NOT NULL,
    "capital_restant" numeric(18,2) DEFAULT 0 NOT NULL,
    "observation" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "id_prestation" bigint,
    "date_effet" "date",
    "date_retraite" "date",
    "cotisation_maladie_annuelle" numeric(15,2) DEFAULT 0 NOT NULL,
    "montant_trimestriel" numeric(15,2) DEFAULT 0 NOT NULL,
    "taux_couverture" numeric(7,4) DEFAULT 100 NOT NULL,
    "taux_frais_gestion" numeric(7,4) DEFAULT 5 NOT NULL,
    "organisme_beneficiaire" "text" DEFAULT 'APS'::"text" NOT NULL,
    "reference_aps" "text",
    "date_suspension" "date",
    "motif_suspension" "text",
    "date_extinction" "date",
    "motif_extinction" "text",
    "version_calcul" "text",
    CONSTRAINT "chk_rentes_montants" CHECK ((("capital_initial" >= (0)::numeric) AND ("capital_restant" >= (0)::numeric) AND ("couverture_pourc" >= (0)::numeric) AND ("frais_rente" >= (0)::numeric)))
);


ALTER TABLE "public"."rentes" OWNER TO "postgres";


COMMENT ON TABLE "public"."rentes" IS 'Rentes viageres servant a financer la cotisation maladie des retraites ESR.';



ALTER TABLE "public"."rentes" ALTER COLUMN "id_rente" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."rentes_id_rente_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."resumes_cloture_esr" (
    "id_resume" bigint NOT NULL,
    "periode" "text" NOT NULL,
    "nb_adherents" integer NOT NULL,
    "capital_global" numeric(18,2) DEFAULT 0 NOT NULL,
    "pm_totale" numeric(18,2) DEFAULT 0 NOT NULL,
    "date_cloture" "date" NOT NULL,
    "version_calc" "text" NOT NULL,
    "cloture_par" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."resumes_cloture_esr" OWNER TO "postgres";


ALTER TABLE "public"."resumes_cloture_esr" ALTER COLUMN "id_resume" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."resumes_cloture_esr_id_resume_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id_role" bigint NOT NULL,
    "code_role" character varying(80) NOT NULL,
    "libelle_role" character varying(120) NOT NULL,
    "actif" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


ALTER TABLE "public"."roles" ALTER COLUMN "id_role" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."roles_id_role_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."situations_matrimoniales" (
    "id_situation_matrimoniale" bigint NOT NULL,
    "libelle_situation" character varying(80) NOT NULL,
    "actif" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."situations_matrimoniales" OWNER TO "postgres";


ALTER TABLE "public"."situations_matrimoniales" ALTER COLUMN "id_situation_matrimoniale" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."situations_matrimoniales_id_situation_matrimoniale_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id_user_role" bigint NOT NULL,
    "id_utilisateur" bigint NOT NULL,
    "id_role" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE "public"."user_roles" ALTER COLUMN "id_user_role" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_roles_id_user_role_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."utilisateurs" (
    "id_utilisateur" bigint NOT NULL,
    "auth_user_id" "uuid",
    "matricule" character varying(10) NOT NULL,
    "email" character varying(120),
    "telephone" character varying(20),
    "user_actif" boolean DEFAULT true,
    "profil" character varying(40) DEFAULT 'ADHERENT'::character varying,
    "id_adherent" bigint,
    "hash_pwd" character varying(120),
    "nb_echec_con" integer DEFAULT 0,
    "date_blocage" timestamp with time zone,
    "chang_mdp" boolean DEFAULT true,
    "date_der_connexion" timestamp with time zone,
    "date_creation" timestamp with time zone DEFAULT "now"(),
    "cree_par" integer,
    "date_modif" timestamp with time zone,
    "modif_par" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "chk_utilisateurs_profil" CHECK ((("profil")::"text" = ANY ((ARRAY['ADHERENT'::character varying, 'GESTIONNAIRE'::character varying, 'ADMINISTRATEUR'::character varying])::"text"[])))
);


ALTER TABLE "public"."utilisateurs" OWNER TO "postgres";


ALTER TABLE "public"."utilisateurs" ALTER COLUMN "id_utilisateur" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."utilisateurs_id_utilisateur_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."v_adherents_complets" WITH ("security_invoker"='true') AS
 SELECT "a"."id_adherent",
    "a"."matricule",
    "a"."nom",
    "a"."prenoms",
    "a"."civilite",
    "a"."sexe",
    "a"."date_naissance",
    "a"."telephone",
    "a"."email",
    "a"."emploi",
    "a"."situation_matrimoniale",
    "a"."date_souscription",
    "a"."statut",
    "a"."etat",
    "a"."decede",
    "a"."retraite",
    "ic"."id_info_cotisation",
    "ic"."grade",
    "ic"."id_grade",
    "ic"."age_retraite",
    "ic"."date_retraite",
    "ic"."date_precompte",
    "ic"."date_effet",
    "ic"."nb_trimestre",
    "ic"."cotisation_annuelle",
    "ic"."cotisation_es",
    "ic"."taux_gar",
    "ic"."frais_rente",
    "ic"."taux_rachat",
    "ce"."id_compte_esr",
    "ce"."capital_acquis",
    "ce"."pm",
    "ce"."pp",
    "ce"."pu",
    "ce"."valeur_rachat",
    "ce"."date_calcul",
    "ce"."version_calc",
    "u"."id_utilisateur",
    "u"."profil",
    "u"."user_actif"
   FROM ((("public"."adherents" "a"
     LEFT JOIN "public"."info_cotisations" "ic" ON ((("ic"."id_adherent" = "a"."id_adherent") AND ("ic"."info_actif" = true))))
     LEFT JOIN "public"."comptes_esr" "ce" ON (("ce"."id_adherent" = "a"."id_adherent")))
     LEFT JOIN "public"."utilisateurs" "u" ON (("u"."id_adherent" = "a"."id_adherent")));


ALTER VIEW "public"."v_adherents_complets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_comptes_esr_details" WITH ("security_invoker"='true') AS
 SELECT "ce"."id_compte_esr",
    "ce"."id_adherent",
    "a"."matricule",
    "a"."nom",
    "a"."prenoms",
    "ce"."capital_acquis",
    "ce"."pm",
    "ce"."pp",
    "ce"."pu",
    "ce"."valeur_rachat",
    "ce"."date_calcul",
    "ce"."version_calc"
   FROM ("public"."comptes_esr" "ce"
     JOIN "public"."adherents" "a" ON (("a"."id_adherent" = "ce"."id_adherent")));


ALTER VIEW "public"."v_comptes_esr_details" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cotisations_details" WITH ("security_invoker"='true') AS
 SELECT "cd"."id_cotisation_detail",
    "ce"."id_cotisation_entete",
    "ce"."id_adherent",
    "a"."matricule",
    "a"."nom",
    "a"."prenoms",
    "ce"."mode",
    "ce"."reference",
    "ce"."periode_deb",
    "ce"."periode_fin",
    "ce"."statut" AS "statut_entete",
    "cd"."periode",
    "cd"."date_valeur",
    "cd"."montant",
    "cd"."source",
    "cd"."statut" AS "statut_detail"
   FROM (("public"."cotisation_details" "cd"
     JOIN "public"."cotisation_entetes" "ce" ON (("ce"."id_cotisation_entete" = "cd"."id_cotisation_entete")))
     JOIN "public"."adherents" "a" ON (("a"."id_adherent" = "ce"."id_adherent")));


ALTER VIEW "public"."v_cotisations_details" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_dashboard_global" WITH ("security_invoker"='true') AS
 SELECT "count"(*) FILTER (WHERE ("a"."statut" = true)) AS "nb_adherents_actifs",
    "count"(*) FILTER (WHERE ("a"."statut" = false)) AS "nb_adherents_inactifs",
    "count"(*) FILTER (WHERE ("a"."retraite" = true)) AS "nb_retraites",
    "count"(*) FILTER (WHERE ("a"."decede" = true)) AS "nb_decedes",
    COALESCE("sum"("ce"."capital_acquis"), (0)::numeric) AS "total_capital_acquis",
    COALESCE("sum"("ce"."pm"), (0)::numeric) AS "total_pm",
    COALESCE("sum"("ce"."valeur_rachat"), (0)::numeric) AS "total_valeur_rachat"
   FROM ("public"."adherents" "a"
     LEFT JOIN "public"."comptes_esr" "ce" ON (("ce"."id_adherent" = "a"."id_adherent")));


ALTER VIEW "public"."v_dashboard_global" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_precomptes_details" WITH ("security_invoker"='true') AS
 SELECT "p"."id_precompte",
    "p"."matricule",
    "a"."id_adherent",
    "a"."nom",
    "a"."prenoms",
    "p"."periode",
    "p"."annee",
    "p"."trimestre",
    "p"."montant_depart",
    "p"."montant_retour",
    "p"."statut_precompte",
    "p"."date_generation",
    "p"."date_retour",
    "p"."id_cotisation_detail"
   FROM ("public"."precomptes" "p"
     LEFT JOIN "public"."adherents" "a" ON ((("a"."matricule")::"text" = ("p"."matricule")::"text")));


ALTER VIEW "public"."v_precomptes_details" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_prestations_details" WITH ("security_invoker"='true') AS
 SELECT "p"."id_prestation",
    "p"."id_adherent",
    "a"."matricule",
    "a"."nom",
    "a"."prenoms",
    "p"."type_prestation",
    "p"."date_evenement",
    "p"."date_demande",
    "p"."statut_prestation",
    "p"."montant_du",
    "p"."montant_paye",
    "p"."date_validation",
    "p"."date_paiement",
    "p"."observation"
   FROM ("public"."prestations" "p"
     JOIN "public"."adherents" "a" ON (("a"."id_adherent" = "p"."id_adherent")));


ALTER VIEW "public"."v_prestations_details" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_rachats_details" AS
 SELECT "r"."id_rachat",
    "r"."id_adherent",
    "r"."date_demande",
    "r"."date_arrete",
    "r"."motif",
    "r"."statut",
    "r"."capital_verse",
    "r"."provision_mathematique",
    "r"."taux_frais_gestion",
    "r"."frais_gestion",
    "r"."taux_penalite",
    "r"."penalite",
    "r"."montant_net",
    "r"."nombre_mouvements",
    "r"."anciennete_annees",
    "r"."version_calcul",
    "r"."parametres_json",
    "r"."mouvements_json",
    "r"."cree_par",
    "r"."controle_par",
    "r"."valide_par",
    "r"."paye_par",
    "r"."date_controle",
    "r"."date_validation",
    "r"."date_paiement",
    "r"."reference_paiement",
    "r"."mode_paiement",
    "r"."observation",
    "r"."created_at",
    "r"."updated_at",
    "a"."matricule",
    "a"."nom",
    "a"."prenoms",
    "a"."date_souscription"
   FROM ("public"."rachats" "r"
     JOIN "public"."adherents" "a" ON (("a"."id_adherent" = "r"."id_adherent")));


ALTER VIEW "public"."v_rachats_details" OWNER TO "postgres";


ALTER TABLE ONLY "public"."adherents"
    ADD CONSTRAINT "adherents_matricule_key" UNIQUE ("matricule");



ALTER TABLE ONLY "public"."adherents"
    ADD CONSTRAINT "adherents_pkey" PRIMARY KEY ("id_adherent");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id_audit");



ALTER TABLE ONLY "public"."beneficiaires"
    ADD CONSTRAINT "beneficiaires_pkey" PRIMARY KEY ("id_beneficiaire");



ALTER TABLE ONLY "public"."civilites"
    ADD CONSTRAINT "civilites_libelle_civilite_key" UNIQUE ("libelle_civilite");



ALTER TABLE ONLY "public"."civilites"
    ADD CONSTRAINT "civilites_pkey" PRIMARY KEY ("id_civilite");



ALTER TABLE ONLY "public"."comptes_esr"
    ADD CONSTRAINT "comptes_esr_pkey" PRIMARY KEY ("id_compte_esr");



ALTER TABLE ONLY "public"."comptes_esr"
    ADD CONSTRAINT "comptes_esr_unique_adherent" UNIQUE ("id_adherent");



ALTER TABLE ONLY "public"."cotisation_details"
    ADD CONSTRAINT "cotisation_details_pkey" PRIMARY KEY ("id_cotisation_detail");



ALTER TABLE ONLY "public"."cotisation_entetes"
    ADD CONSTRAINT "cotisation_entetes_pkey" PRIMARY KEY ("id_cotisation_entete");



ALTER TABLE ONLY "public"."emplois"
    ADD CONSTRAINT "emplois_libelle_emploi_key" UNIQUE ("libelle_emploi");



ALTER TABLE ONLY "public"."emplois"
    ADD CONSTRAINT "emplois_pkey" PRIMARY KEY ("id_emploi");



ALTER TABLE ONLY "public"."fonctions"
    ADD CONSTRAINT "fonctions_libelle_fonction_key" UNIQUE ("libelle_fonction");



ALTER TABLE ONLY "public"."fonctions"
    ADD CONSTRAINT "fonctions_pkey" PRIMARY KEY ("id_fonction");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_libelle_grade_key" UNIQUE ("libelle_grade");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_pkey" PRIMARY KEY ("id_grade");



ALTER TABLE ONLY "public"."historique_actuariel_esr"
    ADD CONSTRAINT "historique_actuariel_esr_id_adherent_periode_key" UNIQUE ("id_adherent", "periode");



ALTER TABLE ONLY "public"."historique_actuariel_esr"
    ADD CONSTRAINT "historique_actuariel_esr_pkey" PRIMARY KEY ("id_historique");



ALTER TABLE ONLY "public"."historique_cotisations_esr"
    ADD CONSTRAINT "historique_cotisations_esr_id_adherent_periode_key" UNIQUE ("id_adherent", "periode");



ALTER TABLE ONLY "public"."historique_cotisations_esr"
    ADD CONSTRAINT "historique_cotisations_esr_pkey" PRIMARY KEY ("id_historique");



ALTER TABLE ONLY "public"."historique_cotisations"
    ADD CONSTRAINT "historique_cotisations_pkey" PRIMARY KEY ("id_historique_cotisation");



ALTER TABLE ONLY "public"."imputations_paiements_spontanes"
    ADD CONSTRAINT "imputations_paiements_spontan_id_cotisation_detail_spontane_key" UNIQUE ("id_cotisation_detail_spontanee", "id_precompte");



ALTER TABLE ONLY "public"."imputations_paiements_spontanes"
    ADD CONSTRAINT "imputations_paiements_spontanes_pkey" PRIMARY KEY ("id_imputation");



ALTER TABLE ONLY "public"."info_cotisations"
    ADD CONSTRAINT "info_cotisations_pkey" PRIMARY KEY ("id_info_cotisation");



ALTER TABLE ONLY "public"."liens_beneficiaires"
    ADD CONSTRAINT "liens_beneficiaires_libelle_lien_key" UNIQUE ("libelle_lien");



ALTER TABLE ONLY "public"."liens_beneficiaires"
    ADD CONSTRAINT "liens_beneficiaires_pkey" PRIMARY KEY ("id_lien_beneficiaire");



ALTER TABLE ONLY "public"."mortalite"
    ADD CONSTRAINT "mortalite_pkey" PRIMARY KEY ("age_mort");



ALTER TABLE ONLY "public"."paiements"
    ADD CONSTRAINT "paiements_pkey" PRIMARY KEY ("id_paiement");



ALTER TABLE ONLY "public"."param_repartitions"
    ADD CONSTRAINT "param_repartitions_pkey" PRIMARY KEY ("id_param_repartition");



ALTER TABLE ONLY "public"."parametre_versions"
    ADD CONSTRAINT "parametre_versions_pkey" PRIMARY KEY ("id_parametre_version");



ALTER TABLE ONLY "public"."parametres_generaux"
    ADD CONSTRAINT "parametres_generaux_pkey" PRIMARY KEY ("id_parametre_generaux");



ALTER TABLE ONLY "public"."periodes"
    ADD CONSTRAINT "periodes_precompte_pkey" PRIMARY KEY ("periode");



ALTER TABLE ONLY "public"."pieces_justificatives"
    ADD CONSTRAINT "pieces_justificatives_pkey" PRIMARY KEY ("id_piece_justificative");



ALTER TABLE ONLY "public"."precomptes"
    ADD CONSTRAINT "precomptes_pkey" PRIMARY KEY ("id_precompte");



ALTER TABLE ONLY "public"."prestations"
    ADD CONSTRAINT "prestations_pkey" PRIMARY KEY ("id_prestation");



ALTER TABLE ONLY "public"."profils"
    ADD CONSTRAINT "profils_code_profil_key" UNIQUE ("code_profil");



ALTER TABLE ONLY "public"."profils"
    ADD CONSTRAINT "profils_pkey" PRIMARY KEY ("id_profil");



ALTER TABLE ONLY "public"."provisions_maths"
    ADD CONSTRAINT "provisions_maths_pkey" PRIMARY KEY ("id_provision_maths");



ALTER TABLE ONLY "public"."rachat_evenements"
    ADD CONSTRAINT "rachat_evenements_pkey" PRIMARY KEY ("id_evenement");



ALTER TABLE ONLY "public"."rachats"
    ADD CONSTRAINT "rachats_pkey" PRIMARY KEY ("id_rachat");



ALTER TABLE ONLY "public"."rente_versements"
    ADD CONSTRAINT "rente_versements_pkey" PRIMARY KEY ("id_rente_versement");



ALTER TABLE ONLY "public"."rentes"
    ADD CONSTRAINT "rentes_pkey" PRIMARY KEY ("id_rente");



ALTER TABLE ONLY "public"."resumes_cloture_esr"
    ADD CONSTRAINT "resumes_cloture_esr_periode_key" UNIQUE ("periode");



ALTER TABLE ONLY "public"."resumes_cloture_esr"
    ADD CONSTRAINT "resumes_cloture_esr_pkey" PRIMARY KEY ("id_resume");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_code_role_key" UNIQUE ("code_role");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id_role");



ALTER TABLE ONLY "public"."situations_matrimoniales"
    ADD CONSTRAINT "situations_matrimoniales_libelle_situation_key" UNIQUE ("libelle_situation");



ALTER TABLE ONLY "public"."situations_matrimoniales"
    ADD CONSTRAINT "situations_matrimoniales_pkey" PRIMARY KEY ("id_situation_matrimoniale");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_id_utilisateur_id_role_key" UNIQUE ("id_utilisateur", "id_role");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id_user_role");



ALTER TABLE ONLY "public"."utilisateurs"
    ADD CONSTRAINT "utilisateurs_matricule_key" UNIQUE ("matricule");



ALTER TABLE ONLY "public"."utilisateurs"
    ADD CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id_utilisateur");



ALTER TABLE ONLY "public"."utilisateurs"
    ADD CONSTRAINT "utilisateurs_unique_adherent" UNIQUE ("id_adherent");



CREATE INDEX "idx_adherents_matricule" ON "public"."adherents" USING "btree" ("matricule");



CREATE INDEX "idx_adherents_nom_prenoms" ON "public"."adherents" USING "btree" ("nom", "prenoms");



CREATE INDEX "idx_adherents_statut" ON "public"."adherents" USING "btree" ("statut");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_horodatage" ON "public"."audit_logs" USING "btree" ("horodatage");



CREATE INDEX "idx_audit_logs_objet" ON "public"."audit_logs" USING "btree" ("objet_audit", "id_objet");



CREATE INDEX "idx_audit_logs_utilisateur" ON "public"."audit_logs" USING "btree" ("utilisateur");



CREATE INDEX "idx_beneficiaires_adherent" ON "public"."beneficiaires" USING "btree" ("id_adherent");



CREATE INDEX "idx_beneficiaires_lien" ON "public"."beneficiaires" USING "btree" ("lien");



CREATE INDEX "idx_comptes_esr_adherent" ON "public"."comptes_esr" USING "btree" ("id_adherent");



CREATE INDEX "idx_comptes_esr_date_calcul" ON "public"."comptes_esr" USING "btree" ("date_calcul");



CREATE INDEX "idx_cotisation_details_entete" ON "public"."cotisation_details" USING "btree" ("id_cotisation_entete");



CREATE INDEX "idx_cotisation_details_id_precompte" ON "public"."cotisation_details" USING "btree" ("id_precompte") WHERE ("id_precompte" IS NOT NULL);



CREATE INDEX "idx_cotisation_details_periode" ON "public"."cotisation_details" USING "btree" ("periode");



CREATE INDEX "idx_cotisation_details_statut" ON "public"."cotisation_details" USING "btree" ("statut");



CREATE INDEX "idx_cotisation_entetes_adherent" ON "public"."cotisation_entetes" USING "btree" ("id_adherent");



CREATE INDEX "idx_cotisation_entetes_reference" ON "public"."cotisation_entetes" USING "btree" ("reference");



CREATE INDEX "idx_cotisation_entetes_statut" ON "public"."cotisation_entetes" USING "btree" ("statut");



CREATE INDEX "idx_echeances_aps_statut_periode" ON "public"."rente_versements" USING "btree" ("annee", "trimestre", "statut");



CREATE INDEX "idx_historique_cotisations_adherent" ON "public"."historique_cotisations" USING "btree" ("id_adherent");



CREATE INDEX "idx_historique_cotisations_date_valeur" ON "public"."historique_cotisations" USING "btree" ("date_valeur");



CREATE INDEX "idx_historique_cotisations_periode" ON "public"."historique_cotisations" USING "btree" ("periode");



CREATE INDEX "idx_imputations_spontanees_detail" ON "public"."imputations_paiements_spontanes" USING "btree" ("id_cotisation_detail_spontanee");



CREATE INDEX "idx_imputations_spontanees_precompte" ON "public"."imputations_paiements_spontanes" USING "btree" ("id_precompte");



CREATE INDEX "idx_info_cotisations_actif" ON "public"."info_cotisations" USING "btree" ("id_adherent", "info_actif");



CREATE INDEX "idx_info_cotisations_adherent" ON "public"."info_cotisations" USING "btree" ("id_adherent");



CREATE INDEX "idx_info_cotisations_grade" ON "public"."info_cotisations" USING "btree" ("grade");



CREATE UNIQUE INDEX "idx_info_cotisations_unique_active" ON "public"."info_cotisations" USING "btree" ("id_adherent") WHERE ("info_actif" = true);



CREATE INDEX "idx_paiements_adherent" ON "public"."paiements" USING "btree" ("id_adherent");



CREATE INDEX "idx_paiements_cotisation_detail" ON "public"."paiements" USING "btree" ("id_cotisation_detail");



CREATE INDEX "idx_paiements_date" ON "public"."paiements" USING "btree" ("date_paiement");



CREATE INDEX "idx_paiements_origine" ON "public"."paiements" USING "btree" ("origine_paiement");



CREATE INDEX "idx_periodes_precompte_statut" ON "public"."periodes" USING "btree" ("statut");



CREATE INDEX "idx_periodes_statut" ON "public"."periodes" USING "btree" ("statut");



CREATE INDEX "idx_pieces_justificatives_prestation" ON "public"."pieces_justificatives" USING "btree" ("id_prestation");



CREATE INDEX "idx_pieces_justificatives_recue" ON "public"."pieces_justificatives" USING "btree" ("recue");



CREATE INDEX "idx_precomptes_annee_trimestre" ON "public"."precomptes" USING "btree" ("annee", "trimestre");



CREATE INDEX "idx_precomptes_cotisation_detail" ON "public"."precomptes" USING "btree" ("id_cotisation_detail");



CREATE INDEX "idx_precomptes_matricule" ON "public"."precomptes" USING "btree" ("matricule");



CREATE INDEX "idx_precomptes_periode" ON "public"."precomptes" USING "btree" ("periode");



CREATE INDEX "idx_precomptes_statut" ON "public"."precomptes" USING "btree" ("statut_precompte");



CREATE UNIQUE INDEX "idx_precomptes_unique_ligne" ON "public"."precomptes" USING "btree" ("matricule", "periode", "id_cotisation_detail") WHERE ("id_cotisation_detail" IS NOT NULL);



CREATE INDEX "idx_prestations_adherent" ON "public"."prestations" USING "btree" ("id_adherent");



CREATE INDEX "idx_prestations_date_evenement" ON "public"."prestations" USING "btree" ("date_evenement");



CREATE INDEX "idx_prestations_statut" ON "public"."prestations" USING "btree" ("statut_prestation");



CREATE INDEX "idx_prestations_type" ON "public"."prestations" USING "btree" ("type_prestation");



CREATE INDEX "idx_provisions_maths_adherent" ON "public"."provisions_maths" USING "btree" ("id_adherent");



CREATE INDEX "idx_provisions_maths_date_calcul" ON "public"."provisions_maths" USING "btree" ("date_calcul");



CREATE INDEX "idx_provisions_maths_hash_params" ON "public"."provisions_maths" USING "btree" ("hash_params");



CREATE INDEX "idx_rente_versements_periode" ON "public"."rente_versements" USING "btree" ("periode");



CREATE INDEX "idx_rente_versements_rente" ON "public"."rente_versements" USING "btree" ("id_rente");



CREATE INDEX "idx_rente_versements_statut" ON "public"."rente_versements" USING "btree" ("statut_rente_vers");



CREATE INDEX "idx_rentes_adherent" ON "public"."rentes" USING "btree" ("id_adherent");



CREATE INDEX "idx_rentes_statut" ON "public"."rentes" USING "btree" ("statut_rente");



CREATE INDEX "idx_roles_code_role" ON "public"."roles" USING "btree" ("code_role");



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("id_role");



CREATE INDEX "idx_user_roles_utilisateur" ON "public"."user_roles" USING "btree" ("id_utilisateur");



CREATE INDEX "idx_utilisateurs_auth_user_id" ON "public"."utilisateurs" USING "btree" ("auth_user_id");



CREATE INDEX "idx_utilisateurs_id_adherent" ON "public"."utilisateurs" USING "btree" ("id_adherent");



CREATE INDEX "idx_utilisateurs_matricule" ON "public"."utilisateurs" USING "btree" ("matricule");



CREATE INDEX "idx_utilisateurs_profil" ON "public"."utilisateurs" USING "btree" ("profil");



CREATE INDEX "idx_utilisateurs_user_actif" ON "public"."utilisateurs" USING "btree" ("user_actif");



CREATE INDEX "ix_paiements_id_precompte" ON "public"."paiements" USING "btree" ("id_precompte") WHERE ("id_precompte" IS NOT NULL);



CREATE INDEX "ix_rachats_date_statut" ON "public"."rachats" USING "btree" ("date_demande" DESC, "statut");



CREATE UNIQUE INDEX "uq_civilites_libelle_civilite" ON "public"."civilites" USING "btree" ("libelle_civilite");



CREATE UNIQUE INDEX "uq_echeance_rente_trimestre" ON "public"."rente_versements" USING "btree" ("id_rente", "annee", "trimestre") WHERE (("annee" IS NOT NULL) AND ("trimestre" IS NOT NULL));



CREATE UNIQUE INDEX "uq_emplois_libelle_emploi" ON "public"."emplois" USING "btree" ("libelle_emploi");



CREATE UNIQUE INDEX "uq_fonctions_libelle_fonction" ON "public"."fonctions" USING "btree" ("libelle_fonction");



CREATE UNIQUE INDEX "uq_grades_libelle_grade" ON "public"."grades" USING "btree" ("libelle_grade");



CREATE UNIQUE INDEX "uq_liens_beneficiaires_libelle_lien" ON "public"."liens_beneficiaires" USING "btree" ("libelle_lien");



CREATE UNIQUE INDEX "uq_mortalite_age_mort" ON "public"."mortalite" USING "btree" ("age_mort");



CREATE UNIQUE INDEX "uq_paiement_cheque_banque_numero" ON "public"."paiements" USING "btree" ("upper"(("banque_emettrice")::"text"), "upper"(("numero_cheque")::"text")) WHERE ((("moyen")::"text" = 'CHEQUE'::"text") AND ("numero_cheque" IS NOT NULL));



CREATE UNIQUE INDEX "uq_parametres_generaux_code" ON "public"."parametres_generaux" USING "btree" ("code");



CREATE UNIQUE INDEX "uq_rente_active_par_adherent" ON "public"."rentes" USING "btree" ("id_adherent") WHERE (("statut_rente")::"text" = ANY ((ARRAY['EN_ATTENTE'::character varying, 'ACTIVE'::character varying, 'SUSPENDUE'::character varying])::"text"[]));



CREATE UNIQUE INDEX "uq_situations_matrimoniales_libelle" ON "public"."situations_matrimoniales" USING "btree" ("libelle_situation");



CREATE UNIQUE INDEX "ux_rachats_dossier_actif" ON "public"."rachats" USING "btree" ("id_adherent") WHERE (("statut")::"text" <> ALL ((ARRAY['PAYE'::character varying, 'REJETE'::character varying, 'ANNULE'::character varying])::"text"[]));



CREATE OR REPLACE TRIGGER "trg_adherents_updated_at" BEFORE UPDATE ON "public"."adherents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_beneficiaires_updated_at" BEFORE UPDATE ON "public"."beneficiaires" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_civilites_updated_at" BEFORE UPDATE ON "public"."civilites" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_comptes_esr_updated_at" BEFORE UPDATE ON "public"."comptes_esr" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cotisation_actualiser_pp_pu" AFTER INSERT OR DELETE OR UPDATE ON "public"."cotisation_details" FOR EACH ROW EXECUTE FUNCTION "public"."trg_actualiser_pp_pu_compte_esr"();



CREATE OR REPLACE TRIGGER "trg_cotisation_details_updated_at" BEFORE UPDATE ON "public"."cotisation_details" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cotisation_entetes_updated_at" BEFORE UPDATE ON "public"."cotisation_entetes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_emplois_updated_at" BEFORE UPDATE ON "public"."emplois" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_fonctions_updated_at" BEFORE UPDATE ON "public"."fonctions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_grades_updated_at" BEFORE UPDATE ON "public"."grades" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_historique_cotisations_updated_at" BEFORE UPDATE ON "public"."historique_cotisations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_info_cotisations_updated_at" BEFORE UPDATE ON "public"."info_cotisations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_liens_beneficiaires_updated_at" BEFORE UPDATE ON "public"."liens_beneficiaires" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_paiements_updated_at" BEFORE UPDATE ON "public"."paiements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_param_repartitions_updated_at" BEFORE UPDATE ON "public"."param_repartitions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_parametre_versions_updated_at" BEFORE UPDATE ON "public"."parametre_versions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_parametres_generaux_updated_at" BEFORE UPDATE ON "public"."parametres_generaux" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pieces_justificatives_updated_at" BEFORE UPDATE ON "public"."pieces_justificatives" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_precomptes_updated_at" BEFORE UPDATE ON "public"."precomptes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prestations_updated_at" BEFORE UPDATE ON "public"."prestations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profils_updated_at" BEFORE UPDATE ON "public"."profils" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_provisions_maths_updated_at" BEFORE UPDATE ON "public"."provisions_maths" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rente_versements_updated_at" BEFORE UPDATE ON "public"."rente_versements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rentes_updated_at" BEFORE UPDATE ON "public"."rentes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_roles_updated_at" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_situations_matrimoniales_updated_at" BEFORE UPDATE ON "public"."situations_matrimoniales" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_utilisateurs_updated_at" BEFORE UPDATE ON "public"."utilisateurs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_verifier_echeance_rente_sante" BEFORE INSERT OR UPDATE ON "public"."rente_versements" FOR EACH ROW EXECUTE FUNCTION "public"."verifier_echeance_rente_sante"();



ALTER TABLE ONLY "public"."beneficiaires"
    ADD CONSTRAINT "beneficiaires_id_adherent_fkey" FOREIGN KEY ("id_adherent") REFERENCES "public"."adherents"("id_adherent") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comptes_esr"
    ADD CONSTRAINT "comptes_esr_id_adherent_fkey" FOREIGN KEY ("id_adherent") REFERENCES "public"."adherents"("id_adherent") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cotisation_details"
    ADD CONSTRAINT "cotisation_details_id_cotisation_entete_fkey" FOREIGN KEY ("id_cotisation_entete") REFERENCES "public"."cotisation_entetes"("id_cotisation_entete") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cotisation_details"
    ADD CONSTRAINT "cotisation_details_id_precompte_fkey" FOREIGN KEY ("id_precompte") REFERENCES "public"."precomptes"("id_precompte");



ALTER TABLE ONLY "public"."cotisation_entetes"
    ADD CONSTRAINT "cotisation_entetes_id_adherent_fkey" FOREIGN KEY ("id_adherent") REFERENCES "public"."adherents"("id_adherent") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."historique_actuariel_esr"
    ADD CONSTRAINT "historique_actuariel_esr_periode_fkey" FOREIGN KEY ("periode") REFERENCES "public"."periodes"("periode");



ALTER TABLE ONLY "public"."historique_cotisations_esr"
    ADD CONSTRAINT "historique_cotisations_esr_cree_par_fkey" FOREIGN KEY ("cree_par") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."historique_cotisations_esr"
    ADD CONSTRAINT "historique_cotisations_esr_periode_fkey" FOREIGN KEY ("periode") REFERENCES "public"."periodes"("periode");



ALTER TABLE ONLY "public"."historique_cotisations"
    ADD CONSTRAINT "historique_cotisations_id_adherent_fkey" FOREIGN KEY ("id_adherent") REFERENCES "public"."adherents"("id_adherent") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."imputations_paiements_spontanes"
    ADD CONSTRAINT "imputations_paiements_spontan_id_cotisation_detail_spontan_fkey" FOREIGN KEY ("id_cotisation_detail_spontanee") REFERENCES "public"."cotisation_details"("id_cotisation_detail") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."imputations_paiements_spontanes"
    ADD CONSTRAINT "imputations_paiements_spontanes_id_precompte_fkey" FOREIGN KEY ("id_precompte") REFERENCES "public"."precomptes"("id_precompte") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."info_cotisations"
    ADD CONSTRAINT "info_cotisations_id_adherent_fkey" FOREIGN KEY ("id_adherent") REFERENCES "public"."adherents"("id_adherent") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."info_cotisations"
    ADD CONSTRAINT "info_cotisations_id_grade_fkey" FOREIGN KEY ("id_grade") REFERENCES "public"."grades"("id_grade");



ALTER TABLE ONLY "public"."paiements"
    ADD CONSTRAINT "paiements_id_adherent_fkey" FOREIGN KEY ("id_adherent") REFERENCES "public"."adherents"("id_adherent");



ALTER TABLE ONLY "public"."paiements"
    ADD CONSTRAINT "paiements_id_cotisation_detail_fkey" FOREIGN KEY ("id_cotisation_detail") REFERENCES "public"."cotisation_details"("id_cotisation_detail");



ALTER TABLE ONLY "public"."paiements"
    ADD CONSTRAINT "paiements_id_precompte_fkey" FOREIGN KEY ("id_precompte") REFERENCES "public"."precomptes"("id_precompte");



ALTER TABLE ONLY "public"."periodes"
    ADD CONSTRAINT "periodes_precompte_cloture_par_fkey" FOREIGN KEY ("cloture_par") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pieces_justificatives"
    ADD CONSTRAINT "pieces_justificatives_id_prestation_fkey" FOREIGN KEY ("id_prestation") REFERENCES "public"."prestations"("id_prestation") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."precomptes"
    ADD CONSTRAINT "precomptes_id_cotisation_detail_fkey" FOREIGN KEY ("id_cotisation_detail") REFERENCES "public"."cotisation_details"("id_cotisation_detail");



ALTER TABLE ONLY "public"."prestations"
    ADD CONSTRAINT "prestations_id_adherent_fkey" FOREIGN KEY ("id_adherent") REFERENCES "public"."adherents"("id_adherent") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provisions_maths"
    ADD CONSTRAINT "provisions_maths_id_adherent_fkey" FOREIGN KEY ("id_adherent") REFERENCES "public"."adherents"("id_adherent") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rachat_evenements"
    ADD CONSTRAINT "rachat_evenements_id_rachat_fkey" FOREIGN KEY ("id_rachat") REFERENCES "public"."rachats"("id_rachat") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rachats"
    ADD CONSTRAINT "rachats_id_adherent_fkey" FOREIGN KEY ("id_adherent") REFERENCES "public"."adherents"("id_adherent");



ALTER TABLE ONLY "public"."rente_versements"
    ADD CONSTRAINT "rente_versements_id_rente_fkey" FOREIGN KEY ("id_rente") REFERENCES "public"."rentes"("id_rente") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rentes"
    ADD CONSTRAINT "rentes_id_adherent_fkey" FOREIGN KEY ("id_adherent") REFERENCES "public"."adherents"("id_adherent") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rentes"
    ADD CONSTRAINT "rentes_id_prestation_fkey" FOREIGN KEY ("id_prestation") REFERENCES "public"."prestations"("id_prestation");



ALTER TABLE ONLY "public"."resumes_cloture_esr"
    ADD CONSTRAINT "resumes_cloture_esr_cloture_par_fkey" FOREIGN KEY ("cloture_par") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."resumes_cloture_esr"
    ADD CONSTRAINT "resumes_cloture_esr_periode_fkey" FOREIGN KEY ("periode") REFERENCES "public"."periodes"("periode");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_id_role_fkey" FOREIGN KEY ("id_role") REFERENCES "public"."roles"("id_role") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "public"."utilisateurs"("id_utilisateur") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."utilisateurs"
    ADD CONSTRAINT "utilisateurs_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."utilisateurs"
    ADD CONSTRAINT "utilisateurs_id_adherent_fkey" FOREIGN KEY ("id_adherent") REFERENCES "public"."adherents"("id_adherent");



ALTER TABLE "public"."adherents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "adherents_delete" ON "public"."adherents" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "adherents_insert" ON "public"."adherents" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "adherents_select" ON "public"."adherents" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR ("id_adherent" = "public"."current_user_adherent_id"())));



CREATE POLICY "adherents_update" ON "public"."adherents" FOR UPDATE TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_insert" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "audit_logs_read" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."beneficiaires" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "beneficiaires_delete" ON "public"."beneficiaires" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "beneficiaires_insert" ON "public"."beneficiaires" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "beneficiaires_select" ON "public"."beneficiaires" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR ("id_adherent" = "public"."current_user_adherent_id"())));



CREATE POLICY "beneficiaires_update" ON "public"."beneficiaires" FOR UPDATE TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



ALTER TABLE "public"."civilites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comptes_esr" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comptes_esr_manage" ON "public"."comptes_esr" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "comptes_esr_select" ON "public"."comptes_esr" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR ("id_adherent" = "public"."current_user_adherent_id"())));



ALTER TABLE "public"."cotisation_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cotisation_details_manage" ON "public"."cotisation_details" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "cotisation_details_select" ON "public"."cotisation_details" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."cotisation_entetes" "ce"
  WHERE (("ce"."id_cotisation_entete" = "cotisation_details"."id_cotisation_entete") AND ("ce"."id_adherent" = "public"."current_user_adherent_id"()))))));



ALTER TABLE "public"."cotisation_entetes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cotisation_entetes_manage" ON "public"."cotisation_entetes" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "cotisation_entetes_select" ON "public"."cotisation_entetes" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR ("id_adherent" = "public"."current_user_adherent_id"())));



ALTER TABLE "public"."emplois" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fonctions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."grades" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."historique_actuariel_esr" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."historique_cotisations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."historique_cotisations_esr" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "historique_cotisations_manage" ON "public"."historique_cotisations" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "historique_cotisations_select" ON "public"."historique_cotisations" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR ("id_adherent" = "public"."current_user_adherent_id"())));



ALTER TABLE "public"."imputations_paiements_spontanes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."info_cotisations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "info_cotisations_manage" ON "public"."info_cotisations" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "info_cotisations_select" ON "public"."info_cotisations" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR ("id_adherent" = "public"."current_user_adherent_id"())));



CREATE POLICY "lecture_anon_civilites" ON "public"."civilites" FOR SELECT TO "anon" USING (true);



CREATE POLICY "lecture_anon_emplois" ON "public"."emplois" FOR SELECT TO "anon" USING (true);



CREATE POLICY "lecture_anon_fonctions" ON "public"."fonctions" FOR SELECT TO "anon" USING (true);



CREATE POLICY "lecture_anon_grades" ON "public"."grades" FOR SELECT TO "anon" USING (true);



CREATE POLICY "lecture_anon_liens_beneficiaires" ON "public"."liens_beneficiaires" FOR SELECT TO "anon" USING (true);



CREATE POLICY "lecture_anon_mortalite" ON "public"."mortalite" FOR SELECT TO "anon" USING (true);



CREATE POLICY "lecture_anon_param_repartitions" ON "public"."param_repartitions" FOR SELECT TO "anon" USING (true);



CREATE POLICY "lecture_anon_parametre_versions" ON "public"."parametre_versions" FOR SELECT TO "anon" USING (true);



CREATE POLICY "lecture_anon_parametres_generaux" ON "public"."parametres_generaux" FOR SELECT TO "anon" USING (true);



CREATE POLICY "lecture_anon_situations_matrimoniales" ON "public"."situations_matrimoniales" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."liens_beneficiaires" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mortalite" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paiements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "paiements_manage" ON "public"."paiements" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "paiements_select" ON "public"."paiements" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR ("id_adherent" = "public"."current_user_adherent_id"())));



ALTER TABLE "public"."param_repartitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parametre_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parametres_generaux" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "params_admin_mortalite" ON "public"."mortalite" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "params_admin_param_repartitions" ON "public"."param_repartitions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "params_admin_parametre_versions" ON "public"."parametre_versions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "params_admin_parametres_generaux" ON "public"."parametres_generaux" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "params_read_mortalite" ON "public"."mortalite" FOR SELECT TO "authenticated" USING ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "params_read_param_repartitions" ON "public"."param_repartitions" FOR SELECT TO "authenticated" USING ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "params_read_parametre_versions" ON "public"."parametre_versions" FOR SELECT TO "authenticated" USING ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "params_read_parametres_generaux" ON "public"."parametres_generaux" FOR SELECT TO "authenticated" USING ("public"."is_gestionnaire_or_admin"());



ALTER TABLE "public"."periodes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pieces_justificatives" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pieces_justificatives_manage" ON "public"."pieces_justificatives" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "pieces_justificatives_select" ON "public"."pieces_justificatives" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."prestations" "p"
  WHERE (("p"."id_prestation" = "pieces_justificatives"."id_prestation") AND ("p"."id_adherent" = "public"."current_user_adherent_id"()))))));



ALTER TABLE "public"."precomptes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "precomptes_manage" ON "public"."precomptes" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "precomptes_select" ON "public"."precomptes" FOR SELECT TO "authenticated" USING ("public"."is_gestionnaire_or_admin"());



ALTER TABLE "public"."prestations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prestations_manage" ON "public"."prestations" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "prestations_select" ON "public"."prestations" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR ("id_adherent" = "public"."current_user_adherent_id"())));



ALTER TABLE "public"."profils" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profils_admin" ON "public"."profils" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "profils_read" ON "public"."profils" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."provisions_maths" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provisions_maths_manage" ON "public"."provisions_maths" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "provisions_maths_select" ON "public"."provisions_maths" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR ("id_adherent" = "public"."current_user_adherent_id"())));



ALTER TABLE "public"."rachat_evenements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rachats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ref_admin_civilites" ON "public"."civilites" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ref_admin_emplois" ON "public"."emplois" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ref_admin_fonctions" ON "public"."fonctions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ref_admin_grades" ON "public"."grades" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ref_admin_liens_beneficiaires" ON "public"."liens_beneficiaires" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ref_admin_situations_matrimoniales" ON "public"."situations_matrimoniales" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ref_read_civilites" ON "public"."civilites" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ref_read_emplois" ON "public"."emplois" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ref_read_fonctions" ON "public"."fonctions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ref_read_grades" ON "public"."grades" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ref_read_liens_beneficiaires" ON "public"."liens_beneficiaires" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ref_read_situations_matrimoniales" ON "public"."situations_matrimoniales" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."rente_versements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rente_versements_manage" ON "public"."rente_versements" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "rente_versements_select" ON "public"."rente_versements" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."rentes" "r"
  WHERE (("r"."id_rente" = "rente_versements"."id_rente") AND ("r"."id_adherent" = "public"."current_user_adherent_id"()))))));



ALTER TABLE "public"."rentes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rentes_manage" ON "public"."rentes" TO "authenticated" USING ("public"."is_gestionnaire_or_admin"()) WITH CHECK ("public"."is_gestionnaire_or_admin"());



CREATE POLICY "rentes_select" ON "public"."rentes" FOR SELECT TO "authenticated" USING (("public"."is_gestionnaire_or_admin"() OR ("id_adherent" = "public"."current_user_adherent_id"())));



ALTER TABLE "public"."resumes_cloture_esr" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_admin" ON "public"."roles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "roles_read" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."situations_matrimoniales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_admin" ON "public"."user_roles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "user_roles_read" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."utilisateurs" "u"
  WHERE (("u"."id_utilisateur" = "user_roles"."id_utilisateur") AND ("u"."auth_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."utilisateurs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "utilisateurs_manage" ON "public"."utilisateurs" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "utilisateurs_select" ON "public"."utilisateurs" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("auth_user_id" = "auth"."uid"())));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."actualiser_pp_pu_compte_esr"("p_id_adherent" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."actualiser_pp_pu_compte_esr"("p_id_adherent" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."actualiser_pp_pu_compte_esr"("p_id_adherent" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."actualiser_pp_pu_compte_esr"("p_id_adherent" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cloturer_periode_esr"("p_periode" "text", "p_user_id" "uuid", "p_snapshots" "jsonb", "p_resume" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cloturer_periode_esr"("p_periode" "text", "p_user_id" "uuid", "p_snapshots" "jsonb", "p_resume" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."cloturer_periode_esr"("p_periode" "text", "p_user_id" "uuid", "p_snapshots" "jsonb", "p_resume" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cloturer_periode_esr"("p_periode" "text", "p_user_id" "uuid", "p_snapshots" "jsonb", "p_resume" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_adherent_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_adherent_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_adherent_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_profile"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."imputer_paiements_spontanes_precompte_esr"("p_id_precompte" bigint, "p_id_adherent" bigint, "p_date_limite" "date", "p_montant_brut" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."imputer_paiements_spontanes_precompte_esr"("p_id_precompte" bigint, "p_id_adherent" bigint, "p_date_limite" "date", "p_montant_brut" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_gestionnaire_or_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_gestionnaire_or_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_gestionnaire_or_admin"() TO "service_role";



GRANT ALL ON TABLE "public"."rente_versements" TO "anon";
GRANT ALL ON TABLE "public"."rente_versements" TO "authenticated";
GRANT ALL ON TABLE "public"."rente_versements" TO "service_role";



REVOKE ALL ON FUNCTION "public"."payer_echeance_aps"("p_id_versement" bigint, "p_date_paiement" "date", "p_reference_paiement" "text", "p_mode_paiement" "text", "p_piece_justificative" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."payer_echeance_aps"("p_id_versement" bigint, "p_date_paiement" "date", "p_reference_paiement" "text", "p_mode_paiement" "text", "p_piece_justificative" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."payer_echeance_aps"("p_id_versement" bigint, "p_date_paiement" "date", "p_reference_paiement" "text", "p_mode_paiement" "text", "p_piece_justificative" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."payer_echeance_aps"("p_id_versement" bigint, "p_date_paiement" "date", "p_reference_paiement" "text", "p_mode_paiement" "text", "p_piece_justificative" "text") TO "service_role";



GRANT ALL ON TABLE "public"."rachats" TO "service_role";



REVOKE ALL ON FUNCTION "public"."payer_rachat_esr"("p_id_rachat" bigint, "p_utilisateur" character varying, "p_date_paiement" "date", "p_reference" character varying, "p_mode" character varying, "p_observation" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."payer_rachat_esr"("p_id_rachat" bigint, "p_utilisateur" character varying, "p_date_paiement" "date", "p_reference" character varying, "p_mode" character varying, "p_observation" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."payer_rachat_esr"("p_id_rachat" bigint, "p_utilisateur" character varying, "p_date_paiement" "date", "p_reference" character varying, "p_mode" character varying, "p_observation" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."payer_rachat_esr"("p_id_rachat" bigint, "p_utilisateur" character varying, "p_date_paiement" "date", "p_reference" character varying, "p_mode" character varying, "p_observation" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."regulariser_precompte_esr"("p_id_precompte" bigint, "p_id_adherent" bigint, "p_mode" "text", "p_periode" "text", "p_periode_deb" "date", "p_periode_fin" "date", "p_date_valeur" "date", "p_montant" numeric, "p_reference" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."regulariser_precompte_esr"("p_id_precompte" bigint, "p_id_adherent" bigint, "p_mode" "text", "p_periode" "text", "p_periode_deb" "date", "p_periode_fin" "date", "p_date_valeur" "date", "p_montant" numeric, "p_reference" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regulariser_precompte_esr"("p_id_precompte" bigint, "p_id_adherent" bigint, "p_mode" "text", "p_periode" "text", "p_periode_deb" "date", "p_periode_fin" "date", "p_date_valeur" "date", "p_montant" numeric, "p_reference" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regulariser_precompte_esr"("p_id_precompte" bigint, "p_id_adherent" bigint, "p_mode" "text", "p_periode" "text", "p_periode_deb" "date", "p_periode_fin" "date", "p_date_valeur" "date", "p_montant" numeric, "p_reference" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_creer_adherent_complet"("p_matricule" character varying, "p_nom" character varying, "p_prenoms" character varying, "p_civilite" character varying, "p_telephone" character varying, "p_email" character varying, "p_date_naissance" "date", "p_emploi" character varying, "p_situation_matrimoniale" character varying, "p_date_souscription" "date", "p_statut" boolean, "p_etat" character varying, "p_grade" character varying, "p_id_grade" bigint, "p_date_effet" "date", "p_date_retraite" "date", "p_age_retraite" numeric, "p_cotisation_annuelle" numeric, "p_date_precompte" "date", "p_cotisation_es" numeric, "p_nb_trimestre" numeric, "p_utilisateur" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_creer_adherent_complet"("p_matricule" character varying, "p_nom" character varying, "p_prenoms" character varying, "p_civilite" character varying, "p_telephone" character varying, "p_email" character varying, "p_date_naissance" "date", "p_emploi" character varying, "p_situation_matrimoniale" character varying, "p_date_souscription" "date", "p_statut" boolean, "p_etat" character varying, "p_grade" character varying, "p_id_grade" bigint, "p_date_effet" "date", "p_date_retraite" "date", "p_age_retraite" numeric, "p_cotisation_annuelle" numeric, "p_date_precompte" "date", "p_cotisation_es" numeric, "p_nb_trimestre" numeric, "p_utilisateur" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_creer_adherent_complet"("p_matricule" character varying, "p_nom" character varying, "p_prenoms" character varying, "p_civilite" character varying, "p_telephone" character varying, "p_email" character varying, "p_date_naissance" "date", "p_emploi" character varying, "p_situation_matrimoniale" character varying, "p_date_souscription" "date", "p_statut" boolean, "p_etat" character varying, "p_grade" character varying, "p_id_grade" bigint, "p_date_effet" "date", "p_date_retraite" "date", "p_age_retraite" numeric, "p_cotisation_annuelle" numeric, "p_date_precompte" "date", "p_cotisation_es" numeric, "p_nb_trimestre" numeric, "p_utilisateur" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_creer_adherent_complet"("p_matricule" character varying, "p_nom" character varying, "p_prenoms" character varying, "p_civilite" character varying, "p_telephone" character varying, "p_email" character varying, "p_date_naissance" "date", "p_emploi" character varying, "p_situation_matrimoniale" character varying, "p_date_souscription" "date", "p_statut" boolean, "p_etat" character varying, "p_grade" character varying, "p_id_grade" bigint, "p_date_effet" "date", "p_date_retraite" "date", "p_age_retraite" numeric, "p_cotisation_annuelle" numeric, "p_date_precompte" "date", "p_cotisation_es" numeric, "p_nb_trimestre" numeric, "p_utilisateur" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_actualiser_pp_pu_compte_esr"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_actualiser_pp_pu_compte_esr"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_actualiser_pp_pu_compte_esr"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verifier_echeance_rente_sante"() TO "anon";
GRANT ALL ON FUNCTION "public"."verifier_echeance_rente_sante"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."verifier_echeance_rente_sante"() TO "service_role";



GRANT ALL ON TABLE "public"."adherents" TO "anon";
GRANT ALL ON TABLE "public"."adherents" TO "authenticated";
GRANT ALL ON TABLE "public"."adherents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."adherents_id_adherent_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."adherents_id_adherent_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."adherents_id_adherent_seq" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_audit_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_audit_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_audit_seq" TO "service_role";



GRANT ALL ON TABLE "public"."beneficiaires" TO "anon";
GRANT ALL ON TABLE "public"."beneficiaires" TO "authenticated";
GRANT ALL ON TABLE "public"."beneficiaires" TO "service_role";



GRANT ALL ON SEQUENCE "public"."beneficiaires_id_beneficiaire_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."beneficiaires_id_beneficiaire_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."beneficiaires_id_beneficiaire_seq" TO "service_role";



GRANT ALL ON TABLE "public"."civilites" TO "anon";
GRANT ALL ON TABLE "public"."civilites" TO "authenticated";
GRANT ALL ON TABLE "public"."civilites" TO "service_role";



GRANT ALL ON SEQUENCE "public"."civilites_id_civilite_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."civilites_id_civilite_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."civilites_id_civilite_seq" TO "service_role";



GRANT ALL ON TABLE "public"."comptes_esr" TO "anon";
GRANT ALL ON TABLE "public"."comptes_esr" TO "authenticated";
GRANT ALL ON TABLE "public"."comptes_esr" TO "service_role";



GRANT ALL ON SEQUENCE "public"."comptes_esr_id_compte_esr_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."comptes_esr_id_compte_esr_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."comptes_esr_id_compte_esr_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cotisation_details" TO "anon";
GRANT ALL ON TABLE "public"."cotisation_details" TO "authenticated";
GRANT ALL ON TABLE "public"."cotisation_details" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cotisation_details_id_cotisation_detail_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cotisation_details_id_cotisation_detail_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cotisation_details_id_cotisation_detail_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cotisation_entetes" TO "anon";
GRANT ALL ON TABLE "public"."cotisation_entetes" TO "authenticated";
GRANT ALL ON TABLE "public"."cotisation_entetes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cotisation_entetes_id_cotisation_entete_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cotisation_entetes_id_cotisation_entete_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cotisation_entetes_id_cotisation_entete_seq" TO "service_role";



GRANT ALL ON TABLE "public"."emplois" TO "anon";
GRANT ALL ON TABLE "public"."emplois" TO "authenticated";
GRANT ALL ON TABLE "public"."emplois" TO "service_role";



GRANT ALL ON SEQUENCE "public"."emplois_id_emploi_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."emplois_id_emploi_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."emplois_id_emploi_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fonctions" TO "anon";
GRANT ALL ON TABLE "public"."fonctions" TO "authenticated";
GRANT ALL ON TABLE "public"."fonctions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fonctions_id_fonction_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fonctions_id_fonction_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fonctions_id_fonction_seq" TO "service_role";



GRANT ALL ON TABLE "public"."grades" TO "anon";
GRANT ALL ON TABLE "public"."grades" TO "authenticated";
GRANT ALL ON TABLE "public"."grades" TO "service_role";



GRANT ALL ON SEQUENCE "public"."grades_id_grade_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."grades_id_grade_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."grades_id_grade_seq" TO "service_role";



GRANT ALL ON TABLE "public"."historique_actuariel_esr" TO "service_role";



GRANT ALL ON SEQUENCE "public"."historique_actuariel_esr_id_historique_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."historique_actuariel_esr_id_historique_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."historique_actuariel_esr_id_historique_seq" TO "service_role";



GRANT ALL ON TABLE "public"."historique_cotisations" TO "anon";
GRANT ALL ON TABLE "public"."historique_cotisations" TO "authenticated";
GRANT ALL ON TABLE "public"."historique_cotisations" TO "service_role";



GRANT ALL ON TABLE "public"."historique_cotisations_esr" TO "service_role";



GRANT ALL ON SEQUENCE "public"."historique_cotisations_esr_id_historique_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."historique_cotisations_esr_id_historique_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."historique_cotisations_esr_id_historique_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."historique_cotisations_id_historique_cotisation_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."historique_cotisations_id_historique_cotisation_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."historique_cotisations_id_historique_cotisation_seq" TO "service_role";



GRANT ALL ON TABLE "public"."imputations_paiements_spontanes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."imputations_paiements_spontanes_id_imputation_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."imputations_paiements_spontanes_id_imputation_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."imputations_paiements_spontanes_id_imputation_seq" TO "service_role";



GRANT ALL ON TABLE "public"."info_cotisations" TO "anon";
GRANT ALL ON TABLE "public"."info_cotisations" TO "authenticated";
GRANT ALL ON TABLE "public"."info_cotisations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."info_cotisations_id_info_cotisation_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."info_cotisations_id_info_cotisation_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."info_cotisations_id_info_cotisation_seq" TO "service_role";



GRANT ALL ON TABLE "public"."liens_beneficiaires" TO "anon";
GRANT ALL ON TABLE "public"."liens_beneficiaires" TO "authenticated";
GRANT ALL ON TABLE "public"."liens_beneficiaires" TO "service_role";



GRANT ALL ON SEQUENCE "public"."liens_beneficiaires_id_lien_beneficiaire_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."liens_beneficiaires_id_lien_beneficiaire_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."liens_beneficiaires_id_lien_beneficiaire_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mortalite" TO "anon";
GRANT ALL ON TABLE "public"."mortalite" TO "authenticated";
GRANT ALL ON TABLE "public"."mortalite" TO "service_role";



GRANT ALL ON TABLE "public"."paiements" TO "anon";
GRANT ALL ON TABLE "public"."paiements" TO "authenticated";
GRANT ALL ON TABLE "public"."paiements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."paiements_id_paiement_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."paiements_id_paiement_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."paiements_id_paiement_seq" TO "service_role";



GRANT ALL ON TABLE "public"."param_repartitions" TO "anon";
GRANT ALL ON TABLE "public"."param_repartitions" TO "authenticated";
GRANT ALL ON TABLE "public"."param_repartitions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."param_repartitions_id_param_repartition_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."param_repartitions_id_param_repartition_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."param_repartitions_id_param_repartition_seq" TO "service_role";



GRANT ALL ON TABLE "public"."parametre_versions" TO "anon";
GRANT ALL ON TABLE "public"."parametre_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."parametre_versions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."parametre_versions_id_parametre_version_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."parametre_versions_id_parametre_version_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."parametre_versions_id_parametre_version_seq" TO "service_role";



GRANT ALL ON TABLE "public"."parametres_generaux" TO "anon";
GRANT ALL ON TABLE "public"."parametres_generaux" TO "authenticated";
GRANT ALL ON TABLE "public"."parametres_generaux" TO "service_role";



GRANT ALL ON SEQUENCE "public"."parametres_generaux_id_parametre_generaux_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."parametres_generaux_id_parametre_generaux_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."parametres_generaux_id_parametre_generaux_seq" TO "service_role";



GRANT ALL ON TABLE "public"."periodes" TO "anon";
GRANT ALL ON TABLE "public"."periodes" TO "authenticated";
GRANT ALL ON TABLE "public"."periodes" TO "service_role";



GRANT ALL ON TABLE "public"."pieces_justificatives" TO "anon";
GRANT ALL ON TABLE "public"."pieces_justificatives" TO "authenticated";
GRANT ALL ON TABLE "public"."pieces_justificatives" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pieces_justificatives_id_piece_justificative_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pieces_justificatives_id_piece_justificative_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pieces_justificatives_id_piece_justificative_seq" TO "service_role";



GRANT ALL ON TABLE "public"."precomptes" TO "anon";
GRANT ALL ON TABLE "public"."precomptes" TO "authenticated";
GRANT ALL ON TABLE "public"."precomptes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."precomptes_id_precompte_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."precomptes_id_precompte_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."precomptes_id_precompte_seq" TO "service_role";



GRANT ALL ON TABLE "public"."prestations" TO "anon";
GRANT ALL ON TABLE "public"."prestations" TO "authenticated";
GRANT ALL ON TABLE "public"."prestations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."prestations_id_prestation_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."prestations_id_prestation_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."prestations_id_prestation_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profils" TO "anon";
GRANT ALL ON TABLE "public"."profils" TO "authenticated";
GRANT ALL ON TABLE "public"."profils" TO "service_role";



GRANT ALL ON SEQUENCE "public"."profils_id_profil_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."profils_id_profil_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."profils_id_profil_seq" TO "service_role";



GRANT ALL ON TABLE "public"."provisions_maths" TO "anon";
GRANT ALL ON TABLE "public"."provisions_maths" TO "authenticated";
GRANT ALL ON TABLE "public"."provisions_maths" TO "service_role";



GRANT ALL ON SEQUENCE "public"."provisions_maths_id_provision_maths_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."provisions_maths_id_provision_maths_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."provisions_maths_id_provision_maths_seq" TO "service_role";



GRANT ALL ON TABLE "public"."rachat_evenements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rachat_evenements_id_evenement_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rachat_evenements_id_evenement_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rachat_evenements_id_evenement_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rachats_id_rachat_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rachats_id_rachat_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rachats_id_rachat_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rente_versements_id_rente_versement_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rente_versements_id_rente_versement_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rente_versements_id_rente_versement_seq" TO "service_role";



GRANT ALL ON TABLE "public"."rentes" TO "anon";
GRANT ALL ON TABLE "public"."rentes" TO "authenticated";
GRANT ALL ON TABLE "public"."rentes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rentes_id_rente_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rentes_id_rente_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rentes_id_rente_seq" TO "service_role";



GRANT ALL ON TABLE "public"."resumes_cloture_esr" TO "service_role";



GRANT ALL ON SEQUENCE "public"."resumes_cloture_esr_id_resume_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."resumes_cloture_esr_id_resume_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."resumes_cloture_esr_id_resume_seq" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."roles_id_role_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."roles_id_role_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."roles_id_role_seq" TO "service_role";



GRANT ALL ON TABLE "public"."situations_matrimoniales" TO "anon";
GRANT ALL ON TABLE "public"."situations_matrimoniales" TO "authenticated";
GRANT ALL ON TABLE "public"."situations_matrimoniales" TO "service_role";



GRANT ALL ON SEQUENCE "public"."situations_matrimoniales_id_situation_matrimoniale_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."situations_matrimoniales_id_situation_matrimoniale_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."situations_matrimoniales_id_situation_matrimoniale_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_roles_id_user_role_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_roles_id_user_role_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_roles_id_user_role_seq" TO "service_role";



GRANT ALL ON TABLE "public"."utilisateurs" TO "anon";
GRANT ALL ON TABLE "public"."utilisateurs" TO "authenticated";
GRANT ALL ON TABLE "public"."utilisateurs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."utilisateurs_id_utilisateur_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."utilisateurs_id_utilisateur_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."utilisateurs_id_utilisateur_seq" TO "service_role";



GRANT ALL ON TABLE "public"."v_adherents_complets" TO "anon";
GRANT ALL ON TABLE "public"."v_adherents_complets" TO "authenticated";
GRANT ALL ON TABLE "public"."v_adherents_complets" TO "service_role";



GRANT ALL ON TABLE "public"."v_comptes_esr_details" TO "anon";
GRANT ALL ON TABLE "public"."v_comptes_esr_details" TO "authenticated";
GRANT ALL ON TABLE "public"."v_comptes_esr_details" TO "service_role";



GRANT ALL ON TABLE "public"."v_cotisations_details" TO "anon";
GRANT ALL ON TABLE "public"."v_cotisations_details" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cotisations_details" TO "service_role";



GRANT ALL ON TABLE "public"."v_dashboard_global" TO "anon";
GRANT ALL ON TABLE "public"."v_dashboard_global" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dashboard_global" TO "service_role";



GRANT ALL ON TABLE "public"."v_precomptes_details" TO "anon";
GRANT ALL ON TABLE "public"."v_precomptes_details" TO "authenticated";
GRANT ALL ON TABLE "public"."v_precomptes_details" TO "service_role";



GRANT ALL ON TABLE "public"."v_prestations_details" TO "anon";
GRANT ALL ON TABLE "public"."v_prestations_details" TO "authenticated";
GRANT ALL ON TABLE "public"."v_prestations_details" TO "service_role";



GRANT ALL ON TABLE "public"."v_rachats_details" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







