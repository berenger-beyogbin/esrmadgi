-- Offre promotionnelle CA (03/09/2026) : abattement sur la cotisation trimestrielle
-- des agents a moins de 5 ans de la retraite, degressif par palier de trimestre et
-- par categorie de grade (A / B / C-D). Fenetre de validite pilotee via
-- parametres_generaux.PROMO_ABATTEMENT_RETRAITE (date_debut / date_fin / actif).

ALTER TABLE public.info_cotisations
  ADD COLUMN IF NOT EXISTS cotisation_es_avant_abattement numeric(18,2),
  ADD COLUMN IF NOT EXISTS taux_abattement_promo numeric(5,2),
  ADD COLUMN IF NOT EXISTS palier_abattement_promo smallint;

INSERT INTO public.parametres_generaux
  (libelle, valeur, code, description, actif, date_debut, date_fin)
VALUES (
  'Offre promotionnelle depart retraite (abattement cotisation)',
  '1',
  'PROMO_ABATTEMENT_RETRAITE',
  'Active l''abattement CA sur la cotisation trimestrielle des agents a moins de 5 ans de la retraite (barème par grade code en dur). date_fin pilote la fin de l''offre ; modifiable ici sans deploiement.',
  true,
  '2026-09-03',
  '2026-12-31'
)
ON CONFLICT (code) DO NOTHING;

-- Recree la vue telle qu'elle existe apres toutes les migrations precedentes (colonnes
-- direction/lieu_naissance/adresses/numero_police incluses), en ajoutant les 3 colonnes
-- d'abattement promo en fin de liste : CREATE OR REPLACE VIEW exige de conserver les
-- colonnes existantes dans le meme ordre.
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
    "u"."user_actif",
    "a"."direction",
    "a"."lieu_naissance",
    "a"."adresse_geographique",
    "a"."adresse_postale",
    "a"."numero_police",
    "ic"."cotisation_es_avant_abattement",
    "ic"."taux_abattement_promo",
    "ic"."palier_abattement_promo"
   FROM ((("public"."adherents" "a"
     LEFT JOIN "public"."info_cotisations" "ic" ON ((("ic"."id_adherent" = "a"."id_adherent") AND ("ic"."info_actif" = true))))
     LEFT JOIN "public"."comptes_esr" "ce" ON (("ce"."id_adherent" = "a"."id_adherent")))
     LEFT JOIN "public"."utilisateurs" "u" ON (("u"."id_adherent" = "a"."id_adherent")));
