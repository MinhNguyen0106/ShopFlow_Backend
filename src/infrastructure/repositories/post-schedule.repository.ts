/**
 * ShopFlow - Post Schedule Repository
 * File: backend/src/infrastructure/repositories/post-schedule.repository.ts
 *
 * Tương tác với bảng `posts_schedule` trong PostgreSQL để lưu trữ và quản lý bài viết đặt lịch.
 */

import { query } from '../database/db.client.js';

export interface PostSchedule {
  id: string;
  page_id: string;
  user_id: string;
  content_text: string;
  media_type: 'none' | 'photo' | 'video';
  media_urls: string[];
  scheduled_time: Date;
  status: 'pending' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  meta_post_id: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePostData {
  pageId: string;
  userId: string;
  contentText: string;
  mediaType: 'none' | 'photo' | 'video';
  mediaUrls: string[];
  scheduledTime: Date;
  status?: 'pending' | 'scheduled' | 'published' | 'failed' | 'cancelled';
}

export interface UpdatePostData {
  contentText?: string;
  mediaType?: 'none' | 'photo' | 'video';
  mediaUrls?: string[];
  scheduledTime?: Date;
  status?: 'pending' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  metaPostId?: string | null;
  errorMessage?: string | null;
}

export interface PostFilterOptions {
  userId: string;
  pageId?: string;
  status?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedPostsResult {
  posts: PostSchedule[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class PostScheduleRepository {
  /**
   * Tạo bài viết mới trong bảng posts_schedule
   */
  async create(data: CreatePostData): Promise<PostSchedule> {
    const text = `
      INSERT INTO posts_schedule (
        page_id,
        user_id,
        content_text,
        media_type,
        media_urls,
        scheduled_time,
        status
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
      RETURNING *;
    `;

    const values = [
      data.pageId,
      data.userId,
      data.contentText,
      data.mediaType,
      JSON.stringify(data.mediaUrls || []),
      data.scheduledTime,
      data.status || 'scheduled',
    ];

    const result = await query<PostSchedule>(text, values);
    return result.rows[0]!;
  }

  /**
   * Tìm bài viết theo ID
   */
  async findById(id: string): Promise<PostSchedule | null> {
    const text = `SELECT * FROM posts_schedule WHERE id = $1 LIMIT 1;`;
    const result = await query<PostSchedule>(text, [id]);
    return result.rows[0] || null;
  }

  /**
   * Tìm bài viết theo ID và User ID (đảm bảo quyền sở hữu)
   */
  async findByIdAndUserId(id: string, userId: string): Promise<PostSchedule | null> {
    const text = `
      SELECT * FROM posts_schedule
      WHERE id = $1 AND user_id = $2
      LIMIT 1;
    `;
    const result = await query<PostSchedule>(text, [id, userId]);
    return result.rows[0] || null;
  }

  /**
   * Lấy danh sách bài viết theo bộ lọc và phân trang
   */
  async findManyWithFilter(filter: PostFilterOptions): Promise<PaginatedPostsResult> {
    const conditions: string[] = ['user_id = $1'];
    const values: any[] = [filter.userId];
    let paramIndex = 2;

    if (filter.pageId) {
      conditions.push(`page_id = $${paramIndex}`);
      values.push(filter.pageId);
      paramIndex++;
    }

    if (filter.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(filter.status);
      paramIndex++;
    }

    if (filter.from) {
      conditions.push(`scheduled_time >= $${paramIndex}`);
      values.push(filter.from);
      paramIndex++;
    }

    if (filter.to) {
      conditions.push(`scheduled_time <= $${paramIndex}`);
      values.push(filter.to);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // 1. Đếm tổng số bài viết
    const countSql = `SELECT COUNT(*) AS total FROM posts_schedule WHERE ${whereClause};`;
    const countRes = await query<{ total: string }>(countSql, values);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // 2. Phân trang
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 20));
    const offset = (page - 1) * limit;

    const dataSql = `
      SELECT * FROM posts_schedule
      WHERE ${whereClause}
      ORDER BY scheduled_time ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;
    values.push(limit, offset);

    const dataRes = await query<PostSchedule>(dataSql, values);

    return {
      posts: dataRes.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Cập nhật nội dung hoặc thời gian bài viết khi chưa xuất bản
   */
  async update(id: string, userId: string, data: UpdatePostData): Promise<PostSchedule | null> {
    const setClauses: string[] = [];
    const values: any[] = [id, userId];
    let paramIndex = 3;

    if (data.contentText !== undefined) {
      setClauses.push(`content_text = $${paramIndex}`);
      values.push(data.contentText);
      paramIndex++;
    }

    if (data.mediaType !== undefined) {
      setClauses.push(`media_type = $${paramIndex}`);
      values.push(data.mediaType);
      paramIndex++;
    }

    if (data.mediaUrls !== undefined) {
      setClauses.push(`media_urls = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(data.mediaUrls));
      paramIndex++;
    }

    if (data.scheduledTime !== undefined) {
      setClauses.push(`scheduled_time = $${paramIndex}`);
      values.push(data.scheduledTime);
      paramIndex++;
    }

    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIndex}`);
      values.push(data.status);
      paramIndex++;
    }

    if (data.metaPostId !== undefined) {
      setClauses.push(`meta_post_id = $${paramIndex}`);
      values.push(data.metaPostId);
      paramIndex++;
    }

    if (data.errorMessage !== undefined) {
      setClauses.push(`error_message = $${paramIndex}`);
      values.push(data.errorMessage);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return this.findByIdAndUserId(id, userId);
    }

    const text = `
      UPDATE posts_schedule
      SET ${setClauses.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;

    const result = await query<PostSchedule>(text, values);
    return result.rows[0] || null;
  }

  /**
   * Cập nhật trạng thái xuất bản (dành cho worker xuất bản bài viết)
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'scheduled' | 'published' | 'failed' | 'cancelled',
    metaPostId?: string | null,
    errorMessage?: string | null
  ): Promise<PostSchedule | null> {
    const text = `
      UPDATE posts_schedule
      SET status = $2,
          meta_post_id = COALESCE($3, meta_post_id),
          error_message = $4
      WHERE id = $1
      RETURNING *;
    `;

    const result = await query<PostSchedule>(text, [
      id,
      status,
      metaPostId || null,
      errorMessage || null,
    ]);

    return result.rows[0] || null;
  }

  /**
   * Xóa bài viết
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const text = `DELETE FROM posts_schedule WHERE id = $1 AND user_id = $2;`;
    const result = await query(text, [id, userId]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const postScheduleRepository = new PostScheduleRepository();
