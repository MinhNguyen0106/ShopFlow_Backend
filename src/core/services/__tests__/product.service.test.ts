/**
 * ShopFlow - Product Service Unit Tests (TASK-21)
 * File: backend/src/core/services/__tests__/product.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '../product.service.js';
import { ProductRepository } from '../../../infrastructure/repositories/product.repository.js';
import { AppError } from '../../errors/app-error.js';
import { Product } from '../../entities/product.entity.js';

describe('ProductService', () => {
  let service: ProductService;
  let mockRepo: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findBySku: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    atomicDecrementStock: ReturnType<typeof vi.fn>;
    adjustStock: ReturnType<typeof vi.fn>;
  };

  const sampleProduct: Product = {
    id: 'prod-001',
    page_id: 'page-001',
    sku: 'SP01',
    name: 'Áo phông Unisex',
    description: null,
    price: 150000,
    original_price: null,
    stock_quantity: 100,
    variants: [],
    image_urls: [],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySku: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      atomicDecrementStock: vi.fn(),
      adjustStock: vi.fn(),
    };

    service = new ProductService(mockRepo as unknown as ProductRepository);
  });

  describe('createProduct', () => {
    it('tạo sản phẩm thành công khi SKU chưa bị trùng trong Fanpage', async () => {
      mockRepo.findBySku.mockResolvedValueOnce(null);
      mockRepo.create.mockResolvedValueOnce(sampleProduct);

      const result = await service.createProduct({
        pageId: 'page-001',
        sku: 'SP01',
        name: 'Áo phông Unisex',
        price: 150000,
        stockQuantity: 100,
        variants: [],
        imageUrls: [],
        isActive: true,
      });

      expect(mockRepo.findBySku).toHaveBeenCalledWith('page-001', 'SP01');
      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(result.sku).toBe('SP01');
    });

    it('ném lỗi SKU_ALREADY_EXISTS (409) khi mã SKU đã tồn tại', async () => {
      mockRepo.findBySku.mockResolvedValueOnce(sampleProduct);

      await expect(
        service.createProduct({
          pageId: 'page-001',
          sku: 'SP01',
          name: 'Sản phẩm mới',
          price: 200000,
          stockQuantity: 10,
          variants: [],
          imageUrls: [],
          isActive: true,
        })
      ).rejects.toThrow(AppError);

      try {
        await service.createProduct({
          pageId: 'page-001',
          sku: 'SP01',
          name: 'Sản phẩm mới',
          price: 200000,
          stockQuantity: 10,
          variants: [],
          imageUrls: [],
          isActive: true,
        });
      } catch (err) {
        const error = err as AppError;
        expect(error.code).toBe('SKU_ALREADY_EXISTS');
        expect(error.statusCode).toBe(409);
      }
    });
  });

  describe('getProductById', () => {
    it('trả về chi tiết sản phẩm khi tìm thấy', async () => {
      mockRepo.findById.mockResolvedValueOnce(sampleProduct);

      const result = await service.getProductById('prod-001');
      expect(result.id).toBe('prod-001');
    });

    it('ném lỗi PRODUCT_NOT_FOUND (404) khi ID không tồn tại', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(service.getProductById('prod-unknown')).rejects.toThrow(AppError);

      try {
        await service.getProductById('prod-unknown');
      } catch (err) {
        const error = err as AppError;
        expect(error.code).toBe('PRODUCT_NOT_FOUND');
        expect(error.statusCode).toBe(404);
      }
    });
  });

  describe('updateProduct', () => {
    it('cập nhật thành công thông tin sản phẩm', async () => {
      mockRepo.findById.mockResolvedValueOnce(sampleProduct);
      mockRepo.update.mockResolvedValueOnce({ ...sampleProduct, price: 180000 });

      const result = await service.updateProduct('prod-001', { price: 180000 });
      expect(result.price).toBe(180000);
      expect(mockRepo.update).toHaveBeenCalledWith('prod-001', { price: 180000 });
    });

    it('ném lỗi 409 khi đổi SKU trùng với sản phẩm khác', async () => {
      mockRepo.findById.mockResolvedValueOnce(sampleProduct);
      mockRepo.findBySku.mockResolvedValueOnce({
        ...sampleProduct,
        id: 'prod-002', // Sản phẩm khác đã dùng SKU này
        sku: 'SP02',
      });

      await expect(
        service.updateProduct('prod-001', { sku: 'SP02' })
      ).rejects.toThrow(AppError);
    });
  });

  describe('decrementStock & adjustStock', () => {
    it('gọi atomicDecrementStock trên repository', async () => {
      mockRepo.atomicDecrementStock.mockResolvedValueOnce({
        ...sampleProduct,
        stock_quantity: 98,
      });

      const result = await service.decrementStock('prod-001', 2);
      expect(mockRepo.atomicDecrementStock).toHaveBeenCalledWith('prod-001', 2, undefined);
      expect(result.stock_quantity).toBe(98);
    });

    it('gọi adjustStock trên repository sau khi kiểm tra sự tồn tại', async () => {
      mockRepo.findById.mockResolvedValueOnce(sampleProduct);
      mockRepo.adjustStock.mockResolvedValueOnce({
        ...sampleProduct,
        stock_quantity: 110,
      });

      const result = await service.adjustStock('prod-001', { quantity: 10, reason: 'Nhập hàng' });
      expect(mockRepo.adjustStock).toHaveBeenCalledWith('prod-001', 10, undefined);
      expect(result.stock_quantity).toBe(110);
    });
  });
});
