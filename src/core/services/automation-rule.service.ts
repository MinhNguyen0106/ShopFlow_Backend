/**
 * ShopFlow - Automation Rules Service
 * File: backend/src/core/services/automation-rule.service.ts
 *
 * Xử lý nghiệp vụ quản lý quy tắc kịch bản tự động hóa bình luận và tin nhắn Fanpage.
 */

import {
  automationRuleRepository,
  AutomationRuleRepository,
  AutomationRule,
} from '../../infrastructure/repositories/automation-rule.repository.js';
import {
  connectedPageRepository,
  ConnectedPageRepository,
} from '../../infrastructure/repositories/connected-page.repository.js';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from '../../api/dtos/automation-rule.dto.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../../utils/logger.js';

export class AutomationRuleService {
  constructor(
    private readonly ruleRepo: AutomationRuleRepository = automationRuleRepository,
    private readonly pageRepo: ConnectedPageRepository = connectedPageRepository
  ) {}

  /**
   * Xác thực quyền sở hữu Fanpage của người dùng và trả về UUID nội bộ.
   */
  private async verifyPageOwnership(pageIdOrDbId: string, userId: string): Promise<string> {
    const page = await this.pageRepo.findByPageIdAndUserId(pageIdOrDbId, userId);
    if (!page) {
      throw new AppError('Không tìm thấy Fanpage hoặc bạn không có quyền truy cập', 404, 'NOT_FOUND');
    }
    return page.id;
  }

  /**
   * Lấy danh sách quy tắc tự động hóa của Fanpage.
   */
  async getRules(pageIdOrDbId: string, userId: string): Promise<AutomationRule[]> {
    const pageDbId = await this.verifyPageOwnership(pageIdOrDbId, userId);
    return this.ruleRepo.findAllByPageId(pageDbId);
  }

  /**
   * Tạo mới kịch bản tự động hóa cho Fanpage.
   */
  async createRule(
    pageIdOrDbId: string,
    userId: string,
    dto: CreateAutomationRuleDto
  ): Promise<AutomationRule> {
    const pageDbId = await this.verifyPageOwnership(pageIdOrDbId, userId);

    const rule = await this.ruleRepo.create({
      pageId: pageDbId,
      ruleName: dto.rule_name,
      hidePhoneEnabled: dto.hide_phone_enabled,
      triggerKeywords: dto.trigger_keywords,
      autoCommentTemplate: dto.auto_comment_template ?? null,
      autoPrivateReplyTemplate: dto.auto_private_reply_template ?? null,
      isActive: dto.is_active,
    });

    logger.info(
      { ruleId: rule.id, pageDbId, ruleName: rule.rule_name },
      '[AutomationRuleService] ✔ Tạo quy tắc tự động hóa thành công'
    );

    return rule;
  }

  /**
   * Cập nhật quy tắc tự động hóa.
   */
  async updateRule(
    pageIdOrDbId: string,
    ruleId: string,
    userId: string,
    dto: UpdateAutomationRuleDto
  ): Promise<AutomationRule> {
    const pageDbId = await this.verifyPageOwnership(pageIdOrDbId, userId);

    const existingRule = await this.ruleRepo.findByIdAndPageId(ruleId, pageDbId);
    if (!existingRule) {
      throw new AppError('Không tìm thấy quy tắc tự động hóa để cập nhật', 404, 'NOT_FOUND');
    }

    const updated = await this.ruleRepo.update(ruleId, pageDbId, {
      ruleName: dto.rule_name,
      hidePhoneEnabled: dto.hide_phone_enabled,
      triggerKeywords: dto.trigger_keywords,
      autoCommentTemplate: dto.auto_comment_template,
      autoPrivateReplyTemplate: dto.auto_private_reply_template,
      isActive: dto.is_active,
    });

    if (!updated) {
      throw new AppError('Cập nhật quy tắc tự động hóa thất bại', 500, 'INTERNAL_SERVER_ERROR');
    }

    logger.info(
      { ruleId, pageDbId },
      '[AutomationRuleService] ✔ Cập nhật quy tắc tự động hóa thành công'
    );

    return updated;
  }

  /**
   * Xóa một quy tắc tự động hóa.
   */
  async deleteRule(pageIdOrDbId: string, ruleId: string, userId: string): Promise<boolean> {
    const pageDbId = await this.verifyPageOwnership(pageIdOrDbId, userId);

    const deleted = await this.ruleRepo.delete(ruleId, pageDbId);
    if (!deleted) {
      throw new AppError('Không tìm thấy quy tắc tự động hóa để xóa', 404, 'NOT_FOUND');
    }

    logger.info(
      { ruleId, pageDbId },
      '[AutomationRuleService] ✔ Xóa quy tắc tự động hóa thành công'
    );

    return true;
  }
}

export const automationRuleService = new AutomationRuleService();
