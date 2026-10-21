/**
 * ShopFlow - Order Parser Controller Unit Tests (TASK-20)
 * File: backend/src/api/controllers/__tests__/order-parser.controller.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { orderParserService } from '../../../core/services/order-parser.service.js';

describe('OrderParserController (POST /api/v1/orders/parse)', () => {
  const app = createApp();

  it('trả về 200 và kết quả trích xuất chuẩn Envelope khi payload hợp lệ', async () => {
    vi.spyOn(orderParserService, 'parseOrder').mockResolvedValueOnce({
      items: [
        {
          productCode: 'VAY01',
          productName: 'Sản phẩm VAY01',
          quantity: 2,
          attributes: { color: 'đỏ', size: 'M' },
          priceEstimate: null,
        },
      ],
      customerName: 'Khách VIP',
      customerPhone: '0987654321',
      shippingAddress: '123 Cầu Giấy, Hà Nội',
      confidenceScore: 0.95,
      rawInput: '#VAY01 2 cái đỏ size M 0987654321',
      extractionMethod: 'regex',
      notes: null,
    });

    const response = await request(app)
      .post('/api/v1/orders/parse')
      .send({
        text: '#VAY01 2 cái đỏ size M 0987654321',
        context: { customerName: 'Khách VIP' },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Trích xuất thông tin đơn hàng thành công');
    expect(response.body.data.customerPhone).toBe('0987654321');
    expect(response.body.data.items[0].productCode).toBe('VAY01');
    expect(response.body.data.items[0].quantity).toBe(2);
  });

  it('trả về 400 VALIDATION_ERROR khi body thiếu trường text bắt buộc', async () => {
    const response = await request(app)
      .post('/api/v1/orders/parse')
      .send({
        context: { customerName: 'Ai đó' },
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.some((d: { field: string }) => d.field === 'text')).toBe(true);
  });
});
