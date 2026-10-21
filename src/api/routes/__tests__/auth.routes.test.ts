/**
 * ShopFlow - Integration Tests: Authentication Endpoints
 * File: backend/src/api/routes/__tests__/auth.routes.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { userRepository } from '../../../infrastructure/repositories/user.repository.js';
import { hashPassword, generateTokens } from '../../../utils/auth.helper.js';
import { User } from '../../../core/entities/user.entity.js';

describe('Auth Endpoints Integration (/api/v1/auth)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('nên trả về 400 VALIDATION_ERROR khi mật khẩu quá yếu (không có số)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email:     'test@shopflow.vn',
          password:  'weakpassword',
          full_name: 'Nguyễn Văn A',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ])
      );
    });

    it('nên đăng ký thành công và trả về HTTP 201 Created với user và tokens', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(null);

      const mockCreatedUser: User = {
        id:            'new-user-uuid',
        email:         'newowner@shopflow.vn',
        password_hash: 'hash',
        full_name:     'Chủ Cửa Hàng',
        role:          'owner',
        status:        'active',
        created_at:    new Date(),
        updated_at:    new Date(),
      };
      vi.spyOn(userRepository, 'create').mockResolvedValueOnce(mockCreatedUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email:     'newowner@shopflow.vn',
          password:  'StrongPass123!',
          full_name: 'Chủ Cửa Hàng',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newowner@shopflow.vn');
      expect(res.body.data.user).not.toHaveProperty('password_hash');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('nên trả về HTTP 409 CONFLICT khi email đã tồn tại', async () => {
      const existingUser: User = {
        id:            'existing-id',
        email:         'existing@shopflow.vn',
        password_hash: 'hash',
        full_name:     'Existing User',
        role:          'owner',
        status:        'active',
        created_at:    new Date(),
        updated_at:    new Date(),
      };
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(existingUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email:     'existing@shopflow.vn',
          password:  'StrongPass123!',
          full_name: 'Trùng Email',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('nên trả về HTTP 400 khi thiếu trường email hoặc password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'onlyemail@shopflow.vn' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('nên trả về HTTP 401 khi thông tin đăng nhập không đúng', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email:    'wrong@shopflow.vn',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('nên đăng nhập thành công và trả về HTTP 200 OK với tokens', async () => {
      const rawPassword = 'ValidPass123!';
      const hash = await hashPassword(rawPassword);

      const user: User = {
        id:            'valid-user-id',
        email:         'user@shopflow.vn',
        password_hash: hash,
        full_name:     'Người Dùng Hợp Lệ',
        role:          'owner',
        status:        'active',
        created_at:    new Date(),
        updated_at:    new Date(),
      };
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(user);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email:    'user@shopflow.vn',
          password: rawPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('nên trả về HTTP 200 và cấp token mới khi refresh token hợp lệ', async () => {
      const user: User = {
        id:            'refresh-uuid',
        email:         'refresh@shopflow.vn',
        password_hash: 'hash',
        full_name:     'Refresh User',
        role:          'owner',
        status:        'active',
        created_at:    new Date(),
        updated_at:    new Date(),
      };
      const initialTokens = generateTokens(user);

      vi.spyOn(userRepository, 'findById').mockResolvedValueOnce(user);

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: initialTokens.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('nên trả về HTTP 401 khi không gửi kèm token xác thực', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('nên trả về thông tin user khi gửi Bearer Access Token hợp lệ', async () => {
      const user = {
        id:    'me-user-id',
        email: 'me@shopflow.vn',
        role:  'owner' as const,
      };
      const { accessToken } = generateTokens(user);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('me@shopflow.vn');
      expect(res.body.data.user.sub).toBe('me-user-id');
    });
  });
});
