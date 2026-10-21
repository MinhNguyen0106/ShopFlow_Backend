/**
 * ShopFlow - Automation Rules Repository
 * File: backend/src/infrastructure/repositories/automation-rule.repository.ts
 *
 * Tương tác với bảng `automation_rules` trong PostgreSQL để quản lý các quy tắc tự động hóa Fanpage.
 */

import { query } from '../database/db.client.js';

export interface AutomationRule {
  id: string;
  page_id: string;
  rule_name: string;
  hide_phone_enabled: boolean;
  trigger_keywords: string[];
  auto_comment_template: string | null;
  auto_private_reply_template: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRuleData {
  pageId: string;
  ruleName?: string;
  hidePhoneEnabled?: boolean;
  triggerKeywords?: string[];
  autoCommentTemplate?: string | null;
  autoPrivateReplyTemplate?: string | null;
  isActive?: boolean;
}

export interface UpdateRuleData {
  ruleName?: string;
  hidePhoneEnabled?: boolean;
  triggerKeywords?: string[];
  autoCommentTemplate?: string | null;
  autoPrivateReplyTemplate?: string | null;
  isActive?: boolean;
}

export class AutomationRuleRepository {
  /**
   * Tạo mới một quy tắc tự động hóa.
   */
  async create(data: CreateRuleData): Promise<AutomationRule> {
    const sql = `
      INSERT INTO automation_rules (
        page_id, rule_name, hide_phone_enabled, trigger_keywords,
        auto_comment_template, auto_private_reply_template, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, page_id, rule_name, hide_phone_enabled, trigger_keywords,
                auto_comment_template, auto_private_reply_template, is_active, created_at, updated_at
    `;
    const result = await query<AutomationRule>(sql, [
      data.pageId,
      data.ruleName ?? 'Mặc định',
      data.hidePhoneEnabled ?? true,
      JSON.stringify(data.triggerKeywords ?? ['giá', 'tư vấn', 'pm', 'inbox', 'bao nhiêu']),
      data.autoCommentTemplate ?? null,
      data.autoPrivateReplyTemplate ?? null,
      data.isActive ?? true,
    ]);

    const row = result.rows[0];
    if (!row) {
      throw new Error('Không thể tạo quy tắc tự động hóa');
    }
    return row;
  }

  /**
   * Lấy toàn bộ danh sách quy tắc của một Fanpage.
   */
  async findAllByPageId(pageId: string): Promise<AutomationRule[]> {
    const sql = `
      SELECT id, page_id, rule_name, hide_phone_enabled, trigger_keywords,
             auto_comment_template, auto_private_reply_template, is_active, created_at, updated_at
      FROM automation_rules
      WHERE page_id = $1
      ORDER BY created_at ASC
    `;
    const result = await query<AutomationRule>(sql, [pageId]);
    return result.rows;
  }

  /**
   * Lấy các quy tắc đang hoạt động (is_active = TRUE) của Fanpage để phục vụ worker xử lý.
   */
  async findActiveRulesByPageId(pageId: string): Promise<AutomationRule[]> {
    const sql = `
      SELECT id, page_id, rule_name, hide_phone_enabled, trigger_keywords,
             auto_comment_template, auto_private_reply_template, is_active, created_at, updated_at
      FROM automation_rules
      WHERE page_id = $1 AND is_active = TRUE
      ORDER BY created_at ASC
    `;
    const result = await query<AutomationRule>(sql, [pageId]);
    return result.rows;
  }

  /**
   * Tìm quy tắc theo ID và Page ID.
   */
  async findByIdAndPageId(ruleId: string, pageId: string): Promise<AutomationRule | null> {
    const sql = `
      SELECT id, page_id, rule_name, hide_phone_enabled, trigger_keywords,
             auto_comment_template, auto_private_reply_template, is_active, created_at, updated_at
      FROM automation_rules
      WHERE id = $1 AND page_id = $2
      LIMIT 1
    `;
    const result = await query<AutomationRule>(sql, [ruleId, pageId]);
    return result.rows[0] ?? null;
  }

  /**
   * Cập nhật cấu hình quy tắc tự động.
   */
  async update(ruleId: string, pageId: string, data: UpdateRuleData): Promise<AutomationRule | null> {
    const fields: string[] = [];
    const values: unknown[] = [ruleId, pageId];
    let idx = 3;

    if (data.ruleName !== undefined) {
      fields.push(`rule_name = $${idx++}`);
      values.push(data.ruleName);
    }
    if (data.hidePhoneEnabled !== undefined) {
      fields.push(`hide_phone_enabled = $${idx++}`);
      values.push(data.hidePhoneEnabled);
    }
    if (data.triggerKeywords !== undefined) {
      fields.push(`trigger_keywords = $${idx++}`);
      values.push(JSON.stringify(data.triggerKeywords));
    }
    if (data.autoCommentTemplate !== undefined) {
      fields.push(`auto_comment_template = $${idx++}`);
      values.push(data.autoCommentTemplate);
    }
    if (data.autoPrivateReplyTemplate !== undefined) {
      fields.push(`auto_private_reply_template = $${idx++}`);
      values.push(data.autoPrivateReplyTemplate);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.isActive);
    }

    if (fields.length === 0) {
      return this.findByIdAndPageId(ruleId, pageId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE automation_rules
      SET ${fields.join(', ')}
      WHERE id = $1 AND page_id = $2
      RETURNING id, page_id, rule_name, hide_phone_enabled, trigger_keywords,
                auto_comment_template, auto_private_reply_template, is_active, created_at, updated_at
    `;
    const result = await query<AutomationRule>(sql, values);
    return result.rows[0] ?? null;
  }

  /**
   * Xóa một quy tắc tự động hóa.
   */
  async delete(ruleId: string, pageId: string): Promise<boolean> {
    const sql = `DELETE FROM automation_rules WHERE id = $1 AND page_id = $2`;
    const result = await query(sql, [ruleId, pageId]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const automationRuleRepository = new AutomationRuleRepository();
