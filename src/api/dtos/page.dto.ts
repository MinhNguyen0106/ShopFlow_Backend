/**
 * ShopFlow - Connected Pages DTOs & Validation Schemas
 * File: backend/src/api/dtos/page.dto.ts
 */

import { z } from 'zod';

export const UpdatePageStatusDtoSchema = z.object({
  is_active: z.boolean({ required_error: 'Trường is_active là bắt buộc' }),
});

export type UpdatePageStatusDto = z.infer<typeof UpdatePageStatusDtoSchema>;
