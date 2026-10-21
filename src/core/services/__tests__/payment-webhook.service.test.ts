import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentWebhookService } from '../payment-webhook.service.js';
import { Order } from '../../entities/order.entity.js';
import { AppError } from '../../errors/app-error.js';

describe('PaymentWebhookService (TASK-23)', () => {
  let service: PaymentWebhookService;
  let mockOrderRepo: any;
  let mockPaymentRepo: any;
  let mockSocketSvc: any;

  const sampleOrder: Order = {
    id: 'ord-101',
    pageId: 'page-1',
    customerId: 'cust-1',
    orderCode: 'ORD-2026-001',
    status: 'pending',
    paymentStatus: 'unpaid',
    paymentMethod: 'vietqr',
    source: 'facebook_comment',
    totalAmount: 500000,
    shippingFee: 30000,
    discountAmount: 0,
    finalAmount: 530000,
    customerName: 'Nguyễn Văn A',
    timeline: [],
    createdAt: '2026-10-21T10:00:00.000Z',
    updatedAt: '2026-10-21T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockOrderRepo = {
      findById: vi.fn(),
      findByOrderCode: vi.fn(),
      updateStatus: vi.fn(),
      updatePaymentStatus: vi.fn(),
    };

    mockPaymentRepo = {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'pay-1', ...data })),
      findByTransactionId: vi.fn().mockResolvedValue(null),
    };

    mockSocketSvc = {
      emitPaymentReceived: vi.fn(),
      emitOrderStatusChanged: vi.fn(),
    };

    service = new PaymentWebhookService({
      orderRepository: mockOrderRepo,
      paymentRepository: mockPaymentRepo,
      socketServiceInstance: mockSocketSvc,
      webhookSecret: 'test-secret-123',
    });
  });

  describe('generateVietQr', () => {
    it('sinh thành công mã VietQR cho đơn hàng hợp lệ', async () => {
      mockOrderRepo.findById.mockResolvedValue(sampleOrder);

      const result = await service.generateVietQr({
        orderId: 'ord-101',
      });

      expect(result.orderCode).toBe('ORD-2026-001');
      expect(result.amount).toBe(530000);
      expect(result.qrDataUrl).toContain('https://img.vietqr.io/image/');
      expect(result.qrPayload).toContain('000201');
    });

    it('báo lỗi 404 khi không tìm thấy đơn hàng', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      await expect(service.generateVietQr({ orderId: 'ord-not-found' })).rejects.toThrow(
        AppError
      );
    });

    it('báo lỗi 400 khi đơn hàng đã bị hủy', async () => {
      mockOrderRepo.findById.mockResolvedValue({
        ...sampleOrder,
        status: 'cancelled',
      });

      await expect(service.generateVietQr({ orderId: 'ord-101' })).rejects.toThrow(
        AppError
      );
    });
  });

  describe('processWebhook', () => {
    const validWebhookPayload = {
      id: 'TXN-888',
      gateway: 'sepay',
      amountIn: 530000,
      amountOut: 0,
      transactionContent: 'SF ORD-2026-001 NGUYEN VAN A CHUYEN TIEN',
      transactionDate: '2026-10-21T10:15:00.000Z',
    };

    it('từ chối request khi sai webhookSecret', async () => {
      await expect(
        service.processWebhook(validWebhookPayload, 'Bearer wrong-secret')
      ).rejects.toThrow('Chữ ký hoặc API Key Webhook không hợp lệ');
    });

    it('xử lý đối soát thành công, tự động chuyển đơn sang confirmed và emit Socket', async () => {
      mockOrderRepo.findByOrderCode.mockResolvedValue(sampleOrder);

      const result = await service.processWebhook(validWebhookPayload, 'Bearer test-secret-123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('paid');
      expect(result.orderCode).toBe('ORD-2026-001');

      // Verify updates
      expect(mockOrderRepo.updatePaymentStatus).toHaveBeenCalledWith('ord-101', 'paid', 'vietqr');
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith(
        'ord-101',
        'confirmed',
        expect.stringContaining('Tự động xác nhận'),
        'vietqr_webhook'
      );

      // Verify socket emit
      expect(mockSocketSvc.emitPaymentReceived).toHaveBeenCalled();
      expect(mockSocketSvc.emitOrderStatusChanged).toHaveBeenCalled();
    });

    it('ghi nhận partially_paid khi khách chuyển thiếu tiền và không đổi trạng thái đơn', async () => {
      mockOrderRepo.findByOrderCode.mockResolvedValue(sampleOrder);

      const underpaymentPayload = {
        ...validWebhookPayload,
        id: 'TXN-PARTIAL-1',
        amountIn: 300000, // Thiếu so với 530.000đ
      };

      const result = await service.processWebhook(underpaymentPayload, 'Bearer test-secret-123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('partially_paid');
      expect(result.amountReceived).toBe(300000);

      expect(mockOrderRepo.updatePaymentStatus).toHaveBeenCalledWith(
        'ord-101',
        'partially_paid',
        'vietqr'
      );
      // Không chuyển sang confirmed
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith(
        'ord-101',
        'pending',
        expect.stringContaining('Cảnh báo: Khách chuyển thiếu tiền'),
        'vietqr_webhook'
      );
    });

    it('xử lý Idempotent khi webhook gửi lại giao dịch đã xử lý trước đó', async () => {
      mockPaymentRepo.findByTransactionId.mockResolvedValue({
        id: 'pay-exist-1',
        orderId: 'ord-101',
        transactionId: 'TXN-888',
        amount: 530000,
      });

      const result = await service.processWebhook(validWebhookPayload, 'Bearer test-secret-123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('already_processed');
      // Không gọi tạo mới payment
      expect(mockPaymentRepo.create).not.toHaveBeenCalled();
    });

    it('trả về unmatched khi nội dung chuyển khoản không có mã đơn hàng', async () => {
      const unmatchedPayload = {
        ...validWebhookPayload,
        transactionContent: 'CHUC MUNG SINH NHAT',
      };

      const result = await service.processWebhook(unmatchedPayload, 'Bearer test-secret-123');
      expect(result.success).toBe(false);
      expect(result.status).toBe('unmatched');
    });
  });
});
