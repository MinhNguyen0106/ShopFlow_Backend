/**
 * ShopFlow - Unit Tests: automation-rule.controller.ts
 * File: backend/src/api/controllers/__tests__/automation-rule.controller.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AutomationRuleController } from '../automation-rule.controller.js';
import { AutomationRuleService } from '../../../core/services/automation-rule.service.js';

describe('AutomationRuleController Unit Tests', () => {
  let controller: AutomationRuleController;
  let mockService: AutomationRuleService;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockService = {
      getRules: vi.fn(),
      createRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
    } as unknown as AutomationRuleService;

    controller = new AutomationRuleController(mockService);

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('Authentication Branch Coverage', () => {
    it('getRules nên chuyển lỗi 401 sang next() khi req.user không có', async () => {
      mockReq = { params: { pageId: 'page-123' }, user: undefined };

      await controller.getRules(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        })
      );
    });

    it('createRule nên chuyển lỗi 401 sang next() khi req.user không có', async () => {
      mockReq = { params: { pageId: 'page-123' }, user: undefined, body: {} as any };

      await controller.createRule(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        })
      );
    });

    it('updateRule nên chuyển lỗi 401 sang next() khi req.user không có', async () => {
      mockReq = { params: { pageId: 'page-123', ruleId: 'rule-1' }, user: undefined, body: {} as any };

      await controller.updateRule(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        })
      );
    });

    it('deleteRule nên chuyển lỗi 401 sang next() khi req.user không có', async () => {
      mockReq = { params: { pageId: 'page-123', ruleId: 'rule-1' }, user: undefined };

      await controller.deleteRule(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        })
      );
    });

    it('getRules sử dụng user.sub khi user.id không tồn tại', async () => {
      mockReq = { params: { pageId: 'page-123' }, user: { sub: 'user-sub-id' } as any };
      vi.spyOn(mockService, 'getRules').mockResolvedValueOnce([]);

      await controller.getRules(mockReq as any, mockRes as any, mockNext);

      expect(mockService.getRules).toHaveBeenCalledWith('page-123', 'user-sub-id');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
