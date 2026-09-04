-- Les agents privés MADGI (matricule : cinq chiffres + P) partent à 60 ans,
-- quelle que soit la règle du grade. Reprise des contrats actifs existants.
with regles as (
  select
    max(valeur::numeric) filter (where code = 'TAUX_GAR') / 100 as taux_annuel,
    max(valeur::numeric) filter (where code = 'FRAIS_RENTE') / 100 as frais_rente,
    max(valeur::integer) filter (where code = 'AGE_MAX') as age_max
  from public.parametres_generaux
  where code in ('TAUX_GAR', 'FRAIS_RENTE', 'AGE_MAX')
    and coalesce(actif, true) = true
), base as (
  select
    ic.id_info_cotisation,
    g.cotisation_annuelle,
    make_date(extract(year from a.date_naissance)::integer + 60, 12, 31) as date_retraite,
    ic.date_precompte,
    r.taux_annuel,
    r.frais_rente,
    r.age_max
  from public.adherents a
  join public.info_cotisations ic
    on ic.id_adherent = a.id_adherent and ic.info_actif = true
  join public.grades g on g.id_grade = ic.id_grade
  cross join regles r
  where upper(a.matricule) ~ '^[0-9]{5}P$'
    and a.date_naissance is not null
    and ic.date_precompte is not null
), durees as (
  select b.*,
    greatest(0,
      (extract(year from b.date_retraite)::integer - extract(year from b.date_precompte)::integer) * 4
      + (extract(quarter from b.date_retraite)::integer - extract(quarter from b.date_precompte)::integer)
      + 1
    ) as nb_trimestre
  from base b
), capitaux as (
  select d.*,
    ceiling((
      d.cotisation_annuelle
      * (1 + d.frais_rente)
      * (
          select sum(m.lx * power(1 / (1 + d.taux_annuel), m.age_mort - 60))
          from public.mortalite m
          where m.age_mort >= 60 and m.age_mort < d.age_max
        )
      / nullif((select m60.lx from public.mortalite m60 where m60.age_mort = 60), 0)
    ) / 100) * 100 as capital_constitutif,
    power(1 + d.taux_annuel, 0.25) - 1 as taux_trimestriel
  from durees d
), recalcul as (
  select c.*,
    case
      when c.nb_trimestre = 0 then c.capital_constitutif
      else ceiling((
        c.capital_constitutif * c.taux_trimestriel
        / nullif(
            (1 + c.taux_trimestriel) * (power(1 + c.taux_trimestriel, c.nb_trimestre) - 1),
            0
          )
      ) / 100) * 100
    end as cotisation_trimestrielle
  from capitaux c
)
update public.info_cotisations ic
set age_retraite = 60,
    date_retraite = r.date_retraite,
    nb_trimestre = r.nb_trimestre,
    cotisation_annuelle = r.cotisation_annuelle,
    cotisation_es = r.cotisation_trimestrielle,
    updated_at = now()
from recalcul r
where r.id_info_cotisation = ic.id_info_cotisation;
