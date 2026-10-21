/**
 * ShopFlow - Meta Webhook Signature Verifier Middleware (HMAC-SHA256)
 * File: backend/src/api/middlewares/webhook-verifier.middleware.ts
 *
 * Xác thực chữ ký HMAC-SHA256 từ header `x-hub-signature-256` của Meta Platform.
 * Sử dụng crypto.timingSafeEqual để ngăn chặn tấn công Timing Attack.
 * Tuân thủ nghiêm ngặt quy định bảo mật tại .agents/rules/security.md.
 */

import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../core/errors/app-error.js';
import { logger } from '../../utils/logger.js';

/**
 * Hàm thuần túy kiểm tra tính hợp lệ của chữ ký HMAC-SHA256.
 *
 * @param rawBody         - Raw buffer của request body
 * @param signatureHeader - Giá trị header 'x-hub-signature-256' (e.g. 'sha256=abc...')
 * @param appSecret       - Facebook App Secret
 * @returns true nếu hợp lệ, false nếu không hợp lệ
 */
export function verifyMetaSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const signatureHash = signatureHeader.slice(7);
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const sigBuffer = Buffer.from(signatureHash, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Middleware Express thẩm định chữ ký Webhook Meta.
 * Bắt buộc áp dụng cho endpoint POST /api/v1/webhook.
 */
export function verifyWebhookSignature(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;
  const appSecret = env.FACEBOOK_APP_SECRET;

  if (!appSecret) {
    if (env.NODE_ENV === 'production') {
      logger.error('[WebhookVerifier] FACEBOOK_APP_SECRET chưa được cấu hình ở môi trường Production!');
      throw new UnauthorizedError('Cấu hình xác thực Webhook máy chủ chưa hoàn tất.');
    }
    // Ở dev/test nếu chưa cấu hình secret thì cảnh báo và bỏ qua
    logger.warn('[WebhookVerifier] FACEBOOK_APP_SECRET chưa được cấu hình. Bỏ qua xác thực chữ ký ở môi trường Dev/Test.');
    return next();
  }

  // Trích xuất raw body buffer được lưu trữ tại express.json verify hook
  const rawBody: Buffer | undefined = (req as unknown as { rawBody?: Buffer }).rawBody;

  const bodyBuffer: Buffer = rawBody ?? (
    Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}))
  );

  const isValid = verifyMetaSignature(bodyBuffer, signatureHeader, appSecret);

  if (!isValid) {
    logger.warn(
      {
        url: req.originalUrl,
        hasSignature: !!signatureHeader,
      },
      '[WebhookVerifier] Chữ ký x-hub-signature-256 không hợp lệ hoặc bị thiếu'
    );
    throw new UnauthorizedError(
      'Chữ ký Meta Webhook (x-hub-signature-256) không hợp lệ hoặc bị thiếu.'
    );
  }

  next();
}
