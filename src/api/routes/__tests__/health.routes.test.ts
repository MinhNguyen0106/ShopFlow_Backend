/**
 * ShopFlow - Integration/Unit Tests: Health Routes & App
 * File: backend/src/api/routes/__tests__/health.routes.test.ts
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';

describe('Health Routes & App Integration', () => {
  const app = createApp();

  it('GET /health nên trả về HTTP 200 OK với trạng thái healthy', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'healthy',
      service: 'ShopFlow Backend API',
    });
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/v1/health nên trả về HTTP 200 OK qua API v1 Router', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'healthy',
      service: 'ShopFlow Backend API',
    });
  });

  it('GET đường dẫn không tồn tại nên kích hoạt notFoundHandler trả về 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/v1/random-route-xyz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Đường dẫn [GET] /api/v1/random-route-xyz không tồn tại trên hệ thống.',
      },
    });
  });

  it('POST JSON không đúng cú pháp nên kích hoạt errorHandler trả về 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"bad_json: missing quote}');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Cú pháp JSON trong nội dung yêu cầu không hợp lệ.',
      },
    });
  });
});
