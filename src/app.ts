import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { healthRouter } from './api/routes/health.routes.js';
import { apiV1Router } from './api/routes/index.js';
import { errorHandler, notFoundHandler } from './api/middlewares/error-handler.middleware.js';
import { compressionMiddleware } from './api/middlewares/compression.middleware.js';
import { globalApiLimiter } from './api/middlewares/rate-limiter.middleware.js';

export function createApp(): express.Application {
  const app = express();

  // 1. Tắt header X-Powered-By để tránh lộ thông tin máy chủ Express
  app.disable('x-powered-by');

  // 2. Security middlewares với cấu hình Helmet gia cố toàn diện
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https:', 'wss:'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      strictTransportSecurity: {
        maxAge: 15552000, // 180 ngày HSTS
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'sameorigin',
      },
      xContentTypeOptions: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    })
  );

  // 3. Tự động nén HTTP Response (Gzip / Deflate) với ngưỡng >= 1024 bytes
  app.use(compressionMiddleware({ threshold: 1024, level: 6 }));

  // 4. CORS Whitelist Protection
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Body parser with raw body buffer retention for Meta Webhook HMAC-SHA256 verification
  app.use(
    express.json({
      verify: (req: Request, _res: Response, buf: Buffer) => {
        // Gán rawBody để verifyMetaSignature sử dụng trong Task-07
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
      limit: '10mb',
    })
  );

  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP Request Logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(
        {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          durationMs: duration,
        },
        `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
      );
    });
    next();
  });

  // Base Health Check
  app.use('/health', healthRouter);

  // API v1 Routes (Bảo vệ bởi Global Rate Limiter)
  app.use(env.API_PREFIX, globalApiLimiter, apiV1Router);

  // 404 Route Not Found Handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
