/**
 * ShopFlow - Payment Controller (TASK-23)
 * File: backend/src/api/controllers/payment.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import {
  PaymentWebhookService,
} from '../../core/services/payment-webhook.service.js';
import {
  GenerateVietQrDto,
  PaymentWebhookDto,
} from '../dtos/payment.dto.js';

export class PaymentController {
  constructor(private readonly service: PaymentWebhookService = new PaymentWebhookService()) {}

  /**
   * POST /api/v1/payments/vietqr - Sinh mã VietQR động theo đơn hàng
   */
  public generateVietQr = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = req.body as GenerateVietQrDto;
      const result = await this.service.generateVietQr(data);

      res.status(200).json({
        success: true,
        message: 'Sinh mã VietQR thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/payments/webhook - Webhook nhận biến động số dư ngân hàng & đối soát
   */
  public handleWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload = req.body as PaymentWebhookDto;
      const authHeader = req.headers.authorization || (req.headers['x-api-key'] as string);

      const result = await this.service.processWebhook(payload, authHeader);

      res.status(200).json({
        success: result.success,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const paymentController = new PaymentController();
