-- Les adhérents créés depuis le back-office ne doivent pas être identifiés
-- comme des adhésions en ligne. La correction est sans effet sur les demandes
-- réellement soumises en ligne (adhesion_en_ligne = true).
alter table public.adherents
  alter column source_adhesion set default 'BACKOFFICE';

update public.adherents
set source_adhesion = 'BACKOFFICE',
    updated_at = now()
where coalesce(adhesion_en_ligne, false) = false
  and source_adhesion = 'EN_LIGNE';
