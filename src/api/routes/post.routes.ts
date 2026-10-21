/**
 * ShopFlow - Scheduled Post Routes
 * File: backend/src/api/routes/post.routes.ts
 *
 * Định tuyến các REST endpoints quản lý và đặt lịch bài viết Fanpage.
 */

import { Router } from 'express';
import { postController } from '../controllers/post.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import {
  CreatePostDtoSchema,
  UpdatePostDtoSchema,
  QueryPostsDtoSchema,
} from '../dtos/post.dto.js';

export const postRouter = Router();

// Toàn bộ routes bài viết đều yêu cầu xác thực người dùng
postRouter.use(authenticateToken);

/**
 * GET /api/v1/posts - Danh sách bài viết có phân trang & bộ lọc
 */
postRouter.get(
  '/',
  validateRequest({ query: QueryPostsDtoSchema }),
  postController.getPosts
);

/**
 * GET /api/v1/posts/:postId - Chi tiết bài viết
 */
postRouter.get('/:postId', postController.getPostDetail);

/**
 * POST /api/v1/posts - Tạo bài viết mới & lên lịch xuất bản
 */
postRouter.post(
  '/',
  validateRequest({ body: CreatePostDtoSchema }),
  postController.createPost
);

/**
 * PUT /api/v1/posts/:postId - Chỉnh sửa bài viết khi chưa xuất bản
 */
postRouter.put(
  '/:postId',
  validateRequest({ body: UpdatePostDtoSchema }),
  postController.updatePost
);

/**
 * DELETE /api/v1/posts/:postId - Hủy bài viết đặt lịch
 */
postRouter.delete('/:postId', postController.cancelPost);

/**
 * POST /api/v1/posts/:postId/retry - Đưa lại bài viết bị lỗi vào hàng đợi xuất bản
 */
postRouter.post('/:postId/retry', postController.retryPost);
