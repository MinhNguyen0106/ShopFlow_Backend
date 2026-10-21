/**
 * ShopFlow - Rate Limiting Middleware
 * File: backend/src/api/middlewares/rate-limiter.middleware.ts
 *
 * Giới hạn tần suất request (Rate Limiting) để chống brute-force và lạm dụng API.
 * Tuân thủ quy chuẩn bảo mật và xử lý ngoại lệ qua TooManyRequestsError (HTTP 429).
 */

import { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '../../core/errors/app-error.js';

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  skipInTest?: boolean;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000; // 15 phút
  const max = options.max ?? 10; // Tối đa 10 request / window
  const message =
    options.message ??
    'Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.';
  const skipInTest = options.skipInTest ?? false;

  const hits = new Map<string, ClientRecord>();

  // Dọn dẹp định kỳ mỗi 5 phút để tránh rò rỉ bộ nhớ
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  // Không giữ Node.js event loop sống khi shutdown
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    if (skipInTest && process.env.NODE_ENV === 'test') {
      return next();
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const now = Date.now();
    const record = hits.get(clientIp);

    if (!record || now > record.resetTime) {
      hits.set(clientIp, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, max - record.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      throw new TooManyRequestsError(message, { retryAfter: retryAfterSeconds });
    }

    return next();
  };

  // Cung cấp hàm reset phục vụ kiểm thử
  middleware.reset = () => {
    hits.clear();
  };

  return middleware;
}

// Rate Limiter mặc định cho đăng ký tài khoản (tối đa 10 lần trong 15 phút)
export const registerRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Quá nhiều yêu cầu đăng ký tài khoản từ địa chỉ IP này. Vui lòng thử lại sau 15 phút.',
});
