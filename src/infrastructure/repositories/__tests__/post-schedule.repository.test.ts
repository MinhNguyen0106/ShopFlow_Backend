/**
 * ShopFlow - Unit Tests: post-schedule.repository.ts
 * File: backend/src/infrastructure/repositories/__tests__/post-schedule.repository.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PostScheduleRepository,
  PostSchedule,
} from '../post-schedule.repository.js';
import * as dbClient from '../../database/db.client.js';

describe('PostScheduleRepository Unit Tests', () => {
  let repo: PostScheduleRepository;

  const mockPost: PostSchedule = {
    id: 'post-uuid-1',
    page_id: 'page-uuid-1',
    user_id: 'user-uuid-1',
    content_text: 'Khuyến mãi đặc biệt 50% hôm nay!',
    media_type: 'photo',
    media_urls: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
    scheduled_time: new Date('2026-10-25T10:00:00Z'),
    status: 'scheduled',
    meta_post_id: null,
    error_message: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    repo = new PostScheduleRepository();
  });

  describe('create()', () => {
    it('thêm bài viết mới vào bảng posts_schedule thành công', async () => {
      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({
        rows: [mockPost],
        rowCount: 1,
      } as any);

      const result = await repo.create({
        pageId: mockPost.page_id,
        userId: mockPost.user_id,
        contentText: mockPost.content_text,
        mediaType: 'photo',
        mediaUrls: mockPost.media_urls,
        scheduledTime: mockPost.scheduled_time,
      });

      expect(result).toEqual(mockPost);
      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO posts_schedule'),
        expect.arrayContaining([mockPost.page_id, mockPost.user_id, mockPost.content_text])
      );
    });
  });

  describe('findById() & findByIdAndUserId()', () => {
    it('findById trả về bài viết khi tìm thấy', async () => {
      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({
        rows: [mockPost],
        rowCount: 1,
      } as any);

      const result = await repo.findById('post-uuid-1');
      expect(result).toEqual(mockPost);
    });

    it('findById trả về null khi không tìm thấy', async () => {
      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repo.findById('post-uuid-none');
      expect(result).toBeNull();
    });

    it('findByIdAndUserId trả về bài viết khi đúng user_id', async () => {
      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({
        rows: [mockPost],
        rowCount: 1,
      } as any);

      const result = await repo.findByIdAndUserId('post-uuid-1', 'user-uuid-1');
      expect(result).toEqual(mockPost);
    });
  });

  describe('findManyWithFilter()', () => {
    it('lấy danh sách bài viết kèm phân trang và lọc theo pageId, status, khoảng ngày', async () => {
      // Mock count
      vi.spyOn(dbClient, 'query')
        .mockResolvedValueOnce({
          rows: [{ total: '5' }],
          rowCount: 1,
        } as any)
        // Mock data
        .mockResolvedValueOnce({
          rows: [mockPost],
          rowCount: 1,
        } as any);

      const result = await repo.findManyWithFilter({
        userId: 'user-uuid-1',
        pageId: 'page-uuid-1',
        status: 'scheduled',
        from: new Date('2026-10-20Z'),
        to: new Date('2026-10-30Z'),
        page: 1,
        limit: 10,
      });

      expect(result.posts).toHaveLength(1);
      expect(result.meta.total).toBe(5);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('update()', () => {
    it('cập nhật các trường nội dung bài viết', async () => {
      const updatedPost = { ...mockPost, content_text: 'Nội dung mới cập nhật' };

      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({
        rows: [updatedPost],
        rowCount: 1,
      } as any);

      const result = await repo.update('post-uuid-1', 'user-uuid-1', {
        contentText: 'Nội dung mới cập nhật',
        mediaType: 'none',
        mediaUrls: [],
        scheduledTime: new Date('2026-10-26T10:00:00Z'),
        status: 'pending',
        metaPostId: 'meta-p-1',
        errorMessage: 'Lỗi cũ',
      });

      expect(result?.content_text).toBe('Nội dung mới cập nhật');
    });

    it('trả về bản ghi hiện tại khi data update rỗng', async () => {
      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({
        rows: [mockPost],
        rowCount: 1,
      } as any);

      const result = await repo.update('post-uuid-1', 'user-uuid-1', {});
      expect(result).toEqual(mockPost);
    });
  });

  describe('updateStatus()', () => {
    it('cập nhật trạng thái published và meta_post_id', async () => {
      const publishedPost = { ...mockPost, status: 'published', meta_post_id: 'meta-fb-123' };

      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({
        rows: [publishedPost],
        rowCount: 1,
      } as any);

      const result = await repo.updateStatus('post-uuid-1', 'published', 'meta-fb-123');
      expect(result?.status).toBe('published');
      expect(result?.meta_post_id).toBe('meta-fb-123');
    });
  });

  describe('delete()', () => {
    it('trả về true khi xóa thành công bài viết', async () => {
      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
      } as any);

      const result = await repo.delete('post-uuid-1', 'user-uuid-1');
      expect(result).toBe(true);
    });

    it('trả về false khi không có bản ghi nào bị xóa', async () => {
      vi.spyOn(dbClient, 'query').mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      } as any);

      const result = await repo.delete('post-uuid-none', 'user-uuid-1');
      expect(result).toBe(false);
    });
  });
});
