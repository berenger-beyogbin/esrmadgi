import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'MADGI ESR API',
    timestamp: new Date().toISOString(),
  });
});
