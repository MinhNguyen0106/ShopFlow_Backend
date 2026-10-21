/**
 * ShopFlow - Unit Tests: message-comment.repository.ts
 * File: backend/src/infrastructure/repositories/__tests__/message-comment.repository.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MessageCommentRepository,
  Conversation,
  MessageOrComment,
} from '../message-comment.repository.js';
import * as dbClient from '../../database/db.client.js';

vi.mock('../../database/db.client.js', () => ({
  query: vi.fn(),
}));

describe('MessageCommentRepository', () => {
  let repo: MessageCommentRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new MessageCommentRepository();
  });

  describe('ensureConversation()', () => {
    it('nên tạo hoặc cập nhật conversation thread', async () => {
      const mockConv: Conversation = {
        id: 'conv-uuid-1',
        page_id: 'page-uuid-1',
        customer_id: 'cust-uuid-1',
        type: 'comment_thread',
        meta_thread_id: 'post_100',
        last_message_text: null,
        status: 'open',
      };

      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [mockConv],
        rowCount: 1,
        command: 'INSERT',
      });

      const result = await repo.ensureConversation(
        'page-uuid-1',
        'cust-uuid-1',
        'post_100',
        'comment_thread'
      );

      expect(result).toEqual(mockConv);
      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversations'),
        ['page-uuid-1', 'cust-uuid-1', 'comment_thread', 'post_100']
      );
    });
  });

  describe('saveComment()', () => {
    it('nên đảm bảo conversation tồn tại và lưu bình luận với is_hidden', async () => {
      const mockConv: Conversation = {
        id: 'conv-uuid-1',
        page_id: 'page-uuid-1',
        customer_id: 'cust-uuid-1',
        type: 'comment_thread',
        meta_thread_id: 'post_100',
        last_message_text: null,
        status: 'open',
      };

      const mockComment: MessageOrComment = {
        id: 'msg-uuid-1',
        conversation_id: 'conv-uuid-1',
        page_id: 'page-uuid-1',
        meta_id: 'cmt_100',
        sender_type: 'customer',
        sender_fb_id: 'cust_fb_1',
        content: 'SĐT 0981234567',
        is_hidden: true,
        private_reply_sent: false,
        media_payload: {},
        created_at: new Date(),
      };

      // Query 1: ensureConversation
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [mockConv],
        rowCount: 1,
        command: 'INSERT',
      });

      // Query 2: saveComment
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [mockComment],
        rowCount: 1,
        command: 'INSERT',
      });

      // Query 3: UPDATE conversations last_message
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
      });

      const result = await repo.saveComment({
        pageInternalId: 'page-uuid-1',
        customerId: 'cust-uuid-1',
        metaThreadId: 'post_100',
        commentId: 'cmt_100',
        senderFbId: 'cust_fb_1',
        content: 'SĐT 0981234567',
        isHidden: true,
      });

      expect(result).toEqual(mockComment);
      expect(result.is_hidden).toBe(true);
    });
  });
});
