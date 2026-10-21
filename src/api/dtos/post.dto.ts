/**
 * ShopFlow - Scheduled Post DTOs & Validation Schemas
 * File: backend/src/api/dtos/post.dto.ts
 *
 * Định nghĩa các schemas Zod kiểm thực dữ liệu đầu vào cho tính năng tạo, sửa, đặt lịch xuất bản bài viết.
 */

import { z } from 'zod';

export const PostMediaTypeEnum = z.enum(['none', 'photo', 'video']);
export type PostMediaType = z.infer<typeof PostMediaTypeEnum>;

export const PostStatusEnum = z.enum([
  'pending',
  'scheduled',
  'published',
  'failed',
  'cancelled',
]);
export type PostStatus = z.infer<typeof PostStatusEnum>;

export const CreatePostDtoSchema = z.object({
  page_id: z.string().uuid({ message: 'page_id phải là định dạng UUID hợp lệ' }),
  content_text: z.string().min(1, { message: 'Nội dung bài viết không được để trống' }),
  media_type: PostMediaTypeEnum.default('none'),
  media_urls: z.array(z.string().url({ message: 'URL tệp media không hợp lệ' })).default([]),
  scheduled_time: z
    .string()
    .datetime({ message: 'scheduled_time phải là định dạng ISO 8601 hợp lệ' })
    .refine(
      (val) => new Date(val).getTime() > Date.now(),
      { message: 'Thời gian đặt lịch phải ở trong tương lai' }
    ),
});

export type CreatePostDto = z.infer<typeof CreatePostDtoSchema>;

export const UpdatePostDtoSchema = z.object({
  content_text: z.string().min(1).optional(),
  media_type: PostMediaTypeEnum.optional(),
  media_urls: z.array(z.string().url()).optional(),
  scheduled_time: z
    .string()
    .datetime({ message: 'scheduled_time phải là định dạng ISO 8601 hợp lệ' })
    .refine(
      (val) => new Date(val).getTime() > Date.now(),
      { message: 'Thời gian đặt lịch phải ở trong tương lai' }
    )
    .optional(),
});

export type UpdatePostDto = z.infer<typeof UpdatePostDtoSchema>;

export const QueryPostsDtoSchema = z.object({
  page_id: z.string().optional(),
  status: PostStatusEnum.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryPostsDto = z.infer<typeof QueryPostsDtoSchema>;
