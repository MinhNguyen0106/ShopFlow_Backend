/**
 * ShopFlow - Scheduled Post Publishing Worker
 * File: backend/src/infrastructure/queue/scheduled-post.worker.ts
 *
 * Lắng nghe và xử lý các tác vụ xuất bản bài viết hẹn giờ lên Fanpage Facebook qua Meta Graph API.
 */

import { Worker, Job } from 'bullmq';
import {
  QUEUE_NAMES,
  ScheduledPostJobData,
  createRedisConnection,
} from './bullmq.client.js';
import {
  postScheduleRepository,
  PostScheduleRepository,
} from '../repositories/post-schedule.repository.js';
import {
  connectedPageRepository,
  ConnectedPageRepository,
} from '../repositories/connected-page.repository.js';
import {
  metaGraphApiClient,
  MetaGraphApiClient,
} from '../meta/graph-api.client.js';
import { decryptToken } from '../../utils/crypto.helper.js';
import { socketService, SocketService } from '../../core/services/socket.service.js';
import { logger } from '../../utils/logger.js';

export class ScheduledPostWorkerService {
  private worker: Worker<ScheduledPostJobData> | null = null;

  constructor(
    private readonly postRepo: PostScheduleRepository = postScheduleRepository,
    private readonly pageRepo: ConnectedPageRepository = connectedPageRepository,
    private readonly graphClient: MetaGraphApiClient = metaGraphApiClient,
    private readonly socketSvc: SocketService = socketService
  ) {}

  /**
   * Khởi động Worker lắng nghe hàng đợi xuất bản bài viết
   */
  start(): void {
    if (this.worker) return;

    this.worker = new Worker<ScheduledPostJobData>(
      QUEUE_NAMES.SCHEDULED_POST,
      async (job: Job<ScheduledPostJobData>) => {
        await this.processJob(job);
      },
      {
        connection: createRedisConnection(),
        concurrency: 5,
      }
    );

    this.worker.on('failed', (job, err) => {
      logger.error(
        { jobId: job?.id, error: err.message },
        '[ScheduledPostWorker] ✘ Job xuất bản bài viết bị lỗi nghiêm trọng'
      );
    });

    this.worker.on('error', (err) => {
      logger.warn({ err: err.message }, '[ScheduledPostWorker] Worker error');
    });

    logger.info('[ScheduledPostWorker] ✔ Worker xuất bản bài viết đã khởi động');
  }

  /**
   * Xử lý một tác vụ xuất bản bài viết hẹn giờ
   */
  async processJob(job: Job<ScheduledPostJobData>): Promise<void> {
    const { postId } = job.data;
    logger.info({ postId }, '[ScheduledPostWorker] 🚀 Bắt đầu xử lý xuất bản bài viết');

    // 1. Lấy thông tin bài viết từ DB
    const post = await this.postRepo.findById(postId);
    if (!post) {
      logger.warn({ postId }, '[ScheduledPostWorker] Không tìm thấy bài viết trong DB, bỏ qua');
      return;
    }

    if (post.status === 'cancelled') {
      logger.info({ postId }, '[ScheduledPostWorker] Bài viết đã bị người dùng hủy, bỏ qua xuất bản');
      return;
    }

    if (post.status === 'published') {
      logger.info({ postId }, '[ScheduledPostWorker] Bài viết đã được xuất bản trước đó, bỏ qua');
      return;
    }

    // 2. Lấy thông tin Fanpage và giải mã Access Token
    const page = await this.pageRepo.findById(post.page_id);
    if (!page) {
      const errMsg = 'Fanpage liên kết không tồn tại trong hệ thống';
      await this.postRepo.updateStatus(postId, 'failed', null, errMsg);
      logger.error({ postId, pageId: post.page_id }, `[ScheduledPostWorker] ✘ ${errMsg}`);
      return;
    }

    if (!page.is_active) {
      const errMsg = 'Fanpage hiện đang bị tạm dừng kết nối';
      await this.postRepo.updateStatus(postId, 'failed', null, errMsg);
      logger.error({ postId, pageId: post.page_id }, `[ScheduledPostWorker] ✘ ${errMsg}`);
      return;
    }

    let pageAccessToken: string;
    try {
      pageAccessToken = decryptToken(page.page_access_token);
    } catch (decryptErr) {
      const errMsg = `Giải mã token Fanpage thất bại: ${(decryptErr as Error).message}`;
      await this.postRepo.updateStatus(postId, 'failed', null, errMsg);
      logger.error({ postId }, `[ScheduledPostWorker] ✘ ${errMsg}`);
      return;
    }

    // 3. Tiến hành gọi Meta Graph API theo định dạng nội dung
    const metaPageId = page.page_id;
    const mediaUrls = post.media_urls || [];
    let publishResult: { success: boolean; postId?: string; error?: string };

    try {
      if (post.media_type === 'video' && mediaUrls.length > 0) {
        // Trường hợp 1: Đăng video
        publishResult = await this.graphClient.publishVideoPost(
          metaPageId,
          mediaUrls[0]!,
          post.content_text,
          pageAccessToken
        );
      } else if (post.media_type === 'photo' && mediaUrls.length === 1) {
        // Trường hợp 2: Đăng 1 ảnh
        publishResult = await this.graphClient.publishPhotoPost(
          metaPageId,
          mediaUrls[0]!,
          post.content_text,
          pageAccessToken
        );
      } else if (post.media_type === 'photo' && mediaUrls.length > 1) {
        // Trường hợp 3: Đăng Album (Nhiều ảnh)
        const mediaFbids: string[] = [];
        let uploadError: string | null = null;

        for (const photoUrl of mediaUrls) {
          const uploadRes = await this.graphClient.uploadUnpublishedPhoto(
            metaPageId,
            photoUrl,
            pageAccessToken
          );
          if (uploadRes.success && uploadRes.mediaFbid) {
            mediaFbids.push(uploadRes.mediaFbid);
          } else {
            uploadError = uploadRes.error || 'Upload ảnh trong album thất bại';
            break;
          }
        }

        if (uploadError || mediaFbids.length === 0) {
          publishResult = {
            success: false,
            error: uploadError || 'Không thể upload ảnh album',
          };
        } else {
          publishResult = await this.graphClient.publishAlbumPost(
            metaPageId,
            mediaFbids,
            post.content_text,
            pageAccessToken
          );
        }
      } else {
        // Trường hợp 4: Đăng bài viết văn bản thuần (Text-only)
        publishResult = await this.graphClient.publishFeedPost(
          metaPageId,
          post.content_text,
          pageAccessToken
        );
      }

      // 4. Cập nhật kết quả vào DB và phát sự kiện WebSocket
      if (publishResult.success && publishResult.postId) {
        await this.postRepo.updateStatus(postId, 'published', publishResult.postId, null);
        logger.info(
          { postId, metaPostId: publishResult.postId },
          '[ScheduledPostWorker] ✔ Xuất bản bài viết thành công lên Facebook'
        );

        this.socketSvc.emitPostStatusChanged(metaPageId, {
          event: 'POST_STATUS_CHANGED',
          post_id: postId,
          page_id: metaPageId,
          status: 'published',
          meta_post_id: publishResult.postId,
          error_message: null,
          published_at: new Date().toISOString(),
        });
      } else {
        const errorDetail = publishResult.error || 'Meta API từ chối xuất bản bài viết';
        await this.postRepo.updateStatus(postId, 'failed', null, errorDetail);
        logger.error(
          { postId, error: errorDetail },
          '[ScheduledPostWorker] ✘ Xuất bản bài viết thất bại'
        );

        this.socketSvc.emitPostStatusChanged(metaPageId, {
          event: 'POST_STATUS_CHANGED',
          post_id: postId,
          page_id: metaPageId,
          status: 'failed',
          meta_post_id: null,
          error_message: errorDetail,
          published_at: null,
        });
      }
    } catch (apiErr) {
      const errMsg = (apiErr as Error).message;
      await this.postRepo.updateStatus(postId, 'failed', null, errMsg);
      logger.error(
        { postId, error: errMsg },
        '[ScheduledPostWorker] ✘ Ngoại lệ khi gọi Meta API'
      );

      this.socketSvc.emitPostStatusChanged(metaPageId, {
        event: 'POST_STATUS_CHANGED',
        post_id: postId,
        page_id: metaPageId,
        status: 'failed',
        meta_post_id: null,
        error_message: errMsg,
        published_at: null,
      });
    }
  }

  /**
   * Đóng worker an toàn khi ứng dụng dừng hoạt động
   */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      logger.info('[ScheduledPostWorker] ✔ Đã dừng worker xuất bản bài viết');
    }
  }
}

export const scheduledPostWorker = new ScheduledPostWorkerService();
