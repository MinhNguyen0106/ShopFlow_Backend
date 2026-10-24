/**
 * ShopFlow - Connected Pages Routes
 * File: backend/src/api/routes/page.routes.ts
 */

import { Router } from 'express';
import { pageController } from '../controllers/page.controller.js';
import { pageMemberController } from '../controllers/page-member.controller.js';
import { automationRuleController } from '../controllers/automation-rule.controller.js';
import { authenticateToken, requirePageRole } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { UpdatePageStatusDtoSchema } from '../dtos/page.dto.js';
import {
  inviteMemberSchema,
  updateMemberRoleSchema,
} from '../dtos/page-member.dto.js';
import {
  CreateAutomationRuleDtoSchema,
  UpdateAutomationRuleDtoSchema,
} from '../dtos/automation-rule.dto.js';

export const pageRouter = Router();

// Tất cả các routes quản lý Fanpage đều yêu cầu xác thực JWT
pageRouter.use(authenticateToken);

/**
 * @route   GET /api/v1/pages
 * @desc    Lấy danh sách tất cả các Fanpage đã kết nối của user
 * @access  Private
 */
pageRouter.get('/', pageController.getPages);

/**
 * @route   GET /api/v1/pages/:pageId
 * @desc    Lấy chi tiết Fanpage và số liệu thống kê
 * @access  Private
 */
pageRouter.get('/:pageId', pageController.getPageDetail);

/**
 * @route   PATCH /api/v1/pages/:pageId/status
 * @desc    Bật/Tắt trạng thái hoạt động (is_active) của Fanpage
 * @access  Private (Owner, Manager)
 */
pageRouter.patch(
  '/:pageId/status',
  requirePageRole('owner', 'manager'),
  validateRequest({ body: UpdatePageStatusDtoSchema }),
  pageController.updateStatus
);

/**
 * @route   POST /api/v1/pages/:pageId/subscribe-webhook
 * @desc    Đồng bộ và đăng ký lại Webhook với Meta
 * @access  Private (Owner, Manager)
 */
pageRouter.post(
  '/:pageId/subscribe-webhook',
  requirePageRole('owner', 'manager'),
  pageController.subscribeWebhook
);

/**
 * @route   DELETE /api/v1/pages/:pageId
 * @desc    Hủy kết nối Fanpage an toàn
 * @access  Private (Owner only)
 */
pageRouter.delete(
  '/:pageId',
  requirePageRole('owner'),
  pageController.disconnectPage
);

/* =============================================================================
   PAGE MEMBERS ROUTES (/api/v1/pages/:pageId/members)
============================================================================= */

/**
 * @route   GET /api/v1/pages/:pageId/members
 * @desc    Lấy danh sách thành viên của Fanpage
 * @access  Private (Owner, Manager, Staff)
 */
pageRouter.get(
  '/:pageId/members',
  requirePageRole('owner', 'manager', 'staff'),
  pageMemberController.getMembers
);

/**
 * @route   POST /api/v1/pages/:pageId/members/invite
 * @desc    Mời thành viên mới vào Fanpage qua email
 * @access  Private (Owner, Manager)
 */
pageRouter.post(
  '/:pageId/members/invite',
  requirePageRole('owner', 'manager'),
  validateRequest({ body: inviteMemberSchema }),
  pageMemberController.inviteMember
);

/**
 * @route   PATCH /api/v1/pages/:pageId/members/:memberId/role
 * @desc    Cập nhật vai trò của thành viên
 * @access  Private (Owner only)
 */
pageRouter.patch(
  '/:pageId/members/:memberId/role',
  requirePageRole('owner'),
  validateRequest({ body: updateMemberRoleSchema }),
  pageMemberController.updateRole
);

/**
 * @route   DELETE /api/v1/pages/:pageId/members/:memberId
 * @desc    Xóa hoặc thu hồi quyền thành viên khỏi Fanpage
 * @access  Private (Owner, Manager)
 */
pageRouter.delete(
  '/:pageId/members/:memberId',
  requirePageRole('owner', 'manager'),
  pageMemberController.removeMember
);

/* =============================================================================
   AUTOMATION RULES ROUTES (/api/v1/pages/:pageId/rules)
============================================================================= */

/**
 * @route   GET /api/v1/pages/:pageId/rules
 * @desc    Lấy danh sách quy tắc tự động hóa của Fanpage
 * @access  Private (Owner, Manager, Staff)
 */
pageRouter.get(
  '/:pageId/rules',
  requirePageRole('owner', 'manager', 'staff'),
  automationRuleController.getRules
);

/**
 * @route   POST /api/v1/pages/:pageId/rules
 * @desc    Tạo mới quy tắc tự động hóa
 * @access  Private (Owner, Manager)
 */
pageRouter.post(
  '/:pageId/rules',
  requirePageRole('owner', 'manager'),
  validateRequest({ body: CreateAutomationRuleDtoSchema }),
  automationRuleController.createRule
);

/**
 * @route   PUT /api/v1/pages/:pageId/rules/:ruleId
 * @desc    Cập nhật cấu hình quy tắc tự động hóa
 * @access  Private (Owner, Manager)
 */
pageRouter.put(
  '/:pageId/rules/:ruleId',
  requirePageRole('owner', 'manager'),
  validateRequest({ body: UpdateAutomationRuleDtoSchema }),
  automationRuleController.updateRule
);

/**
 * @route   DELETE /api/v1/pages/:pageId/rules/:ruleId
 * @desc    Xóa quy tắc tự động hóa
 * @access  Private (Owner, Manager)
 */
pageRouter.delete(
  '/:pageId/rules/:ruleId',
  requirePageRole('owner', 'manager'),
  automationRuleController.deleteRule
);


