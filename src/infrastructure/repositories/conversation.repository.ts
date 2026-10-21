/**
 * ShopFlow - Conversations Repository
 * File: backend/src/infrastructure/repositories/conversation.repository.ts
 *
 * Tương tác với bảng `conversations` (Hội thoại hợp nhất Messenger Inbox & Comment Thread).
 */

import { query } from '../database/db.client.js';

export interface ConversationDetail {
  id: string;
  page_id: string;
  page_name: string;
  page_fb_id: string;
  customer_id: string;
  customer_fb_id: string;
  customer_name: string | null;
  phone_number: string | null;
  customer_tags: string[];
  type: 'messenger' | 'comment_thread';
  meta_thread_id: string;
  last_message_text: string | null;
  last_message_at: Date;
  window_24h_expires_at: Date | null;
  unread_count: number;
  status: 'open' | 'resolved' | 'archived';
  created_at: Date;
}

export interface ConversationFilterParams {
  userId: string;
  pageId?: string;
  type?: 'messenger' | 'comment_thread';
  status?: 'open' | 'resolved' | 'archived';
  search?: string;
  page?: number;
  limit?: number;
}

export class ConversationRepository {
  /**
   * Truy vấn danh sách hội thoại có phân trang và bộ lọc, kết hợp thông tin Fanpage và Customer.
   */
  async findManyWithFilter(params: ConversationFilterParams): Promise<{
    conversations: ConversationDetail[];
    total: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['p.user_id = $1'];
    const values: unknown[] = [params.userId];
    let idx = 2;

    if (params.pageId) {
      conditions.push(`c.page_id = $${idx++}`);
      values.push(params.pageId);
    }

    if (params.type) {
      conditions.push(`c.type = $${idx++}`);
      values.push(params.type);
    }

    if (params.status) {
      conditions.push(`c.status = $${idx++}`);
      values.push(params.status);
    }

    if (params.search) {
      conditions.push(
        `(cu.customer_name ILIKE $${idx} OR cu.phone_number ILIKE $${idx} OR c.last_message_text ILIKE $${idx})`
      );
      values.push(`%${params.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    // Đếm tổng số bản ghi
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM conversations c
      JOIN connected_pages p ON c.page_id = p.id
      JOIN customers cu ON c.customer_id = cu.id
      WHERE ${whereClause}
    `;
    const countResult = await query<{ total: number }>(countSql, values);
    const total = countResult.rows[0]?.total ?? 0;

    // Lấy dữ liệu phân trang
    const dataSql = `
      SELECT
        c.id,
        c.page_id,
        p.page_name,
        p.page_id AS page_fb_id,
        c.customer_id,
        cu.customer_fb_id,
        cu.customer_name,
        cu.phone_number,
        COALESCE(cu.tags, '[]'::jsonb) AS customer_tags,
        c.type,
        c.meta_thread_id,
        c.last_message_text,
        c.last_message_at,
        c.window_24h_expires_at,
        c.unread_count,
        c.status,
        c.created_at
      FROM conversations c
      JOIN connected_pages p ON c.page_id = p.id
      JOIN customers cu ON c.customer_id = cu.id
      WHERE ${whereClause}
      ORDER BY c.last_message_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const dataResult = await query<ConversationDetail>(dataSql, [...values, limit, offset]);

    return {
      conversations: dataResult.rows,
      total,
    };
  }

  /**
   * Lấy chi tiết hội thoại kèm quyền sở hữu của user.
   */
  async findByIdAndUserId(
    conversationId: string,
    userId: string
  ): Promise<ConversationDetail | null> {
    const sql = `
      SELECT
        c.id,
        c.page_id,
        p.page_name,
        p.page_id AS page_fb_id,
        c.customer_id,
        cu.customer_fb_id,
        cu.customer_name,
        cu.phone_number,
        COALESCE(cu.tags, '[]'::jsonb) AS customer_tags,
        c.type,
        c.meta_thread_id,
        c.last_message_text,
        c.last_message_at,
        c.window_24h_expires_at,
        c.unread_count,
        c.status,
        c.created_at
      FROM conversations c
      JOIN connected_pages p ON c.page_id = p.id
      JOIN customers cu ON c.customer_id = cu.id
      WHERE c.id = $1 AND p.user_id = $2
      LIMIT 1
    `;
    const result = await query<ConversationDetail>(sql, [conversationId, userId]);
    return result.rows[0] ?? null;
  }

  /**
   * Cập nhật trạng thái hội thoại (open, resolved, archived).
   */
  async updateStatus(
    conversationId: string,
    status: 'open' | 'resolved' | 'archived'
  ): Promise<ConversationDetail | null> {
    const sql = `
      UPDATE conversations
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await query<ConversationDetail>(sql, [status, conversationId]);
    return result.rows[0] ?? null;
  }

  /**
   * Đánh dấu cuộc hội thoại đã đọc (reset unread_count = 0).
   */
  async markAsRead(conversationId: string): Promise<boolean> {
    const sql = `
      UPDATE conversations
      SET unread_count = 0
      WHERE id = $1
    `;
    const result = await query(sql, [conversationId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Cập nhật bản xem trước tin nhắn cuối cùng và hạn cửa sổ 24h.
   */
  async updateLastMessage(
    conversationId: string,
    lastMessageText: string,
    window24hExpiresAt?: Date | null
  ): Promise<void> {
    const sql = `
      UPDATE conversations
      SET
        last_message_text = $1,
        last_message_at = CURRENT_TIMESTAMP,
        window_24h_expires_at = COALESCE($2, window_24h_expires_at)
      WHERE id = $3
    `;
    await query(sql, [lastMessageText, window24hExpiresAt ?? null, conversationId]);
  }
}

export const conversationRepository = new ConversationRepository();
