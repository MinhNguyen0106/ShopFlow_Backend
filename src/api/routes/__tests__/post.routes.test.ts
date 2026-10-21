/**
 * ShopFlow - Integration Tests: Scheduled Post Routes
 * File: backend/src/api/routes/__tests__/post.routes.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { postScheduleService } from '../../../core/services/post-schedule.service.js';
import { generateTokens } from '../../../utils/auth.helper.js';
import { User } from '../../../core/entities/user.entity.js';
import { PostSchedule } from '../../../infrastructure/repositories/post-schedule.repository.js';

describe('Scheduled Post Routes Integration (/api/v1/posts)', () => {
  const app = createApp();

  const testUser: User = {
    id: 'user-post-tester',
    email: 'postcreator@shopflow.vn',
    password_hash: 'hashed',
    full_name: 'Post Creator',
    role: 'owner',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const { accessToken } = generateTokens(testUser);

  const mockPost: PostSchedule = {
    id: 'post-uuid-test',
    page_id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: testUser.id,
    content_text: 'Săn deal chớp nhoáng cùng ShopFlow!',
    media_type: 'photo',
    media_urls: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
    scheduled_time: new Date(Date.now() + 3600000),
    status: 'scheduled',
    meta_post_id: null,
    error_message: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/posts', () => {
    it('nên trả về 401 UNAUTHORIZED khi không có token', async () => {
      const res = await request(app).get('/api/v1/posts');
      expect(res.status).toBe(401);
    });

    it('nên trả về danh sách bài viết theo phân trang', async () => {
      vi.spyOn(postScheduleService, 'getPosts').mockResolvedValueOnce({
        posts: [mockPost],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.posts).toHaveLength(1);
    });
  });

  describe('GET /api/v1/posts/:postId', () => {
    it('nên trả về chi tiết bài viết đặt lịch', async () => {
      vi.spyOn(postScheduleService, 'getPostDetail').mockResolvedValueOnce(mockPost);

      const res = await request(app)
        .get('/api/v1/posts/post-uuid-test')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.post.id).toBe('post-uuid-test');
    });
  });

  describe('POST /api/v1/posts', () => {
    it('nên trả về 400 VALIDATION_ERROR khi thiếu các trường bắt buộc', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('nên tạo bài viết mới và lập lịch thành công khi payload hợp lệ', async () => {
      vi.spyOn(postScheduleService, 'createPost').mockResolvedValueOnce(mockPost);

      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          page_id: '123e4567-e89b-12d3-a456-426614174000',
          content_text: 'Săn deal chớp nhoáng cùng ShopFlow!',
          media_type: 'photo',
          media_urls: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
          scheduled_time: new Date(Date.now() + 3600000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.post.id).toBe('post-uuid-test');
    });
  });

  describe('PUT /api/v1/posts/:postId', () => {
    it('nên cập nhật bài viết thành công', async () => {
      const updatedPost = { ...mockPost, content_text: 'Nội dung cập nhật mới' };
      vi.spyOn(postScheduleService, 'updatePost').mockResolvedValueOnce(updatedPost);

      const res = await request(app)
        .put('/api/v1/posts/post-uuid-test')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content_text: 'Nội dung cập nhật mới',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.post.content_text).toBe('Nội dung cập nhật mới');
    });
  });

  describe('DELETE /api/v1/posts/:postId', () => {
    it('nên hủy bài viết đặt lịch thành công', async () => {
      vi.spyOn(postScheduleService, 'cancelPost').mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/v1/posts/post-uuid-test')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Đã hủy lịch đăng bài');
    });
  });

  describe('POST /api/v1/posts/:postId/retry', () => {
    it('nên đưa bài viết lỗi vào hàng đợi đăng lại thành công', async () => {
      vi.spyOn(postScheduleService, 'retryPost').mockResolvedValueOnce(mockPost);

      const res = await request(app)
        .post('/api/v1/posts/post-uuid-test/retry')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('đăng lại');
    });
  });
});
