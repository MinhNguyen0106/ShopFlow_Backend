/**
 * ShopFlow - Unit Tests: post-schedule.service.ts
 * File: backend/src/core/services/__tests__/post-schedule.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostScheduleService } from '../post-schedule.service.js';
import {
  PostScheduleRepository,
  PostSchedule,
} from '../../../infrastructure/repositories/post-schedule.repository.js';
import { ConnectedPageRepository } from '../../../infrastructure/repositories/connected-page.repository.js';
import { AppError } from '../../errors/app-error.js';

describe('PostScheduleService Unit Tests', () => {
  let service: PostScheduleService;
  let mockPostRepo: PostScheduleRepository;
  let mockPageRepo: ConnectedPageRepository;
  let mockQueue: any;

  const mockPage = {
    id: 'page-uuid-1',
    user_id: 'user-uuid-1',
    page_id: 'meta-page-123',
    page_name: 'Shop Thời Trang',
    page_access_token: 'enc_token',
    is_active: true,
    webhook_subscribed: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPost: PostSchedule = {
    id: 'post-uuid-1',
    page_id: 'page-uuid-1',
    user_id: 'user-uuid-1',
    content_text: 'Bài viết khuyến mãi',
    media_type: 'photo',
    media_urls: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
    scheduled_time: new Date(Date.now() + 3600000), // 1h sau
    status: 'scheduled',
    meta_post_id: null,
    error_message: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockPostRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdAndUserId: vi.fn(),
      findManyWithFilter: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    } as unknown as PostScheduleRepository;

    mockPageRepo = {
      findByPageIdAndUserId: vi.fn(),
      findById: vi.fn(),
    } as unknown as ConnectedPageRepository;

    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-1' }),
      getJob: vi.fn().mockResolvedValue(null),
    };

    service = new PostScheduleService(mockPostRepo, mockPageRepo, mockQueue);
  });

  describe('createPost()', () => {
    it('throw AppError 404 khi không tìm thấy Fanpage của user', async () => {
      vi.spyOn(mockPageRepo, 'findByPageIdAndUserId').mockResolvedValueOnce(null);

      await expect(
        service.createPost('user-uuid-1', {
          page_id: 'page-nonexistent',
          content_text: 'Test content',
          media_type: 'none',
          media_urls: [],
          scheduled_time: new Date(Date.now() + 1000000).toISOString(),
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'PAGE_NOT_FOUND',
          statusCode: 404,
        })
      );
    });

    it('throw AppError 400 khi Fanpage đang bị tạm dừng hoạt động', async () => {
      vi.spyOn(mockPageRepo, 'findByPageIdAndUserId').mockResolvedValueOnce({
        ...mockPage,
        is_active: false,
      });

      await expect(
        service.createPost('user-uuid-1', {
          page_id: mockPage.id,
          content_text: 'Test content',
          media_type: 'none',
          media_urls: [],
          scheduled_time: new Date(Date.now() + 1000000).toISOString(),
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'PAGE_INACTIVE',
          statusCode: 400,
        })
      );
    });

    it('tạo bài viết và lập lịch Job vào BullMQ thành công', async () => {
      vi.spyOn(mockPageRepo, 'findByPageIdAndUserId').mockResolvedValueOnce(mockPage);
      vi.spyOn(mockPostRepo, 'create').mockResolvedValueOnce(mockPost);

      const result = await service.createPost('user-uuid-1', {
        page_id: mockPage.id,
        content_text: 'Bài viết khuyến mãi',
        media_type: 'photo',
        media_urls: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
        scheduled_time: mockPost.scheduled_time.toISOString(),
      });

      expect(result).toEqual(mockPost);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish-scheduled-post',
        expect.objectContaining({
          postId: mockPost.id,
          pageId: mockPage.id,
          userId: 'user-uuid-1',
        }),
        expect.objectContaining({
          jobId: mockPost.id,
        })
      );
    });
  });

  describe('getPosts() & getPostDetail()', () => {
    it('getPosts trả về danh sách phân trang', async () => {
      const mockPaginated = {
        posts: [mockPost],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      vi.spyOn(mockPostRepo, 'findManyWithFilter').mockResolvedValueOnce(mockPaginated);

      const result = await service.getPosts({ userId: 'user-uuid-1' });
      expect(result).toEqual(mockPaginated);
    });

    it('getPostDetail trả về bài viết khi tìm thấy', async () => {
      vi.spyOn(mockPostRepo, 'findByIdAndUserId').mockResolvedValueOnce(mockPost);

      const result = await service.getPostDetail('post-uuid-1', 'user-uuid-1');
      expect(result).toEqual(mockPost);
    });

    it('getPostDetail throw 404 khi không tìm thấy', async () => {
      vi.spyOn(mockPostRepo, 'findByIdAndUserId').mockResolvedValueOnce(null);

      await expect(
        service.getPostDetail('post-uuid-none', 'user-uuid-1')
      ).rejects.toThrow(AppError);
    });
  });

  describe('updatePost()', () => {
    it('throw 400 khi chỉnh sửa bài viết đã xuất bản', async () => {
      vi.spyOn(mockPostRepo, 'findByIdAndUserId').mockResolvedValueOnce({
        ...mockPost,
        status: 'published',
      });

      await expect(
        service.updatePost('post-uuid-1', 'user-uuid-1', { content_text: 'Sửa' })
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'CANNOT_EDIT_POST',
          statusCode: 400,
        })
      );
    });

    it('cập nhật nội dung và điều chỉnh delay Job khi đổi thời gian hẹn giờ', async () => {
      vi.spyOn(mockPostRepo, 'findByIdAndUserId').mockResolvedValueOnce(mockPost);

      const newTime = new Date(Date.now() + 7200000); // 2h sau
      const updatedPost = { ...mockPost, scheduled_time: newTime, content_text: 'Nội dung mới' };

      vi.spyOn(mockPostRepo, 'update').mockResolvedValueOnce(updatedPost);

      const mockJob = { remove: vi.fn() };
      mockQueue.getJob.mockResolvedValueOnce(mockJob);

      const result = await service.updatePost('post-uuid-1', 'user-uuid-1', {
        content_text: 'Nội dung mới',
        scheduled_time: newTime.toISOString(),
      });

      expect(result.content_text).toBe('Nội dung mới');
      expect(mockJob.remove).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('cancelPost()', () => {
    it('throw 400 khi hủy bài viết đã xuất bản', async () => {
      vi.spyOn(mockPostRepo, 'findByIdAndUserId').mockResolvedValueOnce({
        ...mockPost,
        status: 'published',
      });

      await expect(
        service.cancelPost('post-uuid-1', 'user-uuid-1')
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'CANNOT_CANCEL_PUBLISHED_POST',
          statusCode: 400,
        })
      );
    });

    it('hủy bài viết và xóa job khỏi BullMQ thành công', async () => {
      vi.spyOn(mockPostRepo, 'findByIdAndUserId').mockResolvedValueOnce(mockPost);

      const mockJob = { remove: vi.fn() };
      mockQueue.getJob.mockResolvedValueOnce(mockJob);
      vi.spyOn(mockPostRepo, 'updateStatus').mockResolvedValueOnce({
        ...mockPost,
        status: 'cancelled',
      });

      const success = await service.cancelPost('post-uuid-1', 'user-uuid-1');

      expect(success).toBe(true);
      expect(mockJob.remove).toHaveBeenCalled();
      expect(mockPostRepo.updateStatus).toHaveBeenCalledWith(
        'post-uuid-1',
        'cancelled',
        null,
        expect.any(String)
      );
    });
  });

  describe('retryPost()', () => {
    it('throw 400 khi bài viết không ở trạng thái failed', async () => {
      vi.spyOn(mockPostRepo, 'findByIdAndUserId').mockResolvedValueOnce(mockPost); // status = scheduled

      await expect(
        service.retryPost('post-uuid-1', 'user-uuid-1')
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'INVALID_RETRY_STATUS',
          statusCode: 400,
        })
      );
    });

    it('đưa bài viết lỗi vào hàng đợi xuất bản ngay lập tức', async () => {
      vi.spyOn(mockPostRepo, 'findByIdAndUserId').mockResolvedValueOnce({
        ...mockPost,
        status: 'failed',
      });

      const retryingPost = { ...mockPost, status: 'scheduled' as const };
      vi.spyOn(mockPostRepo, 'updateStatus').mockResolvedValueOnce(retryingPost);

      const result = await service.retryPost('post-uuid-1', 'user-uuid-1');

      expect(result.status).toBe('scheduled');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish-scheduled-post',
        expect.objectContaining({
          postId: 'post-uuid-1',
        }),
        expect.objectContaining({
          delay: 0,
        })
      );
    });
  });
});
