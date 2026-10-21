/**
 * ShopFlow - Unit Tests: auth.service.ts
 * File: backend/src/core/services/__tests__/auth.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth.service.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { User } from '../../entities/user.entity.js';
import { ConflictError, UnauthorizedError, ForbiddenError } from '../../errors/app-error.js';
import { hashPassword, generateTokens } from '../../../utils/auth.helper.js';

describe('AuthService — register()', () => {
  let mockUserRepo: UserRepository;
  let service: AuthService;

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: vi.fn(),
      findById:    vi.fn(),
      create:      vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as UserRepository;

    service = new AuthService(mockUserRepo);
  });

  it('nên đăng ký người dùng mới thành công và trả về safe user kèm tokens', async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValueOnce(null);

    const createdUser: User = {
      id:            'new-uuid-1',
      email:         'owner@shopflow.vn',
      password_hash: 'hashed_password',
      full_name:     'Chủ Shop A',
      role:          'owner',
      status:        'active',
      created_at:    new Date(),
      updated_at:    new Date(),
    };
    vi.mocked(mockUserRepo.create).mockResolvedValueOnce(createdUser);

    const result = await service.register({
      email:     'owner@shopflow.vn',
      password:  'Password123!',
      full_name: 'Chủ Shop A',
    });

    expect(result.user).not.toHaveProperty('password_hash');
    expect(result.user.id).toBe('new-uuid-1');
    expect(result.user.email).toBe('owner@shopflow.vn');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(mockUserRepo.create).toHaveBeenCalledTimes(1);
  });

  it('nên throw ConflictError khi email đã tồn tại trong hệ thống', async () => {
    const existingUser: User = {
      id:            'existing-id',
      email:         'duplicate@shopflow.vn',
      password_hash: 'hash',
      full_name:     'Người cũ',
      role:          'owner',
      status:        'active',
      created_at:    new Date(),
      updated_at:    new Date(),
    };
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValueOnce(existingUser);

    await expect(
      service.register({
        email:     'duplicate@shopflow.vn',
        password:  'Password123!',
        full_name: 'Người mới',
      })
    ).rejects.toThrow(ConflictError);

    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });
});

describe('AuthService — login()', () => {
  let mockUserRepo: UserRepository;
  let service: AuthService;

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: vi.fn(),
      findById:    vi.fn(),
      create:      vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as UserRepository;

    service = new AuthService(mockUserRepo);
  });

  it('nên đăng nhập thành công khi email và mật khẩu chính xác', async () => {
    const rawPassword = 'CorrectPassword123!';
    const passwordHash = await hashPassword(rawPassword);

    const activeUser: User = {
      id:            'user-1',
      email:         'active@shopflow.vn',
      password_hash: passwordHash,
      full_name:     'Nguyễn Văn A',
      role:          'owner',
      status:        'active',
      created_at:    new Date(),
      updated_at:    new Date(),
    };
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValueOnce(activeUser);

    const result = await service.login({
      email:    'active@shopflow.vn',
      password: rawPassword,
    });

    expect(result.user.email).toBe('active@shopflow.vn');
    expect(result.tokens.accessToken).toBeDefined();
  });

  it('nên throw UnauthorizedError khi email không tồn tại', async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValueOnce(null);

    await expect(
      service.login({
        email:    'nonexistent@shopflow.vn',
        password: 'Password123!',
      })
    ).rejects.toThrow(UnauthorizedError);
  });

  it('nên throw UnauthorizedError khi mật khẩu không đúng', async () => {
    const passwordHash = await hashPassword('OriginalPassword123');
    const user: User = {
      id:            'user-1',
      email:         'test@shopflow.vn',
      password_hash: passwordHash,
      full_name:     'Test User',
      role:          'owner',
      status:        'active',
      created_at:    new Date(),
      updated_at:    new Date(),
    };
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValueOnce(user);

    await expect(
      service.login({
        email:    'test@shopflow.vn',
        password: 'WrongPassword123',
      })
    ).rejects.toThrow(UnauthorizedError);
  });

  it('nên throw ForbiddenError khi tài khoản bị khóa (inactive / suspended)', async () => {
    const user: User = {
      id:            'user-locked',
      email:         'locked@shopflow.vn',
      password_hash: 'hash',
      full_name:     'Bị Khóa',
      role:          'staff',
      status:        'suspended',
      created_at:    new Date(),
      updated_at:    new Date(),
    };
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValueOnce(user);

    await expect(
      service.login({
        email:    'locked@shopflow.vn',
        password: 'Password123!',
      })
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('AuthService — refreshToken()', () => {
  let mockUserRepo: UserRepository;
  let service: AuthService;

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: vi.fn(),
      findById:    vi.fn(),
      create:      vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as UserRepository;

    service = new AuthService(mockUserRepo);
  });

  it('nên cấp token mới khi refresh token hợp lệ và tài khoản active', async () => {
    const activeUser: User = {
      id:            'user-refresh-1',
      email:         'refresh@shopflow.vn',
      password_hash: 'hash',
      full_name:     'User Refresh',
      role:          'owner',
      status:        'active',
      created_at:    new Date(),
      updated_at:    new Date(),
    };

    const initialTokens = generateTokens(activeUser);
    vi.mocked(mockUserRepo.findById).mockResolvedValueOnce(activeUser);

    const newTokens = await service.refreshToken(initialTokens.refreshToken);

    expect(newTokens.accessToken).toBeDefined();
    expect(newTokens.refreshToken).toBeDefined();
    expect(mockUserRepo.findById).toHaveBeenCalledWith(activeUser.id);
  });

  it('nên throw UnauthorizedError nếu người dùng không còn tồn tại', async () => {
    const mockUser = {
      id:    'deleted-user-id',
      email: 'deleted@shopflow.vn',
      role:  'staff' as const,
    };
    const tokens = generateTokens(mockUser);
    vi.mocked(mockUserRepo.findById).mockResolvedValueOnce(null);

    await expect(
      service.refreshToken(tokens.refreshToken)
    ).rejects.toThrow(UnauthorizedError);
  });
});
