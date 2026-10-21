/**
 * ShopFlow - Messages & Comments Repository
 * File: backend/src/infrastructure/repositories/message-comment.repository.ts
 *
 * Quản lý lưu trữ bình luận Facebook và tin nhắn trong bảng `conversations` và `messages_and_comments`.
 */

import { query } from '../database/db.client.js';

export interface Conversation {
  id: string;
  page_id: string;
  customer_id: string;
  type: 'messenger' | 'comment_thread';
  meta_thread_id: string;
  last_message_text: string | null;
  status: 'open' | 'resolved' | 'archived';
}

export interface MessageOrComment {
  id: string;
  conversation_id: string;
  page_id: string;
  meta_id: string;
  sender_type: 'customer' | 'page' | 'system';
  sender_fb_id: string;
  content: string | null;
  is_hidden: boolean;
  private_reply_sent: boolean;
  media_payload: unknown;
  created_at: Date;
}

export interface SaveCommentParams {
  pageInternalId: string;
  customerId: string;
  metaThreadId: string; // Facebook Post ID hoặc Parent Comment ID
  commentId: string;    // Facebook Comment ID (meta_id)
  senderFbId: string;
  content: string;
  isHidden: boolean;
}

export class MessageCommentRepository {
  /**
   * Đảm bảo cuộc hội thoại (comment thread) đã tồn tại. Nếu chưa thì tạo mới.
   */
  async ensureConversation(
    pageInternalId: string,
    customerId: string,
    metaThreadId: string,
    type: 'comment_thread' | 'messenger' = 'comment_thread'
  ): Promise<Conversation> {
    const sql = `
      INSERT INTO conversations (page_id, customer_id, type, meta_thread_id, status)
      VALUES ($1, $2, $3, $4, 'open')
      ON CONFLICT (meta_thread_id) DO UPDATE
      SET last_message_at = CURRENT_TIMESTAMP
      RETURNING id, page_id, customer_id, type, meta_thread_id, last_message_text, status
    `;

    const result = await query<Conversation>(sql, [
      pageInternalId,
      customerId,
      type,
      metaThreadId,
    ]);

    return result.rows[0]!;
  }

  /**
   * Lưu bình luận vào bảng messages_and_comments.
   * Nếu meta_id đã tồn tại, cập nhật cờ is_hidden và content.
   */
  async saveComment(params: SaveCommentParams): Promise<MessageOrComment> {
    // 1. Đảm bảo conversation tồn tại
    const conversation = await this.ensureConversation(
      params.pageInternalId,
      params.customerId,
      params.metaThreadId,
      'comment_thread'
    );

    // 2. Lưu/cập nhật bản ghi bình luận
    const sql = `
      INSERT INTO messages_and_comments (
        conversation_id, page_id, meta_id, sender_type, sender_fb_id, content, is_hidden
      )
      VALUES ($1, $2, $3, 'customer', $4, $5, $6)
      ON CONFLICT (meta_id) DO UPDATE
      SET
        is_hidden = EXCLUDED.is_hidden,
        content = EXCLUDED.content
      RETURNING id, conversation_id, page_id, meta_id, sender_type, sender_fb_id, content, is_hidden, private_reply_sent, media_payload, created_at
    `;

    const result = await query<MessageOrComment>(sql, [
      conversation.id,
      params.pageInternalId,
      params.commentId,
      params.senderFbId,
      params.content,
      params.isHidden,
    ]);

    // 3. Cập nhật preview tin nhắn cuối trong conversation
    await query(
      `UPDATE conversations SET last_message_text = $1, last_message_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [params.content, conversation.id]
    ).catch(() => {});

    return result.rows[0]!;
  }

  /**
   * Đánh dấu bình luận đã được gửi Private Reply qua Messenger.
   */
  async markPrivateReplySent(commentMetaId: string): Promise<boolean> {
    const sql = `UPDATE messages_and_comments SET private_reply_sent = TRUE WHERE meta_id = $1`;
    const result = await query(sql, [commentMetaId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Kiểm tra xem bình luận đã được gửi Private Reply trước đó hay chưa.
   */
  async isPrivateReplySent(commentMetaId: string): Promise<boolean> {
    const sql = `SELECT private_reply_sent FROM messages_and_comments WHERE meta_id = $1 LIMIT 1`;
    const result = await query<{ private_reply_sent: boolean }>(sql, [commentMetaId]);
    return result.rows[0]?.private_reply_sent ?? false;
  }

  /**
   * Lấy danh sách tin nhắn/bình luận theo cursor pagination (dựa trên created_at giảm dần).
   */
  async findMessagesByConversation(
    conversationId: string,
    cursor?: string,
    limit: number = 50
  ): Promise<{
    messages: MessageOrComment[];
    nextCursor: string | null;
  }> {
    const safeLimit = Math.max(1, Math.min(100, limit));
    const conditions: string[] = ['conversation_id = $1'];
    const values: unknown[] = [conversationId];
    let idx = 2;

    if (cursor) {
      conditions.push(`created_at < $${idx++}`);
      values.push(new Date(cursor));
    }

    const whereClause = conditions.join(' AND ');
    // Lấy dư 1 bản ghi để xác định nextCursor
    const sql = `
      SELECT id, conversation_id, page_id, meta_id, sender_type, sender_fb_id, content, is_hidden, private_reply_sent, media_payload, created_at
      FROM messages_and_comments
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx}
    `;

    values.push(safeLimit + 1);
    const result = await query<MessageOrComment>(sql, values);
    const rows = result.rows;

    let nextCursor: string | null = null;
    if (rows.length > safeLimit) {
      const extraItem = rows.pop(); // Gỡ bản ghi thứ safeLimit + 1
      nextCursor = extraItem?.created_at ? new Date(extraItem.created_at).toISOString() : null;
    }

    return {
      messages: rows,
      nextCursor,
    };
  }

  /**
   * Lấy chi tiết tin nhắn theo ID.
   */
  async findById(messageId: string): Promise<MessageOrComment | null> {
    const sql = `
      SELECT id, conversation_id, page_id, meta_id, sender_type, sender_fb_id, content, is_hidden, private_reply_sent, media_payload, created_at
      FROM messages_and_comments
      WHERE id = $1
      LIMIT 1
    `;
    const result = await query<MessageOrComment>(sql, [messageId]);
    return result.rows[0] ?? null;
  }

  /**
   * Lấy chi tiết tin nhắn kèm Fanpage và kiểm tra quyền sở hữu của user.
   */
  async findByIdWithPage(
    messageId: string,
    userId: string
  ): Promise<(MessageOrComment & { page_access_token: string; page_fb_id: string }) | null> {
    const sql = `
      SELECT
        m.id, m.conversation_id, m.page_id, m.meta_id, m.sender_type, m.sender_fb_id,
        m.content, m.is_hidden, m.private_reply_sent, m.media_payload, m.created_at,
        p.page_access_token, p.page_id AS page_fb_id
      FROM messages_and_comments m
      JOIN connected_pages p ON m.page_id = p.id
      WHERE m.id = $1 AND p.user_id = $2
      LIMIT 1
    `;
    const result = await query<MessageOrComment & { page_access_token: string; page_fb_id: string }>(sql, [
      messageId,
      userId,
    ]);
    return result.rows[0] ?? null;
  }

  /**
   * Tạo tin nhắn mới từ trang (page reply).
   */
  async createPageMessage(params: {
    conversationId: string;
    pageId: string;
    metaId: string;
    senderFbId: string;
    content: string;
    mediaPayload?: Record<string, unknown>;
  }): Promise<MessageOrComment> {
    const sql = `
      INSERT INTO messages_and_comments (
        conversation_id, page_id, meta_id, sender_type, sender_fb_id, content, media_payload, created_at
      )
      VALUES ($1, $2, $3, 'page', $4, $5, $6::jsonb, CURRENT_TIMESTAMP)
      RETURNING id, conversation_id, page_id, meta_id, sender_type, sender_fb_id, content, is_hidden, private_reply_sent, media_payload, created_at
    `;
    const result = await query<MessageOrComment>(sql, [
      params.conversationId,
      params.pageId,
      params.metaId,
      params.senderFbId,
      params.content,
      JSON.stringify(params.mediaPayload ?? {}),
    ]);
    return result.rows[0]!;
  }

  /**
   * Cập nhật trạng thái ẩn/hiện của bình luận.
   */
  async updateHideStatus(messageId: string, isHidden: boolean): Promise<MessageOrComment | null> {
    const sql = `
      UPDATE messages_and_comments
      SET is_hidden = $1
      WHERE id = $2
      RETURNING id, conversation_id, page_id, meta_id, sender_type, sender_fb_id, content, is_hidden, private_reply_sent, media_payload, created_at
    `;
    const result = await query<MessageOrComment>(sql, [isHidden, messageId]);
    return result.rows[0] ?? null;
  }
}

export const messageCommentRepository = new MessageCommentRepository();

