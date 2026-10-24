/**
 * ShopFlow - Page Member Controller
 * File: backend/src/api/controllers/page-member.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import {
  PageMemberService,
  pageMemberService,
} from '../../core/services/page-member.service.js';
import { InviteMemberDto, UpdateMemberRoleDto } from '../dtos/page-member.dto.js';
import { UnauthorizedError } from '../../core/errors/app-error.js';

export class PageMemberController {
  constructor(
    private readonly service: PageMemberService = pageMemberService
  ) {}

  /**
   * GET /api/v1/pages/:pageId/members
   * Lấy danh sách thành viên của Fanpage
   */
  getMembers = async (
    req: Request<{ pageId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { pageId } = req.params;
      const members = await this.service.listMembers(pageId);

      res.status(200).json({
        success: true,
        data: { members },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/pages/:pageId/members/invite
   * Mời một thành viên mới vào Fanpage theo email
   */
  inviteMember = async (
    req: Request<{ pageId: string }, unknown, InviteMemberDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new UnauthorizedError('Yêu cầu xác thực tài khoản');
      }

      const { pageId } = req.params;
      const member = await this.service.inviteMember(pageId, userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Mời thành viên tham gia Fanpage thành công',
        data: { member },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/pages/:pageId/members/:memberId/role
   * Thay đổi vai trò thành viên trong Fanpage
   */
  updateRole = async (
    req: Request<{ pageId: string; memberId: string }, unknown, UpdateMemberRoleDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { pageId, memberId } = req.params;
      const member = await this.service.updateMemberRole(pageId, memberId, req.body.role);

      res.status(200).json({
        success: true,
        message: 'Cập nhật vai trò thành viên thành công',
        data: { member },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/pages/:pageId/members/:memberId
   * Thu hồi quyền hoặc xóa thành viên khỏi Fanpage
   */
  removeMember = async (
    req: Request<{ pageId: string; memberId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { pageId, memberId } = req.params;
      await this.service.removeMember(pageId, memberId);

      res.status(200).json({
        success: true,
        message: 'Xóa thành viên khỏi Fanpage thành công',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const pageMemberController = new PageMemberController();
