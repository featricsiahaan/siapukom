import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProduction } from './config/env';
import { prisma } from './lib/prisma';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import categoriesRoutes from './routes/categories.routes';
import practiceRoutes from './routes/practice.routes';
import dashboardRoutes from './routes/dashboard.routes';
import adminRoutes from './routes/admin.routes';
import paymentsRoutes from './routes/payments.routes';
import materiRoutes from './routes/materi.routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin.includes('*') ? true : env.corsOrigin,
      credentials: true,
    })
  );
  // DOKU menandatangani body notifikasi dari byte mentahnya, jadi jangan biarkan
  // express.json() mem-parse ulang (re-serialize) rute ini sebelum verifikasi signature.
  app.use('/api/payments/notification', express.raw({ type: '*/*', limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(isProduction ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Untuk pemantau uptime: memastikan database ikut terjangkau, bukan hanya proses Node yang hidup.
  app.get('/api/health/db', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'error', database: 'unreachable', timestamp: new Date().toISOString() });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/practice', practiceRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/materi', materiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
