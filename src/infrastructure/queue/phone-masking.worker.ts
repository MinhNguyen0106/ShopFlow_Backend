/**
 * ShopFlow - Phone Masking Queue Worker
 * File: backend/src/infrastructure/queue/phone-masking.worker.ts
 *
 * Lắng nghe và xử lý các tác vụ từ `phone-masking-queue`:
 * 1. Quét biểu thức chính quy nhận diện SĐT Việt Nam trong nội dung bình luận
 * 2. Gọi Meta Graph API ẩn bình luận tức thời (is_hidden = true)
 * 3. Đảm bảo toàn bộ chu trình hoàn thành trong < 3 giây
 * 4. Tự động lưu/cập nhật thông tin khách hàng vào `customers` (gán nhãn "Co_SDT")
 * 5. Lưu vết bình luận vào `messages_and_comments` với is_hidden = true
 * 6. Cập nhật `webhook_logs` sang trạng thái 'processed'
 * 7. Rate Limiter chống spam và chuyển tiếp vào Dead Letter Queue (DLQ) khi lỗi
 */

import { Worker, Job } from 'bullmq';
import {
  QUEUE_NAMES,
  PhoneMaskingJobData,
  createRedisConnection,
  phoneMaskingDlq,
} from './bullmq.client.js';
import { extractPhoneNumbers } from '../../utils/phone-regex.js';
import {
  MetaGraphApiClient,
  metaGraphApiClient as defaultGraphClient,
} from '../meta/graph-api.client.js';
import {
  ConnectedPageRepository,
  connectedPageRepository as defaultConnectedPageRepo,
} from '../repositories/connected-page.repository.js';
import {
  CustomerRepository,
  customerRepository as defaultCustomerRepo,
} from '../repositories/customer.repository.js';
import {
  MessageCommentRepository,
  messageCommentRepository as defaultMessageCommentRepo,
} from '../repositories/message-comment.repository.js';
import {
  WebhookLogRepository,
  webhookLogRepository as defaultWebhookLogRepo,
} from '../repositories/webhook-log.repository.js';
import { logger } from '../../utils/logger.js';

export interface PhoneMaskingProcessResult {
  hasPhone: boolean;
  commentId: string;
  hidden: boolean;
  durationMs: number;
  phoneCount: number;
}

export class PhoneMaskingWorkerService {
  constructor(
    private readonly graphClient: MetaGraphApiClient = defaultGraphClient,
    private readonly pageRepo: ConnectedPageRepository = defaultConnectedPageRepo,
    private readonly customerRepo: CustomerRepository = defaultCustomerRepo,
    private readonly messageCommentRepo: MessageCommentRepository = defaultMessageCommentRepo,
    private readonly webhookLogRepo: WebhookLogRepository = defaultWebhookLogRepo
  ) {}

  /**
   * Xử lý một Job quét và ẩn số điện thoại trong bình luận Facebook.
   * Toàn bộ thao tác ưu tiên tính khẩn cấp để đảm bảo hoàn tất trong < 3 giây.
   */
  async processJob(job: Job<PhoneMaskingJobData>): Promise<PhoneMaskingProcessResult> {
    const startTime = performance.now();
    const data = job.data;
    const { eventId, pageId, commentId, postId, fromId, fromName, message } = data;

    logger.info(
      { jobId: job.id, commentId, pageId },
      '[PhoneMaskingWorker] Bắt đầu xử lý bình luận từ hàng đợi'
    );

    // 1. Quét Regex phát hiện số điện thoại
    const detectedPhones = extractPhoneNumbers(message);
    const hasPhone = detectedPhones.length > 0;

    if (!hasPhone) {
      // Không có SĐT: Cập nhật webhook_logs đã xử lý và kết thúc sớm
      await this.webhookLogRepo.updateStatus(eventId, 'processed');
      const durationMs = Math.round(performance.now() - startTime);

      logger.info(
        { commentId, durationMs },
        '[PhoneMaskingWorker] Bình luận không chứa SĐT. Bỏ qua ẩn'
      );

      return {
        hasPhone: false,
        commentId,
        hidden: false,
        durationMs,
        phoneCount: 0,
      };
    }

    const primaryPhone = detectedPhones[0]!;
    logger.info(
      {
        commentId,
        maskedPhone: primaryPhone.masked,
        totalPhones: detectedPhones.length,
      },
      '[PhoneMaskingWorker] ⚠️ Phát hiện bình luận chứa SĐT! Đang kích hoạt ẩn khẩn cấp'
    );

    // 2. Tra cứu Page Access Token
    const connectedPage = await this.pageRepo.findByPageId(pageId);
    const pageAccessToken = connectedPage?.page_access_token || 'FALLBACK_TOKEN_DEV';

    // 3. GỌI NGAY META GRAPH API ĐỂ ẨN BÌNH LUẬN (Ưu tiên số 1 để đạt mốc < 3s)
    const hideResult = await this.graphClient.hideComment(commentId, pageAccessToken);

    // 4. Lưu / Cập nhật CRM Khách hàng trong database nếu Fanpage đã kết nối
    if (connectedPage) {
      try {
        const customer = await this.customerRepo.upsertWithPhone(
          connectedPage.id,
          fromId,
          fromName,
          primaryPhone.normalized,
          'Co_SDT'
        );

        if (customer) {
          // 5. Lưu bình luận vào bảng messages_and_comments với cờ is_hidden = true
          await this.messageCommentRepo.saveComment({
            pageInternalId: connectedPage.id,
            customerId: customer.id,
            metaThreadId: postId || commentId,
            commentId,
            senderFbId: fromId,
            content: message,
            isHidden: true,
          });
        }
      } catch (dbError) {
        // Lỗi lưu DB phụ trợ không làm gián đoạn việc ẩn bình luận
        logger.error(
          { commentId, error: (dbError as Error).message },
          '[PhoneMaskingWorker] Cảnh báo: Lỗi khi lưu Customer/Comment vào DB'
        );
      }
    }

    // 6. Cập nhật trạng thái sự kiện webhook_logs thành 'processed'
    await this.webhookLogRepo.updateStatus(eventId, 'processed');

    const durationMs = Math.round(performance.now() - startTime);

    logger.info(
      {
        commentId,
        durationMs,
        isUnder3Seconds: durationMs < 3000,
        maskedPhone: primaryPhone.masked,
        hidden: hideResult.success,
      },
      `[PhoneMaskingWorker] ✔ Hoàn tất ẩn bình luận trong ${durationMs}ms ${
        durationMs < 3000 ? '(< 3 GIÂY - ĐẠT CHUẨN)' : '(VƯỢT NGƯỠNG)'
      }`
    );

    return {
      hasPhone: true,
      commentId,
      hidden: hideResult.success,
      durationMs,
      phoneCount: detectedPhones.length,
    };
  }
}

export const phoneMaskingWorkerService = new PhoneMaskingWorkerService();

// =============================================================================
// Khởi tạo BullMQ Worker thực tế
// =============================================================================
let _workerInstance: Worker<PhoneMaskingJobData> | null = null;

export function startPhoneMaskingWorker(): Worker<PhoneMaskingJobData> {
  if (_workerInstance) {
    return _workerInstance;
  }

  const workerConnection = createRedisConnection();

  _workerInstance = new Worker<PhoneMaskingJobData>(
    QUEUE_NAMES.PHONE_MASKING,
    async (job: Job<PhoneMaskingJobData>) => {
      try {
        return await phoneMaskingWorkerService.processJob(job);
      } catch (error) {
        const attempts = job.opts.attempts || 3;
        const isFinalAttempt = job.attemptsMade >= attempts - 1;

        if (isFinalAttempt) {
          // Đã cạn số lần retry: Chuyển sang Dead Letter Queue (DLQ)
          logger.error(
            { jobId: job.id, commentId: job.data.commentId, error: (error as Error).message },
            '[PhoneMaskingWorker] ✘ Job thất bại sau toàn bộ số lần retry. Đẩy vào Dead Letter Queue (DLQ)'
          );

          await phoneMaskingDlq.add('failed-phone-masking', {
            ...job.data,
            error: (error as Error).message,
          }).catch((dlqErr) => {
            logger.error({ dlqErr: (dlqErr as Error).message }, '[PhoneMaskingWorker] Lỗi đẩy vào DLQ');
          });

          await defaultWebhookLogRepo
            .updateStatus(job.data.eventId, 'failed')
            .catch(() => {});
        }

        throw error; // Re-throw để BullMQ tự kích hoạt backoff retry
      }
    },
    {
      connection: workerConnection,
      concurrency: 5, // Xử lý song song 5 bình luận đồng thời
      limiter: {
        max: 20,       // Tối đa 20 jobs
        duration: 1000 // trên 1 giây -> chống vượt Rate Limit Meta Graph API
      },
    }
  );

  _workerInstance.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[PhoneMaskingWorker] Job hoàn thành thành công');
  });

  _workerInstance.on('failed', (job, err) => {
    logger.warn(
      { jobId: job?.id, attempt: job?.attemptsMade, err: err.message },
      '[PhoneMaskingWorker] Job thất bại (chờ retry hoặc chuyển DLQ)'
    );
  });

  return _workerInstance;
}

export async function stopPhoneMaskingWorker(): Promise<void> {
  if (_workerInstance) {
    await _workerInstance.close();
    _workerInstance = null;
    logger.info('[PhoneMaskingWorker] ✔ Đã dừng Worker an toàn');
  }
}
