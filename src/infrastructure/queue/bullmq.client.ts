/**
 * ShopFlow - BullMQ Client & Queue Configurations
 * File: backend/src/infrastructure/queue/bullmq.client.ts
 *
 * Cung cấp kết nối Redis tập trung cho BullMQ và khởi tạo các hàng đợi:
 * - `webhook-processing-queue`: Tiếp nhận sự kiện webhook tổng quát
 * - `phone-masking-queue`: Xử lý quét Regex & ẩn bình luận SĐT trong < 3 giây
 * - `phone-masking-dlq`: Dead Letter Queue lưu trữ các job lỗi quá số lần retry
 */

import { Queue, QueueOptions } from 'bullmq';
import { Redis, RedisOptions } from 'ioredis';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// =============================================================================
// Tên định danh các Hàng Đợi (Queue Names)
// =============================================================================
export const QUEUE_NAMES = {
  WEBHOOK_PROCESSING: 'webhook-processing-queue',
  PHONE_MASKING:      'phone-masking-queue',
  PHONE_MASKING_DLQ:  'phone-masking-dlq',
  AUTOMATION_REPLY:   'automation-reply-queue',
  SCHEDULED_POST:     'scheduled-post-queue',
} as const;

// =============================================================================
// Kiểu dữ liệu Job Payload
// =============================================================================
export interface ScheduledPostJobData {
  postId: string;
  pageId: string;
  userId: string;
}

export interface AutomationReplyJobData {
  commentId: string;
  postId?: string;
  pageId: string; // Meta Fanpage ID
  senderFbId: string;
  senderName?: string;
  commentText: string;
}

export interface PhoneMaskingJobData {
  eventId:      string;          // Idempotency key (comment_id hoặc eventId)
  pageId:       string;          // Meta Fanpage ID
  commentId:    string;          // Facebook Comment ID cần kiểm tra & ẩn
  postId?:      string;          // Facebook Post ID chứa bình luận
  fromId:       string;          // Facebook User ID (PSID) của người bình luận
  fromName?:    string;          // Tên hiển thị Facebook của khách hàng
  message:      string;          // Nội dung bình luận thô
  createdTime?: number;          // Thời gian tạo bình luận từ Meta
  rawPayload?:  unknown;         // Payload gốc phục vụ audit
}

export interface WebhookProcessingJobData {
  eventId:   string;
  pageId?:   string;
  eventType: string;
  payload:   unknown;
}

// =============================================================================
// Cấu hình kết nối Redis cho BullMQ
// Lưu ý: BullMQ bắt buộc maxRetriesPerRequest phải bằng null
// =============================================================================
export function createRedisConnection(): Redis {
  const redisOptions: RedisOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      // Giới hạn thời gian retry tối đa 3 giây để tránh treo lâu
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  };

  const client = new Redis(redisOptions);

  client.on('error', (err) => {
    logger.warn({ err: err.message }, '[BullMQ/Redis] Lỗi kết nối Redis');
  });

  client.on('connect', () => {
    logger.info('[BullMQ/Redis] Kết nối Redis thành công');
  });

  return client;
}

// Kết nối dùng chung cho các Queues (Workers sẽ tự tạo kết nối riêng theo khuyến nghị BullMQ)
let _sharedRedisConnection: Redis | null = null;

export function getSharedRedisConnection(): Redis {
  if (!_sharedRedisConnection) {
    _sharedRedisConnection = createRedisConnection();
  }
  return _sharedRedisConnection;
}

// =============================================================================
// Cấu hình mặc định cho Hàng Đợi (Queue Options)
// =============================================================================
const defaultQueueOptions: QueueOptions = {
  connection: getSharedRedisConnection(),
  defaultJobOptions: {
    attempts: 3,                   // Thử lại tối đa 3 lần nếu gặp sự cố mạng Meta API
    backoff: {
      type: 'exponential',
      delay: 500,                  // Thử lại sau 500ms, 1000ms, 2000ms (đảm bảo hoàn tất < 3s)
    },
    removeOnComplete: {
      age: 24 * 3600,             // Giữ lại log thành công trong 24h
      count: 5000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,         // Giữ lại log lỗi trong 7 ngày
      count: 10000,
    },
  },
};

// =============================================================================
// Khởi tạo các hàng đợi (Queues)
// =============================================================================
export const webhookProcessingQueue = new Queue<WebhookProcessingJobData>(
  QUEUE_NAMES.WEBHOOK_PROCESSING,
  defaultQueueOptions
);
webhookProcessingQueue.on('error', (err) => {
  logger.debug({ err: err.message }, '[webhookProcessingQueue] Redis connection status');
});

export const phoneMaskingQueue = new Queue<PhoneMaskingJobData>(
  QUEUE_NAMES.PHONE_MASKING,
  defaultQueueOptions
);
phoneMaskingQueue.on('error', (err) => {
  logger.debug({ err: err.message }, '[phoneMaskingQueue] Redis connection status');
});

export const phoneMaskingDlq = new Queue<PhoneMaskingJobData & { error: string }>(
  QUEUE_NAMES.PHONE_MASKING_DLQ,
  defaultQueueOptions
);
phoneMaskingDlq.on('error', (err) => {
  logger.debug({ err: err.message }, '[phoneMaskingDlq] Redis connection status');
});

export const automationReplyQueue = new Queue<AutomationReplyJobData>(
  QUEUE_NAMES.AUTOMATION_REPLY,
  defaultQueueOptions
);
automationReplyQueue.on('error', (err) => {
  logger.debug({ err: err.message }, '[automationReplyQueue] Redis connection status');
});

export const scheduledPostQueue = new Queue<ScheduledPostJobData>(
  QUEUE_NAMES.SCHEDULED_POST,
  defaultQueueOptions
);
scheduledPostQueue.on('error', (err) => {
  logger.debug({ err: err.message }, '[scheduledPostQueue] Redis connection status');
});

/**
 * Đóng an toàn kết nối của toàn bộ hàng đợi khi tắt ứng dụng (Graceful Shutdown)
 */
export async function closeQueueConnections(): Promise<void> {
  logger.info('[BullMQ] Đang đóng các kết nối Queue...');
  await Promise.allSettled([
    webhookProcessingQueue.close(),
    phoneMaskingQueue.close(),
    phoneMaskingDlq.close(),
    automationReplyQueue.close(),
    scheduledPostQueue.close(),
  ]);

  if (_sharedRedisConnection) {
    await _sharedRedisConnection.quit().catch(() => {});
    _sharedRedisConnection = null;
  }
  logger.info('[BullMQ] ✔ Đã đóng an toàn toàn bộ Queue connections');
}
