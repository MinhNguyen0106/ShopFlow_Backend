/**
 * ShopFlow - Scheduled Post Domain Service
 * File: backend/src/core/services/post-schedule.service.ts
 *
 * Xử lý logic nghiệp vụ quản lý bài viết đặt lịch, điều phối hàng đợi BullMQ và kiểm tra quyền Fanpage.
 */

import { Queue } from 'bullmq';
import {
  postScheduleRepository,
  PostScheduleRepository,
  PostSchedule,
  PostFilterOptions,
  PaginatedPostsResult,
} from '../../infrastructure/repositories/post-schedule.repository.js';
import {
  connectedPageRepository,
  ConnectedPageRepository,
} from '../../infrastructure/repositories/connected-page.repository.js';
import {
  scheduledPostQueue as defaultScheduledPostQueue,
  ScheduledPostJobData,
} from '../../infrastructure/queue/bullmq.client.js';
import { CreatePostDto, UpdatePostDto } from '../../api/dtos/post.dto.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../../utils/logger.js';

export class PostScheduleService {
  constructor(
    private readonly postRepo: PostScheduleRepository = postScheduleRepository,
    private readonly pageRepo: ConnectedPageRepository = connectedPageRepository,
    private readonly postQueue: Queue<ScheduledPostJobData> = defaultScheduledPostQueue
  ) {}

  /**
   * Tạo mới bài viết và đưa vào hàng đợi hẹn giờ xuất bản
   */
  async createPost(userId: string, dto: CreatePostDto): Promise<PostSchedule> {
    // 1. Xác thực quyền sở hữu Fanpage
    const page = await this.pageRepo.findByPageIdAndUserId(dto.page_id, userId);
    if (!page) {
      throw new AppError(
        'Không tìm thấy Fanpage hoặc bạn không có quyền đăng bài trên trang này',
        404,
        'PAGE_NOT_FOUND'
      );
    }

    if (!page.is_active) {
      throw new AppError(
        'Fanpage này hiện đang bị tạm dừng kết nối. Vui lòng kích hoạt lại để đặt lịch',
        400,
        'PAGE_INACTIVE'
      );
    }

    const scheduledDate = new Date(dto.scheduled_time);
    const delayMs = Math.max(0, scheduledDate.getTime() - Date.now());

    // 2. Lưu bài viết vào cơ sở dữ liệu
    const post = await this.postRepo.create({
      pageId: page.id,
      userId,
      contentText: dto.content_text,
      mediaType: dto.media_type,
      mediaUrls: dto.media_urls,
      scheduledTime: scheduledDate,
      status: 'scheduled',
    });

    // 3. Đưa Job vào BullMQ với delay tương ứng
    try {
      await this.postQueue.add(
        'publish-scheduled-post',
        {
          postId: post.id,
          pageId: page.id,
          userId,
        },
        {
          jobId: post.id,
          delay: delayMs,
        }
      );
      logger.info(
        { postId: post.id, delayMs, scheduledTime: post.scheduled_time },
        '[PostScheduleService] ✔ Đã lập lịch Job xuất bản bài viết thành công'
      );
    } catch (queueErr) {
      logger.error(
        { postId: post.id, error: (queueErr as Error).message },
        '[PostScheduleService] ✘ Lỗi khi thêm Job vào hàng đợi BullMQ'
      );
    }

    return post;
  }

  /**
   * Lấy danh sách bài viết theo bộ lọc và phân trang
   */
  async getPosts(filter: PostFilterOptions): Promise<PaginatedPostsResult> {
    return this.postRepo.findManyWithFilter(filter);
  }

  /**
   * Xem chi tiết bài viết đặt lịch
   */
  async getPostDetail(id: string, userId: string): Promise<PostSchedule> {
    const post = await this.postRepo.findByIdAndUserId(id, userId);
    if (!post) {
      throw new AppError('Không tìm thấy bài viết đặt lịch', 404, 'NOT_FOUND');
    }
    return post;
  }

  /**
   * Cập nhật nội dung hoặc thời gian bài viết khi chưa xuất bản
   */
  async updatePost(
    id: string,
    userId: string,
    dto: UpdatePostDto
  ): Promise<PostSchedule> {
    const post = await this.getPostDetail(id, userId);

    if (post.status !== 'pending' && post.status !== 'scheduled') {
      throw new AppError(
        `Không thể chỉnh sửa bài viết đã ở trạng thái '${post.status}'`,
        400,
        'CANNOT_EDIT_POST'
      );
    }

    const scheduledDate = dto.scheduled_time ? new Date(dto.scheduled_time) : undefined;

    const updated = await this.postRepo.update(id, userId, {
      contentText: dto.content_text,
      mediaType: dto.media_type,
      mediaUrls: dto.media_urls,
      scheduledTime: scheduledDate,
    });

    if (!updated) {
      throw new AppError('Cập nhật bài viết thất bại', 500, 'UPDATE_FAILED');
    }

    // Nếu thời gian thay đổi, cập nhật lại job trong hàng đợi
    if (scheduledDate) {
      const delayMs = Math.max(0, scheduledDate.getTime() - Date.now());
      try {
        const existingJob = await this.postQueue.getJob(id);
        if (existingJob) {
          await existingJob.remove();
        }
        await this.postQueue.add(
          'publish-scheduled-post',
          {
            postId: updated.id,
            pageId: updated.page_id,
            userId,
          },
          {
            jobId: updated.id,
            delay: delayMs,
          }
        );
        logger.info(
          { postId: updated.id, newDelayMs: delayMs },
          '[PostScheduleService] ✔ Đã cập nhật lại thời gian hẹn giờ Job trong BullMQ'
        );
      } catch (jobErr) {
        logger.warn(
          { postId: id, error: (jobErr as Error).message },
          '[PostScheduleService] Không thể cập nhật lại BullMQ Job khi đổi giờ'
        );
      }
    }

    return updated;
  }

  /**
   * Hủy bài viết đặt lịch (gỡ bỏ Job hẹn giờ trong BullMQ)
   */
  async cancelPost(id: string, userId: string): Promise<boolean> {
    const post = await this.getPostDetail(id, userId);

    if (post.status === 'published') {
      throw new AppError(
        'Không thể hủy bài viết đã được xuất bản thành công lên Facebook',
        400,
        'CANNOT_CANCEL_PUBLISHED_POST'
      );
    }

    // Gỡ bỏ job trong BullMQ nếu có
    try {
      const job = await this.postQueue.getJob(id);
      if (job) {
        await job.remove();
        logger.info({ postId: id }, '[PostScheduleService] ✔ Đã gỡ bỏ Job khỏi BullMQ');
      }
    } catch (err) {
      logger.warn(
        { postId: id, error: (err as Error).message },
        '[PostScheduleService] Lỗi khi gỡ Job khỏi BullMQ'
      );
    }

    // Cập nhật trạng thái sang cancelled
    await this.postRepo.updateStatus(id, 'cancelled', null, 'Người dùng đã hủy lịch');
    return true;
  }

  /**
   * Thử xuất bản lại bài viết bị lỗi (failed)
   */
  async retryPost(id: string, userId: string): Promise<PostSchedule> {
    const post = await this.getPostDetail(id, userId);

    if (post.status !== 'failed') {
      throw new AppError(
        'Chỉ có thể thử lại đối với các bài viết có trạng thái thất bại (failed)',
        400,
        'INVALID_RETRY_STATUS'
      );
    }

    // Cập nhật lại trạng thái sang scheduled
    const updated = await this.postRepo.updateStatus(id, 'scheduled', null, null);
    if (!updated) {
      throw new AppError('Cập nhật trạng thái bài viết thất bại', 500, 'UPDATE_FAILED');
    }

    // Đẩy lại vào BullMQ để xử lý ngay (delay = 0)
    try {
      await this.postQueue.add(
        'publish-scheduled-post',
        {
          postId: updated.id,
          pageId: updated.page_id,
          userId,
        },
        {
          jobId: `${updated.id}-retry-${Date.now()}`,
          delay: 0,
        }
      );
      logger.info({ postId: id }, '[PostScheduleService] ✔ Đã đưa bài viết lỗi vào hàng đợi đăng lại');
    } catch (err) {
      logger.error(
        { postId: id, error: (err as Error).message },
        '[PostScheduleService] ✘ Lỗi đưa bài viết vào hàng đợi retry'
      );
    }

    return updated;
  }
}

export const postScheduleService = new PostScheduleService();
