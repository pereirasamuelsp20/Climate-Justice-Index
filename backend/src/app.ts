import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middlewares/error.middleware.js';

import { climateRouter } from './routes/climate.routes.js';
import { userRouter } from './routes/user.routes.js';
import { alertsRouter } from './routes/alerts.routes.js';
import { authRouter } from './routes/auth.routes.js';

export const app = express();

// Security and utility middlewares
app.use(helmet());
// Support multiple origins and dynamic vercel preview URLs
const allowedOrigins = env.FRONTEND_URL.split(',').map(s => s.trim());
app.use(cors({
  origin: [
    ...allowedOrigins,
    ...allowedOrigins.map(o => o.replace(/\/$/, '')), // Handle trailing slashes
    /\.vercel\.app$/, // Allow all Vercel preview deployments
    /localhost:/      // Allow local development
  ],
  credentials: true,
}));
app.use(express.json());

// 300 req/min per IP limit (generous for SPA with parallel data fetches + auth checks)
const limiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 300, 
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests' }, status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Don't count health checks
});
app.use(limiter);

// Structured logging for requests
app.use(pinoHttp({ logger }));

// Health check endpoint (Antigravity deployment format)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/climate', climateRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/alerts', alertsRouter);

// Undefined route handler
app.use((req, res, next) => {
  next({ status: 404, code: 'NOT_FOUND', message: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);
