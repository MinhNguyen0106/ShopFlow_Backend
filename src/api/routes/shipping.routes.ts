/**
 * ShopFlow - Shipping Routes (TASK-23)
 * File: backend/src/api/routes/shipping.routes.ts
 */

import { Router } from 'express';
import { shippingController } from '../controllers/shipping.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { CreateShipmentDtoSchema } from '../dtos/shipping.dto.js';
import { z } from 'zod';

export const shippingRouter = Router();

// Yêu cầu xác thực Bearer token cho toàn bộ thao tác vận chuyển
shippingRouter.use(authenticateToken);

const TrackingCodeParamSchema = z.object({
  trackingCode: z.string().min(3, 'Mã vận đơn tối thiểu 3 ký tự'),
});

/**
 * POST /api/v1/shipments/create - Tạo vận đơn và đẩy sang đơn vị vận chuyển
 */
shippingRouter.post(
  '/create',
  validateRequest({ body: CreateShipmentDtoSchema }),
  shippingController.createShipment
);

/**
 * GET /api/v1/shipments/:trackingCode/track - Tra cứu hành trình vận chuyển
 */
shippingRouter.get(
  '/:trackingCode/track',
  validateRequest({ params: TrackingCodeParamSchema }),
  shippingController.trackShipment
);
