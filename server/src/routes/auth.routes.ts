import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import {
  publicFirstLoginOtpRateLimiter,
  publicFirstLoginRateLimiter,
  publicPasswordResetRateLimiter,
} from '../middleware/rateLimit';

export const authRouter = Router();

authRouter.post('/first-login/check', publicFirstLoginRateLimiter, (req, res, next) => {
  authController.firstLoginCheck(req, res, next);
});

authRouter.post('/first-login/send-otp', publicFirstLoginOtpRateLimiter, (req, res, next) => {
  authController.sendFirstLoginOtp(req, res, next);
});

authRouter.post('/first-login/set-password', publicFirstLoginRateLimiter, (req, res, next) => {
  authController.setFirstLoginPassword(req, res, next);
});

authRouter.post('/password-reset/request', publicPasswordResetRateLimiter, (req, res, next) => {
  authController.requestPasswordReset(req, res, next);
});

authRouter.use(requireAuth, requireRoles('ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'));

authRouter.get('/me', (req, res, next) => {
  authController.me(req, res, next);
});

authRouter.post('/change-password', (req, res, next) => {
  authController.changePassword(req, res, next);
});
