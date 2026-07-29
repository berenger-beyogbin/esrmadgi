-- Paramètres métier provisoires MADGI ESR.
-- Ces valeurs restent modifiables depuis Paramètres > Paramètres généraux ESR.

insert into public.parametres_generaux
  (code, libelle, valeur, description, actif, date_debut)
select
  seed.code,
  seed.libelle,
  seed.valeur,
  seed.description,
  true,
  date '2024-01-01'
from (
  values
    ('FRAIS_GESTION_RACHAT', 'Frais de gestion sur rachat', '5',
      'Valeur provisoire en pourcentage, distincte de la pénalité de rachat.'),
    ('TAUX_DECES_AVANT_RETRAITE', 'Part versée en cas de décès avant retraite', '95',
      'Valeur provisoire en pourcentage de la valeur acquise du compte ESR.'),
    ('TAUX_INVALIDITE_AVANT_RETRAITE', 'Part versée en cas d''invalidité totale avant retraite', '95',
      'Valeur provisoire en pourcentage de la valeur acquise du compte ESR.'),
    ('TAUX_COUVERTURE_RETRAITE', 'Part de la cotisation maladie financée à la retraite', '100',
      'Valeur provisoire, distincte du taux de remboursement des soins.'),
    ('TAUX_REMBOURSEMENT_SOINS', 'Taux de remboursement des soins', '80',
      'Valeur provisoire ; ne pas confondre avec le financement de la cotisation.'),
    ('TAUX_DECES_PENDANT_RENTE', 'Part du capital restant versée en cas de décès pendant rente', '80',
      'Valeur provisoire en pourcentage du capital constitutif restant dû.'),
    ('DELAI_MIN_RACHAT_ANNEES', 'Ancienneté minimale avant rachat total', '2',
      'Valeur provisoire exprimée en années complètes de cotisation.')
) as seed(code, libelle, valeur, description)
where not exists (
  select 1
  from public.parametres_generaux existing
  where existing.code = seed.code
);
