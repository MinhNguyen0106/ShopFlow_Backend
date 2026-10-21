/**
 * ShopFlow - Meta Webhook DTOs & Normalizer
 * File: backend/src/api/dtos/webhook.dto.ts
 *
 * Định nghĩa cấu trúc dữ liệu payload gửi từ Meta Webhooks (Feed, Comments, Messenger).
 */

import crypto from 'node:crypto';
import { z } from 'zod';

export const WebhookHandshakeQuerySchema = z.object({
  'hub.mode':         z.string().optional(),
  'hub.challenge':    z.string().optional(),
  'hub.verify_token': z.string().optional(),
});

export type WebhookHandshakeQuery = z.infer<typeof WebhookHandshakeQuerySchema>;

export interface MetaWebhookChangeValue {
  item?:         string; // 'comment', 'post', 'status', etc.
  verb?:         string; // 'add', 'edit', 'remove', etc.
  comment_id?:   string;
  parent_id?:    string;
  post_id?:      string;
  message?:      string;
  from?: {
    id:    string;
    name?: string;
  };
  created_time?: number;
  [key: string]: unknown;
}

export interface MetaWebhookChange {
  field: string; // 'feed', 'mention', etc.
  value: MetaWebhookChangeValue;
}

export interface MetaWebhookMessagingItem {
  sender?:    { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: {
    mid:          string;
    text?:        string;
    attachments?: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MetaWebhookEntry {
  id:         string; // Fanpage ID
  time:       number;
  changes?:   MetaWebhookChange[];
  messaging?: MetaWebhookMessagingItem[];
}

export interface MetaWebhookPayload {
  object: string; // Thường là 'page'
  entry:  MetaWebhookEntry[];
}

/**
 * Sự kiện chuẩn hóa trích xuất từ payload thô để lưu DB và đẩy hàng đợi
 */
export interface NormalizedWebhookEvent {
  eventId:   string; // Idempotency key (comment_id, mid, hoặc sha256 hash)
  pageId?:   string; // Meta Page ID
  eventType: 'comment' | 'message' | 'feed' | 'reaction' | 'unknown';
  payload:   unknown;
}

/**
 * Phân tích và trích xuất danh sách các sự kiện đơn lẻ từ Meta webhook payload.
 */
export function extractWebhookEvents(payload: MetaWebhookPayload): NormalizedWebhookEvent[] {
  const events: NormalizedWebhookEvent[] = [];

  if (!payload || !Array.isArray(payload.entry)) {
    return events;
  }

  for (const entry of payload.entry) {
    const pageId = entry.id;

    // 1. Trích xuất sự kiện Messenger (Tin nhắn khách hàng)
    if (Array.isArray(entry.messaging)) {
      for (const item of entry.messaging) {
        const mid = item.message?.mid;
        const eventId = mid || crypto
          .createHash('sha256')
          .update(`${pageId}-${entry.time}-${JSON.stringify(item)}`)
          .digest('hex');

        events.push({
          eventId,
          pageId,
          eventType: 'message',
          payload:   item,
        });
      }
    }

    // 2. Trích xuất sự kiện Page Feed (Bình luận, bài đăng)
    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        const val = change.value;
        const commentId = val?.comment_id;
        const postId = val?.post_id;
        const eventId = commentId || postId || crypto
          .createHash('sha256')
          .update(`${pageId}-${entry.time}-${JSON.stringify(change)}`)
          .digest('hex');

        let eventType: NormalizedWebhookEvent['eventType'] = 'feed';
        if (val?.item === 'comment' || !!commentId) {
          eventType = 'comment';
        } else if (val?.item === 'reaction') {
          eventType = 'reaction';
        }

        events.push({
          eventId,
          pageId,
          eventType,
          payload: val,
        });
      }
    }
  }

  return events;
}
