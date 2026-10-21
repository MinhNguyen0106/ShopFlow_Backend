/**
 * ShopFlow - Integration Tests: Automation Rule Routes
 * File: backend/src/api/routes/__tests__/automation-rule.routes.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { automationRuleService } from '../../../core/services/automation-rule.service.js';
import { generateTokens } from '../../../utils/auth.helper.js';
import { User } from '../../../core/entities/user.entity.js';
import { AutomationRule } from '../../../infrastructure/repositories/automation-rule.repository.js';

describe('Automation Rule Routes Integration (/api/v1/pages/:pageId/rules)', () => {
  const app = createApp();

  const testUser: User = {
    id: 'user-owner-123',
    email: 'shopowner@shopflow.vn',
    password_hash: 'hashed',
    full_name: 'Shop Owner',
    role: 'owner',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const { accessToken } = generateTokens(testUser);

  const mockRule: AutomationRule = {
    id: 'rule-uuid-1',
    page_id: 'page-uuid-123',
    rule_name: 'Tự động báo giá son',
    hide_phone_enabled: true,
    trigger_keywords: ['giá bao nhiêu', 'bao nhieu'],
    auto_comment_template: 'Dạ chào bạn, giá là 250k ạ!',
    auto_private_reply_template: 'Chào {{customer_name}}, cảm ơn bạn đã quan tâm sản phẩm.',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/pages/:pageId/rules', () => {
    it('nên trả về 401 khi không có token', async () => {
      const res = await request(app).get('/api/v1/pages/meta-12345/rules');
      expect(res.status).toBe(401);
    });

    it('nên trả về danh sách automation rules của page', async () => {
      vi.spyOn(automationRuleService, 'getRules').mockResolvedValueOnce([mockRule]);

      const res = await request(app)
        .get('/api/v1/pages/meta-12345/rules')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rules).toHaveLength(1);
      expect(res.body.data.rules[0].rule_name).toBe('Tự động báo giá son');
    });
  });

  describe('POST /api/v1/pages/:pageId/rules', () => {
    it('nên trả về 400 VALIDATION_ERROR khi body không hợp lệ', async () => {
      const res = await request(app)
        .post('/api/v1/pages/meta-12345/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          rule_name: '', // Empty name triggers validation error
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('nên tạo rule mới thành công khi dữ liệu hợp lệ', async () => {
      vi.spyOn(automationRuleService, 'createRule').mockResolvedValueOnce(mockRule);

      const res = await request(app)
        .post('/api/v1/pages/meta-12345/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          rule_name: 'Tự động báo giá son',
          hide_phone_enabled: true,
          trigger_keywords: ['giá bao nhiêu', 'bao nhieu'],
          auto_comment_template: 'Dạ chào bạn, giá là 250k ạ!',
          auto_private_reply_template: 'Chào {{customer_name}}, cảm ơn bạn đã quan tâm sản phẩm.',
          is_active: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rule.id).toBe('rule-uuid-1');
      expect(res.body.data.rule.rule_name).toBe('Tự động báo giá son');
    });
  });

  describe('PUT /api/v1/pages/:pageId/rules/:ruleId', () => {
    it('nên trả về 400 VALIDATION_ERROR khi dữ liệu cập nhật không đúng', async () => {
      const res = await request(app)
        .put('/api/v1/pages/meta-12345/rules/rule-uuid-1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          trigger_keywords: 'invalid_keywords_must_be_array',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('nên cập nhật rule thành công', async () => {
      const updatedRule = { ...mockRule, rule_name: 'Tự động báo giá son V2', is_active: false };
      vi.spyOn(automationRuleService, 'updateRule').mockResolvedValueOnce(updatedRule);

      const res = await request(app)
        .put('/api/v1/pages/meta-12345/rules/rule-uuid-1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          rule_name: 'Tự động báo giá son V2',
          is_active: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rule.rule_name).toBe('Tự động báo giá son V2');
      expect(res.body.data.rule.is_active).toBe(false);
    });
  });

  describe('DELETE /api/v1/pages/:pageId/rules/:ruleId', () => {
    it('nên xóa rule thành công', async () => {
      vi.spyOn(automationRuleService, 'deleteRule').mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/v1/pages/meta-12345/rules/rule-uuid-1')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Đã xóa quy tắc tự động hóa thành công');
    });
  });
});
