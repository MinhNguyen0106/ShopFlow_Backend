/**
 * ShopFlow - Centralized Inbox Service
 * File: backend/src/core/services/inbox.service.ts
 *
 * Dịch vụ xử lý nghiệp vụ Hộp thư tập trung:
 * - Truy vấn danh sách và chi tiết hội thoại
 * - Tự động tính toán cửa sổ 24h nhắn tin Meta Messenger
 * - Lấy tin nhắn theo cursor pagination
 * - Nhân viên gửi tin nhắn trả lời qua Meta Send API / Comment Reply
 * - Gửi tin nhắn riêng (Private Reply) cho bình luận
 * - Ẩn/Hiện bình luận Facebook
 * - Cập nhật trạng thái hội thoại và CRM khách hàng
 * - Phát sự kiện thời gian thực (Socket.io)
 */

import {
  conversationRepository,
  ConversationRepository,
} from '../../infrastructure/repositories/conversation.repository.js';
import {
  customerRepository,
  CustomerRepository,
} from '../../infrastructure/repositories/customer.repository.js';
import {
  messageCommentRepository,
  MessageCommentRepository,
} from '../../infrastructure/repositories/message-comment.repository.js';
import {
  connectedPageRepository,
  ConnectedPageRepository,
} from '../../infrastructure/repositories/connected-page.repository.js';
import {
  metaGraphApiClient,
  MetaGraphApiClient,
} from '../../infrastructure/meta/graph-api.client.js';
import {
  socketService,
  SocketService,
} from './socket.service.js';
import { decryptToken } from '../../utils/crypto.helper.js';
import { AppError } from '../errors/app-error.js';
import {
  QueryConversationsDto,
  QueryMessagesDto,
  SendMessageDto,
  PrivateReplyDto,
  UpdateCustomerDto,
} from '../../api/dtos/inbox.dto.js';
import { logger } from '../../utils/logger.js';

export class InboxService {
  constructor(
    private readonly conversationRepo: ConversationRepository = conversationRepository,
    private readonly customerRepo: CustomerRepository = customerRepository,
    private readonly messageCommentRepo: MessageCommentRepository = messageCommentRepository,
    private readonly pageRepo: ConnectedPageRepository = connectedPageRepository,
    private readonly graphClient: MetaGraphApiClient = metaGraphApiClient,
    private readonly socketSvc: SocketService = socketService
  ) {}

  /**
   * Lấy danh sách hội thoại có tìm kiếm và bộ lọc phân trang.
   */
  async getConversations(userId: string, query: QueryConversationsDto) {
    const { conversations, total } = await this.conversationRepo.findManyWithFilter({
      userId,
      pageId: query.page_id,
      type: query.type,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    const now = new Date();
    const formattedConversations = conversations.map((conv) => {
      const isWithin24h =
        conv.window_24h_expires_at !== null && new Date(conv.window_24h_expires_at) > now;

      return {
        id: conv.id,
        page_id: conv.page_id,
        page_name: conv.page_name,
        page_fb_id: conv.page_fb_id,
        customer: {
          id: conv.customer_id,
          customer_fb_id: conv.customer_fb_id,
          customer_name: conv.customer_name,
          phone_number: conv.phone_number,
          tags: conv.customer_tags,
        },
        type: conv.type,
        meta_thread_id: conv.meta_thread_id,
        last_message_text: conv.last_message_text,
        last_message_at: conv.last_message_at,
        unread_count: conv.unread_count,
        window_24h_expires_at: conv.window_24h_expires_at,
        is_within_24h: isWithin24h,
        status: conv.status,
        created_at: conv.created_at,
      };
    });

    const totalPages = Math.ceil(total / query.limit) || 1;

    return {
      conversations: formattedConversations,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Xem chi tiết một cuộc hội thoại kèm thông tin khách hàng và tự động đánh dấu đã đọc.
   */
  async getConversationDetail(conversationId: string, userId: string) {
    const conv = await this.conversationRepo.findByIdAndUserId(conversationId, userId);
    if (!conv) {
      throw new AppError('Không tìm thấy cuộc hội thoại', 404, 'NOT_FOUND');
    }

    // Đánh dấu hội thoại đã đọc nếu đang có unread_count > 0
    if (conv.unread_count > 0) {
      await this.conversationRepo.markAsRead(conversationId);
      conv.unread_count = 0;

      // Phát sự kiện socket INBOX_UPDATED
      this.socketSvc.emitInboxUpdated(conv.page_fb_id, {
        event: 'INBOX_UPDATED',
        page_id: conv.page_fb_id,
        conversation_id: conv.id,
        updated_fields: {
          unread_count: 0,
        },
      });
    }

    const isWithin24h =
      conv.window_24h_expires_at !== null && new Date(conv.window_24h_expires_at) > new Date();

    return {
      conversation: {
        id: conv.id,
        page_id: conv.page_id,
        page_name: conv.page_name,
        page_fb_id: conv.page_fb_id,
        type: conv.type,
        meta_thread_id: conv.meta_thread_id,
        last_message_text: conv.last_message_text,
        last_message_at: conv.last_message_at,
        unread_count: conv.unread_count,
        window_24h_expires_at: conv.window_24h_expires_at,
        status: conv.status,
        created_at: conv.created_at,
      },
      customer: {
        id: conv.customer_id,
        customer_fb_id: conv.customer_fb_id,
        customer_name: conv.customer_name,
        phone_number: conv.phone_number,
        tags: conv.customer_tags,
      },
      is_within_24h: isWithin24h,
    };
  }

  /**
   * Lấy lịch sử tin nhắn / bình luận của một cuộc hội thoại theo cursor pagination.
   */
  async getMessages(conversationId: string, userId: string, query: QueryMessagesDto) {
    const conv = await this.conversationRepo.findByIdAndUserId(conversationId, userId);
    if (!conv) {
      throw new AppError('Không tìm thấy cuộc hội thoại', 404, 'NOT_FOUND');
    }

    const result = await this.messageCommentRepo.findMessagesByConversation(
      conversationId,
      query.cursor,
      query.limit
    );

    return result;
  }

  /**
   * Nhân viên gửi tin nhắn trả lời khách hàng qua Facebook Messenger hoặc bình luận.
   */
  async sendMessage(conversationId: string, userId: string, dto: SendMessageDto) {
    const conv = await this.conversationRepo.findByIdAndUserId(conversationId, userId);
    if (!conv) {
      throw new AppError('Không tìm thấy cuộc hội thoại', 404, 'NOT_FOUND');
    }

    const page = await this.pageRepo.findById(conv.page_id);
    if (!page) {
      throw new AppError('Không tìm thấy Fanpage liên kết', 404, 'NOT_FOUND');
    }

    const pageAccessToken = decryptToken(page.page_access_token);
    let metaMessageId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (conv.type === 'messenger') {
      // Kiểm tra cửa sổ 24h Meta
      const isWithin24h =
        conv.window_24h_expires_at !== null && new Date(conv.window_24h_expires_at) > new Date();

      if (!isWithin24h) {
        logger.warn(
          { conversationId, customerFbId: conv.customer_fb_id },
          '[InboxService] Gửi tin nhắn khi đã hết hạn cửa sổ 24h Meta'
        );
      }

      const sendRes = await this.graphClient.sendMessage(
        page.page_id,
        conv.customer_fb_id,
        dto.content,
        pageAccessToken,
        dto.media_url
      );

      if (!sendRes.success) {
        throw new AppError(
          sendRes.error || 'Meta Graph API từ chối gửi tin nhắn',
          502,
          'META_API_ERROR'
        );
      }

      if (sendRes.messageId) {
        metaMessageId = sendRes.messageId;
      }
    } else {
      // Trả lời bình luận trong thread (Comment Reply)
      const replyRes = await this.graphClient.replyComment(
        conv.meta_thread_id,
        dto.content,
        pageAccessToken
      );

      if (!replyRes.success) {
        throw new AppError(
          replyRes.error || 'Meta Graph API từ chối đăng bình luận trả lời',
          502,
          'META_API_ERROR'
        );
      }

      if (replyRes.commentId) {
        metaMessageId = replyRes.commentId;
      }
    }

    // Lưu tin nhắn vào DB
    const createdMessage = await this.messageCommentRepo.createPageMessage({
      conversationId,
      pageId: conv.page_id,
      metaId: metaMessageId,
      senderFbId: page.page_id,
      content: dto.content,
      mediaPayload: dto.media_url ? { url: dto.media_url } : {},
    });

    // Cập nhật last_message cho conversation
    await this.conversationRepo.updateLastMessage(conversationId, dto.content);

    // Phát sự kiện INBOX_UPDATED qua WebSocket
    this.socketSvc.emitInboxUpdated(page.page_id, {
      event: 'INBOX_UPDATED',
      page_id: page.page_id,
      conversation_id: conversationId,
      updated_fields: {
        last_message_text: dto.content,
        last_message_at: createdMessage.created_at,
      },
    });

    return createdMessage;
  }

  /**
   * Gửi tin nhắn riêng (Private Reply) cho một bình luận cụ thể.
   */
  async sendPrivateReply(messageId: string, userId: string, dto: PrivateReplyDto) {
    const msg = await this.messageCommentRepo.findByIdWithPage(messageId, userId);
    if (!msg) {
      throw new AppError('Không tìm thấy bình luận cần trả lời riêng', 404, 'NOT_FOUND');
    }

    if (msg.private_reply_sent) {
      throw new AppError(
        'Bình luận này đã được gửi tin nhắn riêng trước đó (Chính sách Meta chỉ cho phép gửi 1 lần)',
        400,
        'BAD_REQUEST'
      );
    }

    const pageAccessToken = decryptToken(msg.page_access_token);
    const privateRes = await this.graphClient.sendPrivateReply(
      msg.page_fb_id,
      msg.meta_id,
      dto.content,
      pageAccessToken
    );

    if (!privateRes.success) {
      throw new AppError(
        privateRes.error || 'Meta API từ chối gửi tin nhắn riêng cho bình luận',
        502,
        'META_API_ERROR'
      );
    }

    await this.messageCommentRepo.markPrivateReplySent(msg.meta_id);

    // Phát sự kiện INBOX_UPDATED qua WebSocket
    this.socketSvc.emitInboxUpdated(msg.page_fb_id, {
      event: 'INBOX_UPDATED',
      page_id: msg.page_fb_id,
      conversation_id: msg.conversation_id,
      updated_fields: {
        private_reply_sent: true,
      },
    });

    return {
      success: true,
      message: 'Đã gửi tin nhắn riêng tới khách hàng thành công',
    };
  }

  /**
   * Ẩn hoặc hiện thủ công một bình luận Facebook qua Graph API.
   */
  async hideComment(messageId: string, userId: string, isHidden: boolean) {
    const msg = await this.messageCommentRepo.findByIdWithPage(messageId, userId);
    if (!msg) {
      throw new AppError('Không tìm thấy bình luận', 404, 'NOT_FOUND');
    }

    const pageAccessToken = decryptToken(msg.page_access_token);
    const hideRes = await this.graphClient.hideComment(msg.meta_id, pageAccessToken, isHidden);

    if (!hideRes.success) {
      throw new AppError(
        hideRes.error || 'Không thể thay đổi trạng thái ẩn bình luận qua Meta API',
        502,
        'META_API_ERROR'
      );
    }

    const updated = await this.messageCommentRepo.updateHideStatus(messageId, isHidden);

    // Phát sự kiện INBOX_UPDATED qua WebSocket
    this.socketSvc.emitInboxUpdated(msg.page_fb_id, {
      event: 'INBOX_UPDATED',
      page_id: msg.page_fb_id,
      conversation_id: msg.conversation_id,
      updated_fields: {
        is_hidden: isHidden,
      },
    });

    return updated;
  }

  /**
   * Cập nhật trạng thái hội thoại (open, resolved, archived).
   */
  async updateConversationStatus(
    conversationId: string,
    userId: string,
    status: 'open' | 'resolved' | 'archived'
  ) {
    const conv = await this.conversationRepo.findByIdAndUserId(conversationId, userId);
    if (!conv) {
      throw new AppError('Không tìm thấy cuộc hội thoại', 404, 'NOT_FOUND');
    }

    const updated = await this.conversationRepo.updateStatus(conversationId, status);

    // Phát sự kiện INBOX_UPDATED qua WebSocket
    this.socketSvc.emitInboxUpdated(conv.page_fb_id, {
      event: 'INBOX_UPDATED',
      page_id: conv.page_fb_id,
      conversation_id: conversationId,
      updated_fields: {
        status,
      },
    });

    return updated;
  }

  /**
   * Cập nhật thông tin khách hàng (customer_name, phone_number, address, tags, notes).
   */
  async updateCustomer(customerId: string, userId: string, dto: UpdateCustomerDto) {
    const customer = await this.customerRepo.findByIdAndUserId(customerId, userId);
    if (!customer) {
      throw new AppError('Không tìm thấy thông tin khách hàng', 404, 'NOT_FOUND');
    }

    const updated = await this.customerRepo.update(customerId, dto);
    return updated;
  }
}

export const inboxService = new InboxService();
