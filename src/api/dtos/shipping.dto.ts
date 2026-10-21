/**
 * ShopFlow - Shipping Carrier DTOs & Validation Schemas (TASK-23)
 * File: backend/src/api/dtos/shipping.dto.ts
 */

import { z } from 'zod';

export const CreateShipmentDtoSchema = z.object({
  orderId: z.string().uuid('orderId phải là UUID hợp lệ'),
  carrier: z.enum(['ghn', 'ghtk', 'mock']).default('mock'),
  codAmount: z.number().nonnegative('Tiền thu hộ COD không được âm').optional(),
  weightGram: z.number().int().positive('Trọng lượng kiện hàng phải > 0g').default(500),
  pickupAddress: z.string().optional(),
  shippingNotes: z.string().optional(),
});

export type CreateShipmentDto = z.infer<typeof CreateShipmentDtoSchema>;

export const TrackShipmentDtoSchema = z.object({
  trackingCode: z.string().min(3, 'Mã vận đơn tối thiểu 3 ký tự'),
  carrier: z.enum(['ghn', 'ghtk', 'mock']).optional(),
});

export type TrackShipmentDto = z.infer<typeof TrackShipmentDtoSchema>;

export interface ShipmentResultDto {
  id: string;
  orderId: string;
  carrier: string;
  trackingCode: string;
  shippingFee: number;
  codAmount: number;
  status: string;
  labelUrl?: string;
  estimatedDeliveryAt?: string;
  logs?: Array<{
    status: string;
    note: string;
    timestamp: string;
  }>;
}
