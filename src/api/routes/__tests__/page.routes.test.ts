/**
 * ShopFlow - Integration Tests: Connected Pages Endpoints
 * File: backend/src/api/routes/__tests__/page.routes.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { pageService } from '../../../core/services/page.service.js';
import { generateTokens } from '../../../utils/auth.helper.js';
import { User } from '../../../core/entities/user.entity.js';

describe('Connected Pages Routes Integration (/api/v1/pages)', () => {
  const app = createApp();

  const testUser: User = {
    id: 'user-uuid-456',
    email: 'pageowner@shopflow.vn',
    password_hash: 'hashed',
    full_name: 'Page Owner',
    role: 'owner',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const { accessToken } = generateTokens(testUser);

  const mockSafePage = {
    id: 'page-db-uuid',
    user_id: testUser.id,
    page_id: 'meta-12345',
    page_name: 'Shop Mỹ Phẩm Chính Hãng',
    avatar_url: 'https://fb.com/avatar.jpg',
    is_active: true,
    webhook_subscribed: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/pages', () => {
    it('nên trả về 401 khi không có token', async () => {
      const res = await request(app).get('/api/v1/pages');
      expect(res.status).toBe(401);
    });

    it('nên trả về 200 OK với danh sách Fanpage đã kết nối', async () => {
      vi.spyOn(pageService, 'getUserPages').mockResolvedValueOnce([mockSafePage]);

      const res = await request(app)
        .get('/api/v1/pages')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pages).toHaveLength(1);
      expect(res.body.data.pages[0].page_name).toBe('Shop Mỹ Phẩm Chính Hãng');
    });
  });

  describe('GET /api/v1/pages/:pageId', () => {
    it('nên trả về 200 OK với chi tiết page và thống kê', async () => {
      vi.spyOn(pageService, 'getPageDetail').mockResolvedValueOnce({
        page: mockSafePage,
        stats: { totalPosts: 10, totalConversations: 50 },
      });

      const res = await request(app)
        .get('/api/v1/pages/meta-12345')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.page.page_id).toBe('meta-12345');
      expect(res.body.data.stats.totalPosts).toBe(10);
    });
  });

  describe('PATCH /api/v1/pages/:pageId/status', () => {
    it('nên trả về 400 VALIDATION_ERROR khi thiếu is_active', async () => {
      const res = await request(app)
        .patch('/api/v1/pages/meta-12345/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('nên cập nhật trạng thái hoạt động thành công', async () => {
      vi.spyOn(pageService, 'updatePageStatus').mockResolvedValueOnce({
        ...mockSafePage,
        is_active: false,
      });

      const res = await request(app)
        .patch('/api/v1/pages/meta-12345/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.page.is_active).toBe(false);
    });
  });

  describe('POST /api/v1/pages/:pageId/subscribe-webhook', () => {
    it('nên đăng ký lại webhook thành công', async () => {
      vi.spyOn(pageService, 'subscribeWebhook').mockResolvedValueOnce({
        webhook_subscribed: true,
      });

      const res = await request(app)
        .post('/api/v1/pages/meta-12345/subscribe-webhook')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.webhook_subscribed).toBe(true);
    });
  });

  describe('DELETE /api/v1/pages/:pageId', () => {
    it('nên hủy kết nối Fanpage thành công', async () => {
      vi.spyOn(pageService, 'disconnectPage').mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/v1/pages/meta-12345')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Đã hủy kết nối Fanpage');
    });
  });
});
