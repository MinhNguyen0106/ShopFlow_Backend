/**
 * ShopFlow - Inbox Routes Integration Tests
 * File: backend/src/api/routes/__tests__/inbox.routes.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import * as authHelper from '../../../utils/auth.helper.js';
import { inboxService } from '../../../core/services/inbox.service.js';
import { UnauthorizedError } from '../../../core/errors/app-error.js';

describe('Inbox Routes (/api/v1/inbox)', () => {
  const app = createApp();

  const mockUser = {
    sub: 'user_test_uuid',
    id: 'user_test_uuid',
    email: 'shop@test.vn',
    role: 'owner' as const,
    token_type: 'access' as const,
  };

  const validToken = 'valid_test_access_token';

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authHelper, 'verifyAccessToken').mockImplementation((token: string) => {
      if (token === validToken) {
        return mockUser;
      }
      throw new UnauthorizedError('Token không hợp lệ hoặc đã hết hạn.');
    });
  });

  describe('Xác thực bảo vệ Router (Auth Guard)', () => {
    it('trả về 401 Unauthorized khi không gửi Authorization header', async () => {
      const res = await request(app).get('/api/v1/inbox/conversations');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('trả về 401 khi token không hợp lệ', async () => {
      const res = await request(app)
        .get('/api/v1/inbox/conversations')
        .set('Authorization', 'Bearer invalid_token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/inbox/conversations', () => {
    it('trả về HTTP 200 kèm danh sách hội thoại', async () => {
      vi.spyOn(inboxService, 'getConversations').mockResolvedValue({
        conversations: [
          {
            id: 'c1',
            page_id: 'p1',
            page_name: 'Shop Flow',
            page_fb_id: '123',
            customer: {
              id: 'cu1',
              customer_fb_id: 'fb1',
              customer_name: 'Khách 1',
              phone_number: '0987654321',
              tags: ['Co_SDT'],
            },
            type: 'messenger',
            meta_thread_id: 't1',
            last_message_text: 'Tư vấn cho mình',
            last_message_at: new Date(),
            unread_count: 1,
            window_24h_expires_at: null,
            is_within_24h: false,
            status: 'open',
            created_at: new Date(),
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const res = await request(app)
        .get('/api/v1/inbox/conversations?page=1&limit=20')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversations).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('GET /api/v1/inbox/conversations/:conversationId', () => {
    it('trả về HTTP 200 kèm chi tiết cuộc hội thoại', async () => {
      vi.spyOn(inboxService, 'getConversationDetail').mockResolvedValue({
        conversation: {
          id: 'c1',
          page_id: 'p1',
          page_name: 'Shop',
          page_fb_id: '123',
          type: 'messenger',
          meta_thread_id: 't1',
          last_message_text: 'Hello',
          last_message_at: new Date(),
          unread_count: 0,
          window_24h_expires_at: null,
          status: 'open',
          created_at: new Date(),
        },
        customer: {
          id: 'cu1',
          customer_fb_id: 'fb1',
          customer_name: 'Khách 1',
          phone_number: null,
          tags: [],
        },
        is_within_24h: false,
      });

      const res = await request(app)
        .get('/api/v1/inbox/conversations/c1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversation.id).toBe('c1');
    });
  });

  describe('GET /api/v1/inbox/conversations/:conversationId/messages', () => {
    it('trả về HTTP 200 kèm danh sách tin nhắn', async () => {
      vi.spyOn(inboxService, 'getMessages').mockResolvedValue({
        messages: [
          {
            id: 'm1',
            conversation_id: 'c1',
            page_id: 'p1',
            meta_id: 'fb_m1',
            sender_type: 'customer',
            sender_fb_id: 'fb_u1',
            content: 'Shop ơi',
            is_hidden: false,
            private_reply_sent: false,
            media_payload: {},
            created_at: new Date(),
          },
        ],
        nextCursor: null,
      });

      const res = await request(app)
        .get('/api/v1/inbox/conversations/c1/messages?limit=20')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages).toHaveLength(1);
    });
  });

  describe('POST /api/v1/inbox/conversations/:conversationId/messages', () => {
    it('trả về HTTP 201 khi nhân viên gửi tin nhắn thành công', async () => {
      vi.spyOn(inboxService, 'sendMessage').mockResolvedValue({
        id: 'm_new',
        conversation_id: 'c1',
        page_id: 'p1',
        meta_id: 'meta_sent_1',
        sender_type: 'page',
        sender_fb_id: 'page_123',
        content: 'Dạ shop chào bạn',
        is_hidden: false,
        private_reply_sent: false,
        media_payload: {},
        created_at: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/inbox/conversations/c1/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'Dạ shop chào bạn',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.content).toBe('Dạ shop chào bạn');
    });

    it('trả về HTTP 400 khi nội dung tin nhắn rỗng', async () => {
      const res = await request(app)
        .post('/api/v1/inbox/conversations/c1/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/inbox/messages/:messageId/private-reply', () => {
    it('trả về HTTP 200 khi gửi private reply thành công', async () => {
      vi.spyOn(inboxService, 'sendPrivateReply').mockResolvedValue({
        success: true,
        message: 'Đã gửi tin nhắn riêng',
      });

      const res = await request(app)
        .post('/api/v1/inbox/messages/m1/private-reply')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'Shop đã inbox báo giá cho bạn',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /api/v1/inbox/messages/:messageId/hide', () => {
    it('trả về HTTP 200 khi ẩn/hiện bình luận thành công', async () => {
      vi.spyOn(inboxService, 'hideComment').mockResolvedValue({
        id: 'm1',
        conversation_id: 'c1',
        page_id: 'p1',
        meta_id: 'cmt_1',
        sender_type: 'customer',
        sender_fb_id: 'cust_1',
        content: 'Chứa SĐT',
        is_hidden: true,
        private_reply_sent: false,
        media_payload: {},
        created_at: new Date(),
      });

      const res = await request(app)
        .patch('/api/v1/inbox/messages/m1/hide')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          is_hidden: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.is_hidden).toBe(true);
    });
  });

  describe('PATCH /api/v1/inbox/conversations/:conversationId/status', () => {
    it('trả về HTTP 200 khi đổi trạng thái hội thoại', async () => {
      vi.spyOn(inboxService, 'updateConversationStatus').mockResolvedValue({
        id: 'c1',
        status: 'resolved',
      } as any);

      const res = await request(app)
        .patch('/api/v1/inbox/conversations/c1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          status: 'resolved',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversation.status).toBe('resolved');
    });

    it('trả về HTTP 400 khi status không hợp lệ', async () => {
      const res = await request(app)
        .patch('/api/v1/inbox/conversations/c1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          status: 'invalid_status',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/inbox/customers/:customerId', () => {
    it('trả về HTTP 200 khi cập nhật thông tin khách hàng', async () => {
      vi.spyOn(inboxService, 'updateCustomer').mockResolvedValue({
        id: 'cu1',
        customer_name: 'Nguyễn Thị Hoa',
        phone_number: '0912345678',
      } as any);

      const res = await request(app)
        .patch('/api/v1/inbox/customers/cu1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: 'Nguyễn Thị Hoa',
          phone_number: '0912345678',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customer.customer_name).toBe('Nguyễn Thị Hoa');
    });
  });
});
