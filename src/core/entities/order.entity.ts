/**
 * ShopFlow - Order & Fulfillment Entities (TASK-23)
 * File: backend/src/core/entities/order.entity.ts
 */

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';
export type PaymentMethod = 'cod' | 'vietqr' | 'bank_transfer';
export type OrderSource = 'facebook_comment' | 'facebook_inbox' | 'manual';

export interface OrderItem {
  id?: string;
  orderId?: string;
  productId?: string | null;
  sku: string;
  productName: string;
  quantity: number;
  price: number;
  variant?: Record<string, unknown>;
  imageUrl?: string | null;
  createdAt?: string;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  note?: string;
  actor?: string;
  timestamp: string;
}

export interface Order {
  id: string;
  pageId: string;
  customerId: string;
  orderCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  source: OrderSource;
  sourceMetaId?: string | null;
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  finalAmount: number;
  customerName: string;
  customerPhone?: string | null;
  shippingAddress?: string | null;
  notes?: string | null;
  timeline: OrderTimelineEvent[];
  items?: OrderItem[];
  payments?: Payment[];
  shipments?: Shipment[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  transactionId: string;
  gateway: string;
  amount: number;
  transferContent?: string | null;
  bankAccount?: string | null;
  bankCode?: string | null;
  status: 'success' | 'partially_paid' | 'refunded' | 'failed';
  paidAt: string;
  rawPayload?: Record<string, unknown>;
  createdAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  carrier: 'ghn' | 'ghtk' | 'mock' | string;
  trackingCode: string;
  codAmount: number;
  shippingFee: number;
  weightGram: number;
  status: 'ready_to_pick' | 'picking' | 'delivering' | 'delivered' | 'returned' | 'cancelled';
  labelUrl?: string | null;
  estimatedDeliveryAt?: string | null;
  rawResponse?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
