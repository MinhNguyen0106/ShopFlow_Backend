/**
 * ShopFlow - Shipping Controller Integration Tests (TASK-23)
 * File: backend/src/api/controllers/__tests__/shipping.controller.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { shippingService } from '../../../core/services/shipping.service.js';
import { generateTokens } from '../../../utils/auth.helper.js';

describe('ShippingController Integration Suite (/api/v1/shipments)', () => {
  const app = createApp();
  let authToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    const tokens = generateTokens({
      id: 'user-uuid-1234',
      email: 'owner@shopflow.vn',
      role: 'owner',
    });
    authToken = `Bearer ${tokens.accessToken}`;
  });

  describe('POST /api/v1/shipments/create', () => {
    const validPayload = {
      orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      carrier: 'ghn',
      weightGram: 500,
      codAmount: 350000,
    };

    it('trả về 401 UNAUTHORIZED khi không có token xác thực', async () => {
      const response = await request(app)
        .post('/api/v1/shipments/create')
        .send(validPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('trả về 400 VALIDATION_ERROR khi orderId không phải UUID', async () => {
      const response = await request(app)
        .post('/api/v1/shipments/create')
        .set('Authorization', authToken)
        .send({ orderId: 'not-valid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('trả về 201 CREATED khi tạo vận đơn thành công', async () => {
      vi.spyOn(shippingService, 'createShipment').mockResolvedValueOnce({
        id: 'ship-uuid-1',
        orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        carrier: 'ghn',
        trackingCode: 'GHN12345678',
        shippingFee: 32000,
        codAmount: 350000,
        status: 'ready_to_pick',
        labelUrl: 'https://api.ghn.vn/print/GHN12345678',
        estimatedDeliveryAt: '2026-10-23T10:00:00.000Z',
      });

      const response = await request(app)
        .post('/api/v1/shipments/create')
        .set('Authorization', authToken)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingCode).toBe('GHN12345678');
      expect(response.body.data.shippingFee).toBe(32000);
    });
  });

  describe('GET /api/v1/shipments/:trackingCode/track', () => {
    it('trả về 401 UNAUTHORIZED khi thiếu token', async () => {
      const response = await request(app)
        .get('/api/v1/shipments/GHN12345678/track');

      expect(response.status).toBe(401);
    });

    it('trả về 200 OK kèm thông tin và timeline hành trình vận đơn', async () => {
      vi.spyOn(shippingService, 'trackShipment').mockResolvedValueOnce({
        carrier: 'ghn',
        trackingCode: 'GHN12345678',
        status: 'delivering',
        statusText: 'Đang giao hàng đến người nhận',
        currentLocation: 'Kho GHN Cầu Giấy',
        updatedAt: '2026-10-21T16:30:00.000Z',
        logs: [
          {
            status: 'delivering',
            note: 'Tài xế đang phát hàng',
            timestamp: '2026-10-21T16:30:00.000Z',
          },
        ],
      });

      const response = await request(app)
        .get('/api/v1/shipments/GHN12345678/track')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingCode).toBe('GHN12345678');
      expect(response.body.data.logs.length).toBe(1);
    });
  });
});
