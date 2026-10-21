/**
 * ShopFlow - Order Parser Routes (TASK-20)
 * File: backend/src/api/routes/order-parser.routes.ts
 */

import { Router } from 'express';
import { orderParserController } from '../controllers/order-parser.controller.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { ParseOrderInputSchema } from '../dtos/order-parser.dto.js';

export const orderParserRouter = Router();

/**
 * POST /api/v1/orders/parse
 * Trích xuất thực thể đơn hàng (SKU, số lượng, size, màu sắc, SĐT, địa chỉ)
 */
orderParserRouter.post(
  '/parse',
  validateRequest({ body: ParseOrderInputSchema }),
  orderParserController.parseOrder
);
