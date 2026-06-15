import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  // CLIENT_URL may be a comma-separated list of explicit allowed origins.
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const isAllowedOrigin = (origin) => {
    if (!origin) return true; // curl / health checks / same-origin (no Origin header)
    if (allowedOrigins.includes(origin)) return true;
    try {
      const { hostname } = new URL(origin);
      if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
      if (hostname.endsWith('.vercel.app')) return true; // Vercel production + preview deploys
      if (hostname === 'gpsfdk.com' || hostname.endsWith('.gpsfdk.com')) return true; // custom domain
    } catch {
      /* malformed origin → not allowed */
    }
    return false;
  };

  app.use(
    cors({
      // Return false (not an error) for disallowed origins so the browser simply
      // gets no CORS headers instead of a 500 from the error handler.
      origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '12mb' })); // headroom for base64 image uploads
  app.use(cookieParser());
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
