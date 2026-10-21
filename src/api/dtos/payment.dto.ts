/**
 * ShopFlow - Payment & VietQR DTOs & Validation Schemas (TASK-23)
 * File: backend/src/api/dtos/payment.dto.ts
 */

import { z } from 'zod';

export const GenerateVietQrDtoSchema = z.object({
  orderId: z.string().uuid('orderId phải là UUID hợp lệ'),
  bankBin: z.string().min(6).max(8).optional(),
  accountNo: z.string().min(4).max(30).optional(),
  accountName: z.string().min(2).max(100).optional(),
  amount: z.number().positive('Số tiền phải lớn hơn 0').optional(),
  memo: z.string().max(50).optional(),
});

export type GenerateVietQrDto = z.infer<typeof GenerateVietQrDtoSchema>;

export const PaymentWebhookDtoSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((v) => String(v)),
  gateway: z.string().default('sepay'),
  accountNumber: z.string().optional(),
  subAccount: z.string().nullable().optional(),
  amountIn: z.number().nonnegative('Số tiền giao dịch không được âm'),
  amountOut: z.number().nonnegative().optional().default(0),
  accumulated: z.number().optional(),
  code: z.string().nullable().optional(),
  transactionContent: z.string().min(1, 'Nội dung chuyển khoản không được để trống'),
  referenceNumber: z.string().nullable().optional(),
  transactionDate: z.string().optional(),
});

export type PaymentWebhookDto = z.infer<typeof PaymentWebhookDtoSchema>;

export interface VietQrResultDto {
  qrDataUrl: string;
  qrPayload: string;
  orderCode: string;
  amount: number;
  bankBin: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  transferContent: string;
}

export interface PaymentReconciliationResultDto {
  success: boolean;
  orderId?: string;
  orderCode?: string;
  paymentId?: string;
  status: 'paid' | 'partially_paid' | 'unmatched' | 'already_processed';
  amountReceived: number;
  finalAmount: number;
  message: string;
}
