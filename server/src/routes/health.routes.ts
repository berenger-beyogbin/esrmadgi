import { Router } from 'express';
import { getSupabaseServer } from '../config/supabaseServer';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'MADGI ESR API',
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/ready', async (_req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from('parametres_generaux').select('code').limit(1);
    if (error) throw error;
    res.json({
      ok: true,
      service: 'MADGI ESR API',
      database: 'available',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      service: 'MADGI ESR API',
      database: 'unavailable',
      error: error instanceof Error ? error.message : 'Erreur de disponibilité',
      timestamp: new Date().toISOString(),
    });
  }
});
