import { Router } from 'express';
import { parametresService } from '../services/parametres.service';

export const calculActuarielRouter = Router();

calculActuarielRouter.get('/references', async (_req, res, next) => {
  try {
    const [mortalite, parametres] = await Promise.all([
      parametresService.getMortalite(),
      parametresService.getParametresGeneraux(),
    ]);

    const codesAutorises = new Set(['TAUX_GAR', 'FRAIS_RENTE', 'AGE_MAX']);
    const parametresCalcul = (parametres as Array<Record<string, unknown>>)
      .filter((parametre) => codesAutorises.has(String(parametre.code ?? '')))
      .map((parametre) => ({
        code: String(parametre.code ?? ''),
        valeur: parametre.valeur == null ? null : String(parametre.valeur),
      }));

    const promo = (parametres as Array<Record<string, unknown>>)
      .find((parametre) => String(parametre.code ?? '') === 'PROMO_ABATTEMENT_RETRAITE');
    const promoAbattementRetraite = promo
      ? {
          actif: Boolean(promo.actif),
          dateDebut: promo.date_debut == null ? null : String(promo.date_debut),
          dateFin: promo.date_fin == null ? null : String(promo.date_fin),
        }
      : null;

    res.json({
      data: { mortalite, parametres: parametresCalcul, promoAbattementRetraite },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});
