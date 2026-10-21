/**
 * ShopFlow - Centralized Inbox DTOs
 * File: backend/src/api/dtos/inbox.dto.ts
 *
 * Định nghĩa Zod Schemas và Types cho các yêu cầu Hộp thư tập trung (/api/v1/inbox).
 */

import { z } from 'zod';

export const QueryConversationsDtoSchema = z.object({
  page_id: z.string().uuid('page_id phải là định dạng UUID').optional(),
  type: z.enum(['messenger', 'comment_thread']).optional(),
  status: z.enum(['open', 'resolved', 'archived']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryConversationsDto = z.infer<typeof QueryConversationsDtoSchema>;

export const QueryMessagesDtoSchema = z.object({
  cursor: z.string().optional(), // ISO datetime string cursor
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type QueryMessagesDto = z.infer<typeof QueryMessagesDtoSchema>;

export const SendMessageDtoSchema = z.object({
  content: z
    .string({ required_error: 'Nội dung tin nhắn không được để trống' })
    .trim()
    .min(1, 'Nội dung tin nhắn không được để trống')
    .max(2000, 'Nội dung tin nhắn tối đa 2000 ký tự'),
  media_url: z.string().url('media_url phải là đường dẫn URL hợp lệ').optional(),
});

export type SendMessageDto = z.infer<typeof SendMessageDtoSchema>;

export const PrivateReplyDtoSchema = z.object({
  content: z
    .string({ required_error: 'Nội dung tin nhắn riêng không được để trống' })
    .trim()
    .min(1, 'Nội dung tin nhắn riêng không được để trống')
    .max(2000, 'Nội dung tin nhắn riêng tối đa 2000 ký tự'),
});

export type PrivateReplyDto = z.infer<typeof PrivateReplyDtoSchema>;

export const HideMessageDtoSchema = z.object({
  is_hidden: z.boolean({ required_error: 'is_hidden là bắt buộc (true hoặc false)' }),
});

export type HideMessageDto = z.infer<typeof HideMessageDtoSchema>;

export const UpdateConversationStatusDtoSchema = z.object({
  status: z.enum(['open', 'resolved', 'archived'], {
    errorMap: () => ({ message: 'status phải là open, resolved hoặc archived' }),
  }),
});

export type UpdateConversationStatusDto = z.infer<typeof UpdateConversationStatusDtoSchema>;

export const UpdateCustomerDtoSchema = z.object({
  customer_name: z.string().max(255).optional(),
  phone_number: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  tags: z.array(z.string().min(1)).optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateCustomerDto = z.infer<typeof UpdateCustomerDtoSchema>;
