/**
 * ShopFlow - Order Parser Routes (TASK-20)
 * File: backend/src/api/routes/order-parser.routes.ts
 */

import { Router } from 'express';
import { orderParserController } from '../controllers/order-parser.controller.js';
import { orderController } from '../controllers/order.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
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

/**
 * GET /api/v1/orders
 * Lấy danh sách đơn hàng theo Fanpage (hỗ trợ PII masking cho staff)
 */
orderParserRouter.get('/', authenticateToken, orderController.getOrders);

/**
 * GET /api/v1/orders/:orderId
 * Xem chi tiết đơn hàng
 */
orderParserRouter.get('/:orderId', authenticateToken, orderController.getOrderDetail);

/**
 * PATCH /api/v1/orders/:orderId/status
 * Cập nhật trạng thái đơn hàng
 */
orderParserRouter.patch('/:orderId/status', authenticateToken, orderController.updateOrderStatus);

