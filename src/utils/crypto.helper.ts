/**
 * ShopFlow - Token Encryption Helper (AES-256-GCM)
 * File: backend/src/utils/crypto.helper.ts
 *
 * Tiện ích mã hóa đối xứng xác thực AES-256-GCM cho User Access Token & Page Access Token.
 * Ngăn chặn rò rỉ token Meta dưới dạng plain-text trong cơ sở dữ liệu.
 */

import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../core/errors/app-error.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits - kích thước tiêu chuẩn tối ưu cho GCM
const DELIMITER = ':';

/**
 * Tạo khóa mã hóa 32 bytes (256 bits) từ chuỗi khóa cấu hình qua SHA-256.
 */
function deriveKey(secretKey?: string): Buffer {
  const secret = secretKey || env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new AppError('Chưa cấu hình TOKEN_ENCRYPTION_KEY cho hệ thống', 500, 'INTERNAL_SERVER_ERROR');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Mã hóa chuỗi token bằng thuật toán AES-256-GCM.
 * Định dạng kết quả trả về: `${ivHex}:${authTagHex}:${encryptedHex}`
 *
 * @param plainText - Token dạng thô cần mã hóa
 * @param secretKey - Tùy chọn override secret key
 * @returns Chuỗi mã hóa đã đóng gói kèm IV và Auth Tag
 */
export function encryptToken(plainText: string, secretKey?: string): string {
  if (!plainText) {
    throw new AppError('Dữ liệu cần mã hóa không được để trống', 400, 'BAD_REQUEST');
  }

  const key = deriveKey(secretKey);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}${DELIMITER}${authTag.toString('hex')}${DELIMITER}${encrypted}`;
}

/**
 * Giải mã chuỗi token đã được mã hóa bằng AES-256-GCM.
 *
 * @param cipherText - Chuỗi mã hóa theo định dạng `${ivHex}:${authTagHex}:${encryptedHex}`
 * @param secretKey  - Tùy chọn override secret key
 * @returns Chuỗi token thô sau khi giải mã
 */
export function decryptToken(cipherText: string, secretKey?: string): string {
  if (!cipherText) {
    throw new AppError('Dữ liệu cần giải mã không được để trống', 400, 'BAD_REQUEST');
  }

  const parts = cipherText.split(DELIMITER);
  if (parts.length !== 3) {
    throw new AppError('Chuỗi mã hóa không đúng định dạng AES-256-GCM', 400, 'VALIDATION_ERROR');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new AppError('Dữ liệu mã hóa bị khuyết trường IV hoặc AuthTag', 400, 'VALIDATION_ERROR');
  }

  try {
    const key = deriveKey(secretKey);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new AppError(
      'Giải mã token thất bại. Dữ liệu có thể bị giả mạo hoặc sai khóa giải mã.',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
}

/**
 * Kiểm tra xem một chuỗi có định dạng mã hóa hợp lệ hay không.
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(DELIMITER);
  if (parts.length !== 3) return false;
  // iv: 12 bytes = 24 hex chars; authTag: 16 bytes = 32 hex chars
  const ivHex = parts[0];
  const authTagHex = parts[1];
  const encryptedHex = parts[2];

  if (!ivHex || !authTagHex || !encryptedHex) return false;

  return (
    ivHex.length === IV_LENGTH * 2 &&
    authTagHex.length === 32 &&
    encryptedHex.length > 0 &&
    /^[0-9a-fA-F]+$/.test(ivHex) &&
    /^[0-9a-fA-F]+$/.test(authTagHex) &&
    /^[0-9a-fA-F]+$/.test(encryptedHex)
  );
}
