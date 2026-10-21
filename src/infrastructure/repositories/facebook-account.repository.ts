/**
 * ShopFlow - Facebook Account Repository
 * File: backend/src/infrastructure/repositories/facebook-account.repository.ts
 *
 * Tương tác với bảng `facebook_accounts` trong PostgreSQL để quản lý tài khoản Meta cá nhân kết nối.
 */

import { query } from '../database/db.client.js';

export interface FacebookAccount {
  id: string;
  user_id: string;
  fb_user_id: string;
  fb_name: string | null;
  user_access_token: string;
  token_expires_at: Date | null;
  created_at: Date;
}

export class FacebookAccountRepository {
  /**
   * Tạo mới hoặc cập nhật tài khoản Facebook kết nối (Upsert theo fb_user_id).
   */
  async upsert(data: {
    userId: string;
    fbUserId: string;
    fbName: string | null;
    userAccessToken: string;
    tokenExpiresAt: Date | null;
  }): Promise<FacebookAccount> {
    const sql = `
      INSERT INTO facebook_accounts (user_id, fb_user_id, fb_name, user_access_token, token_expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (fb_user_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        fb_name = EXCLUDED.fb_name,
        user_access_token = EXCLUDED.user_access_token,
        token_expires_at = EXCLUDED.token_expires_at
      RETURNING id, user_id, fb_user_id, fb_name, user_access_token, token_expires_at, created_at
    `;
    const result = await query<FacebookAccount>(sql, [
      data.userId,
      data.fbUserId,
      data.fbName,
      data.userAccessToken,
      data.tokenExpiresAt,
    ]);
    const account = result.rows[0];
    if (!account) {
      throw new Error('Không thể lưu thông tin tài khoản Facebook vào cơ sở dữ liệu');
    }
    return account;
  }

  /**
   * Tìm tài khoản Facebook theo User ID của hệ thống ShopFlow.
   */
  async findByUserId(userId: string): Promise<FacebookAccount | null> {
    const sql = `
      SELECT id, user_id, fb_user_id, fb_name, user_access_token, token_expires_at, created_at
      FROM facebook_accounts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await query<FacebookAccount>(sql, [userId]);
    return result.rows[0] ?? null;
  }

  /**
   * Tìm tài khoản Facebook theo Facebook User ID (Meta App-Scoped ID).
   */
  async findByFbUserId(fbUserId: string): Promise<FacebookAccount | null> {
    const sql = `
      SELECT id, user_id, fb_user_id, fb_name, user_access_token, token_expires_at, created_at
      FROM facebook_accounts
      WHERE fb_user_id = $1
      LIMIT 1
    `;
    const result = await query<FacebookAccount>(sql, [fbUserId]);
    return result.rows[0] ?? null;
  }

  /**
   * Xóa tài khoản Facebook của user.
   */
  async deleteByUserId(userId: string): Promise<boolean> {
    const sql = `DELETE FROM facebook_accounts WHERE user_id = $1`;
    const result = await query(sql, [userId]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const facebookAccountRepository = new FacebookAccountRepository();
