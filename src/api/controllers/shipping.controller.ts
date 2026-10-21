/**
 * ShopFlow - Shipping Controller (TASK-23)
 * File: backend/src/api/controllers/shipping.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import { shippingService, ShippingService } from '../../core/services/shipping.service.js';
import {
  CreateShipmentDto,
  TrackShipmentDto,
} from '../dtos/shipping.dto.js';

export class ShippingController {
  constructor(private readonly service: ShippingService = shippingService) {}

  /**
   * POST /api/v1/shipments/create - Tạo vận đơn và đẩy sang đơn vị vận chuyển
   */
  public createShipment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = req.body as CreateShipmentDto;
      const result = await this.service.createShipment(data);

      res.status(201).json({
        success: true,
        message: 'Tạo vận đơn và bàn giao nhà vận chuyển thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/shipments/:trackingCode/track - Tra cứu hành trình vận chuyển
   */
  public trackShipment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { trackingCode } = req.params;
      const carrier = req.query.carrier as 'ghn' | 'ghtk' | 'mock' | undefined;

      const trackDto: TrackShipmentDto = {
        trackingCode: String(trackingCode || ''),
        carrier,
      };

      const result = await this.service.trackShipment(trackDto);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const shippingController = new ShippingController();
