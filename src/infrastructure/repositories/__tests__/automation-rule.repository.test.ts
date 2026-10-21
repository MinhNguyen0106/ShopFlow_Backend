/**
 * ShopFlow - Unit Tests: automation-rule.repository.ts
 * File: backend/src/infrastructure/repositories/__tests__/automation-rule.repository.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationRuleRepository, AutomationRule } from '../automation-rule.repository.js';
import * as dbClient from '../../database/db.client.js';

vi.mock('../../database/db.client.js', () => ({
  query: vi.fn(),
}));

describe('AutomationRuleRepository', () => {
  let repo: AutomationRuleRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new AutomationRuleRepository();
  });

  const mockRule: AutomationRule = {
    id: 'rule-uuid-1',
    page_id: 'page-uuid-1',
    rule_name: 'Báo giá tự động',
    hide_phone_enabled: true,
    trigger_keywords: ['giá', 'bao nhiêu'],
    auto_comment_template: 'Chào bạn, shop đã inbox nhé!',
    auto_private_reply_template: 'Chào bạn, giá sản phẩm là 299k ạ.',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  it('create() nên tạo mới một quy tắc và trả về kết quả', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockRule],
      rowCount: 1,
      command: 'INSERT',
    });

    const result = await repo.create({
      pageId: 'page-uuid-1',
      ruleName: 'Báo giá tự động',
      hidePhoneEnabled: true,
      triggerKeywords: ['giá', 'bao nhiêu'],
      autoCommentTemplate: 'Chào bạn, shop đã inbox nhé!',
      autoPrivateReplyTemplate: 'Chào bạn, giá sản phẩm là 299k ạ.',
      isActive: true,
    });

    expect(result).toEqual(mockRule);
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO automation_rules'),
      expect.any(Array)
    );
  });

  it('findAllByPageId() nên lấy tất cả quy tắc của Fanpage', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockRule],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.findAllByPageId('page-uuid-1');
    expect(result).toEqual([mockRule]);
  });

  it('findActiveRulesByPageId() nên chỉ lấy các quy tắc có is_active = TRUE', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockRule],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.findActiveRulesByPageId('page-uuid-1');
    expect(result).toEqual([mockRule]);
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining('is_active = TRUE'),
      ['page-uuid-1']
    );
  });

  it('findByIdAndPageId() nên tìm thấy quy tắc theo ID và Page ID', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockRule],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.findByIdAndPageId('rule-uuid-1', 'page-uuid-1');
    expect(result).toEqual(mockRule);
  });

  it('update() nên cập nhật các trường được chỉ định', async () => {
    const updatedRule = { ...mockRule, rule_name: 'Tên mới' };
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [updatedRule],
      rowCount: 1,
      command: 'UPDATE',
    });

    const result = await repo.update('rule-uuid-1', 'page-uuid-1', {
      ruleName: 'Tên mới',
    });

    expect(result?.rule_name).toBe('Tên mới');
  });

  it('update() khi không có trường nào thay đổi nên trả về bản ghi hiện tại', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockRule],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.update('rule-uuid-1', 'page-uuid-1', {});
    expect(result).toEqual(mockRule);
  });

  it('delete() nên xóa quy tắc thành công', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
      command: 'DELETE',
    });

    const result = await repo.delete('rule-uuid-1', 'page-uuid-1');
    expect(result).toBe(true);
  });
});
