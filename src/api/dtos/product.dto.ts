/**
 * ShopFlow - Product & Inventory DTOs & Schemas (TASK-21)
 * File: backend/src/api/dtos/product.dto.ts
 */

import { z } from 'zod';

export const ProductVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  price: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().default(0),
});

export type ProductVariantDto = z.infer<typeof ProductVariantSchema>;

export const CreateProductDtoSchema = z.object({
  pageId: z.string().uuid('pageId phải là UUID hợp lệ'),
  sku: z
    .string()
    .min(2, 'Mã SKU tối thiểu 2 ký tự')
    .max(50, 'Mã SKU tối đa 50 ký tự')
    .trim()
    .toUpperCase(),
  name: z.string().min(2, 'Tên sản phẩm tối thiểu 2 ký tự').max(255).trim(),
  description: z.string().nullable().optional(),
  price: z.number().nonnegative('Giá sản phẩm không được là số âm'),
  originalPrice: z.number().nonnegative('Giá gốc không được là số âm').nullable().optional(),
  stockQuantity: z.number().int().nonnegative('Số lượng tồn kho không được âm').default(0),
  variants: z.array(ProductVariantSchema).default([]),
  imageUrls: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export type CreateProductDto = z.infer<typeof CreateProductDtoSchema>;

export const UpdateProductDtoSchema = z.object({
  sku: z
    .string()
    .min(2, 'Mã SKU tối thiểu 2 ký tự')
    .max(50, 'Mã SKU tối đa 50 ký tự')
    .trim()
    .toUpperCase()
    .optional(),
  name: z.string().min(2, 'Tên sản phẩm tối thiểu 2 ký tự').max(255).trim().optional(),
  description: z.string().nullable().optional(),
  price: z.number().nonnegative('Giá sản phẩm không được là số âm').optional(),
  originalPrice: z.number().nonnegative('Giá gốc không được là số âm').nullable().optional(),
  stockQuantity: z.number().int().nonnegative('Số lượng tồn kho không được âm').optional(),
  variants: z.array(ProductVariantSchema).optional(),
  imageUrls: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateProductDto = z.infer<typeof UpdateProductDtoSchema>;

export const QueryProductsDtoSchema = z.object({
  pageId: z.string().uuid('pageId phải là UUID hợp lệ'),
  search: z.string().optional(),
  isActive: z
    .preprocess((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return val;
    }, z.boolean().optional())
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type QueryProductsDto = z.infer<typeof QueryProductsDtoSchema>;

export const AdjustStockDtoSchema = z.object({
  quantity: z.number().int('Số lượng điều chỉnh phải là số nguyên'),
  variantSku: z.string().optional(),
  reason: z.string().optional(),
});

export type AdjustStockDto = z.infer<typeof AdjustStockDtoSchema>;

export const ProductItemSchema = z.object({
  id: z.string().uuid(),
  pageId: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  price: z.number(),
  originalPrice: z.number().nullable().optional(),
  stockQuantity: z.number().int(),
  variants: z.array(ProductVariantSchema),
  imageUrls: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type ProductItemDto = z.infer<typeof ProductItemSchema>;
