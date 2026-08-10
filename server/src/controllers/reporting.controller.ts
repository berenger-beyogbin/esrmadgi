import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { reportingService } from '../services/reporting.service';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parsePeriode(req: Request): { dateDebut: string; dateFin: string } {
  const dateDebut = String(req.query.dateDebut ?? '');
  const dateFin = String(req.query.dateFin ?? '');
  if (!DATE_REGEX.test(dateDebut) || !DATE_REGEX.test(dateFin)) {
    throw new AppError(400, 'Période invalide (dateDebut/dateFin attendus au format AAAA-MM-JJ)');
  }
  if (dateDebut > dateFin) {
    throw new AppError(400, 'La date de début doit précéder la date de fin');
  }
  return { dateDebut, dateFin };
}

export const reportingController = {
  async cimaC20(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const annee = Number(req.query.annee);
      if (!Number.isInteger(annee) || annee < 2020 || annee > 2100) {
        throw new AppError(400, 'Année de reporting invalide');
      }
      const data = await reportingService.getCimaC20(annee);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async listeAdherents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.listeAdherents();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async adherentsActifs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.adherentsActifs();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async adherentsRetraites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.adherentsRetraites();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async adherentsRetraitesParStatut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.adherentsRetraitesParStatut();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async rachatsResiliations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.rachatsResiliations();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async agentsDecedes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.agentsDecedes();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async agentsDecedesCapitalVerse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.agentsDecedesCapitalVerse();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async cotisationsPeriode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dateDebut, dateFin } = parsePeriode(req);
      const data = await reportingService.cotisationsPeriode(dateDebut, dateFin);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async capitalRenteAdherents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.capitalRenteAdherents();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async capitalRestantDuRetraites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.capitalRestantDuRetraites();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async capitalDecesInvalidite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.capitalDecesInvalidite();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async provisionsGlobales(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.provisionsGlobales();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async mouvementsFlux(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dateDebut, dateFin } = parsePeriode(req);
      const data = await reportingService.mouvementsFlux(dateDebut, dateFin);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async avisAnnuelEligibles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.avisAnnuelEligibles();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async rachats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.rachats();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async resiliations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.resiliations();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async retraitesAJour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.retraitesParStatutFiltre('A_JOUR');
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async retraitesNonAJour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.retraitesParStatutFiltre('PAS_A_JOUR');
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async actifsAJour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.actifsParStatutFiltre('A_JOUR');
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async actifsNonAJour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.actifsParStatutFiltre('PAS_A_JOUR');
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async ayantsDroitGlobal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.ayantsDroitGlobal();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async capitalRestantDuPeriode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dateDebut, dateFin } = parsePeriode(req);
      const data = await reportingService.capitalRestantDuPeriode(dateDebut, dateFin);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async capitalDecesInvaliditeAvantRetraite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportingService.capitalDecesInvaliditeAvantRetraite();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
