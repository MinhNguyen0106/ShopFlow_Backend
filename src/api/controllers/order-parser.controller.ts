/**
 * ShopFlow - Order Parser Controller (TASK-20)
 * File: backend/src/api/controllers/order-parser.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import { orderParserService, OrderParserService } from '../../core/services/order-parser.service.js';
import { ParseOrderInput } from '../dtos/order-parser.dto.js';

export class OrderParserController {
  constructor(private readonly service: OrderParserService = orderParserService) {}

  /**
   * POST /api/v1/orders/parse
   * Phân tích văn bản bình luận/tin nhắn và trích xuất thực thể đơn hàng
   */
  public parseOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as ParseOrderInput;
      const data = await this.service.parseOrder(input);

      res.status(200).json({
        success: true,
        message: 'Trích xuất thông tin đơn hàng thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const orderParserController = new OrderParserController();
