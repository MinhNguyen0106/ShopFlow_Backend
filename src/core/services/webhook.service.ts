/**
 * ShopFlow - Webhook Domain Service
 * File: backend/src/core/services/webhook.service.ts
 *
 * Xử lý xác thực Handshake từ Meta và tiếp nhận (Ingest) sự kiện Webhook.
 */

import { env } from '../../config/env.js';
import {
  MetaWebhookPayload,
  extractWebhookEvents,
  NormalizedWebhookEvent,
} from '../../api/dtos/webhook.dto.js';
import {
  WebhookLogRepository,
  webhookLogRepository as defaultWebhookLogRepo,
} from '../../infrastructure/repositories/webhook-log.repository.js';
import {
  phoneMaskingQueue as defaultPhoneMaskingQueue,
  PhoneMaskingJobData,
  automationReplyQueue as defaultAutomationReplyQueue,
  AutomationReplyJobData,
} from '../../infrastructure/queue/bullmq.client.js';
import { Queue } from 'bullmq';
import { ForbiddenError } from '../errors/app-error.js';
import { logger } from '../../utils/logger.js';

export class WebhookService {
  constructor(
    private readonly webhookRepo: WebhookLogRepository = defaultWebhookLogRepo,
    private readonly phoneQueue: Queue<PhoneMaskingJobData> = defaultPhoneMaskingQueue,
    private readonly replyQueue: Queue<AutomationReplyJobData> = defaultAutomationReplyQueue
  ) {}

  /**
   * Xác thực Meta Webhook Handshake (GET challenge).
   *
   * @param mode      - Thường là 'subscribe'
   * @param token     - FACEBOOK_VERIFY_TOKEN
   * @param challenge - Chuỗi số ngẫu nhiên Meta gửi sang
   * @returns Chuỗi challenge thô nếu hợp lệ
   */
  verifyHandshake(
    mode?: string,
    token?: string,
    challenge?: string
  ): string {
    const expectedToken = env.FACEBOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === expectedToken && challenge) {
      logger.info('[WebhookService] ✔ Xác thực Webhook Handshake thành công');
      return challenge;
    }

    logger.warn(
      { mode, hasToken: !!token, hasChallenge: !!challenge },
      '[WebhookService] ✘ Xác thực Webhook Handshake thất bại: verify_token hoặc mode không khớp'
    );
    throw new ForbiddenError(
      'Xác thực Webhook Handshake thất bại: verify_token hoặc mode không khớp.'
    );
  }

  /**
   * Tiếp nhận payload Webhook từ Meta, trích xuất sự kiện và lưu log Idempotent.
   *
   * @param payload - Payload JSON gửi từ Meta
   */
  async processIncomingWebhook(
    payload: MetaWebhookPayload
  ): Promise<{ received: number; events: NormalizedWebhookEvent[] }> {
    const events = extractWebhookEvents(payload);

    logger.info(
      { totalEvents: events.length, object: payload?.object },
      `[WebhookService] Tiếp nhận ${events.length} sự kiện webhook từ Meta`
    );

    // Ghi nhận sự kiện vào database (bảng webhook_logs) phục vụ Audit & Idempotency
    for (const event of events) {
      try {
        await this.webhookRepo.create({
          event_id:   event.eventId,
          page_id:    event.pageId,
          event_type: event.eventType,
          payload:    event.payload,
        });
        // 2. Nếu là sự kiện bình luận (comment), đẩy ngay vào hàng đợi phone-masking-queue
        if (event.eventType === 'comment') {
          const val = (event.payload || {}) as Record<string, unknown>;
          const from = (val.from || {}) as Record<string, string>;

          await this.phoneQueue.add(
            'mask-phone-in-comment',
            {
              eventId:     event.eventId,
              pageId:      event.pageId || '',
              commentId:   (val.comment_id as string) || event.eventId,
              postId:      val.post_id as string | undefined,
              fromId:      from.id || '',
              fromName:    from.name,
              message:     (val.message as string) || '',
              createdTime: val.created_time as number | undefined,
              rawPayload:  event.payload,
            },
            {
              jobId: `comment-${event.eventId}`, // Đảm bảo Idempotency không enqueue trùng
            }
          ).catch((queueErr) => {
            logger.error(
              { eventId: event.eventId, err: (queueErr as Error).message },
              '[WebhookService] Lỗi khi đưa bình luận vào phone-masking-queue'
            );
          });

          // 3. Đưa vào hàng đợi automation-reply-queue xử lý kịch bản tự động
          if (this.replyQueue) {
            await this.replyQueue.add(
              'automation-reply-to-comment',
              {
                commentId:   (val.comment_id as string) || event.eventId,
                postId:      val.post_id as string | undefined,
                pageId:      event.pageId || '',
                senderFbId:  from.id || '',
                senderName:  from.name,
                commentText: (val.message as string) || '',
              },
              {
                jobId: `reply-${event.eventId}`,
              }
            ).catch((queueErr) => {
              logger.error(
                { eventId: event.eventId, err: (queueErr as Error).message },
                '[WebhookService] Lỗi khi đưa bình luận vào automation-reply-queue'
              );
            });
          }
        }
      } catch (err) {
        // Không để lỗi DB chặn việc phản hồi 200 OK về Meta
        logger.error(
          { eventId: event.eventId, err: (err as Error).message },
          '[WebhookService] Lỗi khi lưu webhook log'
        );
      }
    }

    return {
      received: events.length,
      events,
    };
  }
}

export const webhookService = new WebhookService();
