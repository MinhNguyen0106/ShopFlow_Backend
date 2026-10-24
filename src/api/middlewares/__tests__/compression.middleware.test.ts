/**
 * ShopFlow - Compression Middleware Unit Tests (TASK-26.2)
 * File: backend/src/api/middlewares/__tests__/compression.middleware.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { compressionMiddleware } from '../compression.middleware.js';
import zlib from 'node:zlib';

describe('Compression Middleware Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let headers: Record<string, string | number>;
  let outputData: Buffer | null;

  beforeEach(() => {
    headers = {};
    outputData = null;
    mockReq = {
      headers: {
        'accept-encoding': 'gzip, deflate',
      },
    };
    mockRes = {
      getHeader: (name: string) => headers[name.toLowerCase()] ?? headers[name],
      setHeader: vi.fn().mockImplementation((name: string, value: any) => {
        headers[name.toLowerCase()] = value;
        return mockRes as Response;
      }),
      removeHeader: vi.fn().mockImplementation((name: string) => {
        delete headers[name.toLowerCase()];
      }),
      write: vi.fn(),
      end: vi.fn().mockImplementation((chunk: any) => {
        if (chunk) {
          outputData = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        }
        return mockRes as Response;
      }),
    };
  });

  it('bỏ qua nén khi client không hỗ trợ gzip hay deflate', () => {
    mockReq.headers = { 'accept-encoding': 'identity' };
    const middleware = compressionMiddleware({ threshold: 50 });
    let nextCalled = false;

    middleware(mockReq as Request, mockRes as Response, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(headers['content-encoding']).toBeUndefined();
  });

  it('bỏ qua nén khi có header x-no-compression', () => {
    mockReq.headers = {
      'accept-encoding': 'gzip',
      'x-no-compression': 'true',
    };
    const middleware = compressionMiddleware({ threshold: 50 });
    let nextCalled = false;

    middleware(mockReq as Request, mockRes as Response, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(headers['content-encoding']).toBeUndefined();
  });

  it('nén gzip payload khi dung lượng lớn hơn ngưỡng threshold', () => {
    const middleware = compressionMiddleware({ threshold: 50 });
    middleware(mockReq as Request, mockRes as Response, () => {});

    const largePayload = JSON.stringify({
      products: Array.from({ length: 50 }, (_, i) => ({
        id: `prod-${i}`,
        name: `Sản phẩm thử nghiệm số ${i}`,
        price: 150000 + i * 1000,
      })),
    });

    // Gọi res.end với payload lớn
    mockRes.end!(largePayload);

    expect(headers['content-encoding']).toBe('gzip');
    expect(headers['vary']).toContain('Accept-Encoding');
    expect(outputData).toBeDefined();

    // Giải nén ngược lại bằng zlib và xác thực đúng dữ liệu gốc
    const decompressed = zlib.gunzipSync(outputData!).toString('utf-8');
    expect(decompressed).toBe(largePayload);
  });

  it('không nén khi payload nhỏ hơn ngưỡng threshold', () => {
    const middleware = compressionMiddleware({ threshold: 1000 });
    middleware(mockReq as Request, mockRes as Response, () => {});

    const smallPayload = 'Short text';
    mockRes.end!(smallPayload);

    expect(headers['content-encoding']).toBeUndefined();
    expect(outputData?.toString()).toBe(smallPayload);
  });
});
