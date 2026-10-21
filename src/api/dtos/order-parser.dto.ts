/**
 * ShopFlow - Order Parser DTOs & Entity Schemas (TASK-20)
 * File: backend/src/api/dtos/order-parser.dto.ts
 */

import { z } from 'zod';

export const ExtractedOrderItemSchema = z.object({
  productCode: z.string().nullable().optional(),
  productName: z.string().nullable().optional(),
  quantity: z.number().int().positive().default(1),
  attributes: z
    .object({
      color: z.string().nullable().optional(),
      size: z.string().nullable().optional(),
      variant: z.string().nullable().optional(),
    })
    .default({}),
  priceEstimate: z.number().nullable().optional(),
});

export type ExtractedOrderItem = z.infer<typeof ExtractedOrderItemSchema>;

export const ExtractedOrderEntitySchema = z.object({
  items: z.array(ExtractedOrderItemSchema).min(1),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  shippingAddress: z.string().nullable().optional(),
  confidenceScore: z.number().min(0).max(1).default(0.9),
  rawInput: z.string(),
  extractionMethod: z.enum(['regex', 'ai_gemini', 'regex_fallback']),
  notes: z.string().nullable().optional(),
});

export type ExtractedOrderEntity = z.infer<typeof ExtractedOrderEntitySchema>;

export const ParseOrderInputSchema = z.object({
  text: z.string().min(1, 'Nội dung văn bản không được để trống'),
  pageId: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

export type ParseOrderInput = z.infer<typeof ParseOrderInputSchema>;

export const ParseOrderOutputSchema = z.object({
  success: z.boolean(),
  data: ExtractedOrderEntitySchema,
  message: z.string().optional(),
});

export type ParseOrderOutput = z.infer<typeof ParseOrderOutputSchema>;
