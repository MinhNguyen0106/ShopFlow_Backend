/**
 * ShopFlow - Automation Rules Controller
 * File: backend/src/api/controllers/automation-rule.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import { automationRuleService, AutomationRuleService } from '../../core/services/automation-rule.service.js';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from '../dtos/automation-rule.dto.js';
import { AppError } from '../../core/errors/app-error.js';

export class AutomationRuleController {
  constructor(
    private readonly service: AutomationRuleService = automationRuleService
  ) {}

  /**
   * GET /api/v1/pages/:pageId/rules
   * Lấy danh sách quy tắc tự động hóa của Fanpage
   */
  getRules = async (
    req: Request<{ pageId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const { pageId } = req.params;
      const rules = await this.service.getRules(pageId, userId);

      res.status(200).json({
        success: true,
        data: { rules },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/pages/:pageId/rules
   * Tạo mới kịch bản tự động hóa
   */
  createRule = async (
    req: Request<{ pageId: string }, unknown, CreateAutomationRuleDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const { pageId } = req.params;
      const rule = await this.service.createRule(pageId, userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Tạo quy tắc tự động hóa thành công',
        data: { rule },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/pages/:pageId/rules/:ruleId
   * Cập nhật quy tắc tự động hóa
   */
  updateRule = async (
    req: Request<{ pageId: string; ruleId: string }, unknown, UpdateAutomationRuleDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const { pageId, ruleId } = req.params;
      const updated = await this.service.updateRule(pageId, ruleId, userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Cập nhật quy tắc tự động hóa thành công',
        data: { rule: updated },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/pages/:pageId/rules/:ruleId
   * Xóa quy tắc tự động hóa
   */
  deleteRule = async (
    req: Request<{ pageId: string; ruleId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const { pageId, ruleId } = req.params;
      await this.service.deleteRule(pageId, ruleId, userId);

      res.status(200).json({
        success: true,
        message: 'Đã xóa quy tắc tự động hóa thành công',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const automationRuleController = new AutomationRuleController();
