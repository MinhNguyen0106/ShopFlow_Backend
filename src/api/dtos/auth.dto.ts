/**
 * ShopFlow - Authentication DTOs & Validation Schemas
 * File: backend/src/api/dtos/auth.dto.ts
 *
 * Định nghĩa các schema thẩm định và kiểu dữ liệu cho luồng xác thực người dùng.
 */

import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z
    .string({ required_error: 'Email không được để trống' })
    .email('Email không đúng định dạng')
    .max(255, 'Email không được vượt quá 255 ký tự')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Mật khẩu không được để trống' })
    .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
    .max(128, 'Mật khẩu không được vượt quá 128 ký tự')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)/,
      'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số'
    ),
  full_name: z
    .string({ required_error: 'Họ và tên không được để trống' })
    .min(2, 'Họ và tên tối thiểu 2 ký tự')
    .max(100, 'Họ và tên tối đa 100 ký tự')
    .trim(),
  role: z.enum(['owner', 'admin', 'staff']).optional().default('owner'),
});

export const RegisterDtoSchema = z.preprocess(
  (input) => {
    if (input && typeof input === 'object' && !('full_name' in input) && 'fullName' in input) {
      return { ...input, full_name: (input as { fullName?: unknown }).fullName };
    }
    return input;
  },
  RegisterSchema
);

export type RegisterDto = z.input<typeof RegisterSchema>;

export const LoginDtoSchema = z.object({
  email: z
    .string({ required_error: 'Email không được để trống' })
    .email('Email không đúng định dạng')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Mật khẩu không được để trống' })
    .min(1, 'Mật khẩu không được để trống'),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;

export const RefreshTokenDtoSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token không được để trống' })
    .min(1, 'Refresh token không được để trống'),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;
