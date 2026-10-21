/**
 * ShopFlow - Product DTOs Unit Tests (TASK-21)
 * File: backend/src/api/dtos/__tests__/product.dto.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  CreateProductDtoSchema,
  UpdateProductDtoSchema,
  QueryProductsDtoSchema,
  AdjustStockDtoSchema,
} from '../product.dto.js';

describe('Product DTOs Validation', () => {
  const validPageId = '11111111-2222-3333-4444-555555555555';

  describe('CreateProductDtoSchema', () => {
    it('thẩm định thành công với đầy đủ dữ liệu hợp lệ và tự động uppercase SKU', () => {
      const raw = {
        pageId: validPageId,
        sku: '  vay01  ',
        name: 'Váy hoa vintage',
        price: 250000,
        originalPrice: 300000,
        stockQuantity: 50,
        variants: [
          { color: 'đỏ', size: 'M', stock: 20, price: 250000 },
          { color: 'đỏ', size: 'L', stock: 30, price: 250000 },
        ],
        imageUrls: ['https://res.cloudinary.com/demo/image/upload/v1/sample.jpg'],
      };

      const result = CreateProductDtoSchema.parse(raw);

      expect(result.sku).toBe('VAY01');
      expect(result.name).toBe('Váy hoa vintage');
      expect(result.price).toBe(250000);
      expect(result.stockQuantity).toBe(50);
      expect(result.variants).toHaveLength(2);
      expect(result.isActive).toBe(true);
    });

    it('báo lỗi khi pageId không phải định dạng UUID', () => {
      const raw = {
        pageId: 'invalid-uuid-string',
        sku: 'VAY01',
        name: 'Váy hoa',
        price: 100000,
      };

      expect(() => CreateProductDtoSchema.parse(raw)).toThrow(/pageId phải là UUID hợp lệ/);
    });

    it('báo lỗi khi giá bán hoặc số lượng tồn kho âm', () => {
      expect(() =>
        CreateProductDtoSchema.parse({
          pageId: validPageId,
          sku: 'SP01',
          name: 'Áo thun',
          price: -50000,
        })
      ).toThrow(/Giá sản phẩm không được là số âm/);

      expect(() =>
        CreateProductDtoSchema.parse({
          pageId: validPageId,
          sku: 'SP01',
          name: 'Áo thun',
          price: 50000,
          stockQuantity: -5,
        })
      ).toThrow(/Số lượng tồn kho không được âm/);
    });
  });

  describe('UpdateProductDtoSchema', () => {
    it('cho phép cập nhật từng phần (partial updates)', () => {
      const raw = {
        price: 199000,
        isActive: false,
      };

      const result = UpdateProductDtoSchema.parse(raw);
      expect(result.price).toBe(199000);
      expect(result.isActive).toBe(false);
      expect(result.name).toBeUndefined();
    });

    it('báo lỗi khi SKU cập nhật dưới 2 ký tự', () => {
      expect(() =>
        UpdateProductDtoSchema.parse({
          sku: 'A',
        })
      ).toThrow(/Mã SKU tối thiểu 2 ký tự/);
    });
  });

  describe('QueryProductsDtoSchema', () => {
    it('gán giá trị mặc định cho phân trang và chuyển đổi string boolean', () => {
      const raw = {
        pageId: validPageId,
        isActive: 'true',
      };

      const result = QueryProductsDtoSchema.parse(raw);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.isActive).toBe(true);
    });

    it('hỗ trợ tìm kiếm từ khóa', () => {
      const raw = {
        pageId: validPageId,
        search: 'áo sơ mi',
        page: '2',
        limit: '15',
      };

      const result = QueryProductsDtoSchema.parse(raw);
      expect(result.search).toBe('áo sơ mi');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(15);
    });
  });

  describe('AdjustStockDtoSchema', () => {
    it('chấp nhận số lượng nguyên dương hoặc âm', () => {
      const inc = AdjustStockDtoSchema.parse({ quantity: 10, reason: 'Nhập hàng mới' });
      expect(inc.quantity).toBe(10);

      const dec = AdjustStockDtoSchema.parse({ quantity: -3, reason: 'Chốt đơn cho khách' });
      expect(dec.quantity).toBe(-3);
    });

    it('từ chối khi số lượng điều chỉnh là số thập phân', () => {
      expect(() => AdjustStockDtoSchema.parse({ quantity: 2.5 })).toThrow(
        /Số lượng điều chỉnh phải là số nguyên/
      );
    });
  });
});
