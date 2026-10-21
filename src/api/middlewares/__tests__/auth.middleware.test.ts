/**
 * ShopFlow - Unit Tests: auth.middleware.ts
 * File: backend/src/api/middlewares/__tests__/auth.middleware.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireRole } from '../auth.middleware.js';
import { generateTokens } from '../../../utils/auth.helper.js';
import { UnauthorizedError, ForbiddenError } from '../../../core/errors/app-error.js';

function createMocks(headers: Record<string, string> = {}) {
  const req = {
    headers: { ...headers },
  } as unknown as Request;

  const res = {} as Response;
  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next };
}

describe('authenticateToken() middleware', () => {
  it('nên throw UnauthorizedError khi không có header Authorization', () => {
    const { req, res, next } = createMocks();

    expect(() => authenticateToken(req, res, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it('nên throw UnauthorizedError khi header không có tiền tố Bearer', () => {
    const { req, res, next } = createMocks({ authorization: 'Basic dXNlcjpwYXNz' });

    expect(() => authenticateToken(req, res, next)).toThrow(
      'Định dạng Authorization header không hợp lệ. Chuẩn bắt buộc: Bearer <token>.'
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('nên throw UnauthorizedError khi token bị thiếu sau Bearer', () => {
    const { req, res, next } = createMocks({ authorization: 'Bearer ' });

    expect(() => authenticateToken(req, res, next)).toThrow();
    expect(next).not.toHaveBeenCalled();
  });

  it('nên giải mã token, gán vào req.user và gọi next() khi token hợp lệ', () => {
    const mockUser = {
      id:    'valid-uuid-user',
      email: 'verified@shopflow.vn',
      role:  'owner' as const,
    };
    const { accessToken } = generateTokens(mockUser);
    const { req, res, next } = createMocks({
      authorization: `Bearer ${accessToken}`,
    });

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user?.sub).toBe(mockUser.id);
    expect(req.user?.email).toBe(mockUser.email);
    expect(req.user?.role).toBe(mockUser.role);
  });
});

describe('requireRole() middleware', () => {
  it('nên throw UnauthorizedError nếu req.user chưa tồn tại', () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn();

    const guard = requireRole('owner', 'admin');
    expect(() => guard(req, res, next)).toThrow(UnauthorizedError);
  });

  it('nên throw ForbiddenError nếu vai trò của user không nằm trong danh sách cho phép', () => {
    const req = {
      user: { sub: 'id-1', email: 'staff@test.com', role: 'staff', token_type: 'access' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    const guard = requireRole('owner', 'admin');
    expect(() => guard(req, res, next)).toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  it('nên gọi next() khi vai trò của user hợp lệ', () => {
    const req = {
      user: { sub: 'id-2', email: 'owner@test.com', role: 'owner', token_type: 'access' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    const guard = requireRole('owner', 'admin');
    guard(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
