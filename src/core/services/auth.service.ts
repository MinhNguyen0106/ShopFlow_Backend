/**
 * ShopFlow - Authentication Domain Service
 * File: backend/src/core/services/auth.service.ts
 *
 * Chứa toàn bộ nghiệp vụ xác thực người dùng: Đăng ký, Đăng nhập, Refresh Token.
 * Hỗ trợ Dependency Injection cho phép mock UserRepository dễ dàng trong Unit Test.
 */

import {
  UserRepository,
  userRepository as defaultUserRepository,
} from '../../infrastructure/repositories/user.repository.js';
import { RegisterDto, LoginDto } from '../../api/dtos/auth.dto.js';
import { AuthResponse, AuthTokens } from '../entities/user.entity.js';
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyRefreshToken,
  toSafeUser,
} from '../../utils/auth.helper.js';
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from '../errors/app-error.js';
import { logger } from '../../utils/logger.js';

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository = defaultUserRepository
  ) {}

  /**
   * Đăng ký tài khoản người dùng mới (Mặc định vai trò owner).
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError(
        'Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác.'
      );
    }

    const passwordHash = await hashPassword(dto.password);
    const newUser = await this.userRepo.create({
      email:         dto.email,
      password_hash: passwordHash,
      full_name:     dto.full_name,
      role:          dto.role,
    });

    logger.info(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      '[AuthService] Đăng ký tài khoản mới thành công'
    );

    const tokens = generateTokens(newUser);
    return {
      user: toSafeUser(newUser),
      tokens,
    };
  }

  /**
   * Đăng nhập hệ thống bằng email và mật khẩu.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      // Dùng thông báo chung để tránh tiết lộ sự tồn tại của email
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác.');
    }

    if (user.status !== 'active') {
      logger.warn(
        { userId: user.id, email: user.email, status: user.status },
        '[AuthService] Đăng nhập thất bại: Tài khoản không ở trạng thái active'
      );
      throw new ForbiddenError(
        'Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa. Vui lòng liên hệ quản trị viên.'
      );
    }

    const isMatch = await verifyPassword(dto.password, user.password_hash);
    if (!isMatch) {
      logger.warn(
        { email: dto.email },
        '[AuthService] Đăng nhập thất bại: Mật khẩu sai'
      );
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác.');
    }

    logger.info(
      { userId: user.id, email: user.email },
      '[AuthService] Đăng nhập thành công'
    );

    const tokens = generateTokens(user);
    return {
      user: toSafeUser(user),
      tokens,
    };
  }

  /**
   * Cấp lại cặp Token mới bằng Refresh Token hợp lệ.
   */
  async refreshToken(token: string): Promise<AuthTokens> {
    const payload = verifyRefreshToken(token);

    const user = await this.userRepo.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedError(
        'Phiên đăng nhập không hợp lệ hoặc người dùng không tồn tại.'
      );
    }

    logger.debug(
      { userId: user.id },
      '[AuthService] Refresh token thành công'
    );

    return generateTokens(user);
  }
}

// Export singleton instance mặc định
export const authService = new AuthService();
