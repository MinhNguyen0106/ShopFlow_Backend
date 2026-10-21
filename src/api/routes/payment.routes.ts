/**
 * ShopFlow - Payment Routes (TASK-23)
 * File: backend/src/api/routes/payment.routes.ts
 */

import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import {
  GenerateVietQrDtoSchema,
  PaymentWebhookDtoSchema,
} from '../dtos/payment.dto.js';

export const paymentRouter = Router();

/**
 * POST /api/v1/payments/vietqr - Sinh mã VietQR động theo đơn hàng
 * Yêu cầu Bearer token xác thực chủ shop
 */
paymentRouter.post(
  '/vietqr',
  authenticateToken,
  validateRequest({ body: GenerateVietQrDtoSchema }),
  paymentController.generateVietQr
);

/**
 * POST /api/v1/payments/webhook - Nhận biến động số dư ngân hàng (SePay / Casso / Webhook)
 * Endpoint công khai cho Gateway, xác thực qua webhookSecret / API key header
 */
paymentRouter.post(
  '/webhook',
  validateRequest({ body: PaymentWebhookDtoSchema }),
  paymentController.handleWebhook
);
