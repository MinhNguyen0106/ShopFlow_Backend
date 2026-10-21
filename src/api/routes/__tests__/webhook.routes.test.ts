/**
 * ShopFlow - Integration Tests: Webhook Routes
 * File: backend/src/api/routes/__tests__/webhook.routes.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../../../app.js';
import { webhookLogRepository } from '../../../infrastructure/repositories/webhook-log.repository.js';
import { env } from '../../../config/env.js';

describe('Webhook Routes Integration (/api/v1/webhook)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/webhook — Meta Handshake Challenge', () => {
    it('nên trả về HTTP 200 với chuỗi challenge thô khi token đúng', async () => {
      const challenge = '1158201444';
      const verifyToken = env.FACEBOOK_VERIFY_TOKEN;

      const res = await request(app)
        .get('/api/v1/webhook')
        .query({
          'hub.mode':         'subscribe',
          'hub.verify_token': verifyToken,
          'hub.challenge':    challenge,
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe(challenge);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
    });

    it('nên trả về HTTP 403 Forbidden khi verify_token sai', async () => {
      const res = await request(app)
        .get('/api/v1/webhook')
        .query({
          'hub.mode':         'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge':    '1158201444',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('nên trả về HTTP 403 Forbidden khi mode không phải subscribe', async () => {
      const res = await request(app)
        .get('/api/v1/webhook')
        .query({
          'hub.mode':         'unsubscribe',
          'hub.verify_token': env.FACEBOOK_VERIFY_TOKEN,
          'hub.challenge':    '1158201444',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/webhook — Event Ingestion', () => {
    const testSecret = 'secret_webhook_test_key_123';

    it('nên trả về HTTP 401 khi không gửi chữ ký x-hub-signature-256 (khi secret đã cấu hình)', async () => {
      vi.spyOn(env, 'FACEBOOK_APP_SECRET', 'get').mockReturnValue(testSecret);

      const res = await request(app)
        .post('/api/v1/webhook')
        .send({ object: 'page', entry: [] });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('nên trả về HTTP 200 EVENT_RECEIVED và ghi nhận log khi chữ ký hợp lệ', async () => {
      vi.spyOn(env, 'FACEBOOK_APP_SECRET', 'get').mockReturnValue(testSecret);
      vi.spyOn(webhookLogRepository, 'create').mockResolvedValueOnce({
        id:         'log-uuid',
        event_id:   'cmt_integration_1',
        page_id:    'page_100',
        event_type: 'comment',
        payload:    {},
        status:     'pending',
        created_at: new Date(),
      });

      const payload = {
        object: 'page',
        entry: [
          {
            id:   'page_100',
            time: 1718000000,
            changes: [
              {
                field: 'feed',
                value: {
                  item:       'comment',
                  comment_id: 'cmt_integration_1',
                  message:    'Sản phẩm đẹp quá shop ơi',
                },
              },
            ],
          },
        ],
      };

      const rawString = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(Buffer.from(rawString))
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/webhook')
        .set('x-hub-signature-256', `sha256=${signature}`)
        .set('Content-Type', 'application/json')
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'EVENT_RECEIVED',
      });
      expect(webhookLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id:   'cmt_integration_1',
          page_id:    'page_100',
          event_type: 'comment',
        })
      );
    });
  });
});
