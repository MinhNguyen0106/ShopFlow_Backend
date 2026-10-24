/**
 * ShopFlow - JWT Authentication Middleware
 * File: backend/src/api/middlewares/auth.middleware.ts
 *
 * Xác thực Bearer Access Token trong Authorization header và gán user vào request.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../utils/auth.helper.js';
import { JwtUserPayload, UserRole } from '../../core/entities/user.entity.js';
import { UnauthorizedError, ForbiddenError, BadRequestError } from '../../core/errors/app-error.js';
import { pageMemberRepository, PageRole } from '../../infrastructure/repositories/page-member.repository.js';

export interface PageMemberContext {
  id: string;
  pageId: string;
  userId: string;
  role: PageRole;
}

// Mở rộng interface Request của Express để chứa thông tin người dùng và thành viên fanpage
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
      pageMember?: PageMemberContext;
    }
  }
}

/**
 * Middleware xác thực Access Token từ Header Authorization: Bearer <token>.
 */
export function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    throw new UnauthorizedError(
      'Không tìm thấy tiêu đề xác thực Authorization. Vui lòng đăng nhập.'
    );
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new UnauthorizedError(
      'Định dạng Authorization header không hợp lệ. Chuẩn bắt buộc: Bearer <token>.'
    );
  }

  const token = parts[1];
  if (!token) {
    throw new UnauthorizedError('Token xác thực trống.');
  }

  const payload = verifyAccessToken(token);
  req.user = payload;
  next();
}

/**
 * Middleware kiểm tra phân quyền (RBAC) theo vai trò hệ thống của người dùng.
 *
 * @param allowedRoles - Danh sách các role được phép truy cập
 *
 * @example
 * router.delete('/posts/:id', authenticateToken, requireRole('owner', 'admin'), controller.delete);
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Người dùng chưa được xác thực.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Bạn không có quyền truy cập chức năng này (Yêu cầu vai trò: ${allowedRoles.join(', ')}).`
      );
    }

    next();
  };
}

import { connectedPageRepository } from '../../infrastructure/repositories/connected-page.repository.js';

/**
 * Middleware kiểm tra phân quyền thành viên Fanpage (Page-level RBAC).
 *
 * Trích xuất pageId từ params, query hoặc body và xác thực vai trò của người dùng trên Fanpage đó.
 *
 * @param allowedRoles - Danh sách các vai trò được phép ('owner', 'manager', 'staff')
 *
 * @example
 * router.delete('/pages/:pageId', authenticateToken, requirePageRole('owner'), controller.disconnect);
 */
export function requirePageRole(...allowedRoles: PageRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Người dùng chưa được xác thực.');
      }

      const currentUserId = req.user.id || req.user.sub;
      if (!currentUserId) {
        throw new UnauthorizedError('Token không chứa thông tin định danh người dùng.');
      }

      const pageId = (req.params['pageId'] || req.query['pageId'] || req.body?.pageId || req.params['id']) as string | undefined;
      if (!pageId) {
        throw new BadRequestError('Không tìm thấy thông tin Fanpage (pageId) trong yêu cầu.');
      }

      let member = await pageMemberRepository.findByPageAndUser(pageId, currentUserId);
      if (!member) {
        // Fallback kiểm tra xem người dùng có phải là người kết nối trang gốc (backward compatibility)
        const page = await connectedPageRepository.findByPageIdAndUserId(pageId, currentUserId);
        if (page) {
          member = {
            id: 'owner-fallback',
            page_id: page.id,
            user_id: currentUserId,
            role: 'owner',
            invited_by: null,
            status: 'active',
            created_at: page.created_at,
            updated_at: page.updated_at,
          };
        }
      }

      if (!member || member.status !== 'active') {
        throw new ForbiddenError('Bạn không phải là thành viên hoặc không có quyền truy cập Fanpage này.');
      }

      if (!allowedRoles.includes(member.role)) {
        throw new ForbiddenError(
          `Bạn không có quyền thực hiện thao tác này trên Fanpage (Yêu cầu vai trò: ${allowedRoles.join(', ')}).`
        );
      }

      req.pageMember = {
        id: member.id,
        pageId: member.page_id,
        userId: member.user_id,
        role: member.role,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

