/**
 * ShopFlow - Product Controller Integration Tests (TASK-21)
 * File: backend/src/api/controllers/__tests__/product.controller.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { productService } from '../../../core/services/product.service.js';
import { generateTokens } from '../../../utils/auth.helper.js';
import { AppError } from '../../../core/errors/app-error.js';
import { Product } from '../../../core/entities/product.entity.js';

describe('ProductController Integration Suite (/api/v1/products)', () => {
  const app = createApp();
  const validPageId = '11111111-2222-3333-4444-555555555555';
  const validProductId = '22222222-3333-4444-5555-666666666666';

  let authToken: string;

  const mockProduct: Product = {
    id: validProductId,
    page_id: validPageId,
    sku: 'AOPOLO01',
    name: 'Áo Polo Nam Cao Cấp',
    description: 'Cotton 100% co giãn 4 chiều',
    price: 299000,
    original_price: 350000,
    stock_quantity: 100,
    variants: [
      { sku: 'POLO-DEN-M', color: 'đen', size: 'M', stock: 50, price: 299000 },
      { sku: 'POLO-DEN-L', color: 'đen', size: 'L', stock: 50, price: 299000 },
    ],
    image_urls: ['https://sample.com/polo.jpg'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const tokens = generateTokens({
      id: 'user-uuid-1234',
      email: 'owner@shopflow.vn',
      role: 'owner',
    });
    authToken = `Bearer ${tokens.accessToken}`;
  });

  describe('Authentication Check (401)', () => {
    it('trả về 401 UNAUTHORIZED khi không truyền Bearer token', async () => {
      const response = await request(app).get('/api/v1/products');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/products', () => {
    it('trả về 400 VALIDATION_ERROR khi thiếu query pageId', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details.some((d: { field: string }) => d.field === 'pageId')).toBe(true);
    });

    it('trả về 200 OK cùng danh sách sản phẩm và phân trang khi hợp lệ', async () => {
      vi.spyOn(productService, 'getProducts').mockResolvedValueOnce({
        items: [mockProduct],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const response = await request(app)
        .get(`/api/v1/products?pageId=${validPageId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sku).toBe('AOPOLO01');
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('POST /api/v1/products', () => {
    it('trả về 400 VALIDATION_ERROR khi body thiếu trường bắt buộc', async () => {
      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', authToken)
        .send({
          pageId: validPageId,
          sku: 'SP',
          // thiếu name và price
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('trả về 409 CONFLICT khi mã SKU đã tồn tại trên Fanpage', async () => {
      vi.spyOn(productService, 'createProduct').mockRejectedValueOnce(
        new AppError('Mã SKU đã tồn tại', 409, 'SKU_ALREADY_EXISTS')
      );

      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', authToken)
        .send({
          pageId: validPageId,
          sku: 'AOPOLO01',
          name: 'Áo Polo Nam',
          price: 299000,
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SKU_ALREADY_EXISTS');
    });

    it('trả về 201 Created khi tạo sản phẩm thành công', async () => {
      vi.spyOn(productService, 'createProduct').mockResolvedValueOnce(mockProduct);

      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', authToken)
        .send({
          pageId: validPageId,
          sku: 'AOPOLO01',
          name: 'Áo Polo Nam Cao Cấp',
          price: 299000,
          stockQuantity: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tạo sản phẩm mới thành công');
      expect(response.body.data.id).toBe(validProductId);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('trả về 404 NOT_FOUND khi sản phẩm không tồn tại', async () => {
      vi.spyOn(productService, 'getProductById').mockRejectedValueOnce(
        new AppError('Không tìm thấy sản phẩm', 404, 'PRODUCT_NOT_FOUND')
      );

      const response = await request(app)
        .get(`/api/v1/products/${validProductId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('trả về 200 OK kèm chi tiết sản phẩm', async () => {
      vi.spyOn(productService, 'getProductById').mockResolvedValueOnce(mockProduct);

      const response = await request(app)
        .get(`/api/v1/products/${validProductId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Áo Polo Nam Cao Cấp');
    });
  });

  describe('PUT /api/v1/products/:id', () => {
    it('trả về 200 OK khi cập nhật thành công', async () => {
      vi.spyOn(productService, 'updateProduct').mockResolvedValueOnce({
        ...mockProduct,
        price: 249000,
      });

      const response = await request(app)
        .put(`/api/v1/products/${validProductId}`)
        .set('Authorization', authToken)
        .send({ price: 249000 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.price).toBe(249000);
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('trả về 200 OK khi xóa sản phẩm thành công', async () => {
      vi.spyOn(productService, 'deleteProduct').mockResolvedValueOnce(true);

      const response = await request(app)
        .delete(`/api/v1/products/${validProductId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Xóa sản phẩm thành công');
    });
  });

  describe('PATCH /api/v1/products/:id/stock (Concurrency & Decrement)', () => {
    it('trả về 200 OK khi điều chỉnh tồn kho thành công', async () => {
      vi.spyOn(productService, 'adjustStock').mockResolvedValueOnce({
        ...mockProduct,
        stock_quantity: 95,
      });

      const response = await request(app)
        .patch(`/api/v1/products/${validProductId}/stock`)
        .set('Authorization', authToken)
        .send({ quantity: -5, reason: 'Chốt 5 cái' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stock_quantity).toBe(95);
    });

    it('trả về 400 khi số lượng tồn không đủ (chống bán vượt - overselling)', async () => {
      vi.spyOn(productService, 'adjustStock').mockRejectedValueOnce(
        new AppError('Số lượng tồn kho không đủ', 400, 'INSUFFICIENT_STOCK')
      );

      const response = await request(app)
        .patch(`/api/v1/products/${validProductId}/stock`)
        .set('Authorization', authToken)
        .send({ quantity: -999 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });
});
