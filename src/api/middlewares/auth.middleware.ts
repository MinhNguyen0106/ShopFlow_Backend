/**
 * ShopFlow - JWT Authentication Middleware
 * File: backend/src/api/middlewares/auth.middleware.ts
 *
 * Xác thực Bearer Access Token trong Authorization header và gán user vào request.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../utils/auth.helper.js';
import { JwtUserPayload, UserRole } from '../../core/entities/user.entity.js';
import { UnauthorizedError, ForbiddenError } from '../../core/errors/app-error.js';

// Mở rộng interface Request của Express để chứa thông tin người dùng đã xác thực
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
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
 * Middleware kiểm tra phân quyền (RBAC) theo vai trò người dùng.
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
