/**
 * ShopFlow - Webhook Logs Repository
 * File: backend/src/infrastructure/repositories/webhook-log.repository.ts
 *
 * Tương tác với bảng `webhook_logs` trong PostgreSQL để lưu vết và hỗ trợ Idempotency.
 */

import { query } from '../database/db.client.js';

export interface WebhookLog {
  id:         string;
  event_id:   string;
  page_id:    string | null;
  event_type: string;
  payload:    unknown;
  status:     'pending' | 'processed' | 'failed';
  created_at: Date;
}

export interface CreateWebhookLogData {
  event_id:   string;
  page_id?:   string;
  event_type: string;
  payload:    unknown;
}

export class WebhookLogRepository {
  /**
   * Lưu log sự kiện webhook. Nếu event_id đã tồn tại (idempotency conflict),
   * không báo lỗi mà trả về bản ghi hiện có.
   */
  async create(data: CreateWebhookLogData): Promise<WebhookLog | null> {
    const sql = `
      INSERT INTO webhook_logs (event_id, page_id, event_type, payload, status)
      VALUES ($1, $2, $3, $4, 'pending')
      ON CONFLICT (event_id) DO NOTHING
      RETURNING id, event_id, page_id, event_type, payload, status, created_at
    `;
    const params = [
      data.event_id,
      data.page_id ?? null,
      data.event_type,
      JSON.stringify(data.payload),
    ];

    const result = await query<WebhookLog>(sql, params);
    if (result.rows.length > 0) {
      return result.rows[0] ?? null;
    }

    // Nếu ON CONFLICT DO NOTHING kích hoạt (đã tồn tại), truy vấn lại bản ghi cũ
    return this.findByEventId(data.event_id);
  }

  /**
   * Tìm log webhook theo event_id.
   */
  async findByEventId(eventId: string): Promise<WebhookLog | null> {
    const sql = `
      SELECT id, event_id, page_id, event_type, payload, status, created_at
      FROM webhook_logs
      WHERE event_id = $1
      LIMIT 1
    `;
    const result = await query<WebhookLog>(sql, [eventId]);
    return result.rows[0] ?? null;
  }

  /**
   * Cập nhật trạng thái xử lý của event ('pending' -> 'processed' / 'failed').
   */
  async updateStatus(
    eventId: string,
    status: WebhookLog['status']
  ): Promise<WebhookLog | null> {
    const sql = `
      UPDATE webhook_logs
      SET status = $1
      WHERE event_id = $2
      RETURNING id, event_id, page_id, event_type, payload, status, created_at
    `;
    const result = await query<WebhookLog>(sql, [status, eventId]);
    return result.rows[0] ?? null;
  }
}

export const webhookLogRepository = new WebhookLogRepository();
