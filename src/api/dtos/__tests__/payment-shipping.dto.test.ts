import { describe, it, expect } from 'vitest';
import {
  GenerateVietQrDtoSchema,
  PaymentWebhookDtoSchema,
} from '../payment.dto.js';
import {
  CreateShipmentDtoSchema,
  TrackShipmentDtoSchema,
} from '../shipping.dto.js';

describe('Payment & Shipping DTO Schemas (TASK-23)', () => {
  describe('GenerateVietQrDtoSchema', () => {
    it('chấp nhận payload hợp lệ với UUID orderId', () => {
      const valid = {
        orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        bankBin: '970436',
        accountNo: '1029384756',
        accountName: 'NGUYEN VAN A',
        amount: 250000,
        memo: 'ORD2026001',
      };
      const parsed = GenerateVietQrDtoSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.orderId).toBe(valid.orderId);
      }
    });

    it('từ chối khi orderId không phải UUID', () => {
      const invalid = {
        orderId: 'invalid-uuid-123',
      };
      const parsed = GenerateVietQrDtoSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('từ chối khi amount <= 0', () => {
      const invalid = {
        orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount: -50000,
      };
      const parsed = GenerateVietQrDtoSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('PaymentWebhookDtoSchema', () => {
    it('chấp nhận webhook SePay với mã giao dịch số chuyển thành chuỗi', () => {
      const webhookPayload = {
        id: 1234567,
        gateway: 'sepay',
        accountNumber: '1029384756',
        amountIn: 350000,
        amountOut: 0,
        transactionContent: 'SF ORD-2026-001 NGUYEN VAN B CHUYEN KHOAN',
        referenceNumber: 'FT2610219999',
        transactionDate: '2026-10-21 16:30:00',
      };
      const parsed = PaymentWebhookDtoSchema.safeParse(webhookPayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.id).toBe('1234567');
        expect(parsed.data.amountIn).toBe(350000);
      }
    });

    it('từ chối khi transactionContent trống', () => {
      const invalid = {
        id: 'txn-1',
        amountIn: 100000,
        transactionContent: '',
      };
      const parsed = PaymentWebhookDtoSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('từ chối khi amountIn là số âm', () => {
      const invalid = {
        id: 'txn-1',
        amountIn: -10000,
        transactionContent: 'Chuyen tien',
      };
      const parsed = PaymentWebhookDtoSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('CreateShipmentDtoSchema', () => {
    it('chấp nhận thông tin tạo vận đơn hợp lệ', () => {
      const valid = {
        orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        carrier: 'ghn',
        codAmount: 250000,
        weightGram: 300,
        pickupAddress: 'Kho Hà Nội, Số 1 Tràng Tiền',
        shippingNotes: 'Giao giờ hành chính',
      };
      const parsed = CreateShipmentDtoSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('từ chối trọng lượng kiện hàng <= 0', () => {
      const invalid = {
        orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        carrier: 'ghn',
        weightGram: 0,
      };
      const parsed = CreateShipmentDtoSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('từ chối nhà vận chuyển không nằm trong danh sách cho phép', () => {
      const invalid = {
        orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        carrier: 'unknown_carrier',
      };
      const parsed = CreateShipmentDtoSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('TrackShipmentDtoSchema', () => {
    it('chấp nhận mã vận đơn hợp lệ', () => {
      const valid = {
        trackingCode: 'GHN-VN-12345678',
        carrier: 'ghn',
      };
      const parsed = TrackShipmentDtoSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('từ chối khi mã vận đơn quá ngắn (< 3 ký tự)', () => {
      const invalid = {
        trackingCode: 'AB',
      };
      const parsed = TrackShipmentDtoSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });
});
