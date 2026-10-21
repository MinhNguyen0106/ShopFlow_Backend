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
import { AppError } from '../errors/app-error.js';

export class ProductService {
  constructor(private readonly repo: ProductRepository = productRepository) {}

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

    return this.repo.create(data);
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
   * Lấy danh sách sản phẩm có phân trang và tìm kiếm
   */
  async getProducts(params: QueryProductsDto): Promise<ProductListResult> {
    return this.repo.findMany(params);
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
    return updated;
  }

  /**
   * Xóa sản phẩm theo ID
   */
  async deleteProduct(id: string): Promise<boolean> {
    await this.getProductById(id);
    return this.repo.delete(id);
  }

  /**
   * Trừ tồn kho nguyên tử khi có đơn đặt hàng
   */
  async decrementStock(id: string, quantity: number, variantSku?: string): Promise<Product> {
    return this.repo.atomicDecrementStock(id, quantity, variantSku);
  }

  /**
   * Điều chỉnh tồn kho thủ công (cộng/trừ kho)
   */
  async adjustStock(id: string, data: AdjustStockDto): Promise<Product> {
    await this.getProductById(id);
    return this.repo.adjustStock(id, data.quantity, data.variantSku);
  }
}

export const productService = new ProductService();
