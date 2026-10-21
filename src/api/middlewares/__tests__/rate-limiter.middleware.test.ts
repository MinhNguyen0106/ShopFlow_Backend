/**
 * ShopFlow - Rate Limiter Middleware Unit Tests
 * File: backend/src/api/middlewares/__tests__/rate-limiter.middleware.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { createRateLimiter } from '../rate-limiter.middleware.js';
import { TooManyRequestsError } from '../../../core/errors/app-error.js';

describe('Rate Limiter Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let headers: Record<string, string | number>;

  beforeEach(() => {
    headers = {};
    mockReq = {
      headers: {
        'x-forwarded-for': '192.168.1.100',
      },
      socket: {
        remoteAddress: '192.168.1.100',
      } as any,
    };
    mockRes = {
      setHeader: (name: string, value: string | number) => {
        headers[name] = value;
        return mockRes as Response;
      },
    };
  });

  it('nên cho phép request khi chưa vượt quá giới hạn', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 3 });
    let nextCalled = false;

    limiter(mockReq as Request, mockRes as Response, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(headers['X-RateLimit-Limit']).toBe(3);
    expect(headers['X-RateLimit-Remaining']).toBe(2);
  });

  it('nên ném ra TooManyRequestsError khi số request vượt quá ngưỡng tối đa', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 2 });
    const nextFn = () => {};

    // Request 1 & 2 thành công
    limiter(mockReq as Request, mockRes as Response, nextFn);
    limiter(mockReq as Request, mockRes as Response, nextFn);

    // Request 3 vượt ngưỡng
    expect(() => {
      limiter(mockReq as Request, mockRes as Response, nextFn);
    }).toThrow(TooManyRequestsError);

    expect(headers['X-RateLimit-Remaining']).toBe(0);
    expect(headers['Retry-After']).toBeDefined();
  });
});
