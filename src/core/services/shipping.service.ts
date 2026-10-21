/**
 * ShopFlow - Shipping Service (TASK-23)
 * File: backend/src/core/services/shipping.service.ts
 */

import { OrderRepository } from '../../infrastructure/repositories/order.repository.js';
import { ShipmentRepository } from '../../infrastructure/repositories/shipment.repository.js';
import {
  ShippingCarrierAdapter,
  MockCarrierAdapter,
  GhnCarrierAdapter,
  GhtkCarrierAdapter,
} from '../../infrastructure/shipping/shipping.adapter.js';
import { socketService, SocketService } from './socket.service.js';
import {
  CreateShipmentDto,
  TrackShipmentDto,
  ShipmentResultDto,
} from '../../api/dtos/shipping.dto.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../../utils/logger.js';

export interface ShippingServiceOptions {
  orderRepository?: OrderRepository;
  shipmentRepository?: ShipmentRepository;
  socketServiceInstance?: SocketService;
  adapters?: Record<string, ShippingCarrierAdapter>;
}

export class ShippingService {
  private readonly orderRepo: OrderRepository;
  private readonly shipmentRepo: ShipmentRepository;
  private readonly socketSvc: SocketService;
  private readonly adapters: Record<string, ShippingCarrierAdapter>;

  constructor(options: ShippingServiceOptions = {}) {
    this.orderRepo = options.orderRepository || new OrderRepository();
    this.shipmentRepo = options.shipmentRepository || new ShipmentRepository();
    this.socketSvc = options.socketServiceInstance || socketService;

    this.adapters = options.adapters || {
      mock: new MockCarrierAdapter(),
      ghn: new GhnCarrierAdapter(),
      ghtk: new GhtkCarrierAdapter(),
    };
  }

  /**
   * Tạo vận đơn và bàn giao hàng sang đối tác vận chuyển
   */
  async createShipment(data: CreateShipmentDto): Promise<ShipmentResultDto> {
    const order = await this.orderRepo.findById(data.orderId);
    if (!order) {
      throw new AppError('Đơn hàng không tồn tại', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status === 'cancelled') {
      throw new AppError('Không thể tạo vận đơn cho đơn hàng đã bị hủy', 400, 'ORDER_CANCELLED');
    }

    const carrierKey = data.carrier.toLowerCase();
    const fallbackAdapter = this.adapters.mock || new MockCarrierAdapter();
    const adapter = this.adapters[carrierKey] || fallbackAdapter;

    // Tính toán tiền COD: nếu đơn đã thanh toán thì COD = 0, nếu chưa thì COD = finalAmount
    let codAmount = data.codAmount !== undefined ? data.codAmount : order.finalAmount;
    if (order.paymentStatus === 'paid') {
      codAmount = 0;
    }

    const receiverPhone = order.customerPhone || '0900000000';
    const receiverAddress = order.shippingAddress || 'Khách nhận tại kho';

    const carrierResult = await adapter.createShipment({
      orderId: order.id,
      orderCode: order.orderCode,
      receiverName: order.customerName,
      receiverPhone,
      receiverAddress,
      weightGram: data.weightGram || 500,
      codAmount,
      items: (order.items || []).map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.price,
      })),
      note: data.shippingNotes || order.notes || undefined,
    });

    // Lưu bản ghi vào bảng shipments
    const shipment = await this.shipmentRepo.create({
      orderId: order.id,
      carrier: carrierResult.carrier,
      trackingCode: carrierResult.trackingCode,
      codAmount: carrierResult.codAmount,
      shippingFee: carrierResult.shippingFee,
      weightGram: data.weightGram || 500,
      status: carrierResult.status,
      labelUrl: carrierResult.labelUrl,
      estimatedDeliveryAt: carrierResult.estimatedDeliveryAt,
      rawResponse: carrierResult.rawResponse,
    });

    // Tự động chuyển trạng thái đơn hàng sang shipping
    await this.orderRepo.updateStatus(
      order.id,
      'shipping',
      `Đã bàn giao vận đơn [${carrierResult.carrier.toUpperCase()}] - Mã: ${carrierResult.trackingCode}`,
      'shipping_service'
    );

    // Phát sự kiện realtime WebSocket
    this.socketSvc.emitOrderStatusChanged(order.pageId, {
      order_id: order.id,
      order_code: order.orderCode,
      status: 'shipping',
      payment_status: order.paymentStatus,
    });

    logger.info(
      { orderCode: order.orderCode, trackingCode: shipment.trackingCode, carrier: shipment.carrier },
      '[ShippingService] 🚚 Bàn giao vận đơn sang nhà vận chuyển thành công'
    );

    return {
      id: shipment.id,
      orderId: shipment.orderId,
      carrier: shipment.carrier,
      trackingCode: shipment.trackingCode,
      shippingFee: shipment.shippingFee,
      codAmount: shipment.codAmount,
      status: shipment.status,
      labelUrl: shipment.labelUrl || undefined,
      estimatedDeliveryAt: shipment.estimatedDeliveryAt || undefined,
    };
  }

  /**
   * Tra cứu hành trình vận chuyển theo mã trackingCode
   */
  async trackShipment(data: TrackShipmentDto): Promise<{
    carrier: string;
    trackingCode: string;
    status: string;
    statusText: string;
    currentLocation?: string;
    updatedAt: string;
    logs: Array<{ status: string; note: string; timestamp: string }>;
  }> {
    const existingShipment = await this.shipmentRepo.findByTrackingCode(data.trackingCode);
    const carrierKey = (data.carrier || existingShipment?.carrier || 'mock').toLowerCase();
    const fallbackAdapter = this.adapters.mock || new MockCarrierAdapter();
    const adapter = this.adapters[carrierKey] || fallbackAdapter;

    return adapter.trackShipment(data.trackingCode);
  }
}

export const shippingService = new ShippingService();
