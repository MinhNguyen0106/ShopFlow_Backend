/**
 * ShopFlow - Connected Pages Repository
 * File: backend/src/infrastructure/repositories/connected-page.repository.ts
 *
 * Tương tác với bảng `connected_pages` trong PostgreSQL để quản lý Fanpage kết nối.
 */

import { query } from '../database/db.client.js';

export interface ConnectedPage {
  id: string;
  user_id: string;
  fb_account_id?: string | null;
  page_id: string;
  page_name: string;
  avatar_url?: string | null;
  page_access_token: string;
  is_active: boolean;
  webhook_subscribed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PageStats {
  totalPosts: number;
  totalConversations: number;
}

export class ConnectedPageRepository {
  /**
   * Tạo mới hoặc cập nhật thông tin Fanpage kết nối (Upsert theo page_id).
   */
  async upsert(data: {
    userId: string;
    fbAccountId?: string | null;
    pageId: string;
    pageName: string;
    avatarUrl?: string | null;
    pageAccessToken: string;
    isActive?: boolean;
    webhookSubscribed?: boolean;
  }): Promise<ConnectedPage> {
    const sql = `
      INSERT INTO connected_pages (
        user_id, fb_account_id, page_id, page_name, avatar_url, page_access_token, is_active, webhook_subscribed
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (page_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        fb_account_id = EXCLUDED.fb_account_id,
        page_name = EXCLUDED.page_name,
        avatar_url = EXCLUDED.avatar_url,
        page_access_token = EXCLUDED.page_access_token,
        is_active = EXCLUDED.is_active,
        webhook_subscribed = EXCLUDED.webhook_subscribed,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, fb_account_id, page_id, page_name, avatar_url, page_access_token, is_active, webhook_subscribed, created_at, updated_at
    `;
    const result = await query<ConnectedPage>(sql, [
      data.userId,
      data.fbAccountId ?? null,
      data.pageId,
      data.pageName,
      data.avatarUrl ?? null,
      data.pageAccessToken,
      data.isActive ?? true,
      data.webhookSubscribed ?? false,
    ]);
    const page = result.rows[0];
    if (!page) {
      throw new Error('Không thể lưu thông tin Fanpage vào cơ sở dữ liệu');
    }
    return page;
  }

  /**
   * Tìm Fanpage theo ID nội bộ (UUID) hoặc Meta Page ID.
   */
  async findById(id: string): Promise<ConnectedPage | null> {
    const sql = `
      SELECT id, user_id, fb_account_id, page_id, page_name, avatar_url, page_access_token, is_active, webhook_subscribed, created_at, updated_at
      FROM connected_pages
      WHERE id::text = $1 OR page_id = $1
      LIMIT 1
    `;
    const result = await query<ConnectedPage>(sql, [id]);
    return result.rows[0] ?? null;
  }

  /**
   * Tìm Fanpage theo Meta Page ID.
   */
  async findByPageId(pageId: string): Promise<ConnectedPage | null> {
    const sql = `
      SELECT id, user_id, fb_account_id, page_id, page_name, avatar_url, page_access_token, is_active, webhook_subscribed, created_at, updated_at
      FROM connected_pages
      WHERE page_id = $1
      LIMIT 1
    `;
    const result = await query<ConnectedPage>(sql, [pageId]);
    return result.rows[0] ?? null;
  }

  /**
   * Tìm Fanpage theo Meta Page ID và User ID sở hữu.
   */
  async findByPageIdAndUserId(pageId: string, userId: string): Promise<ConnectedPage | null> {
    const sql = `
      SELECT id, user_id, fb_account_id, page_id, page_name, avatar_url, page_access_token, is_active, webhook_subscribed, created_at, updated_at
      FROM connected_pages
      WHERE (page_id = $1 OR id::text = $1) AND user_id = $2
      LIMIT 1
    `;
    const result = await query<ConnectedPage>(sql, [pageId, userId]);
    return result.rows[0] ?? null;
  }

  /**
   * Lấy toàn bộ danh sách Fanpage thuộc về một User.
   */
  async findAllByUserId(userId: string): Promise<ConnectedPage[]> {
    const sql = `
      SELECT id, user_id, fb_account_id, page_id, page_name, avatar_url, page_access_token, is_active, webhook_subscribed, created_at, updated_at
      FROM connected_pages
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query<ConnectedPage>(sql, [userId]);
    return result.rows;
  }

  /**
   * Cập nhật trạng thái kích hoạt (is_active) của Fanpage.
   */
  async updateStatus(pageId: string, userId: string, isActive: boolean): Promise<ConnectedPage | null> {
    const sql = `
      UPDATE connected_pages
      SET is_active = $3, updated_at = CURRENT_TIMESTAMP
      WHERE (page_id = $1 OR id::text = $1) AND user_id = $2
      RETURNING id, user_id, fb_account_id, page_id, page_name, avatar_url, page_access_token, is_active, webhook_subscribed, created_at, updated_at
    `;
    const result = await query<ConnectedPage>(sql, [pageId, userId, isActive]);
    return result.rows[0] ?? null;
  }

  /**
   * Cập nhật cờ webhook_subscribed khi đăng ký Webhook với Meta thành công.
   */
  async updateWebhookSubscribed(pageId: string, subscribed: boolean): Promise<ConnectedPage | null> {
    const sql = `
      UPDATE connected_pages
      SET webhook_subscribed = $2, updated_at = CURRENT_TIMESTAMP
      WHERE page_id = $1 OR id::text = $1
      RETURNING id, user_id, fb_account_id, page_id, page_name, avatar_url, page_access_token, is_active, webhook_subscribed, created_at, updated_at
    `;
    const result = await query<ConnectedPage>(sql, [pageId, subscribed]);
    return result.rows[0] ?? null;
  }

  /**
   * Lấy số liệu thống kê cơ bản của Fanpage (Tổng bài viết, Tổng hội thoại).
   */
  async getPageStats(pageDbId: string): Promise<PageStats> {
    const sql = `
      SELECT
        (SELECT COUNT(*)::int FROM posts_schedule WHERE page_id = $1) AS total_posts,
        (SELECT COUNT(*)::int FROM conversations WHERE page_id = $1) AS total_conversations
    `;
    const result = await query<{ total_posts: number; total_conversations: number }>(sql, [pageDbId]);
    const row = result.rows[0];
    return {
      totalPosts: row?.total_posts ?? 0,
      totalConversations: row?.total_conversations ?? 0,
    };
  }

  /**
   * Hủy kết nối / Xóa Fanpage khỏi hệ thống.
   */
  async deleteByPageIdAndUserId(pageId: string, userId: string): Promise<boolean> {
    const sql = `
      DELETE FROM connected_pages
      WHERE (page_id = $1 OR id::text = $1) AND user_id = $2
    `;
    const result = await query(sql, [pageId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Lấy Page Access Token của Fanpage.
   */
  async getAccessToken(pageId: string): Promise<string | null> {
    const page = await this.findByPageId(pageId);
    return page?.page_access_token ?? null;
  }
}

export const connectedPageRepository = new ConnectedPageRepository();
