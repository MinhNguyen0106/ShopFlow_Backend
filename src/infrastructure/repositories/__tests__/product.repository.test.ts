/**
 * ShopFlow - Product Repository Unit Tests (TASK-21)
 * File: backend/src/infrastructure/repositories/__tests__/product.repository.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductRepository } from '../product.repository.js';
import * as dbClient from '../../database/db.client.js';
import { AppError } from '../../../core/errors/app-error.js';

vi.mock('../../database/db.client.js', () => ({
  query: vi.fn(),
}));

describe('ProductRepository', () => {
  let repository: ProductRepository;
  const mockQuery = vi.mocked(dbClient.query);

  const mockProductRow = {
    id: 'prod-uuid-1234',
    page_id: 'page-uuid-5678',
    sku: 'VAY01',
    name: 'Váy hoa vintage',
    description: 'Chất liệu lụa thoáng mát',
    price: '250000',
    original_price: '300000',
    stock_quantity: 50,
    variants: [
      { sku: 'VAY01-M', color: 'đỏ', size: 'M', stock: 20, price: 250000 },
      { sku: 'VAY01-L', color: 'đỏ', size: 'L', stock: 30, price: 250000 },
    ],
    image_urls: ['https://sample.com/vay.jpg'],
    is_active: true,
    created_at: '2026-10-21T08:00:00.000Z',
    updated_at: '2026-10-21T08:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ProductRepository();
  });

  it('tạo mới sản phẩm và ánh xạ dữ liệu chính xác', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [mockProductRow],
      rowCount: 1,
      command: 'INSERT',
    });

    const result = await repository.create({
      pageId: 'page-uuid-5678',
      sku: 'vay01',
      name: 'Váy hoa vintage',
      price: 250000,
      stockQuantity: 50,
      variants: mockProductRow.variants,
      imageUrls: mockProductRow.image_urls,
      isActive: true,
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('prod-uuid-1234');
    expect(result.sku).toBe('VAY01');
    expect(result.price).toBe(250000);
    expect(result.stock_quantity).toBe(50);
    expect(result.variants).toHaveLength(2);
  });

  it('tìm sản phẩm theo ID thành công', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [mockProductRow],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repository.findById('prod-uuid-1234');
    expect(result).not.null;
    expect(result?.id).toBe('prod-uuid-1234');
  });

  it('tìm sản phẩm theo SKU và pageId', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [mockProductRow],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repository.findBySku('page-uuid-5678', 'vay01');
    expect(result).not.null;
    expect(result?.sku).toBe('VAY01');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPPER(sku) = UPPER($2)'),
      ['page-uuid-5678', 'VAY01']
    );
  });

  it('lấy danh sách sản phẩm phân trang và tính toán tổng số trang', async () => {
    // 1. Mock count query
    mockQuery.mockResolvedValueOnce({
      rows: [{ total: 45 }],
      rowCount: 1,
      command: 'SELECT',
    });

    // 2. Mock data query
    mockQuery.mockResolvedValueOnce({
      rows: [mockProductRow],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repository.findMany({
      pageId: 'page-uuid-5678',
      search: 'hoa',
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(45);
    expect(result.totalPages).toBe(5);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe('Váy hoa vintage');
  });

  describe('atomicDecrementStock (Trừ tồn kho nguyên tử)', () => {
    it('trừ tồn kho thành công khi số lượng khả dụng đủ', async () => {
      const updatedRow = { ...mockProductRow, stock_quantity: 48 };

      mockQuery.mockResolvedValueOnce({
        rows: [updatedRow],
        rowCount: 1,
        command: 'UPDATE',
      });

      const result = await repository.atomicDecrementStock('prod-uuid-1234', 2);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('stock_quantity >= $1'),
        [2, 'prod-uuid-1234']
      );
      expect(result.stock_quantity).toBe(48);
    });

    it('ném lỗi INSUFFICIENT_STOCK khi tồn kho không đủ (bán vượt/hết hàng)', async () => {
      // Khi câu lệnh UPDATE không cập nhật dòng nào do stock_quantity < quantity
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
      });

      try {
        await repository.atomicDecrementStock('prod-uuid-1234', 100);
        expect.unreachable('Cần ném lỗi khi tồn kho không đủ');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const error = err as AppError;
        expect(error.code).toBe('INSUFFICIENT_STOCK');
        expect(error.statusCode).toBe(400);
      }
    });

    it('từ chối trừ kho khi số lượng <= 0', async () => {
      await expect(repository.atomicDecrementStock('prod-uuid-1234', 0)).rejects.toThrow(
        /Số lượng trừ kho phải lớn hơn 0/
      );
    });
  });

  describe('adjustStock', () => {
    it('cộng thêm tồn kho khi deltaQuantity > 0', async () => {
      const increasedRow = { ...mockProductRow, stock_quantity: 60 };
      mockQuery.mockResolvedValueOnce({
        rows: [increasedRow],
        rowCount: 1,
        command: 'UPDATE',
      });

      const result = await repository.adjustStock('prod-uuid-1234', 10);
      expect(result.stock_quantity).toBe(60);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('stock_quantity + $1'),
        [10, 'prod-uuid-1234']
      );
    });
  });
});
