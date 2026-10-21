/**
 * ShopFlow - Unit Tests: validate-request.middleware.ts
 * File: backend/src/api/middlewares/__tests__/validate-request.middleware.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validateRequest,
  formatZodIssues,
} from '../validate-request.middleware.js';

// Helper tạo mock Request, Response, Next
function createMocks(overrides: Partial<Request> = {}) {
  const req = {
    body: {},
    query: {},
    params: {},
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

describe('formatZodIssues()', () => {
  it('nên format đường dẫn phẳng (1 level)', () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: 'invalid-email' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodIssues(result.error.issues);
      expect(formatted).toEqual([
        { field: 'email', issue: expect.any(String) },
      ]);
    }
  });

  it('nên format đường dẫn lồng nhau (nested paths)', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          age: z.number().min(18),
        }),
      }),
    });
    const result = schema.safeParse({ user: { profile: { age: 15 } } });

    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodIssues(result.error.issues);
      expect(formatted).toEqual([
        { field: 'user.profile.age', issue: expect.any(String) },
      ]);
    }
  });

  it('nên format _root_ khi lỗi ở cấp cao nhất (root level refinement)', () => {
    const schema = z.string().refine(() => false, { message: 'Root error' });
    const result = schema.safeParse('test');

    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodIssues(result.error.issues);
      expect(formatted).toEqual([
        { field: '_root_', issue: 'Root error' },
      ]);
    }
  });
});

describe('validateRequest() — Body validation', () => {
  const BodySchema = z.object({
    email: z.string().email('Email không đúng định dạng'),
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
    age: z.number().optional(),
  });

  it('nên gọi next() và gán parsed body khi dữ liệu hợp lệ', async () => {
    const middleware = validateRequest({ body: BodySchema });
    const { req, res, next } = createMocks({
      body: {
        email: 'user@shopflow.vn',
        password: 'Password123!',
        extraField: 'should be stripped if strict or passed',
      },
    });

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toMatchObject({
      email: 'user@shopflow.vn',
      password: 'Password123!',
    });
  });

  it('nên trả về 400 với chi tiết lỗi khi body không hợp lệ', async () => {
    const middleware = validateRequest({ body: BodySchema });
    const { req, res, next, statusMock, jsonMock } = createMocks({
      body: {
        email: 'invalid-email',
        password: '123',
      },
    });

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu yêu cầu không hợp lệ',
        details: expect.arrayContaining([
          { field: 'email', issue: 'Email không đúng định dạng' },
          { field: 'password', issue: 'Mật khẩu tối thiểu 8 ký tự' },
        ]),
      },
    });
  });
});

describe('validateRequest() — Query validation', () => {
  const QuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().max(100).default(20),
    search: z.string().optional(),
  });

  it('nên ép kiểu query params (coerce) và gọi next() khi hợp lệ', async () => {
    const middleware = validateRequest({ query: QuerySchema });
    const { req, res, next } = createMocks({
      query: { page: '2', limit: '50', search: 'áo thun' } as unknown as Request['query'],
    });

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.query).toEqual({ page: 2, limit: 50, search: 'áo thun' });
  });

  it('nên trả về 400 khi query param vi phạm constraint', async () => {
    const middleware = validateRequest({ query: QuerySchema });
    const { req, res, next, statusMock, jsonMock } = createMocks({
      query: { limit: '999' } as unknown as Request['query'],
    });

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'limit' }),
          ]),
        }),
      })
    );
  });
});

describe('validateRequest() — Params validation', () => {
  const ParamsSchema = z.object({
    id: z.string().uuid('ID phải là UUID hợp lệ'),
  });

  it('nên gọi next() khi params hợp lệ', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const middleware = validateRequest({ params: ParamsSchema });
    const { req, res, next } = createMocks({
      params: { id: validUuid },
    });

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.params).toEqual({ id: validUuid });
  });

  it('nên trả về 400 khi params không đúng UUID', async () => {
    const middleware = validateRequest({ params: ParamsSchema });
    const { req, res, next, statusMock, jsonMock } = createMocks({
      params: { id: 'not-a-uuid' },
    });

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: [
            { field: 'id', issue: 'ID phải là UUID hợp lệ' },
          ],
        }),
      })
    );
  });
});

describe('validateRequest() — Aggregate multiple targets', () => {
  it('nên gộp lỗi từ cả body, query và params nếu đồng thời không hợp lệ', async () => {
    const middleware = validateRequest({
      params: z.object({ id: z.string().uuid() }),
      query: z.object({ page: z.coerce.number() }),
      body: z.object({ name: z.string().min(1) }),
    });

    const { req, res, next, statusMock, jsonMock } = createMocks({
      params: { id: 'bad-id' },
      query: { page: 'not-a-number' } as unknown as Request['query'],
      body: { name: '' },
    });

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(400);

    const callArgs = jsonMock.mock.calls[0]?.[0];
    expect(callArgs.error.details).toHaveLength(3);
    const fields = callArgs.error.details.map((d: { field: string }) => d.field);
    expect(fields).toContain('id');
    expect(fields).toContain('page');
    expect(fields).toContain('name');
  });

  it('nên gọi next() khi không có schema nào được truyền vào', async () => {
    const middleware = validateRequest({});
    const { req, res, next } = createMocks();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
