/**
 * ShopFlow - Product Routes (TASK-21)
 * File: backend/src/api/routes/product.routes.ts
 */

import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import {
  CreateProductDtoSchema,
  UpdateProductDtoSchema,
  QueryProductsDtoSchema,
  AdjustStockDtoSchema,
} from '../dtos/product.dto.js';
import { z } from 'zod';

export const productRouter = Router();

// Yêu cầu xác thực Bearer token cho toàn bộ thao tác sản phẩm
productRouter.use(authenticateToken);

const IdParamSchema = z.object({
  id: z.string().uuid('Product ID phải là UUID hợp lệ'),
});

/**
 * GET /api/v1/products - Danh sách sản phẩm của Fanpage có phân trang & tìm kiếm
 */
productRouter.get(
  '/',
  validateRequest({ query: QueryProductsDtoSchema }),
  productController.getProducts
);

/**
 * POST /api/v1/products - Tạo sản phẩm mới
 */
productRouter.post(
  '/',
  validateRequest({ body: CreateProductDtoSchema }),
  productController.createProduct
);

/**
 * GET /api/v1/products/:id - Lấy chi tiết sản phẩm
 */
productRouter.get(
  '/:id',
  validateRequest({ params: IdParamSchema }),
  productController.getProductById
);

/**
 * PUT /api/v1/products/:id - Cập nhật sản phẩm
 */
productRouter.put(
  '/:id',
  validateRequest({ params: IdParamSchema, body: UpdateProductDtoSchema }),
  productController.updateProduct
);

/**
 * DELETE /api/v1/products/:id - Xóa sản phẩm
 */
productRouter.delete(
  '/:id',
  validateRequest({ params: IdParamSchema }),
  productController.deleteProduct
);

/**
 * PATCH /api/v1/products/:id/stock - Điều chỉnh số lượng tồn kho
 */
productRouter.patch(
  '/:id/stock',
  validateRequest({ params: IdParamSchema, body: AdjustStockDtoSchema }),
  productController.adjustStock
);
