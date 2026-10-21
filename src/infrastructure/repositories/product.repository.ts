/**
 * ShopFlow - Product Repository (PostgreSQL / db.client)
 * File: backend/src/infrastructure/repositories/product.repository.ts
 *
 * Thực hiện truy vấn dữ liệu bảng `products` sử dụng Prepared Statements và Atomic SQL Decrement.
 */

import { query } from '../database/db.client.js';
import { Product, ProductListResult } from '../../core/entities/product.entity.js';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
  ProductVariantDto,
} from '../../api/dtos/product.dto.js';
import { AppError } from '../../core/errors/app-error.js';

export interface ProductDbRow {
  id: string;
  page_id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number | string;
  original_price: number | string | null;
  stock_quantity: number | string;
  variants: unknown;
  image_urls: unknown;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  [key: string]: unknown;
}

export class ProductRepository {
  /**
   * Tạo mới sản phẩm trong cơ sở dữ liệu
   */
  async create(data: CreateProductDto): Promise<Product> {
    const sql = `
      INSERT INTO products (
        page_id, sku, name, description, price, original_price,
        stock_quantity, variants, image_urls, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const params = [
      data.pageId,
      data.sku.trim().toUpperCase(),
      data.name.trim(),
      data.description ?? null,
      data.price,
      data.originalPrice ?? null,
      data.stockQuantity,
      JSON.stringify(data.variants || []),
      JSON.stringify(data.imageUrls || []),
      data.isActive ?? true,
    ];

    const result = await query<ProductDbRow>(sql, params);
    const product = result.rows[0];
    if (!product) {
      throw new Error('[ProductRepository] Không thể tạo bản ghi sản phẩm mới');
    }
    return this.mapRow(product);
  }

  /**
   * Tìm sản phẩm theo ID (UUID)
   */
  async findById(id: string): Promise<Product | null> {
    const sql = `
      SELECT *
      FROM products
      WHERE id = $1
      LIMIT 1;
    `;
    const result = await query<ProductDbRow>(sql, [id]);
    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  /**
   * Tìm sản phẩm theo SKU trong cùng một Fanpage
   */
  async findBySku(pageId: string, sku: string): Promise<Product | null> {
    const sql = `
      SELECT *
      FROM products
      WHERE page_id = $1 AND UPPER(sku) = UPPER($2)
      LIMIT 1;
    `;
    const result = await query<ProductDbRow>(sql, [pageId, sku.trim().toUpperCase()]);
    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  /**
   * Lấy danh sách sản phẩm có phân trang, lọc trạng thái và tìm kiếm
   */
  async findMany(params: QueryProductsDto): Promise<ProductListResult> {
    const { pageId, search, isActive, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['page_id = $1'];
    const values: unknown[] = [pageId];
    let paramIndex = 2;

    if (isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    if (search && search.trim()) {
      conditions.push(`(name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // 1. Đếm tổng số bản ghi
    const countSql = `SELECT COUNT(*)::int AS total FROM products WHERE ${whereClause};`;
    const countResult = await query<{ total: number }>(countSql, values);
    const total = countResult.rows[0]?.total ?? 0;

    // 2. Lấy dữ liệu phân trang
    const dataSql = `
      SELECT *
      FROM products
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;
    values.push(limit, offset);

    const dataResult = await query<ProductDbRow>(dataSql, values);
    const items = dataResult.rows.map((row) => this.mapRow(row));
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Cập nhật thông tin sản phẩm
   */
  async update(id: string, data: UpdateProductDto): Promise<Product | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.sku !== undefined) {
      sets.push(`sku = $${paramIndex}`);
      values.push(data.sku.trim().toUpperCase());
      paramIndex++;
    }

    if (data.name !== undefined) {
      sets.push(`name = $${paramIndex}`);
      values.push(data.name.trim());
      paramIndex++;
    }

    if (data.description !== undefined) {
      sets.push(`description = $${paramIndex}`);
      values.push(data.description);
      paramIndex++;
    }

    if (data.price !== undefined) {
      sets.push(`price = $${paramIndex}`);
      values.push(data.price);
      paramIndex++;
    }

    if (data.originalPrice !== undefined) {
      sets.push(`original_price = $${paramIndex}`);
      values.push(data.originalPrice);
      paramIndex++;
    }

    if (data.stockQuantity !== undefined) {
      sets.push(`stock_quantity = $${paramIndex}`);
      values.push(data.stockQuantity);
      paramIndex++;
    }

    if (data.variants !== undefined) {
      sets.push(`variants = $${paramIndex}`);
      values.push(JSON.stringify(data.variants));
      paramIndex++;
    }

    if (data.imageUrls !== undefined) {
      sets.push(`image_urls = $${paramIndex}`);
      values.push(JSON.stringify(data.imageUrls));
      paramIndex++;
    }

    if (data.isActive !== undefined) {
      sets.push(`is_active = $${paramIndex}`);
      values.push(data.isActive);
      paramIndex++;
    }

    if (sets.length === 0) {
      return this.findById(id);
    }

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `
      UPDATE products
      SET ${sets.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const result = await query<ProductDbRow>(sql, values);
    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  /**
   * Xóa sản phẩm theo ID
   */
  async delete(id: string): Promise<boolean> {
    const sql = `DELETE FROM products WHERE id = $1 RETURNING id;`;
    const result = await query<{ id: string }>(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Trừ tồn kho nguyên tử (Atomic Decrement) - Ngăn ngừa Race Condition & Overselling
   * Sử dụng câu lệnh UPDATE có điều kiện stock_quantity >= $1
   */
  async atomicDecrementStock(
    id: string,
    quantity: number,
    variantSku?: string
  ): Promise<Product> {
    if (quantity <= 0) {
      throw new AppError('Số lượng trừ kho phải lớn hơn 0', 400, 'INVALID_QUANTITY');
    }

    // Nếu trừ kho theo sản phẩm cha
    const sql = `
      UPDATE products
      SET stock_quantity = stock_quantity - $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND stock_quantity >= $1
      RETURNING *;
    `;

    const result = await query<ProductDbRow>(sql, [quantity, id]);
    const updatedProduct = result.rows[0];

    if (!updatedProduct) {
      throw new AppError(
        'Số lượng tồn kho không đủ để thực hiện yêu cầu (Hết hàng hoặc bán vượt)',
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    // Nếu có variantSku, cập nhật tồn kho biến thể trong JSONB
    if (variantSku && Array.isArray(updatedProduct.variants)) {
      const variants = updatedProduct.variants as ProductVariantDto[];
      const targetVariant = variants.find(
        (v) => v.sku?.toUpperCase() === variantSku.toUpperCase()
      );

      if (targetVariant) {
        targetVariant.stock = Math.max(0, targetVariant.stock - quantity);
        await this.update(id, { variants });
        updatedProduct.variants = variants;
      }
    }

    return this.mapRow(updatedProduct);
  }

  /**
   * Điều chỉnh tồn kho trực tiếp (Cộng hoặc trừ kho)
   */
  async adjustStock(id: string, deltaQuantity: number, variantSku?: string): Promise<Product> {
    if (deltaQuantity < 0) {
      return this.atomicDecrementStock(id, Math.abs(deltaQuantity), variantSku);
    }

    const sql = `
      UPDATE products
      SET stock_quantity = stock_quantity + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;

    const result = await query<ProductDbRow>(sql, [deltaQuantity, id]);
    const product = result.rows[0];
    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm để điều chỉnh tồn kho', 404, 'PRODUCT_NOT_FOUND');
    }

    return this.mapRow(product);
  }

  /**
   * Chuẩn hóa row từ database PostgreSQL về kiểu TypeScript Product
   */
  private mapRow(row: ProductDbRow): Product {
    return {
      id: row.id as string,
      page_id: row.page_id as string,
      sku: row.sku as string,
      name: row.name as string,
      description: (row.description as string) ?? null,
      price: Number(row.price),
      original_price: row.original_price != null ? Number(row.original_price) : null,
      stock_quantity: Number(row.stock_quantity),
      variants: Array.isArray(row.variants)
        ? (row.variants as ProductVariantDto[])
        : typeof row.variants === 'string'
          ? JSON.parse(row.variants)
          : [],
      image_urls: Array.isArray(row.image_urls)
        ? (row.image_urls as string[])
        : typeof row.image_urls === 'string'
          ? JSON.parse(row.image_urls)
          : [],
      is_active: Boolean(row.is_active),
      created_at: new Date(row.created_at as string | Date),
      updated_at: new Date(row.updated_at as string | Date),
    };
  }
}

export const productRepository = new ProductRepository();
