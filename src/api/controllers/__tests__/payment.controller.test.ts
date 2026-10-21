/**
 * ShopFlow - Payment Controller Integration Tests (TASK-23)
 * File: backend/src/api/controllers/__tests__/payment.controller.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { PaymentWebhookService } from '../../../core/services/payment-webhook.service.js';
import { generateTokens } from '../../../utils/auth.helper.js';

describe('PaymentController Integration Suite (/api/v1/payments)', () => {
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

  describe('POST /api/v1/payments/vietqr', () => {
    const validPayload = {
      orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      bankBin: '970436',
      accountNo: '1029384756',
      accountName: 'NGUYEN VAN A',
    };

    it('trả về 401 UNAUTHORIZED khi không có token xác thực', async () => {
      const response = await request(app)
        .post('/api/v1/payments/vietqr')
        .send(validPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('trả về 400 VALIDATION_ERROR khi orderId không phải UUID', async () => {
      const response = await request(app)
        .post('/api/v1/payments/vietqr')
        .set('Authorization', authToken)
        .send({ orderId: 'not-a-uuid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('trả về 200 OK kèm mã VietQR khi request hợp lệ', async () => {
      vi.spyOn(PaymentWebhookService.prototype, 'generateVietQr').mockResolvedValueOnce({
        qrDataUrl: 'https://img.vietqr.io/image/970436-1029384756-compact2.png',
        qrPayload: '00020101021238...',
        orderCode: 'ORD-2026-001',
        amount: 500000,
        bankBin: '970436',
        bankName: 'Vietcombank',
        accountNo: '1029384756',
        accountName: 'NGUYEN VAN A',
        transferContent: 'ORD-2026-001',
      });

      const response = await request(app)
        .post('/api/v1/payments/vietqr')
        .set('Authorization', authToken)
        .send(validPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderCode).toBe('ORD-2026-001');
      expect(response.body.data.qrDataUrl).toContain('https://img.vietqr.io');
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    const validWebhookPayload = {
      id: 99887766,
      gateway: 'sepay',
      amountIn: 530000,
      transactionContent: 'SF ORD-2026-001 CHUYEN KHOAN',
      transactionDate: '2026-10-21 16:30:00',
    };

    it('trả về 400 VALIDATION_ERROR khi thiếu transactionContent', async () => {
      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .send({ id: 123, amountIn: 100000 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('trả về 200 OK khi đối soát webhook thành công', async () => {
      vi.spyOn(PaymentWebhookService.prototype, 'processWebhook').mockResolvedValueOnce({
        success: true,
        orderId: 'ord-101',
        orderCode: 'ORD-2026-001',
        paymentId: 'pay-1',
        status: 'paid',
        amountReceived: 530000,
        finalAmount: 530000,
        message: 'Thanh toán thành công và tự động xác nhận đơn hàng',
      });

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .send(validWebhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('paid');
    });

    it('trả về 200 OK với status already_processed khi trùng lặp giao dịch', async () => {
      vi.spyOn(PaymentWebhookService.prototype, 'processWebhook').mockResolvedValueOnce({
        success: true,
        orderId: 'ord-101',
        paymentId: 'pay-1',
        status: 'already_processed',
        amountReceived: 530000,
        finalAmount: 530000,
        message: 'Giao dịch đã được ghi nhận trước đó',
      });

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .send(validWebhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('already_processed');
    });
  });
});
