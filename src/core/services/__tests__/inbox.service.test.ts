/**
 * ShopFlow - Inbox Service Unit Tests
 * File: backend/src/core/services/__tests__/inbox.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InboxService } from '../inbox.service.js';
import { AppError } from '../../errors/app-error.js';
import * as cryptoHelper from '../../../utils/crypto.helper.js';

describe('InboxService', () => {
  let inboxService: InboxService;
  let mockConversationRepo: any;
  let mockCustomerRepo: any;
  let mockMessageCommentRepo: any;
  let mockPageRepo: any;
  let mockGraphClient: any;
  let mockSocketService: any;

  beforeEach(() => {
    mockConversationRepo = {
      findManyWithFilter: vi.fn(),
      findByIdAndUserId: vi.fn(),
      updateStatus: vi.fn(),
      markAsRead: vi.fn(),
      updateLastMessage: vi.fn(),
    };

    mockCustomerRepo = {
      findByIdAndUserId: vi.fn(),
      update: vi.fn(),
    };

    mockMessageCommentRepo = {
      findMessagesByConversation: vi.fn(),
      findByIdWithPage: vi.fn(),
      createPageMessage: vi.fn(),
      updateHideStatus: vi.fn(),
      markPrivateReplySent: vi.fn(),
    };

    mockPageRepo = {
      findById: vi.fn(),
    };

    mockGraphClient = {
      sendMessage: vi.fn(),
      replyComment: vi.fn(),
      sendPrivateReply: vi.fn(),
      hideComment: vi.fn(),
    };

    mockSocketService = {
      emitNewInboxItem: vi.fn(),
      emitInboxUpdated: vi.fn(),
      emitPostStatusChanged: vi.fn(),
    };

    inboxService = new InboxService(
      mockConversationRepo,
      mockCustomerRepo,
      mockMessageCommentRepo,
      mockPageRepo,
      mockGraphClient,
      mockSocketService
    );

    vi.spyOn(cryptoHelper, 'decryptToken').mockReturnValue('decrypted_token');
  });

  describe('getConversations()', () => {
    it('lấy danh sách hội thoại và tính toán đúng is_within_24h', async () => {
      const futureDate = new Date(Date.now() + 3600 * 1000); // Còn hạn 1h
      const pastDate = new Date(Date.now() - 3600 * 1000); // Đã hết hạn 1h

      mockConversationRepo.findManyWithFilter.mockResolvedValue({
        conversations: [
          {
            id: 'c1',
            page_id: 'p1',
            page_name: 'Shop 1',
            page_fb_id: '123',
            customer_id: 'cu1',
            customer_fb_id: 'fb1',
            customer_name: 'Khách 1',
            phone_number: '0912345678',
            customer_tags: ['VIP'],
            type: 'messenger',
            meta_thread_id: 't1',
            last_message_text: 'Hello',
            last_message_at: new Date(),
            window_24h_expires_at: futureDate,
            unread_count: 2,
            status: 'open',
            created_at: new Date(),
          },
          {
            id: 'c2',
            page_id: 'p1',
            page_name: 'Shop 1',
            page_fb_id: '123',
            customer_id: 'cu2',
            customer_fb_id: 'fb2',
            customer_name: 'Khách 2',
            phone_number: null,
            customer_tags: [],
            type: 'messenger',
            meta_thread_id: 't2',
            last_message_text: 'Xin chào',
            last_message_at: new Date(),
            window_24h_expires_at: pastDate,
            unread_count: 0,
            status: 'resolved',
            created_at: new Date(),
          },
        ],
        total: 2,
      });

      const result = await inboxService.getConversations('u1', { page: 1, limit: 10 });

      expect(result.conversations).toHaveLength(2);
      expect(result.conversations[0]?.is_within_24h).toBe(true);
      expect(result.conversations[1]?.is_within_24h).toBe(false);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('getConversationDetail()', () => {
    it('ném lỗi 404 nếu không tìm thấy hội thoại', async () => {
      mockConversationRepo.findByIdAndUserId.mockResolvedValue(null);

      await expect(inboxService.getConversationDetail('c_not_found', 'u1')).rejects.toThrow(
        AppError
      );
    });

    it('trả về chi tiết và tự động đánh dấu đã đọc khi unread_count > 0', async () => {
      mockConversationRepo.findByIdAndUserId.mockResolvedValue({
        id: 'c1',
        page_id: 'p1',
        page_name: 'Shop 1',
        page_fb_id: '123',
        customer_id: 'cu1',
        customer_fb_id: 'fb1',
        customer_name: 'Khách 1',
        phone_number: '0912345678',
        customer_tags: [],
        type: 'messenger',
        meta_thread_id: 't1',
        last_message_text: 'Hi',
        last_message_at: new Date(),
        window_24h_expires_at: null,
        unread_count: 3,
        status: 'open',
        created_at: new Date(),
      });

      const result = await inboxService.getConversationDetail('c1', 'u1');

      expect(mockConversationRepo.markAsRead).toHaveBeenCalledWith('c1');
      expect(mockSocketService.emitInboxUpdated).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          event: 'INBOX_UPDATED',
          updated_fields: { unread_count: 0 },
        })
      );
      expect(result.conversation.unread_count).toBe(0);
      expect(result.customer.customer_name).toBe('Khách 1');
    });
  });

  describe('getMessages()', () => {
    it('lấy danh sách tin nhắn theo cursor pagination', async () => {
      mockConversationRepo.findByIdAndUserId.mockResolvedValue({ id: 'c1' });
      mockMessageCommentRepo.findMessagesByConversation.mockResolvedValue({
        messages: [{ id: 'm1', content: 'Test' }],
        nextCursor: null,
      });

      const result = await inboxService.getMessages('c1', 'u1', { limit: 50 });
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('sendMessage()', () => {
    it('gửi tin nhắn qua Facebook Messenger thành công và phát socket event', async () => {
      mockConversationRepo.findByIdAndUserId.mockResolvedValue({
        id: 'c1',
        page_id: 'p_uuid_1',
        type: 'messenger',
        page_fb_id: 'page_fb_123',
        customer_fb_id: 'cust_fb_456',
        window_24h_expires_at: new Date(Date.now() + 10000),
      });

      mockPageRepo.findById.mockResolvedValue({
        id: 'p_uuid_1',
        page_id: 'page_fb_123',
        page_access_token: 'encrypted_token',
      });

      mockGraphClient.sendMessage.mockResolvedValue({
        success: true,
        messageId: 'mid_meta_789',
      });

      mockMessageCommentRepo.createPageMessage.mockResolvedValue({
        id: 'm_new',
        content: 'Dạ shop đây ạ',
        created_at: new Date(),
      });

      const message = await inboxService.sendMessage('c1', 'u1', {
        content: 'Dạ shop đây ạ',
      });

      expect(mockGraphClient.sendMessage).toHaveBeenCalledWith(
        'page_fb_123',
        'cust_fb_456',
        'Dạ shop đây ạ',
        'decrypted_token',
        undefined
      );
      expect(mockMessageCommentRepo.createPageMessage).toHaveBeenCalled();
      expect(mockConversationRepo.updateLastMessage).toHaveBeenCalledWith('c1', 'Dạ shop đây ạ');
      expect(mockSocketService.emitInboxUpdated).toHaveBeenCalled();
      expect(message.id).toBe('m_new');
    });

    it('ném lỗi 502 khi Meta Graph API từ chối gửi tin nhắn', async () => {
      mockConversationRepo.findByIdAndUserId.mockResolvedValue({
        id: 'c1',
        page_id: 'p_uuid_1',
        type: 'messenger',
        page_fb_id: 'page_fb_123',
        customer_fb_id: 'cust_fb_456',
        window_24h_expires_at: null,
      });

      mockPageRepo.findById.mockResolvedValue({
        id: 'p_uuid_1',
        page_id: 'page_fb_123',
        page_access_token: 'enc_token',
      });

      mockGraphClient.sendMessage.mockResolvedValue({
        success: false,
        error: 'Graph API Error: (#10) Message failed',
      });

      await expect(
        inboxService.sendMessage('c1', 'u1', { content: 'Xin chào' })
      ).rejects.toThrow(AppError);
    });

    it('gửi bình luận trả lời khi hội thoại là comment_thread', async () => {
      mockConversationRepo.findByIdAndUserId.mockResolvedValue({
        id: 'c2',
        page_id: 'p_uuid_1',
        type: 'comment_thread',
        meta_thread_id: 'parent_cmt_123',
        page_fb_id: 'page_fb_123',
      });

      mockPageRepo.findById.mockResolvedValue({
        id: 'p_uuid_1',
        page_id: 'page_fb_123',
        page_access_token: 'enc_token',
      });

      mockGraphClient.replyComment.mockResolvedValue({
        success: true,
        commentId: 'reply_cmt_456',
      });

      mockMessageCommentRepo.createPageMessage.mockResolvedValue({
        id: 'm_reply',
        content: 'Cảm ơn bạn đã hỏi',
        created_at: new Date(),
      });

      const message = await inboxService.sendMessage('c2', 'u1', {
        content: 'Cảm ơn bạn đã hỏi',
      });

      expect(mockGraphClient.replyComment).toHaveBeenCalledWith(
        'parent_cmt_123',
        'Cảm ơn bạn đã hỏi',
        'decrypted_token'
      );
      expect(message.id).toBe('m_reply');
    });
  });

  describe('sendPrivateReply()', () => {
    it('từ chối nếu bình luận đã được gửi Private Reply trước đó', async () => {
      mockMessageCommentRepo.findByIdWithPage.mockResolvedValue({
        id: 'm_1',
        private_reply_sent: true,
      });

      await expect(
        inboxService.sendPrivateReply('m_1', 'u1', { content: 'Báo giá' })
      ).rejects.toThrow('Bình luận này đã được gửi tin nhắn riêng trước đó');
    });

    it('gửi tin nhắn riêng thành công khi chưa gửi trước đó', async () => {
      mockMessageCommentRepo.findByIdWithPage.mockResolvedValue({
        id: 'm_1',
        meta_id: 'fb_cmt_1',
        page_fb_id: 'page_fb_1',
        page_access_token: 'enc_token',
        private_reply_sent: false,
        conversation_id: 'c_1',
      });

      mockGraphClient.sendPrivateReply.mockResolvedValue({
        success: true,
        messageId: 'mid_pr_1',
      });

      const result = await inboxService.sendPrivateReply('m_1', 'u1', {
        content: 'Chào bạn, giá 199k nhé',
      });

      expect(mockGraphClient.sendPrivateReply).toHaveBeenCalledWith(
        'page_fb_1',
        'fb_cmt_1',
        'Chào bạn, giá 199k nhé',
        'decrypted_token'
      );
      expect(mockMessageCommentRepo.markPrivateReplySent).toHaveBeenCalledWith('fb_cmt_1');
      expect(mockSocketService.emitInboxUpdated).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('hideComment()', () => {
    it('gọi Meta API và cập nhật DB khi ẩn/hiện bình luận', async () => {
      mockMessageCommentRepo.findByIdWithPage.mockResolvedValue({
        id: 'm_1',
        meta_id: 'fb_cmt_1',
        page_fb_id: 'page_fb_1',
        page_access_token: 'enc_token',
        conversation_id: 'c_1',
      });

      mockGraphClient.hideComment.mockResolvedValue({
        success: true,
      });

      mockMessageCommentRepo.updateHideStatus.mockResolvedValue({
        id: 'm_1',
        is_hidden: true,
      });

      const result = await inboxService.hideComment('m_1', 'u1', true);

      expect(mockGraphClient.hideComment).toHaveBeenCalledWith('fb_cmt_1', 'decrypted_token', true);
      expect(mockMessageCommentRepo.updateHideStatus).toHaveBeenCalledWith('m_1', true);
      expect(mockSocketService.emitInboxUpdated).toHaveBeenCalled();
      expect(result?.is_hidden).toBe(true);
    });
  });

  describe('updateConversationStatus()', () => {
    it('cập nhật trạng thái hội thoại và phát socket event', async () => {
      mockConversationRepo.findByIdAndUserId.mockResolvedValue({
        id: 'c_1',
        page_fb_id: 'page_1',
      });

      mockConversationRepo.updateStatus.mockResolvedValue({
        id: 'c_1',
        status: 'resolved',
      });

      const result = await inboxService.updateConversationStatus('c_1', 'u1', 'resolved');

      expect(mockConversationRepo.updateStatus).toHaveBeenCalledWith('c_1', 'resolved');
      expect(mockSocketService.emitInboxUpdated).toHaveBeenCalled();
      expect(result?.status).toBe('resolved');
    });
  });

  describe('updateCustomer()', () => {
    it('cập nhật thông tin khách hàng CRM', async () => {
      mockCustomerRepo.findByIdAndUserId.mockResolvedValue({ id: 'cu_1' });
      mockCustomerRepo.update.mockResolvedValue({
        id: 'cu_1',
        customer_name: 'Khách VIP Mai',
        phone_number: '0988888888',
      });

      const result = await inboxService.updateCustomer('cu_1', 'u1', {
        customer_name: 'Khách VIP Mai',
        phone_number: '0988888888',
      });

      expect(result?.customer_name).toBe('Khách VIP Mai');
    });
  });
});
