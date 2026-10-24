/**
 * ShopFlow - Page Member Repository
 * File: backend/src/infrastructure/repositories/page-member.repository.ts
 *
 * Thực hiện truy vấn dữ liệu bảng `page_members` quản lý phân quyền thành viên Fanpage.
 */

import { query } from '../database/db.client.js';

export type PageRole = 'owner' | 'manager' | 'staff';
export type PageMemberStatus = 'active' | 'pending' | 'revoked';

export interface PageMember {
  id: string;
  page_id: string;
  user_id: string;
  role: PageRole;
  invited_by: string | null;
  status: PageMemberStatus;
  created_at: Date;
  updated_at: Date;
}

export interface PageMemberWithUser extends PageMember {
  email: string;
  full_name: string;
}

export interface CreatePageMemberData {
  pageId: string;
  userId: string;
  role: PageRole;
  invitedBy?: string | null;
  status?: PageMemberStatus;
}

export class PageMemberRepository {
  /**
   * Tìm thành viên theo ID bảng page_members.
   */
  async findById(id: string): Promise<PageMember | null> {
    const sql = `
      SELECT id, page_id, user_id, role, invited_by, status, created_at, updated_at
      FROM page_members
      WHERE id = $1
      LIMIT 1
    `;
    const result = await query<PageMember>(sql, [id]);
    return result.rows[0] ?? null;
  }

  /**
   * Tìm thành viên theo Page ID (hỗ trợ cả UUID lẫn Meta page_id) và User ID.
   */
  async findByPageAndUser(pageId: string, userId: string): Promise<PageMember | null> {
    const sql = `
      SELECT pm.id, pm.page_id, pm.user_id, pm.role, pm.invited_by, pm.status, pm.created_at, pm.updated_at
      FROM page_members pm
      JOIN connected_pages cp ON cp.id = pm.page_id
      WHERE (cp.id::text = $1 OR cp.page_id = $1) AND pm.user_id = $2
      LIMIT 1
    `;
    const result = await query<PageMember>(sql, [pageId, userId]);
    return result.rows[0] ?? null;
  }

  /**
   * Lấy danh sách thành viên của Fanpage kèm thông tin tài khoản (email, tên).
   */
  async listByPageId(pageId: string): Promise<PageMemberWithUser[]> {
    const sql = `
      SELECT pm.id, pm.page_id, pm.user_id, pm.role, pm.invited_by, pm.status, pm.created_at, pm.updated_at,
             u.email, u.full_name
      FROM page_members pm
      JOIN connected_pages cp ON cp.id = pm.page_id
      JOIN users u ON u.id = pm.user_id
      WHERE (cp.id::text = $1 OR cp.page_id = $1)
      ORDER BY 
        CASE pm.role 
          WHEN 'owner' THEN 1 
          WHEN 'manager' THEN 2 
          WHEN 'staff' THEN 3 
          ELSE 4 
        END, 
        pm.created_at ASC
    `;
    const result = await query<PageMemberWithUser>(sql, [pageId]);
    return result.rows;
  }

  /**
   * Tạo mới một thành viên cho Fanpage.
   */
  async createMember(data: CreatePageMemberData): Promise<PageMember> {
    const sql = `
      INSERT INTO page_members (page_id, user_id, role, invited_by, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, page_id, user_id, role, invited_by, status, created_at, updated_at
    `;
    const params = [
      data.pageId,
      data.userId,
      data.role,
      data.invitedBy ?? null,
      data.status ?? 'active',
    ];
    const result = await query<PageMember>(sql, params);
    const member = result.rows[0];
    if (!member) {
      throw new Error('[PageMemberRepository] Không thể tạo bản ghi thành viên mới');
    }
    return member;
  }

  /**
   * Cập nhật vai trò (role) của thành viên.
   */
  async updateRole(id: string, role: PageRole): Promise<PageMember | null> {
    const sql = `
      UPDATE page_members
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, page_id, user_id, role, invited_by, status, created_at, updated_at
    `;
    const result = await query<PageMember>(sql, [role, id]);
    return result.rows[0] ?? null;
  }

  /**
   * Cập nhật trạng thái thành viên.
   */
  async updateStatus(id: string, status: PageMemberStatus): Promise<PageMember | null> {
    const sql = `
      UPDATE page_members
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, page_id, user_id, role, invited_by, status, created_at, updated_at
    `;
    const result = await query<PageMember>(sql, [status, id]);
    return result.rows[0] ?? null;
  }

  /**
   * Xóa / Thu hồi quyền thành viên khỏi Fanpage.
   */
  async removeMember(id: string): Promise<boolean> {
    const sql = `
      DELETE FROM page_members
      WHERE id = $1
    `;
    const result = await query(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Đếm số lượng chủ sở hữu (owner) đang hoạt động trên Fanpage.
   */
  async countOwnersByPage(pageId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*)::int AS count
      FROM page_members pm
      JOIN connected_pages cp ON cp.id = pm.page_id
      WHERE (cp.id::text = $1 OR cp.page_id = $1) AND pm.role = 'owner' AND pm.status = 'active'
    `;
    const result = await query<{ count: number }>(sql, [pageId]);
    return result.rows[0]?.count ?? 0;
  }
}

export const pageMemberRepository = new PageMemberRepository();
