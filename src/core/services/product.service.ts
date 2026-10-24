/**
 * ShopFlow - Product Domain Service (TASK-21)
 * File: backend/src/core/services/product.service.ts
 */

import { Product, ProductListResult } from '../entities/product.entity.js';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
  AdjustStockDto,
} from '../../api/dtos/product.dto.js';
import { ProductRepository, productRepository } from '../../infrastructure/repositories/product.repository.js';
import { ICacheService, cacheService } from '../../infrastructure/cache/cache.service.js';
import { AppError } from '../errors/app-error.js';

export class ProductService {
  constructor(
    private readonly repo: ProductRepository = productRepository,
    private readonly cache: ICacheService = cacheService
  ) {}

  /**
   * Tạo sản phẩm mới kèm kiểm tra mã SKU duy nhất trên từng Fanpage
   */
  async createProduct(data: CreateProductDto): Promise<Product> {
    const existing = await this.repo.findBySku(data.pageId, data.sku);
    if (existing) {
      throw new AppError(
        `Mã SKU "${data.sku.toUpperCase()}" đã tồn tại trong Fanpage này`,
        409,
        'SKU_ALREADY_EXISTS'
      );
    }

    const created = await this.repo.create(data);
    await this.cache.invalidateByPattern(`cache:products:${data.pageId}:*`).catch(() => {});
    return created;
  }

  /**
   * Lấy chi tiết sản phẩm theo ID
   */
  async getProductById(id: string): Promise<Product> {
    const product = await this.repo.findById(id);
    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm', 404, 'PRODUCT_NOT_FOUND');
    }
    return product;
  }

  /**
   * Tìm sản phẩm theo SKU và pageId
   */
  async getProductBySku(pageId: string, sku: string): Promise<Product | null> {
    return this.repo.findBySku(pageId, sku);
  }

  /**
   * Lấy danh sách sản phẩm có phân trang và tìm kiếm (được tối ưu hóa qua Redis Cache)
   */
  async getProducts(params: QueryProductsDto): Promise<ProductListResult> {
    const queryStringHash = Buffer.from(JSON.stringify(params)).toString('base64');
    const cacheKey = `cache:products:${params.pageId}:list:${queryStringHash}`;

    return this.cache.getOrSet(
      cacheKey,
      () => this.repo.findMany(params),
      600 // TTL 10 phút
    );
  }

  /**
   * Cập nhật thông tin sản phẩm
   */
  async updateProduct(id: string, data: UpdateProductDto): Promise<Product> {
    const existing = await this.getProductById(id);

    // Nếu thay đổi mã SKU, kiểm tra trùng SKU trên page
    if (data.sku && data.sku.toUpperCase() !== existing.sku.toUpperCase()) {
      const duplicate = await this.repo.findBySku(existing.page_id, data.sku);
      if (duplicate && duplicate.id !== id) {
        throw new AppError(
          `Mã SKU "${data.sku.toUpperCase()}" đã được sử dụng bởi sản phẩm khác`,
          409,
          'SKU_ALREADY_EXISTS'
        );
      }
    }

    const updated = await this.repo.update(id, data);
    if (!updated) {
      throw new AppError('Không thể cập nhật sản phẩm', 500, 'UPDATE_FAILED');
    }

    await this.cache.invalidateByPattern(`cache:products:${existing.page_id}:*`).catch(() => {});
    return updated;
  }

  /**
   * Xóa sản phẩm theo ID
   */
  async deleteProduct(id: string): Promise<boolean> {
    const existing = await this.getProductById(id);
    const deleted = await this.repo.delete(id);
    if (deleted) {
      await this.cache.invalidateByPattern(`cache:products:${existing.page_id}:*`).catch(() => {});
    }
    return deleted;
  }

  /**
   * Trừ tồn kho nguyên tử khi có đơn đặt hàng
   */
  async decrementStock(id: string, quantity: number, variantSku?: string): Promise<Product> {
    const updated = await this.repo.atomicDecrementStock(id, quantity, variantSku);
    await this.cache.invalidateByPattern(`cache:products:${updated.page_id}:*`).catch(() => {});
    return updated;
  }

  /**
   * Điều chỉnh tồn kho thủ công (cộng/trừ kho)
   */
  async adjustStock(id: string, data: AdjustStockDto): Promise<Product> {
    const existing = await this.getProductById(id);
    const updated = await this.repo.adjustStock(id, data.quantity, data.variantSku);
    await this.cache.invalidateByPattern(`cache:products:${existing.page_id}:*`).catch(() => {});
    return updated;
  }
}

export const productService = new ProductService();
