/**
 * ShopFlow - User Repository (PostgreSQL / db.client)
 * File: backend/src/infrastructure/repositories/user.repository.ts
 *
 * Thực hiện truy vấn dữ liệu bảng `users` sử dụng db.client.ts (Prepared Statements).
 */

import { query } from '../database/db.client.js';
import { User, UserRole } from '../../core/entities/user.entity.js';

export interface CreateUserData {
  email:         string;
  password_hash: string;
  full_name:     string;
  role?:         UserRole;
}

export class UserRepository {
  /**
   * Tìm người dùng theo email (case-insensitive).
   */
  async findByEmail(email: string): Promise<User | null> {
    const sql = `
      SELECT id, email, password_hash, full_name, role, status, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `;
    const result = await query<User>(sql, [email.trim()]);
    return result.rows[0] ?? null;
  }

  /**
   * Tìm người dùng theo ID (UUID).
   */
  async findById(id: string): Promise<User | null> {
    const sql = `
      SELECT id, email, password_hash, full_name, role, status, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `;
    const result = await query<User>(sql, [id]);
    return result.rows[0] ?? null;
  }

  /**
   * Tạo mới một người dùng trong hệ thống.
   */
  async create(data: CreateUserData): Promise<User> {
    const sql = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, password_hash, full_name, role, status, created_at, updated_at
    `;
    const params = [
      data.email.toLowerCase().trim(),
      data.password_hash,
      data.full_name.trim(),
      data.role ?? 'owner',
    ];
    const result = await query<User>(sql, params);
    const user = result.rows[0];
    if (!user) {
      throw new Error('[UserRepository] Không thể tạo bản ghi người dùng mới');
    }
    return user;
  }

  /**
   * Cập nhật thông tin người dùng.
   */
  async updateStatus(id: string, status: User['status']): Promise<User | null> {
    const sql = `
      UPDATE users
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, password_hash, full_name, role, status, created_at, updated_at
    `;
    const result = await query<User>(sql, [status, id]);
    return result.rows[0] ?? null;
  }
}

// Export singleton instance để tái sử dụng
export const userRepository = new UserRepository();
