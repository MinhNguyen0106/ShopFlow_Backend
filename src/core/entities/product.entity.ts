/**
 * ShopFlow - Product Entity & Types (TASK-21)
 * File: backend/src/core/entities/product.entity.ts
 */

import { ProductVariantDto } from '../../api/dtos/product.dto.js';

export interface Product {
  id: string;
  page_id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  stock_quantity: number;
  variants: ProductVariantDto[];
  image_urls: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductListResult {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
