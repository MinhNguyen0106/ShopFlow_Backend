/**
 * ShopFlow - Authentication DTOs Unit Tests
 * File: backend/src/api/dtos/__tests__/auth.dto.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  RegisterDtoSchema,
  LoginDtoSchema,
  RefreshTokenDtoSchema,
} from '../auth.dto.js';

describe('Auth DTOs Validation Schemas', () => {
  describe('RegisterDtoSchema', () => {
    it('nên thẩm định thành công khi truyền payload hợp lệ với fullName (camelCase)', () => {
      const payload = {
        email: 'Owner@ShopFlow.vn',
        password: 'Password123',
        fullName: 'Nguyễn Văn Chủ Shop',
      };

      const result = RegisterDtoSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('owner@shopflow.vn');
        expect(result.data.full_name).toBe('Nguyễn Văn Chủ Shop');
        expect(result.data.role).toBe('owner');
      }
    });

    it('nên thẩm định thành công khi truyền payload hợp lệ với full_name (snake_case)', () => {
      const payload = {
        email: 'staff@shopflow.vn',
        password: 'SecurePass2026',
        full_name: 'Trần Thị Nhân Viên',
        role: 'staff',
      };

      const result = RegisterDtoSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.full_name).toBe('Trần Thị Nhân Viên');
        expect(result.data.role).toBe('staff');
      }
    });

    it('nên báo lỗi khi email không đúng định dạng', () => {
      const payload = {
        email: 'invalid-email-string',
        password: 'Password123',
        fullName: 'Nguyễn Văn A',
      };

      const result = RegisterDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailIssue = result.error.issues.find((i) => i.path.includes('email'));
        expect(emailIssue).toBeDefined();
        expect(emailIssue?.message).toContain('Email');
      }
    });

    it('nên báo lỗi khi mật khẩu ngắn hơn 8 ký tự', () => {
      const payload = {
        email: 'user@shopflow.vn',
        password: 'Pass1',
        fullName: 'Nguyễn Văn A',
      };

      const result = RegisterDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passIssue = result.error.issues.find((i) => i.path.includes('password'));
        expect(passIssue).toBeDefined();
        expect(passIssue?.message).toContain('tối thiểu 8 ký tự');
      }
    });

    it('nên báo lỗi khi mật khẩu chỉ chứa chữ cái mà không có số', () => {
      const payload = {
        email: 'user@shopflow.vn',
        password: 'OnlyLettersPassword',
        fullName: 'Nguyễn Văn A',
      };

      const result = RegisterDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passIssue = result.error.issues.find((i) => i.path.includes('password'));
        expect(passIssue).toBeDefined();
        expect(passIssue?.message).toContain('chứa ít nhất một chữ cái và một chữ số');
      }
    });

    it('nên báo lỗi khi họ tên dưới 2 ký tự', () => {
      const payload = {
        email: 'user@shopflow.vn',
        password: 'Password123',
        fullName: 'A',
      };

      const result = RegisterDtoSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameIssue = result.error.issues.find(
          (i) => i.path.includes('full_name') || i.path.includes('fullName')
        );
        expect(nameIssue).toBeDefined();
      }
    });
  });

  describe('LoginDtoSchema', () => {
    it('nên thẩm định thành công với email và password hợp lệ', () => {
      const payload = {
        email: 'TEST@ShopFlow.vn',
        password: 'MyPassword123',
      };

      const result = LoginDtoSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@shopflow.vn');
      }
    });

    it('nên báo lỗi khi thiếu mật khẩu hoặc email', () => {
      const result = LoginDtoSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('RefreshTokenDtoSchema', () => {
    it('nên thẩm định thành công khi có refreshToken', () => {
      const result = RefreshTokenDtoSchema.safeParse({
        refreshToken: 'valid.jwt.refresh.token',
      });
      expect(result.success).toBe(true);
    });

    it('nên báo lỗi khi thiếu refreshToken', () => {
      const result = RefreshTokenDtoSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
