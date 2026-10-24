/**
 * ShopFlow - Integration Tests: Page Members & RBAC Routes
 * File: backend/src/api/routes/__tests__/page-member.routes.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { pageMemberService } from '../../../core/services/page-member.service.js';
import { pageMemberRepository } from '../../../infrastructure/repositories/page-member.repository.js';
import { generateTokens } from '../../../utils/auth.helper.js';
import { User } from '../../../core/entities/user.entity.js';

describe('Page Members Routes Integration (/api/v1/pages/:pageId/members)', () => {
  const app = createApp();

  const ownerUser: User = {
    id: 'user-owner-1',
    email: 'owner@shopflow.vn',
    password_hash: 'hashed',
    full_name: 'Shop Owner',
    role: 'owner',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const staffUser: User = {
    id: 'user-staff-2',
    email: 'staff@shopflow.vn',
    password_hash: 'hashed',
    full_name: 'Shop Staff',
    role: 'staff',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const { accessToken: ownerToken } = generateTokens(ownerUser);
  const { accessToken: staffToken } = generateTokens(staffUser);

  const mockMember = {
    id: 'pm-uuid-1',
    page_id: 'page-123',
    user_id: ownerUser.id,
    role: 'owner' as const,
    invited_by: null,
    status: 'active' as const,
    email: ownerUser.email,
    full_name: ownerUser.full_name,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/pages/:pageId/members', () => {
    it('trả về 401 khi không có token', async () => {
      const res = await request(app).get('/api/v1/pages/page-123/members');
      expect(res.status).toBe(401);
    });

    it('trả về 200 OK với danh sách thành viên khi người gọi là owner', async () => {
      vi.spyOn(pageMemberRepository, 'findByPageAndUser').mockResolvedValueOnce({
        id: 'pm-1',
        page_id: 'page-123',
        user_id: ownerUser.id,
        role: 'owner',
        invited_by: null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.spyOn(pageMemberService, 'listMembers').mockResolvedValueOnce([mockMember]);

      const res = await request(app)
        .get('/api/v1/pages/page-123/members')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.members).toHaveLength(1);
      expect(res.body.data.members[0]?.email).toBe('owner@shopflow.vn');
    });
  });

  describe('POST /api/v1/pages/:pageId/members/invite', () => {
    it('trả về 403 Forbidden nếu người gọi là staff', async () => {
      vi.spyOn(pageMemberRepository, 'findByPageAndUser').mockResolvedValueOnce({
        id: 'pm-2',
        page_id: 'page-123',
        user_id: staffUser.id,
        role: 'staff',
        invited_by: null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/pages/page-123/members/invite')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          email: 'newuser@shopflow.vn',
          role: 'staff',
        });

      expect(res.status).toBe(403);
    });

    it('trả về 400 Bad Request nếu email không đúng định dạng', async () => {
      vi.spyOn(pageMemberRepository, 'findByPageAndUser').mockResolvedValueOnce({
        id: 'pm-1',
        page_id: 'page-123',
        user_id: ownerUser.id,
        role: 'owner',
        invited_by: null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/pages/page-123/members/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'invalid-email',
          role: 'staff',
        });

      expect(res.status).toBe(400);
    });

    it('trả về 201 Created khi owner mời thành viên thành công', async () => {
      vi.spyOn(pageMemberRepository, 'findByPageAndUser').mockResolvedValueOnce({
        id: 'pm-1',
        page_id: 'page-123',
        user_id: ownerUser.id,
        role: 'owner',
        invited_by: null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.spyOn(pageMemberService, 'inviteMember').mockResolvedValueOnce({
        ...mockMember,
        id: 'pm-new',
        role: 'staff',
        user_id: 'user-new',
      });

      const res = await request(app)
        .post('/api/v1/pages/page-123/members/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'newbie@shopflow.vn',
          role: 'staff',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.member.role).toBe('staff');
    });
  });

  describe('PATCH /api/v1/pages/:pageId/members/:memberId/role', () => {
    it('trả về 200 OK khi owner cập nhật vai trò thành công', async () => {
      vi.spyOn(pageMemberRepository, 'findByPageAndUser').mockResolvedValueOnce({
        id: 'pm-1',
        page_id: 'page-123',
        user_id: ownerUser.id,
        role: 'owner',
        invited_by: null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.spyOn(pageMemberService, 'updateMemberRole').mockResolvedValueOnce({
        ...mockMember,
        role: 'manager',
      });

      const res = await request(app)
        .patch('/api/v1/pages/page-123/members/pm-uuid-1/role')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'manager' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.member.role).toBe('manager');
    });
  });

  describe('DELETE /api/v1/pages/:pageId/members/:memberId', () => {
    it('trả về 200 OK khi xóa thành viên thành công', async () => {
      vi.spyOn(pageMemberRepository, 'findByPageAndUser').mockResolvedValueOnce({
        id: 'pm-1',
        page_id: 'page-123',
        user_id: ownerUser.id,
        role: 'owner',
        invited_by: null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.spyOn(pageMemberService, 'removeMember').mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/v1/pages/page-123/members/pm-uuid-2')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
