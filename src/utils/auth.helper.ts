/**
 * ShopFlow - Authentication Helper (Bcrypt & JWT)
 * File: backend/src/utils/auth.helper.ts
 *
 * Cung cấp các tiện ích mã hóa mật khẩu và tạo/xác thực JWT tokens.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import {
  User,
  SafeUser,
  JwtUserPayload,
  AuthTokens,
} from '../core/entities/user.entity.js';
import { UnauthorizedError } from '../core/errors/app-error.js';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Mã hóa mật khẩu sử dụng Bcrypt với cost factor = 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Đối soát mật khẩu thô với mã hash đã lưu.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Tạo cặp Access Token và Refresh Token cho người dùng.
 */
export function generateTokens(user: Pick<User, 'id' | 'email' | 'role'>): AuthTokens {
  const accessPayload: JwtUserPayload = {
    sub:        user.id,
    id:         user.id,
    email:      user.email,
    role:       user.role,
    token_type: 'access',
  };

  const refreshPayload: JwtUserPayload = {
    sub:        user.id,
    email:      user.email,
    role:       user.role,
    token_type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);

  return {
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRY,
    tokenType: 'Bearer',
  };
}

/**
 * Xác thực và giải mã Access Token.
 * Throws UnauthorizedError nếu token hết hạn hoặc chữ ký không hợp lệ.
 */
export function verifyAccessToken(token: string): JwtUserPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUserPayload;
    if (decoded.token_type !== 'access') {
      throw new UnauthorizedError('Token không đúng loại access token.');
    }
    return decoded;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    const err = error as Error;
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token đã hết hạn, vui lòng refresh token.');
    }
    throw new UnauthorizedError('Access token không hợp lệ hoặc đã bị chỉnh sửa.');
  }
}

/**
 * Xác thực và giải mã Refresh Token.
 * Throws UnauthorizedError nếu token hết hạn hoặc chữ ký không hợp lệ.
 */
export function verifyRefreshToken(token: string): JwtUserPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtUserPayload;
    if (decoded.token_type !== 'refresh') {
      throw new UnauthorizedError('Token không đúng loại refresh token.');
    }
    return decoded;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    const err = error as Error;
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Refresh token đã hết hạn, vui lòng đăng nhập lại.');
    }
    throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã bị chỉnh sửa.');
  }
}

/**
 * Loại bỏ password_hash khỏi User entity trước khi gửi trả về client.
 */
export function toSafeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...safe } = user;
  return safe;
}
