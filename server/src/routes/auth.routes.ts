import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

export const authRouter = Router();

authRouter.get('/me', (req, res, next) => {
  authController.me(req, res, next);
});

authRouter.post('/change-password', (req, res, next) => {
  authController.changePassword(req, res, next);
});
