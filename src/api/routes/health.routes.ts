import { Router, Request, Response } from 'express';
import { env } from '../../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ShopFlow Backend API',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
