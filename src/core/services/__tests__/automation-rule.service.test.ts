/**
 * ShopFlow - Unit Tests: automation-rule.service.ts
 * File: backend/src/core/services/__tests__/automation-rule.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationRuleService } from '../automation-rule.service.js';
import { AutomationRuleRepository, AutomationRule } from '../../../infrastructure/repositories/automation-rule.repository.js';
import { ConnectedPageRepository, ConnectedPage } from '../../../infrastructure/repositories/connected-page.repository.js';
import { AppError } from '../../errors/app-error.js';

describe('AutomationRuleService', () => {
  let service: AutomationRuleService;
  let mockRuleRepo: AutomationRuleRepository;
  let mockPageRepo: ConnectedPageRepository;

  const mockPage: ConnectedPage = {
    id: 'page-internal-uuid',
    user_id: 'user-uuid-1',
    page_id: 'meta-page-123',
    page_name: 'Shop ABC',
    page_access_token: 'iv:tag:enc',
    is_active: true,
    webhook_subscribed: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockRule: AutomationRule = {
    id: 'rule-uuid-1',
    page_id: mockPage.id,
    rule_name: 'Quy tắc 1',
    hide_phone_enabled: true,
    trigger_keywords: ['giá'],
    auto_comment_template: 'Chào {{customer_name}}',
    auto_private_reply_template: 'Báo giá cho bạn',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRuleRepo = {
      findAllByPageId: vi.fn().mockResolvedValue([mockRule]),
      findActiveRulesByPageId: vi.fn().mockResolvedValue([mockRule]),
      findByIdAndPageId: vi.fn().mockResolvedValue(mockRule),
      create: vi.fn().mockResolvedValue(mockRule),
      update: vi.fn().mockResolvedValue({ ...mockRule, rule_name: 'Tên mới' }),
      delete: vi.fn().mockResolvedValue(true),
    } as unknown as AutomationRuleRepository;

    mockPageRepo = {
      findByPageIdAndUserId: vi.fn().mockResolvedValue(mockPage),
    } as unknown as ConnectedPageRepository;

    service = new AutomationRuleService(mockRuleRepo, mockPageRepo);
  });

  describe('getRules()', () => {
    it('nên lấy danh sách rules của fanpage khi user sở hữu', async () => {
      const rules = await service.getRules('meta-page-123', 'user-uuid-1');
      expect(rules).toHaveLength(1);
      expect(mockPageRepo.findByPageIdAndUserId).toHaveBeenCalledWith('meta-page-123', 'user-uuid-1');
      expect(mockRuleRepo.findAllByPageId).toHaveBeenCalledWith(mockPage.id);
    });

    it('nên throw lỗi 404 khi không tìm thấy page hoặc không có quyền', async () => {
      vi.mocked(mockPageRepo.findByPageIdAndUserId).mockResolvedValueOnce(null);
      await expect(service.getRules('other-page', 'user-uuid-1')).rejects.toThrow(AppError);
    });
  });

  describe('createRule()', () => {
    it('nên tạo rule mới thành công', async () => {
      const result = await service.createRule('meta-page-123', 'user-uuid-1', {
        rule_name: 'Quy tắc 1',
        hide_phone_enabled: true,
        trigger_keywords: ['giá'],
        is_active: true,
      });

      expect(result).toEqual(mockRule);
      expect(mockRuleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pageId: mockPage.id,
          ruleName: 'Quy tắc 1',
        })
      );
    });
  });

  describe('updateRule()', () => {
    it('nên cập nhật rule thành công', async () => {
      const updated = await service.updateRule('meta-page-123', 'rule-uuid-1', 'user-uuid-1', {
        rule_name: 'Tên mới',
      });

      expect(updated.rule_name).toBe('Tên mới');
      expect(mockRuleRepo.update).toHaveBeenCalledWith('rule-uuid-1', mockPage.id, expect.any(Object));
    });

    it('nên throw lỗi 404 khi rule không tồn tại trong page', async () => {
      vi.mocked(mockRuleRepo.findByIdAndPageId).mockResolvedValueOnce(null);
      await expect(
        service.updateRule('meta-page-123', 'non-existent', 'user-uuid-1', { rule_name: 'Tên' })
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteRule()', () => {
    it('nên xóa rule thành công', async () => {
      const result = await service.deleteRule('meta-page-123', 'rule-uuid-1', 'user-uuid-1');
      expect(result).toBe(true);
      expect(mockRuleRepo.delete).toHaveBeenCalledWith('rule-uuid-1', mockPage.id);
    });

    it('nên throw lỗi khi không xóa được rule', async () => {
      vi.mocked(mockRuleRepo.delete).mockResolvedValueOnce(false);
      await expect(service.deleteRule('meta-page-123', 'rule-uuid-1', 'user-uuid-1')).rejects.toThrow(AppError);
    });
  });
});
