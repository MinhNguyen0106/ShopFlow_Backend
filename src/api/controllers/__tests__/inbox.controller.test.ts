/**
 * ShopFlow - Inbox Controller Unit Tests
 * File: backend/src/api/controllers/__tests__/inbox.controller.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InboxController } from '../inbox.controller.js';
import { AppError } from '../../../core/errors/app-error.js';

describe('InboxController', () => {
  let controller: InboxController;
  let mockInboxService: any;
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    mockInboxService = {
      getConversations: vi.fn(),
      getConversationDetail: vi.fn(),
      getMessages: vi.fn(),
      sendMessage: vi.fn(),
      sendPrivateReply: vi.fn(),
      hideComment: vi.fn(),
      updateConversationStatus: vi.fn(),
      updateCustomer: vi.fn(),
    };

    controller = new InboxController(mockInboxService);

    req = {
      user: { id: 'u1' },
      query: {},
      params: {},
      body: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    next = vi.fn();
  });

  describe('getConversations', () => {
    it('trả về HTTP 200 kèm danh sách hội thoại', async () => {
      mockInboxService.getConversations.mockResolvedValue({
        conversations: [{ id: 'c1' }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      await controller.getConversations(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { conversations: [{ id: 'c1' }] },
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });

    it('bắt lỗi 401 khi req.user không tồn tại', async () => {
      req.user = undefined;
      await controller.getConversations(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getConversationDetail', () => {
    it('trả về HTTP 200 kèm chi tiết hội thoại', async () => {
      req.params = { conversationId: 'c1' };
      mockInboxService.getConversationDetail.mockResolvedValue({
        conversation: { id: 'c1' },
        customer: { id: 'cu1' },
        is_within_24h: true,
      });

      await controller.getConversationDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          conversation: { id: 'c1' },
          customer: { id: 'cu1' },
          is_within_24h: true,
        },
      });
    });
  });

  describe('getMessages', () => {
    it('trả về HTTP 200 kèm tin nhắn', async () => {
      req.params = { conversationId: 'c1' };
      mockInboxService.getMessages.mockResolvedValue({
        messages: [{ id: 'm1' }],
        nextCursor: null,
      });

      await controller.getMessages(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          messages: [{ id: 'm1' }],
          nextCursor: null,
        },
      });
    });
  });

  describe('sendMessage', () => {
    it('trả về HTTP 201 Created khi gửi tin nhắn thành công', async () => {
      req.params = { conversationId: 'c1' };
      req.body = { content: 'Xin chào' };
      mockInboxService.sendMessage.mockResolvedValue({ id: 'm1', content: 'Xin chào' });

      await controller.sendMessage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: { id: 'm1', content: 'Xin chào' },
        },
      });
    });
  });

  describe('sendPrivateReply', () => {
    it('trả về HTTP 200 khi gửi private reply thành công', async () => {
      req.params = { messageId: 'm1' };
      req.body = { content: 'Báo giá 200k' };
      mockInboxService.sendPrivateReply.mockResolvedValue({ success: true, message: 'OK' });

      await controller.sendPrivateReply(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { success: true, message: 'OK' },
      });
    });
  });

  describe('hideMessage', () => {
    it('trả về HTTP 200 khi ẩn/hiện tin nhắn thành công', async () => {
      req.params = { messageId: 'm1' };
      req.body = { is_hidden: true };
      mockInboxService.hideComment.mockResolvedValue({ id: 'm1', is_hidden: true });

      await controller.hideMessage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: { id: 'm1', is_hidden: true },
        },
      });
    });
  });

  describe('updateConversationStatus', () => {
    it('trả về HTTP 200 khi cập nhật status hội thoại', async () => {
      req.params = { conversationId: 'c1' };
      req.body = { status: 'resolved' };
      mockInboxService.updateConversationStatus.mockResolvedValue({ id: 'c1', status: 'resolved' });

      await controller.updateConversationStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          conversation: { id: 'c1', status: 'resolved' },
        },
      });
    });
  });

  describe('updateCustomer', () => {
    it('trả về HTTP 200 khi cập nhật khách hàng', async () => {
      req.params = { customerId: 'cu1' };
      req.body = { customer_name: 'Nguyễn Văn B' };
      mockInboxService.updateCustomer.mockResolvedValue({ id: 'cu1', customer_name: 'Nguyễn Văn B' });

      await controller.updateCustomer(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          customer: { id: 'cu1', customer_name: 'Nguyễn Văn B' },
        },
      });
    });
  });
});
