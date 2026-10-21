/**
 * ShopFlow - Realtime Socket Service
 * File: backend/src/core/services/socket.service.ts
 *
 * Cung cấp dịch vụ phát sóng các sự kiện thời gian thực (Socket.io) theo đúng đặc tả:
 * - NEW_INBOX_ITEM: Khi có tin nhắn/bình luận mới.
 * - INBOX_UPDATED: Khi trạng thái hội thoại hoặc tin nhắn thay đổi.
 * - POST_STATUS_CHANGED: Khi trạng thái bài viết đặt lịch thay đổi.
 */

import { getSocketServer } from '../../infrastructure/socket/socket.server.js';
import { logger } from '../../utils/logger.js';

export interface NewInboxItemPayload {
  event: 'NEW_INBOX_ITEM';
  page_id: string;
  conversation_id: string;
  type: 'messenger' | 'comment_thread';
  customer: {
    id: string;
    customer_fb_id: string;
    customer_name: string | null;
    phone_number: string | null;
    tags: string[];
  };
  message: {
    id: string;
    meta_id: string;
    sender_type: 'customer' | 'page' | 'system';
    sender_fb_id: string;
    content: string | null;
    is_hidden: boolean;
    private_reply_sent: boolean;
    media_payload?: unknown;
    created_at: string | Date;
  };
  unread_count: number;
  window_24h_expires_at: string | Date | null;
}

export interface InboxUpdatedPayload {
  event: 'INBOX_UPDATED';
  page_id: string;
  conversation_id: string;
  updated_fields: {
    status?: 'open' | 'resolved' | 'archived';
    unread_count?: number;
    last_message_text?: string | null;
    last_message_at?: string | Date;
    tags?: string[];
    is_hidden?: boolean;
    private_reply_sent?: boolean;
  };
}

export interface PostStatusChangedPayload {
  event: 'POST_STATUS_CHANGED';
  post_id: string;
  page_id: string;
  status: 'pending' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  meta_post_id: string | null;
  error_message: string | null;
  published_at: string | Date | null;
}

export class SocketService {
  /**
   * Phát sự kiện NEW_INBOX_ITEM khi có tin nhắn hoặc bình luận mới tiếp nhận từ Fanpage.
   */
  emitNewInboxItem(pageId: string, payload: NewInboxItemPayload): void {
    const io = getSocketServer();
    if (!io) {
      logger.debug({ pageId }, '[SocketService] Socket.io chưa được khởi tạo, bỏ qua emitNewInboxItem');
      return;
    }

    const pageRoom = `room:page_${pageId}`;
    io.to(pageRoom).emit('NEW_INBOX_ITEM', payload);
    logger.debug(
      { pageRoom, conversationId: payload.conversation_id },
      '[SocketService] 📡 Đã phát sự kiện NEW_INBOX_ITEM'
    );
  }

  /**
   * Phát sự kiện INBOX_UPDATED khi có thay đổi trạng thái, đọc tin nhắn hoặc cập nhật thẻ tag.
   */
  emitInboxUpdated(pageId: string, payload: InboxUpdatedPayload): void {
    const io = getSocketServer();
    if (!io) {
      logger.debug({ pageId }, '[SocketService] Socket.io chưa được khởi tạo, bỏ qua emitInboxUpdated');
      return;
    }

    const pageRoom = `room:page_${pageId}`;
    const convRoom = `room:conv_${payload.conversation_id}`;

    // Phát cho cả phòng Fanpage và phòng chi tiết hội thoại
    io.to(pageRoom).to(convRoom).emit('INBOX_UPDATED', payload);
    logger.debug(
      { pageRoom, convRoom, conversationId: payload.conversation_id },
      '[SocketService] 📡 Đã phát sự kiện INBOX_UPDATED'
    );
  }

  /**
   * Phát sự kiện POST_STATUS_CHANGED khi bài viết đặt lịch hoàn tất xuất bản hoặc thất bại.
   */
  emitPostStatusChanged(pageId: string, payload: PostStatusChangedPayload): void {
    const io = getSocketServer();
    if (!io) {
      logger.debug({ pageId }, '[SocketService] Socket.io chưa được khởi tạo, bỏ qua emitPostStatusChanged');
      return;
    }

    const pageRoom = `room:page_${pageId}`;
    io.to(pageRoom).emit('POST_STATUS_CHANGED', payload);
    logger.debug(
      { pageRoom, postId: payload.post_id, status: payload.status },
      '[SocketService] 📡 Đã phát sự kiện POST_STATUS_CHANGED'
    );
  }

  /**
   * Phát sự kiện ORDER_STATUS_CHANGED khi trạng thái đơn hàng thay đổi
   */
  emitOrderStatusChanged(pageId: string, payload: {
    order_id: string;
    order_code: string;
    status: string;
    payment_status?: string;
    updated_at?: string;
  }): void {
    const io = getSocketServer();
    if (!io) {
      logger.debug({ pageId }, '[SocketService] Socket.io chưa được khởi tạo, bỏ qua emitOrderStatusChanged');
      return;
    }

    const pageRoom = `room:page_${pageId}`;
    io.to(pageRoom).emit('ORDER_STATUS_CHANGED', {
      event: 'ORDER_STATUS_CHANGED',
      page_id: pageId,
      ...payload,
      updated_at: payload.updated_at || new Date().toISOString(),
    });
    logger.debug(
      { pageRoom, orderId: payload.order_id, status: payload.status },
      '[SocketService] 📡 Đã phát sự kiện ORDER_STATUS_CHANGED'
    );
  }

  /**
   * Phát sự kiện PAYMENT_RECEIVED khi nhận được thanh toán thành công qua VietQR
   */
  emitPaymentReceived(pageId: string, payload: {
    order_id: string;
    order_code: string;
    amount: number;
    transaction_id: string;
    paid_at?: string;
  }): void {
    const io = getSocketServer();
    if (!io) {
      logger.debug({ pageId }, '[SocketService] Socket.io chưa được khởi tạo, bỏ qua emitPaymentReceived');
      return;
    }

    const pageRoom = `room:page_${pageId}`;
    io.to(pageRoom).emit('PAYMENT_RECEIVED', {
      event: 'PAYMENT_RECEIVED',
      page_id: pageId,
      ...payload,
      paid_at: payload.paid_at || new Date().toISOString(),
    });
    logger.debug(
      { pageRoom, orderId: payload.order_id, amount: payload.amount },
      '[SocketService] 📡 Đã phát sự kiện PAYMENT_RECEIVED'
    );
  }
}

export const socketService = new SocketService();
