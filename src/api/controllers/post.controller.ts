/**
 * ShopFlow - Scheduled Post Controller
 * File: backend/src/api/controllers/post.controller.ts
 *
 * Điều khiển các yêu cầu tạo, cập nhật, hủy và tra cứu bài viết đặt lịch.
 */

import { Request, Response, NextFunction } from 'express';
import {
  postScheduleService,
  PostScheduleService,
} from '../../core/services/post-schedule.service.js';
import { CreatePostDto, UpdatePostDto } from '../dtos/post.dto.js';
import { AppError } from '../../core/errors/app-error.js';

export class PostController {
  constructor(private readonly service: PostScheduleService = postScheduleService) {}

  /**
   * GET /api/v1/posts
   * Danh sách bài viết có phân trang và bộ lọc
   */
  getPosts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const { page_id, status, from, to, page, limit } = req.query as any;

      const result = await this.service.getPosts({
        userId,
        pageId: page_id,
        status,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/posts/:postId
   * Chi tiết bài viết đặt lịch
   */
  getPostDetail = async (
    req: Request<{ postId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const post = await this.service.getPostDetail(req.params.postId, userId);

      res.status(200).json({
        success: true,
        data: { post },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/posts
   * Tạo bài viết mới & đặt lịch xuất bản
   */
  createPost = async (
    req: Request<unknown, unknown, CreatePostDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const post = await this.service.createPost(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Lên lịch xuất bản bài viết thành công',
        data: { post },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/posts/:postId
   * Chỉnh sửa bài viết khi chưa xuất bản
   */
  updatePost = async (
    req: Request<{ postId: string }, unknown, UpdatePostDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const post = await this.service.updatePost(
        req.params.postId,
        userId,
        req.body
      );

      res.status(200).json({
        success: true,
        message: 'Cập nhật bài viết thành công',
        data: { post },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/posts/:postId
   * Hủy bài viết đặt lịch
   */
  cancelPost = async (
    req: Request<{ postId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      await this.service.cancelPost(req.params.postId, userId);

      res.status(200).json({
        success: true,
        message: 'Đã hủy lịch đăng bài',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/posts/:postId/retry
   * Đưa lại bài viết bị lỗi (failed) vào hàng đợi xuất bản
   */
  retryPost = async (
    req: Request<{ postId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const post = await this.service.retryPost(req.params.postId, userId);

      res.status(200).json({
        success: true,
        message: 'Đã đưa bài viết vào hàng đợi đăng lại',
        data: { post },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const postController = new PostController();
