/**
 * ShopFlow - Unit Tests: error-handler.middleware.ts
 * File: backend/src/api/middlewares/__tests__/error-handler.middleware.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  errorHandler,
  notFoundHandler,
} from '../error-handler.middleware.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../../core/errors/app-error.js';

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
  logger: {
    info:  vi.fn(),
    debug: vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
  },
}));

// Mock env
vi.mock('../../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

function createMocks(overrides: Partial<Request> = {}) {
  const req = {
    method: 'GET',
    originalUrl: '/api/v1/test',
    ...overrides,
  } as unknown as Request;

  const jsonMock = vi.fn();
  const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

  const res = {
    status: statusMock,
    json: jsonMock,
  } as unknown as Response;

  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next, statusMock, jsonMock };
}

describe('notFoundHandler()', () => {
  it('nên trả về mã HTTP 404 với cấu trúc NOT_FOUND chuẩn hóa', () => {
    const { req, res, statusMock, jsonMock } = createMocks({
      method: 'POST',
      originalUrl: '/api/v1/non-existent-route',
    });

    notFoundHandler(req, res);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Đường dẫn [POST] /api/v1/non-existent-route không tồn tại trên hệ thống.',
      },
    });
  });
});

describe('errorHandler() — AppError handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('nên xử lý ValidationError (400) với code và details đầy đủ', () => {
    const { req, res, next, statusMock, jsonMock } = createMocks();
    const details = [{ field: 'email', issue: 'Email không đúng định dạng' }];
    const error = new ValidationError('Dữ liệu không hợp lệ', details);

    errorHandler(error, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details,
      },
    });
  });

  it('nên xử lý NotFoundError (404)', () => {
    const { req, res, next, statusMock, jsonMock } = createMocks();
    const error = new NotFoundError('Không tìm thấy người dùng');

    errorHandler(error, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Không tìm thấy người dùng',
      },
    });
  });

  it('nên xử lý UnauthorizedError (401)', () => {
    const { req, res, next, statusMock, jsonMock } = createMocks();
    const error = new UnauthorizedError();

    errorHandler(error, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Không có quyền truy cập hoặc phiên đã hết hạn',
      },
    });
  });

  it('nên xử lý ForbiddenError (403)', () => {
    const { req, res, next, statusMock, jsonMock } = createMocks();
    const error = new ForbiddenError();

    errorHandler(error, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện hành động này',
      },
    });
  });

  it('nên xử lý ConflictError (409)', () => {
    const { req, res, next, statusMock, jsonMock } = createMocks();
    const error = new ConflictError('Email này đã được đăng ký');

    errorHandler(error, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Email này đã được đăng ký',
      },
    });
  });

  it('nên xử lý AppError với statusCode >= 500', () => {
    const { req, res, next, statusMock, jsonMock } = createMocks();
    const error = new AppError('Lỗi dịch vụ bên thứ ba', 502, 'BAD_GATEWAY');

    errorHandler(error, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(502);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_GATEWAY',
        message: 'Lỗi dịch vụ bên thứ ba',
      },
    });
  });
});

describe('errorHandler() — ZodError handling', () => {
  it('nên format ZodError khi controller chuyển qua next(err)', () => {
    const { req, res, next, statusMock, jsonMock } = createMocks();
    const schema = z.object({ phone: z.string().min(10, 'SĐT tối thiểu 10 số') });
    const parsed = schema.safeParse({ phone: '123' });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      errorHandler(parsed.error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu yêu cầu không hợp lệ',
          details: [{ field: 'phone', issue: 'SĐT tối thiểu 10 số' }],
        },
      });
    }
  });
});

describe('errorHandler() — SyntaxError (Invalid JSON Body)', () => {
  it('nên trả về 400 BAD_REQUEST khi body parser gặp SyntaxError', () => {
    const { req, res, next, statusMock, jsonMock } = createMocks();
    const syntaxErr = new SyntaxError('Unexpected token in JSON');
    (syntaxErr as unknown as { status: number }).status = 400;

    errorHandler(syntaxErr, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Cú pháp JSON trong nội dung yêu cầu không hợp lệ.',
      },
    });
  });
});

describe('errorHandler() — Unhandled 500 Errors', () => {
  it('nên trả về 500 INTERNAL_SERVER_ERROR khi gặp Error thông thường', () => {
    const { req, res, next, statusMock, jsonMock } = createMocks();
    const unexpectedErr = new Error('Database connection crashed');

    errorHandler(unexpectedErr, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database connection crashed',
      },
    });
  });
});
