/**
 * ShopFlow - Integration Tests: Facebook OAuth Endpoints
 * File: backend/src/api/routes/__tests__/fb-oauth.routes.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { facebookOAuthService } from '../../../core/services/facebook-oauth.service.js';
import { generateTokens } from '../../../utils/auth.helper.js';
import { User } from '../../../core/entities/user.entity.js';

describe('Facebook OAuth Routes Integration (/api/v1/fb-oauth)', () => {
  const app = createApp();

  const testUser: User = {
    id: 'user-uuid-123',
    email: 'test@shopflow.vn',
    password_hash: 'hashed',
    full_name: 'Test Owner',
    role: 'owner',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const { accessToken } = generateTokens(testUser);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/fb-oauth/connect-url', () => {
    it('nên trả về 401 khi không có token xác thực', async () => {
      const res = await request(app).get('/api/v1/fb-oauth/connect-url');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('nên trả về 200 OK với authUrl khi có Bearer token', async () => {
      vi.spyOn(facebookOAuthService, 'generateConnectUrl').mockReturnValueOnce({
        authUrl: 'https://www.facebook.com/v19.0/dialog/oauth?test=1',
        state: 'signed-state-token',
      });

      const res = await request(app)
        .get('/api/v1/fb-oauth/connect-url')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authUrl).toContain('facebook.com');
    });
  });

  describe('GET /api/v1/fb-oauth/callback', () => {
    it('nên chuyển hướng về Frontend với lỗi khi thiếu tham số code hoặc state', async () => {
      const res = await request(app).get('/api/v1/fb-oauth/callback');
      expect(res.status).toBe(302);
      expect(res.header.location).toContain('oauth_status=error');
    });

    it('nên xử lý thành công và chuyển hướng về frontend', async () => {
      vi.spyOn(facebookOAuthService, 'handleCallback').mockResolvedValueOnce({
        success: true,
        fbUserId: 'fb-user-999',
        fbName: 'Nguyen Van A',
      });

      const res = await request(app)
        .get('/api/v1/fb-oauth/callback?code=mock_code&state=mock_state');

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('oauth_status=success');
      expect(res.header.location).toContain('fb_user_id=fb-user-999');
    });

    it('nên trả về JSON khi truyền format=json', async () => {
      vi.spyOn(facebookOAuthService, 'handleCallback').mockResolvedValueOnce({
        success: true,
        fbUserId: 'fb-user-999',
        fbName: 'Nguyen Van A',
      });

      const res = await request(app)
        .get('/api/v1/fb-oauth/callback?code=mock_code&state=mock_state&format=json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fbUserId).toBe('fb-user-999');
    });
  });

  describe('GET /api/v1/fb-oauth/accounts', () => {
    it('nên trả về 200 OK với danh sách Fanpage quản lý', async () => {
      vi.spyOn(facebookOAuthService, 'getManageablePages').mockResolvedValueOnce([
        {
          page_id: 'page-101',
          page_name: 'Shop Áo Quần',
          avatar_url: 'https://fb.com/pic.jpg',
          is_connected: true,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/fb-oauth/accounts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pages).toHaveLength(1);
    });
  });

  describe('POST /api/v1/fb-oauth/connect-pages', () => {
    it('nên trả về 400 VALIDATION_ERROR khi body không có page_ids', async () => {
      const res = await request(app)
        .post('/api/v1/fb-oauth/connect-pages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('nên trả về 200 OK và kết nối các page thành công', async () => {
      vi.spyOn(facebookOAuthService, 'connectPages').mockResolvedValueOnce({
        connectedCount: 1,
        pages: [
          {
            id: 'page-db-id',
            user_id: testUser.id,
            page_id: '1029384756',
            page_name: 'Shop Áo Quần',
            page_access_token: 'should_be_masked',
            is_active: true,
            webhook_subscribed: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const res = await request(app)
        .post('/api/v1/fb-oauth/connect-pages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ page_ids: ['1029384756'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.connectedCount).toBe(1);
      // Kiểm tra access token đã được che giấu
      expect(res.body.data.pages[0].page_access_token).toBeUndefined();
    });
  });
});
