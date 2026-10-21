/**
 * ShopFlow - Payment & VietQR Webhook Service (TASK-23)
 * File: backend/src/core/services/payment-webhook.service.ts
 */

import { OrderRepository } from '../../infrastructure/repositories/order.repository.js';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository.js';
import { VietQrHelper, VIETNAM_BANKS } from './vietqr.helper.js';
import { socketService, SocketService } from './socket.service.js';
import {
  GenerateVietQrDto,
  PaymentWebhookDto,
  VietQrResultDto,
  PaymentReconciliationResultDto,
} from '../../api/dtos/payment.dto.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../../utils/logger.js';

export interface PaymentWebhookServiceOptions {
  orderRepository?: OrderRepository;
  paymentRepository?: PaymentRepository;
  socketServiceInstance?: SocketService;
  webhookSecret?: string;
  defaultBankBin?: string;
  defaultAccountNo?: string;
  defaultAccountName?: string;
}

export class PaymentWebhookService {
  private readonly orderRepo: OrderRepository;
  private readonly paymentRepo: PaymentRepository;
  private readonly socketSvc: SocketService;
  private readonly webhookSecret: string;
  private readonly defaultBankBin: string;
  private readonly defaultAccountNo: string;
  private readonly defaultAccountName: string;

  constructor(options: PaymentWebhookServiceOptions = {}) {
    this.orderRepo = options.orderRepository || new OrderRepository();
    this.paymentRepo = options.paymentRepository || new PaymentRepository();
    this.socketSvc = options.socketServiceInstance || socketService;
    this.webhookSecret = options.webhookSecret || process.env.PAYMENT_WEBHOOK_SECRET || '';
    this.defaultBankBin = options.defaultBankBin || process.env.DEFAULT_BANK_BIN || '970436'; // Vietcombank
    this.defaultAccountNo = options.defaultAccountNo || process.env.DEFAULT_BANK_ACCOUNT || '1029384756';
    this.defaultAccountName = options.defaultAccountName || process.env.DEFAULT_BANK_ACCOUNT_NAME || 'SHOPFLOW STORE';
  }

  /**
   * Sinh mã VietQR động theo đơn hàng
   */
  async generateVietQr(data: GenerateVietQrDto): Promise<VietQrResultDto> {
    const order = await this.orderRepo.findById(data.orderId);
    if (!order) {
      throw new AppError('Đơn hàng không tồn tại', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status === 'cancelled') {
      throw new AppError('Không thể tạo mã thanh toán cho đơn hàng đã bị hủy', 400, 'ORDER_ALREADY_CANCELLED');
    }

    const bankBin = data.bankBin || this.defaultBankBin;
    const accountNo = data.accountNo || this.defaultAccountNo;
    const accountName = data.accountName || this.defaultAccountName;
    const amount = data.amount || order.finalAmount;
    const memo = data.memo || order.orderCode;

    const qrPayload = VietQrHelper.generateEmvCoPayload({
      bankBin,
      accountNo,
      accountName,
      amount,
      memo,
    });

    const qrDataUrl = VietQrHelper.generateQuickLinkUrl({
      bankBin,
      accountNo,
      accountName,
      amount,
      memo,
      template: 'compact2',
    });

    const bank = VIETNAM_BANKS[bankBin];
    const bankName = bank ? bank.name : 'Ngân hàng Việt Nam';

    return {
      qrDataUrl,
      qrPayload,
      orderCode: order.orderCode,
      amount,
      bankBin,
      bankName,
      accountNo,
      accountName,
      transferContent: memo,
    };
  }

  /**
   * Xử lý Webhook biến động số dư tài khoản ngân hàng & Tự động đối soát
   */
  async processWebhook(
    payload: PaymentWebhookDto,
    authHeader?: string
  ): Promise<PaymentReconciliationResultDto> {
    // 1. Xác thực bảo mật nếu hệ thống có cấu hình webhookSecret
    if (this.webhookSecret && this.webhookSecret.trim().length > 0) {
      const providedSecret = authHeader?.replace(/^Bearer\s+/i, '').trim();
      if (providedSecret !== this.webhookSecret) {
        logger.warn({ authHeader }, '[PaymentWebhookService] ❌ Webhook từ chối: Sai API Key bí mật');
        throw new AppError('Chữ ký hoặc API Key Webhook không hợp lệ', 401, 'UNAUTHORIZED_WEBHOOK');
      }
    }

    const transactionId = payload.id.trim();
    const gateway = payload.gateway || 'sepay';

    // 2. Chống tấn công phát lại & Idempotency: Kiểm tra nếu giao dịch đã xử lý trước đó
    const existingPayment = await this.paymentRepo.findByTransactionId(transactionId, gateway);
    if (existingPayment) {
      logger.info({ transactionId, gateway }, '[PaymentWebhookService] Giao dịch đã được xử lý trước đó');
      return {
        success: true,
        orderId: existingPayment.orderId,
        paymentId: existingPayment.id,
        status: 'already_processed',
        amountReceived: payload.amountIn,
        finalAmount: existingPayment.amount,
        message: 'Giao dịch đã được ghi nhận trước đó (Idempotent response)',
      };
    }

    // 3. Trích xuất mã đơn hàng từ nội dung chuyển khoản
    const orderCode = VietQrHelper.extractOrderCodeFromTransferContent(payload.transactionContent);
    if (!orderCode) {
      logger.warn(
        { content: payload.transactionContent },
        '[PaymentWebhookService] ⚠️ Không trích xuất được mã đơn hàng từ nội dung chuyển khoản'
      );
      return {
        success: false,
        status: 'unmatched',
        amountReceived: payload.amountIn,
        finalAmount: 0,
        message: 'Không tìm thấy mã đơn hàng phù hợp trong nội dung chuyển khoản',
      };
    }

    // 4. Tìm kiếm đơn hàng trong cơ sở dữ liệu
    const order = await this.orderRepo.findByOrderCode(orderCode);
    if (!order) {
      logger.warn({ orderCode }, '[PaymentWebhookService] ⚠️ Mã đơn hàng không tồn tại trong hệ thống');
      return {
        success: false,
        orderCode,
        status: 'unmatched',
        amountReceived: payload.amountIn,
        finalAmount: 0,
        message: `Đơn hàng ${orderCode} không tồn tại trong hệ thống`,
      };
    }

    const amountIn = payload.amountIn;
    const isFullPayment = amountIn >= order.finalAmount;

    // 5. Lưu bản ghi thanh toán vào bảng payments
    const payment = await this.paymentRepo.create({
      orderId: order.id,
      transactionId,
      gateway,
      amount: amountIn,
      transferContent: payload.transactionContent,
      bankAccount: payload.accountNumber,
      status: isFullPayment ? 'success' : 'partially_paid',
      paidAt: payload.transactionDate ? new Date(payload.transactionDate) : new Date(),
      rawPayload: payload as unknown as Record<string, unknown>,
    });

    if (isFullPayment) {
      // 6a. Khách thanh toán đủ: Cập nhật trạng thái thanh toán sang paid
      await this.orderRepo.updatePaymentStatus(order.id, 'paid', 'vietqr');

      // Tự động xác nhận đơn nếu đang pending
      if (order.status === 'pending') {
        await this.orderRepo.updateStatus(
          order.id,
          'confirmed',
          `Tự động xác nhận qua VietQR: đã nhận ${amountIn.toLocaleString('vi-VN')}đ`,
          'vietqr_webhook'
        );
      }

      // Phát sự kiện realtime WebSocket tới phòng Fanpage
      this.socketSvc.emitPaymentReceived(order.pageId, {
        order_id: order.id,
        order_code: order.orderCode,
        amount: amountIn,
        transaction_id: transactionId,
      });

      this.socketSvc.emitOrderStatusChanged(order.pageId, {
        order_id: order.id,
        order_code: order.orderCode,
        status: order.status === 'pending' ? 'confirmed' : order.status,
        payment_status: 'paid',
      });

      logger.info(
        { orderCode: order.orderCode, amountIn, transactionId },
        '[PaymentWebhookService] ✅ Đối soát thanh toán VietQR thành công 100%'
      );

      return {
        success: true,
        orderId: order.id,
        orderCode: order.orderCode,
        paymentId: payment.id,
        status: 'paid',
        amountReceived: amountIn,
        finalAmount: order.finalAmount,
        message: 'Thanh toán thành công và tự động xác nhận đơn hàng',
      };
    } else {
      // 6b. Khách chuyển thiếu tiền: Đánh dấu partially_paid, không đổi trạng thái đơn
      await this.orderRepo.updatePaymentStatus(order.id, 'partially_paid', 'vietqr');
      await this.orderRepo.updateStatus(
        order.id,
        order.status,
        `Cảnh báo: Khách chuyển thiếu tiền (${amountIn.toLocaleString('vi-VN')}đ / ${order.finalAmount.toLocaleString('vi-VN')}đ)`,
        'vietqr_webhook'
      );

      this.socketSvc.emitPaymentReceived(order.pageId, {
        order_id: order.id,
        order_code: order.orderCode,
        amount: amountIn,
        transaction_id: transactionId,
      });

      logger.warn(
        { orderCode: order.orderCode, amountIn, expected: order.finalAmount },
        '[PaymentWebhookService] ⚠️ Khách chuyển thiếu tiền cho đơn hàng'
      );

      return {
        success: true,
        orderId: order.id,
        orderCode: order.orderCode,
        paymentId: payment.id,
        status: 'partially_paid',
        amountReceived: amountIn,
        finalAmount: order.finalAmount,
        message: 'Ghi nhận thanh toán một phần (chuyển thiếu tiền)',
      };
    }
  }
}
