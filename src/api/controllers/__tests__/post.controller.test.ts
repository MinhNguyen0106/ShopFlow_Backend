/**
 * ShopFlow - Unit Tests: post.controller.ts
 * File: backend/src/api/controllers/__tests__/post.controller.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { PostController } from '../post.controller.js';
import { PostScheduleService } from '../../../core/services/post-schedule.service.js';

describe('PostController Unit Tests', () => {
  let controller: PostController;
  let mockService: PostScheduleService;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockService = {
      getPosts: vi.fn(),
      getPostDetail: vi.fn(),
      createPost: vi.fn(),
      updatePost: vi.fn(),
      cancelPost: vi.fn(),
      retryPost: vi.fn(),
    } as unknown as PostScheduleService;

    controller = new PostController(mockService);

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('Authentication check (401 UNAUTHORIZED)', () => {
    it('getPosts chuyển tiếp lỗi 401 khi không có user trong request', async () => {
      mockReq = { user: undefined, query: {} as any };
      await controller.getPosts(mockReq as any, mockRes as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNAUTHORIZED', statusCode: 401 })
      );
    });

    it('getPostDetail chuyển tiếp lỗi 401 khi không có user trong request', async () => {
      mockReq = { user: undefined, params: { postId: 'p-1' } as any };
      await controller.getPostDetail(mockReq as any, mockRes as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNAUTHORIZED', statusCode: 401 })
      );
    });

    it('createPost chuyển tiếp lỗi 401 khi không có user trong request', async () => {
      mockReq = { user: undefined, body: {} as any };
      await controller.createPost(mockReq as any, mockRes as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNAUTHORIZED', statusCode: 401 })
      );
    });

    it('updatePost chuyển tiếp lỗi 401 khi không có user trong request', async () => {
      mockReq = { user: undefined, params: { postId: 'p-1' } as any, body: {} as any };
      await controller.updatePost(mockReq as any, mockRes as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNAUTHORIZED', statusCode: 401 })
      );
    });

    it('cancelPost chuyển tiếp lỗi 401 khi không có user trong request', async () => {
      mockReq = { user: undefined, params: { postId: 'p-1' } as any };
      await controller.cancelPost(mockReq as any, mockRes as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNAUTHORIZED', statusCode: 401 })
      );
    });

    it('retryPost chuyển tiếp lỗi 401 khi không có user trong request', async () => {
      mockReq = { user: undefined, params: { postId: 'p-1' } as any };
      await controller.retryPost(mockReq as any, mockRes as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNAUTHORIZED', statusCode: 401 })
      );
    });
  });

  describe('Success Cases', () => {
    beforeEach(() => {
      mockReq = { user: { id: 'user-123' } as any };
    });

    it('getPosts trả về 200 OK cùng dữ liệu phân trang', async () => {
      mockReq.query = { page: 1, limit: 10 } as any;
      const mockResult = { posts: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } };
      vi.spyOn(mockService, 'getPosts').mockResolvedValueOnce(mockResult as any);

      await controller.getPosts(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockResult });
    });

    it('createPost trả về 201 Created cùng bài viết mới', async () => {
      const mockPost = { id: 'p-1', content_text: 'Bài mới' };
      vi.spyOn(mockService, 'createPost').mockResolvedValueOnce(mockPost as any);

      mockReq.body = { content_text: 'Bài mới' } as any;
      await controller.createPost(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { post: mockPost },
        })
      );
    });

    it('cancelPost trả về 200 OK', async () => {
      vi.spyOn(mockService, 'cancelPost').mockResolvedValueOnce(true);
      mockReq.params = { postId: 'p-1' } as any;

      await controller.cancelPost(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Đã hủy lịch đăng bài',
        })
      );
    });
  });
});
