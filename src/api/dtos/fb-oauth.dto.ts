/**
 * ShopFlow - Facebook OAuth DTOs & Validation Schemas
 * File: backend/src/api/dtos/fb-oauth.dto.ts
 */

import { z } from 'zod';

export const ConnectPagesDtoSchema = z.object({
  page_ids: z.array(z.string().min(1, 'Page ID không được để trống')).min(1, 'Cần ít nhất một Page ID để kết nối'),
});

export type ConnectPagesDto = z.infer<typeof ConnectPagesDtoSchema>;

export const OAuthCallbackQuerySchema = z.object({
  code: z.string().min(1, 'Mã authorization code không được để trống'),
  state: z.string().min(1, 'CSRF state token không được để trống'),
});

export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;
