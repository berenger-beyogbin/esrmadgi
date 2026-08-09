import { env, validateEnv } from './config/env'; // premier import — charge dotenv
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimit';
import { healthRouter } from './routes/health.routes';
import { agentsRouter } from './routes/agents.routes';
import { adhesionsEnLigneRouter } from './routes/adhesions-en-ligne.routes';
import { adherentsRouter } from './routes/adherents.routes';
import { beneficiairesRouter } from './routes/beneficiaires.routes';
import { cotisationsRouter } from './routes/cotisations.routes';
import { precomptesRouter } from './routes/precomptes.routes';
import { periodesRouter } from './routes/periodes-precompte.routes';
import { prestationsRouter } from './routes/prestations.routes';
import { paiementsRouter } from './routes/paiements.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { auditRouter } from './routes/audit.routes';
import { comptesEsrRouter } from './routes/comptes-esr.routes';
import { parametresRouter } from './routes/parametres.routes';
import { authRouter } from './routes/auth.routes';
import { utilisateursRouter } from './routes/utilisateurs.routes';
import { reportingRouter } from './routes/reporting.routes';
import { rachatsRouter } from './routes/rachats.routes';
import { requireAuth, requireRoles } from './middleware/auth';

validateEnv();

const app = express();
app.set('trust proxy', env.TRUST_PROXY ? 1 : false);

function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (env.FRONTEND_URLS.includes(origin)) return true;

  if (env.IS_DEV) {
    try {
      const url = new URL(origin);
      return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    } catch {
      return false;
    }
  }

  return false;
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origine CORS non autorisee : ${origin}`));
    },
    credentials: true,
  }),
);
app.use('/api', apiRateLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.use('/api/health', healthRouter);
app.use('/api/adhesions-en-ligne', adhesionsEnLigneRouter);
app.use('/api/auth', authRouter);
app.use('/api/agents', requireAuth, requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'), agentsRouter);
app.use('/api/adherents', requireAuth, requireRoles('ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'), adherentsRouter);
app.use('/api/beneficiaires', requireAuth, requireRoles('ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'), beneficiairesRouter);
app.use('/api/cotisations', requireAuth, requireRoles('ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'), cotisationsRouter);
app.use('/api/precomptes', requireAuth, requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'), precomptesRouter);
app.use('/api/periodes', requireAuth, requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'), periodesRouter);
app.use('/api/prestations', requireAuth, requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'), prestationsRouter);
app.use('/api/rachats', requireAuth, requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'), rachatsRouter);
app.use('/api/paiements', requireAuth, requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'), paiementsRouter);
app.use('/api/dashboard', requireAuth, requireRoles('ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'), dashboardRouter);
app.use('/api/audit', requireAuth, requireRoles('ADMINISTRATEUR'), auditRouter);
app.use('/api/utilisateurs', requireAuth, requireRoles('ADMINISTRATEUR'), utilisateursRouter);
app.use('/api/comptes-esr', requireAuth, requireRoles('ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'), comptesEsrRouter);
app.use('/api/parametres', requireAuth, requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'), parametresRouter);
app.use('/api/reporting', requireAuth, requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'), reportingRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.info(`[MADGI ESR API] Serveur demarré sur http://localhost:${env.PORT}`);
  console.info(`[MADGI ESR API] CORS autorisé pour : ${env.FRONTEND_URL}`);
});
