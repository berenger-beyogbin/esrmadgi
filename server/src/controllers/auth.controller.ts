import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { authService } from '../services/auth.service';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy';

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Authentification requise');
  }
  return req.user;
}

const passwordChangeSchema = z.object({
  new_password: z.string().refine(isStrongPassword, PASSWORD_POLICY_MESSAGE),
});

export const authController = {
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = authService.getCurrentUser(requireUser(req));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = passwordChangeSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Mot de passe invalide');

      const data = await authService.changePassword(requireUser(req), parsed.data.new_password);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
