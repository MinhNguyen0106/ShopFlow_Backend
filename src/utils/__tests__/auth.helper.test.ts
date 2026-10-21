/**
 * ShopFlow - Unit Tests: auth.helper.ts
 * File: backend/src/utils/__tests__/auth.helper.test.ts
 */

import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  toSafeUser,
} from '../auth.helper.js';
import { User } from '../../core/entities/user.entity.js';
import { env } from '../../config/env.js';

describe('auth.helper — Password hashing', () => {
  it('nên băm mật khẩu thành chuỗi bcrypt hash hợp lệ', async () => {
    const password = 'SecurePassword123!';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/); // Chuẩn định dạng bcrypt
  });

  it('nên đối soát chính xác mật khẩu đúng', async () => {
    const password = 'MyTestPassword#2026';
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);
  });

  it('nên trả về false khi đối soát mật khẩu sai', async () => {
    const password = 'CorrectPassword123';
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword('WrongPassword123', hash);
    expect(isMatch).toBe(false);
  });
});

describe('auth.helper — JWT Tokens generation & verification', () => {
  const mockUser = {
    id:    '123e4567-e89b-12d3-a456-426614174000',
    email: 'shopowner@example.com',
    role:  'owner' as const,
  };

  it('nên tạo cặp Access Token và Refresh Token hợp lệ', () => {
    const tokens = generateTokens(mockUser);

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.tokenType).toBe('Bearer');
    expect(tokens.expiresIn).toBe(env.JWT_ACCESS_EXPIRY);
  });

  it('nên giải mã và xác thực Access Token thành công', () => {
    const tokens = generateTokens(mockUser);
    const decoded = verifyAccessToken(tokens.accessToken);

    expect(decoded.sub).toBe(mockUser.id);
    expect(decoded.email).toBe(mockUser.email);
    expect(decoded.role).toBe(mockUser.role);
    expect(decoded.token_type).toBe('access');
  });

  it('nên giải mã và xác thực Refresh Token thành công', () => {
    const tokens = generateTokens(mockUser);
    const decoded = verifyRefreshToken(tokens.refreshToken);

    expect(decoded.sub).toBe(mockUser.id);
    expect(decoded.email).toBe(mockUser.email);
    expect(decoded.role).toBe(mockUser.role);
    expect(decoded.token_type).toBe('refresh');
  });

  it('verifyAccessToken nên throw lỗi nếu truyền nhầm Refresh Token', () => {
    const tokens = generateTokens(mockUser);

    expect(() => verifyAccessToken(tokens.refreshToken)).toThrow();
  });

  it('verifyRefreshToken nên throw lỗi nếu truyền nhầm Access Token', () => {
    const tokens = generateTokens(mockUser);

    expect(() => verifyRefreshToken(tokens.accessToken)).toThrow();
  });

  it('nên throw lỗi khi token bị ký bằng khóa secret khác', () => {
    const fakeToken = jwt.sign(
      { sub: mockUser.id, token_type: 'access' },
      'wrong_secret_key_1234567890_different'
    );

    expect(() => verifyAccessToken(fakeToken)).toThrow(
      'Access token không hợp lệ hoặc đã bị chỉnh sửa.'
    );
  });

  it('nên throw lỗi khi token đã hết hạn', () => {
    const expiredToken = jwt.sign(
      { sub: mockUser.id, token_type: 'access' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '-1s' }
    );

    expect(() => verifyAccessToken(expiredToken)).toThrow(
      'Access token đã hết hạn, vui lòng refresh token.'
    );
  });
});

describe('auth.helper — toSafeUser()', () => {
  it('nên loại bỏ trường password_hash khỏi đối tượng User', () => {
    const fullUser: User = {
      id:            'user-id-1',
      email:         'test@shopflow.vn',
      password_hash: '$2a$12$hashedpasswordstring',
      full_name:     'Nguyễn Văn A',
      role:          'owner',
      status:        'active',
      created_at:    new Date(),
      updated_at:    new Date(),
    };

    const safe = toSafeUser(fullUser);

    expect(safe).not.toHaveProperty('password_hash');
    expect(safe.id).toBe(fullUser.id);
    expect(safe.email).toBe(fullUser.email);
    expect(safe.full_name).toBe(fullUser.full_name);
  });
});
