/**
 * ShopFlow - Automation Rules DTOs & Validation Schemas
 * File: backend/src/api/dtos/automation-rule.dto.ts
 */

import { z } from 'zod';

export const CreateAutomationRuleDtoSchema = z.object({
  rule_name: z.string().min(1, 'Tên quy tắc không được để trống').max(100, 'Tên quy tắc tối đa 100 ký tự'),
  hide_phone_enabled: z.boolean().default(true),
  trigger_keywords: z
    .array(z.string().min(1, 'Từ khóa không được để trống'))
    .min(1, 'Cần ít nhất 1 từ khóa kích hoạt')
    .default(['giá', 'tư vấn', 'pm', 'inbox', 'bao nhiêu']),
  auto_comment_template: z.string().nullable().optional(),
  auto_private_reply_template: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export type CreateAutomationRuleDto = z.infer<typeof CreateAutomationRuleDtoSchema>;

export const UpdateAutomationRuleDtoSchema = CreateAutomationRuleDtoSchema.partial();

export type UpdateAutomationRuleDto = z.infer<typeof UpdateAutomationRuleDtoSchema>;
