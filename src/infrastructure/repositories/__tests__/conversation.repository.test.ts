/**
 * ShopFlow - Conversation Repository Unit Tests
 * File: backend/src/infrastructure/repositories/__tests__/conversation.repository.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationRepository } from '../conversation.repository.js';
import * as dbClient from '../../database/db.client.js';

describe('ConversationRepository', () => {
  let repository: ConversationRepository;

  beforeEach(() => {
    repository = new ConversationRepository();
    vi.restoreAllMocks();
  });

  describe('findManyWithFilter()', () => {
    it('truy vấn danh sách hội thoại không có filter mở rộng', async () => {
      const mockCount = { rows: [{ total: 2 }] };
      const mockRows = {
        rows: [
          {
            id: 'c1',
            page_id: 'p1',
            page_name: 'Shop 1',
            page_fb_id: '123456',
            customer_id: 'cu1',
            customer_fb_id: '999',
            customer_name: 'Khách A',
            phone_number: '0987654321',
            customer_tags: ['Co_SDT'],
            type: 'messenger',
            meta_thread_id: 't_1',
            last_message_text: 'Xin chào',
            last_message_at: new Date(),
            window_24h_expires_at: new Date(),
            unread_count: 1,
            status: 'open',
            created_at: new Date(),
          },
        ],
      };

      const querySpy = vi
        .spyOn(dbClient, 'query')
        .mockResolvedValueOnce(mockCount as any)
        .mockResolvedValueOnce(mockRows as any);

      const result = await repository.findManyWithFilter({
        userId: 'user_1',
        page: 1,
        limit: 10,
      });

      expect(querySpy).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(2);
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0]?.customer_name).toBe('Khách A');
    });

    it('áp dụng đầy đủ bộ lọc pageId, type, status, search', async () => {
      vi.spyOn(dbClient, 'query')
        .mockResolvedValueOnce({ rows: [{ total: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await repository.findManyWithFilter({
        userId: 'user_1',
        pageId: 'page_123',
        type: 'comment_thread',
        status: 'resolved',
        search: 'Mai',
        page: 2,
        limit: 5,
      });

      expect(result.total).toBe(1);
    });
  });

  describe('findByIdAndUserId()', () => {
    it('trả về chi tiết cuộc hội thoại khi tìm thấy', async () => {
      const mockConv = {
        id: 'c_xyz',
        page_id: 'p_1',
        customer_id: 'cu_1',
        type: 'messenger',
      };

      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({ rows: [mockConv] } as any);

      const result = await repository.findByIdAndUserId('c_xyz', 'u_1');
      expect(result).toEqual(mockConv);
    });

    it('trả về null khi không tìm thấy hoặc user không có quyền', async () => {
      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({ rows: [] } as any);

      const result = await repository.findByIdAndUserId('not_found', 'u_1');
      expect(result).toBeNull();
    });
  });

  describe('updateStatus()', () => {
    it('cập nhật thành công trạng thái hội thoại', async () => {
      const updatedConv = { id: 'c_1', status: 'resolved' };
      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({ rows: [updatedConv] } as any);

      const result = await repository.updateStatus('c_1', 'resolved');
      expect(result?.status).toBe('resolved');
    });
  });

  describe('markAsRead()', () => {
    it('cập nhật unread_count = 0', async () => {
      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await repository.markAsRead('c_1');
      expect(result).toBe(true);
    });
  });

  describe('updateLastMessage()', () => {
    it('cập nhật last_message_text và thời điểm', async () => {
      const querySpy = vi.spyOn(dbClient, 'query').mockResolvedValueOnce({ rowCount: 1 } as any);

      await repository.updateLastMessage('c_1', 'Tin nhắn mới', new Date());
      expect(querySpy).toHaveBeenCalledTimes(1);
    });
  });
});
