import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShippingService } from '../shipping.service.js';
import { Order } from '../../entities/order.entity.js';
import { AppError } from '../../errors/app-error.js';

describe('ShippingService (TASK-23)', () => {
  let service: ShippingService;
  let mockOrderRepo: any;
  let mockShipmentRepo: any;
  let mockSocketSvc: any;

  const sampleOrder: Order = {
    id: 'ord-101',
    pageId: 'page-1',
    customerId: 'cust-1',
    orderCode: 'ORD-2026-001',
    status: 'confirmed',
    paymentStatus: 'unpaid',
    paymentMethod: 'cod',
    source: 'facebook_comment',
    totalAmount: 500000,
    shippingFee: 30000,
    discountAmount: 0,
    finalAmount: 530000,
    customerName: 'Nguyễn Văn A',
    customerPhone: '0987654321',
    shippingAddress: '123 Đường Cầu Giấy, Hà Nội',
    timeline: [],
    items: [
      {
        sku: 'AOPOLO01',
        productName: 'Áo Polo Nam',
        quantity: 2,
        price: 250000,
      },
    ],
    createdAt: '2026-10-21T10:00:00.000Z',
    updatedAt: '2026-10-21T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockOrderRepo = {
      findById: vi.fn(),
      updateStatus: vi.fn(),
    };

    mockShipmentRepo = {
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'ship-1',
          orderId: data.orderId,
          carrier: data.carrier,
          trackingCode: data.trackingCode,
          codAmount: data.codAmount,
          shippingFee: data.shippingFee,
          status: data.status,
          labelUrl: data.labelUrl,
          estimatedDeliveryAt: data.estimatedDeliveryAt,
        })
      ),
      findByTrackingCode: vi.fn().mockResolvedValue(null),
    };

    mockSocketSvc = {
      emitOrderStatusChanged: vi.fn(),
    };

    service = new ShippingService({
      orderRepository: mockOrderRepo,
      shipmentRepository: mockShipmentRepo,
      socketServiceInstance: mockSocketSvc,
    });
  });

  describe('createShipment', () => {
    it('tạo thành công vận đơn với đối tác vận chuyển, chuyển trạng thái đơn sang shipping', async () => {
      mockOrderRepo.findById.mockResolvedValue(sampleOrder);

      const result = await service.createShipment({
        orderId: 'ord-101',
        carrier: 'mock',
        weightGram: 500,
      });

      expect(result.id).toBe('ship-1');
      expect(result.carrier).toBe('mock');
      expect(result.trackingCode).toContain('MOCK-ORD2026001');
      expect(result.codAmount).toBe(530000); // Chưa thanh toán thì COD = 530.000đ

      // Verify order update & socket
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith(
        'ord-101',
        'shipping',
        expect.stringContaining('Đã bàn giao vận đơn'),
        'shipping_service'
      );
      expect(mockSocketSvc.emitOrderStatusChanged).toHaveBeenCalled();
    });

    it('tự động đặt COD = 0 khi đơn hàng đã thanh toán (paymentStatus = paid)', async () => {
      mockOrderRepo.findById.mockResolvedValue({
        ...sampleOrder,
        paymentStatus: 'paid',
      });

      const result = await service.createShipment({
        orderId: 'ord-101',
        carrier: 'mock',
        weightGram: 500,
      });

      expect(result.codAmount).toBe(0);
    });

    it('báo lỗi 404 khi không tìm thấy đơn hàng', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      await expect(
        service.createShipment({ orderId: 'not-found', carrier: 'mock', weightGram: 500 })
      ).rejects.toThrow(AppError);
    });

    it('báo lỗi 400 khi đơn hàng đã bị hủy', async () => {
      mockOrderRepo.findById.mockResolvedValue({
        ...sampleOrder,
        status: 'cancelled',
      });

      await expect(
        service.createShipment({ orderId: 'ord-101', carrier: 'mock', weightGram: 500 })
      ).rejects.toThrow('Không thể tạo vận đơn cho đơn hàng đã bị hủy');
    });
  });

  describe('trackShipment', () => {
    it('tra cứu đúng thông tin và lịch sử hành trình vận đơn', async () => {
      mockShipmentRepo.findByTrackingCode.mockResolvedValue({
        id: 'ship-1',
        carrier: 'mock',
        trackingCode: 'MOCK-ORD2026001-123456',
      });

      const tracking = await service.trackShipment({
        trackingCode: 'MOCK-ORD2026001-123456',
      });

      expect(tracking.trackingCode).toBe('MOCK-ORD2026001-123456');
      expect(tracking.status).toBe('delivering');
      expect(tracking.logs.length).toBeGreaterThan(0);
    });
  });
});
