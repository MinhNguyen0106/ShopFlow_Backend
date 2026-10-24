/**
 * ShopFlow - Page Member DTOs & Validation Schemas
 * File: backend/src/api/dtos/page-member.dto.ts
 */

import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z
    .string({ required_error: 'Địa chỉ email là bắt buộc' })
    .email('Địa chỉ email không đúng định dạng')
    .toLowerCase()
    .trim(),
  role: z.enum(['manager', 'staff'], {
    errorMap: () => ({ message: 'Vai trò chỉ có thể là manager hoặc staff' }),
  }),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'manager', 'staff'], {
    errorMap: () => ({ message: 'Vai trò không hợp lệ (hỗ trợ: owner, manager, staff)' }),
  }),
});

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
