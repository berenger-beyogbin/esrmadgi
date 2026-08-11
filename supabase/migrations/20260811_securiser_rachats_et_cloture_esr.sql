-- Correctifs de securite : verrouillage des fonctions SECURITY DEFINER de paiement
-- et activation du RLS sur les tables/vue exposant des donnees financieres/PII
-- (aucune de ces tables/fonctions n'est appelee ailleurs que par le backend Express,
-- qui utilise exclusivement la cle service_role).

-- 1. Verrouiller les fonctions de paiement, au meme niveau que leurs fonctions soeurs
--    (cloturer_periode_esr, actualiser_pp_pu_compte_esr, regulariser_precompte_esr).
revoke all on function public.payer_rachat_esr(bigint, varchar, date, varchar, varchar, text) from public;
grant execute on function public.payer_rachat_esr(bigint, varchar, date, varchar, varchar, text) to service_role;

revoke all on function public.payer_echeance_aps(bigint, date, text, text, text) from public;
grant execute on function public.payer_echeance_aps(bigint, date, text, text, text) to service_role;

-- 2. Activer le RLS sur les tables sensibles introduites par les migrations
--    de cloture et de rachat (aucune n'avait ENABLE ROW LEVEL SECURITY jusqu'ici).
--    Aucune policy n'est necessaire : seul service_role (utilise par le backend)
--    doit pouvoir lire/ecrire ces tables ; RLS sans policy bloque anon/authenticated
--    par defaut.
alter table public.rachats enable row level security;
alter table public.rachat_evenements enable row level security;
alter table public.historique_actuariel_esr enable row level security;
alter table public.historique_cotisations_esr enable row level security;
alter table public.resumes_cloture_esr enable row level security;

-- 3. Defense en profondeur : retirer les GRANTs par defaut d'anon/authenticated
--    et les redonner explicitement a service_role, sur les tables et la vue.
revoke all on public.rachats from public, anon, authenticated;
revoke all on public.rachat_evenements from public, anon, authenticated;
revoke all on public.historique_actuariel_esr from public, anon, authenticated;
revoke all on public.historique_cotisations_esr from public, anon, authenticated;
revoke all on public.resumes_cloture_esr from public, anon, authenticated;
revoke all on public.v_rachats_details from public, anon, authenticated;

grant all on public.rachats to service_role;
grant all on public.rachat_evenements to service_role;
grant all on public.historique_actuariel_esr to service_role;
grant all on public.historique_cotisations_esr to service_role;
grant all on public.resumes_cloture_esr to service_role;
grant select on public.v_rachats_details to service_role;
