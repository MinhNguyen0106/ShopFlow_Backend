/**
 * ShopFlow - Unit Tests: webhook-verifier.middleware.ts
 * File: backend/src/api/middlewares/__tests__/webhook-verifier.middleware.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import {
  verifyMetaSignature,
  verifyWebhookSignature,
} from '../webhook-verifier.middleware.js';
import { UnauthorizedError } from '../../../core/errors/app-error.js';
import { env } from '../../../config/env.js';

describe('verifyMetaSignature() — Thuần túy kiểm tra HMAC-SHA256', () => {
  const secret = 'my_super_secret_facebook_app_secret_123';
  const rawBody = Buffer.from(JSON.stringify({ object: 'page', entry: [] }));

  function createValidSignature(body: Buffer, appSecret: string): string {
    const hash = crypto.createHmac('sha256', appSecret).update(body).digest('hex');
    return `sha256=${hash}`;
  }

  it('nên trả về true khi chữ ký HMAC-SHA256 hoàn toàn trùng khớp', () => {
    const signature = createValidSignature(rawBody, secret);
    const isValid = verifyMetaSignature(rawBody, signature, secret);

    expect(isValid).toBe(true);
  });

  it('nên trả về false khi header không bắt đầu bằng sha256=', () => {
    const invalidHeader = 'md5=abcdef123456';
    const isValid = verifyMetaSignature(rawBody, invalidHeader, secret);

    expect(isValid).toBe(false);
  });

  it('nên trả về false khi signatureHeader là undefined hoặc rỗng', () => {
    expect(verifyMetaSignature(rawBody, undefined, secret)).toBe(false);
    expect(verifyMetaSignature(rawBody, '', secret)).toBe(false);
  });

  it('nên trả về false khi raw body bị sửa đổi (tampered payload)', () => {
    const signature = createValidSignature(rawBody, secret);
    const tamperedBody = Buffer.from(JSON.stringify({ object: 'page', entry: ['tampered'] }));

    const isValid = verifyMetaSignature(tamperedBody, signature, secret);
    expect(isValid).toBe(false);
  });

  it('nên trả về false khi chữ ký được tạo từ secret khác', () => {
    const signatureFromOtherSecret = createValidSignature(rawBody, 'different_secret_key');
    const isValid = verifyMetaSignature(rawBody, signatureFromOtherSecret, secret);

    expect(isValid).toBe(false);
  });

  it('nên trả về false khi độ dài mã hash khác nhau (ngăn timingSafeEqual throw)', () => {
    const shortSignature = 'sha256=12345678';
    const isValid = verifyMetaSignature(rawBody, shortSignature, secret);

    expect(isValid).toBe(false);
  });
});

describe('verifyWebhookSignature() — Express Middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createMocks(headers: Record<string, string> = {}, rawBody?: Buffer, body?: unknown) {
    const req = {
      headers: { ...headers },
      rawBody,
      body: body ?? {},
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    return { req, res, next };
  }

  it('nên gọi next() khi chữ ký x-hub-signature-256 hợp lệ', () => {
    const testSecret = 'test_secret_for_middleware';
    vi.spyOn(env, 'FACEBOOK_APP_SECRET', 'get').mockReturnValue(testSecret);

    const bodyObj = { object: 'page', entry: [{ id: '123' }] };
    const rawBodyBuffer = Buffer.from(JSON.stringify(bodyObj));
    const validHash = crypto.createHmac('sha256', testSecret).update(rawBodyBuffer).digest('hex');

    const { req, res, next } = createMocks(
      { 'x-hub-signature-256': `sha256=${validHash}` },
      rawBodyBuffer,
      bodyObj
    );

    verifyWebhookSignature(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('nên throw UnauthorizedError khi chữ ký không hợp lệ', () => {
    const testSecret = 'test_secret_for_middleware';
    vi.spyOn(env, 'FACEBOOK_APP_SECRET', 'get').mockReturnValue(testSecret);

    const bodyObj = { object: 'page' };
    const rawBodyBuffer = Buffer.from(JSON.stringify(bodyObj));

    const { req, res, next } = createMocks(
      { 'x-hub-signature-256': 'sha256=0000000000000000000000000000000000000000000000000000000000000000' },
      rawBodyBuffer,
      bodyObj
    );

    expect(() => verifyWebhookSignature(req, res, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it('nên throw UnauthorizedError khi header x-hub-signature-256 bị thiếu', () => {
    const testSecret = 'test_secret_for_middleware';
    vi.spyOn(env, 'FACEBOOK_APP_SECRET', 'get').mockReturnValue(testSecret);

    const { req, res, next } = createMocks({}, Buffer.from('{}'), {});

    expect(() => verifyWebhookSignature(req, res, next)).toThrow(UnauthorizedError);
  });

  it('ở môi trường dev/test khi FACEBOOK_APP_SECRET undefined thì cảnh báo và cho qua (gọi next)', () => {
    vi.spyOn(env, 'FACEBOOK_APP_SECRET', 'get').mockReturnValue(undefined);
    vi.spyOn(env, 'NODE_ENV', 'get').mockReturnValue('development');

    const { req, res, next } = createMocks({}, Buffer.from('{}'), {});

    verifyWebhookSignature(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('ở môi trường production khi FACEBOOK_APP_SECRET undefined thì throw UnauthorizedError', () => {
    vi.spyOn(env, 'FACEBOOK_APP_SECRET', 'get').mockReturnValue(undefined);
    vi.spyOn(env, 'NODE_ENV', 'get').mockReturnValue('production');

    const { req, res, next } = createMocks({}, Buffer.from('{}'), {});

    expect(() => verifyWebhookSignature(req, res, next)).toThrow(UnauthorizedError);
  });
});
