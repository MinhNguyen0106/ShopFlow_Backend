import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderRepository } from '../order.repository.js';
import { PaymentRepository } from '../payment.repository.js';
import * as dbClient from '../../database/db.client.js';

vi.mock('../../database/db.client.js', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

describe('Order & Payment Repositories (TASK-23)', () => {
  let orderRepo: OrderRepository;
  let paymentRepo: PaymentRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    orderRepo = new OrderRepository();
    paymentRepo = new PaymentRepository();
  });

  describe('OrderRepository', () => {
    const mockOrderRow = {
      id: 'ord-101',
      page_id: 'page-1',
      customer_id: 'cust-1',
      order_code: 'ORD-2026-001',
      status: 'pending',
      payment_status: 'unpaid',
      payment_method: 'vietqr',
      source: 'facebook_comment',
      source_meta_id: 'comment_123',
      total_amount: '500000',
      shipping_fee: '30000',
      discount_amount: '0',
      final_amount: '530000',
      customer_name: 'Nguyễn Văn A',
      customer_phone: '0987654321',
      shipping_address: '123 Đường Cầu Giấy, Hà Nội',
      notes: 'Giao nhanh',
      timeline: JSON.stringify([
        { status: 'pending', note: 'Tạo đơn mới', timestamp: '2026-10-21T10:00:00.000Z' },
      ]),
      created_at: new Date('2026-10-21T10:00:00.000Z'),
      updated_at: new Date('2026-10-21T10:00:00.000Z'),
    };

    const mockItemRow = {
      id: 'item-1',
      order_id: 'ord-101',
      product_id: 'prod-1',
      sku: 'AOPOLO01',
      product_name: 'Áo Polo Nam',
      quantity: 2,
      price: '250000',
      variant: JSON.stringify({ color: 'Đen', size: 'L' }),
      image_url: null,
      created_at: new Date('2026-10-21T10:00:00.000Z'),
    };

    it('create() tạo đơn hàng và các order_items trong transaction', async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [mockOrderRow] }) // insert order
          .mockResolvedValueOnce({ rows: [mockItemRow] }), // insert item
      };

      vi.mocked(dbClient.withTransaction).mockImplementation(async (callback: any) => {
        return callback(mockClient);
      });

      const result = await orderRepo.create({
        pageId: 'page-1',
        customerId: 'cust-1',
        orderCode: 'ORD-2026-001',
        customerName: 'Nguyễn Văn A',
        customerPhone: '0987654321',
        totalAmount: 500000,
        shippingFee: 30000,
        finalAmount: 530000,
        paymentMethod: 'vietqr',
        items: [
          {
            sku: 'AOPOLO01',
            productName: 'Áo Polo Nam',
            quantity: 2,
            price: 250000,
          },
        ],
      });

      expect(result.id).toBe('ord-101');
      expect(result.orderCode).toBe('ORD-2026-001');
      expect(result.finalAmount).toBe(530000);
      expect(result.items?.length).toBe(1);
      expect(result.items?.[0]?.sku).toBe('AOPOLO01');
    });

    it('findById() trả về đơn hàng kèm chi tiết items', async () => {
      vi.mocked(dbClient.query)
        .mockResolvedValueOnce({ rows: [mockOrderRow] } as any) // order
        .mockResolvedValueOnce({ rows: [mockItemRow] } as any); // items

      const order = await orderRepo.findById('ord-101');
      expect(order).not.toBeNull();
      expect(order?.orderCode).toBe('ORD-2026-001');
      expect(order?.items?.length).toBe(1);
    });

    it('findByOrderCode() tìm đúng đơn hàng theo mã', async () => {
      vi.mocked(dbClient.query)
        .mockResolvedValueOnce({ rows: [mockOrderRow] } as any)
        .mockResolvedValueOnce({ rows: [mockItemRow] } as any);

      const order = await orderRepo.findByOrderCode('ORD-2026-001');
      expect(order?.id).toBe('ord-101');
    });

    it('updateStatus() cập nhật trạng thái và ghi thêm vào timeline', async () => {
      vi.mocked(dbClient.query)
        .mockResolvedValueOnce({ rows: [mockOrderRow] } as any) // findById order
        .mockResolvedValueOnce({ rows: [mockItemRow] } as any) // findById items
        .mockResolvedValueOnce({
          rows: [{ ...mockOrderRow, status: 'confirmed' }],
        } as any); // update query

      const updated = await orderRepo.updateStatus('ord-101', 'confirmed', 'Đã nhận chuyển khoản');
      expect(updated.status).toBe('confirmed');
    });

    it('updatePaymentStatus() cập nhật trạng thái thanh toán sang paid', async () => {
      vi.mocked(dbClient.query)
        .mockResolvedValueOnce({ rows: [mockOrderRow] } as any) // findById order
        .mockResolvedValueOnce({ rows: [mockItemRow] } as any) // findById items
        .mockResolvedValueOnce({
          rows: [{ ...mockOrderRow, payment_status: 'paid' }],
        } as any); // update query

      const updated = await orderRepo.updatePaymentStatus('ord-101', 'paid', 'vietqr');
      expect(updated.paymentStatus).toBe('paid');
    });
  });

  describe('PaymentRepository', () => {
    const mockPaymentRow = {
      id: 'pay-1',
      order_id: 'ord-101',
      transaction_id: 'TXN-999',
      gateway: 'sepay',
      amount: '530000',
      transfer_content: 'SF ORD-2026-001',
      bank_account: '1029384756',
      bank_code: 'VCB',
      status: 'success',
      paid_at: new Date('2026-10-21T10:15:00.000Z'),
      raw_payload: JSON.stringify({ id: 'TXN-999' }),
      created_at: new Date('2026-10-21T10:15:00.000Z'),
    };

    it('create() tạo thành công bản ghi giao dịch thanh toán', async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({ rows: [mockPaymentRow] } as any);

      const payment = await paymentRepo.create({
        orderId: 'ord-101',
        transactionId: 'TXN-999',
        gateway: 'sepay',
        amount: 530000,
        transferContent: 'SF ORD-2026-001',
      });

      expect(payment.id).toBe('pay-1');
      expect(payment.transactionId).toBe('TXN-999');
      expect(payment.amount).toBe(530000);
    });

    it('findByTransactionId() tra cứu giao dịch theo mã để chống xử lý trùng', async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({ rows: [mockPaymentRow] } as any);

      const found = await paymentRepo.findByTransactionId('TXN-999', 'sepay');
      expect(found).not.toBeNull();
      expect(found?.transactionId).toBe('TXN-999');
    });

    it('findByOrderId() lấy danh sách thanh toán của đơn hàng', async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({ rows: [mockPaymentRow] } as any);

      const list = await paymentRepo.findByOrderId('ord-101');
      expect(list.length).toBe(1);
      expect(list[0]?.orderId).toBe('ord-101');
    });
  });
});
