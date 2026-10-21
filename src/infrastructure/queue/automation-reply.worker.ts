/**
 * ShopFlow - Automation Reply Queue Worker
 * File: backend/src/infrastructure/queue/automation-reply.worker.ts
 *
 * Lắng nghe và xử lý các tác vụ từ `automation-reply-queue`:
 * 1. Lấy thông tin Fanpage và giải mã Page Access Token
 * 2. Tải các quy tắc kịch bản tự động hóa đang kích hoạt (active rules) của Fanpage
 * 3. Quét đối soát từ khóa kích hoạt (trigger_keywords) với nội dung bình luận
 * 4. Tự động trả lời bình luận (Public Comment Reply) qua Meta Graph API
 * 5. Tự động gửi tin nhắn riêng (Private Reply Messenger) trong 7 ngày
 * 6. Đảm bảo giới hạn tốc độ (Rate Limiter) chống spam Meta
 */

import { Worker, Job } from 'bullmq';
import {
  QUEUE_NAMES,
  AutomationReplyJobData,
  createRedisConnection,
} from './bullmq.client.js';
import {
  MetaGraphApiClient,
  metaGraphApiClient as defaultGraphClient,
} from '../meta/graph-api.client.js';
import {
  ConnectedPageRepository,
  connectedPageRepository as defaultConnectedPageRepo,
} from '../repositories/connected-page.repository.js';
import {
  AutomationRuleRepository,
  automationRuleRepository as defaultAutomationRuleRepo,
} from '../repositories/automation-rule.repository.js';
import {
  MessageCommentRepository,
  messageCommentRepository as defaultMessageCommentRepo,
} from '../repositories/message-comment.repository.js';
import {
  KeywordMatcherService,
  keywordMatcherService as defaultKeywordMatcher,
} from '../../core/services/keyword-matcher.service.js';
import { decryptToken } from '../../utils/crypto.helper.js';
import { logger } from '../../utils/logger.js';

export interface AutomationReplyProcessResult {
  commentId: string;
  matchedRuleId?: string;
  commentReplied: boolean;
  privateReplySent: boolean;
  durationMs: number;
}

export class AutomationReplyWorkerService {
  constructor(
    private readonly graphClient: MetaGraphApiClient = defaultGraphClient,
    private readonly pageRepo: ConnectedPageRepository = defaultConnectedPageRepo,
    private readonly ruleRepo: AutomationRuleRepository = defaultAutomationRuleRepo,
    private readonly messageCommentRepo: MessageCommentRepository = defaultMessageCommentRepo,
    private readonly keywordMatcher: KeywordMatcherService = defaultKeywordMatcher
  ) {}

  /**
   * Xử lý một Job kịch bản tự động phản hồi bình luận.
   */
  async processJob(job: Job<AutomationReplyJobData>): Promise<AutomationReplyProcessResult> {
    const startTime = performance.now();
    const { commentId, pageId, senderName, commentText } = job.data;

    const result: AutomationReplyProcessResult = {
      commentId,
      commentReplied: false,
      privateReplySent: false,
      durationMs: 0,
    };

    try {
      // 1. Kiểm tra Fanpage đã kết nối và đang kích hoạt
      const page = await this.pageRepo.findByPageId(pageId);
      if (!page || !page.is_active) {
        logger.debug({ pageId, commentId }, '[AutomationReplyWorker] Fanpage không tồn tại hoặc đã tạm dừng');
        result.durationMs = Math.round(performance.now() - startTime);
        return result;
      }

      // 2. Giải mã Page Access Token
      const plainToken = decryptToken(page.page_access_token);

      // 3. Lấy danh sách các kịch bản đang active của Page
      const activeRules = await this.ruleRepo.findActiveRulesByPageId(page.id);
      if (activeRules.length === 0) {
        result.durationMs = Math.round(performance.now() - startTime);
        return result;
      }

      // 4. Đối soát từ khóa trong nội dung bình luận
      for (const rule of activeRules) {
        const matchResult = this.keywordMatcher.matches(commentText, rule.trigger_keywords);

        if (matchResult.isMatch) {
          result.matchedRuleId = rule.id;
          logger.info(
            { ruleId: rule.id, commentId, matchedKeyword: matchResult.matchedKeyword },
            '[AutomationReplyWorker] ✔ Khớp từ khóa kịch bản tự động hóa'
          );

          const placeholders = {
            customer_name: senderName,
            page_name: page.page_name,
          };

          // 4a. Tự động trả lời bình luận công khai
          if (rule.auto_comment_template) {
            const replyText = this.keywordMatcher.renderTemplate(rule.auto_comment_template, placeholders);
            const commentRes = await this.graphClient.replyComment(commentId, replyText, plainToken);
            result.commentReplied = commentRes.success;
          }

          // 4b. Tự động gửi tin nhắn riêng (Private Reply) qua Messenger
          if (rule.auto_private_reply_template) {
            // Kiểm tra quy định Meta: chỉ gửi 1 lần duy nhất cho mỗi comment
            const alreadySent = await this.messageCommentRepo.isPrivateReplySent(commentId);

            if (!alreadySent) {
              const privateMsg = this.keywordMatcher.renderTemplate(rule.auto_private_reply_template, placeholders);
              const privateRes = await this.graphClient.sendPrivateReply(
                page.page_id,
                commentId,
                privateMsg,
                plainToken
              );

              if (privateRes.success) {
                result.privateReplySent = true;
                await this.messageCommentRepo.markPrivateReplySent(commentId);
              }
            } else {
              logger.debug({ commentId }, '[AutomationReplyWorker] Bỏ qua Private Reply: Đã gửi trước đó');
            }
          }

          // Chỉ thực thi kịch bản đầu tiên khớp từ khóa
          break;
        }
      }

      result.durationMs = Math.round(performance.now() - startTime);
      return result;
    } catch (error) {
      result.durationMs = Math.round(performance.now() - startTime);
      logger.error(
        { commentId, err: (error as Error).message },
        '[AutomationReplyWorker] ✘ Lỗi trong quá trình xử lý kịch bản tự động'
      );
      throw error;
    }
  }
}

/**
 * Khởi chạy Worker BullMQ cho hàng đợi `automation-reply-queue`.
 */
export function startAutomationReplyWorker(
  workerService: AutomationReplyWorkerService = new AutomationReplyWorkerService()
): Worker<AutomationReplyJobData, AutomationReplyProcessResult> {
  const connection = createRedisConnection();

  const worker = new Worker<AutomationReplyJobData, AutomationReplyProcessResult>(
    QUEUE_NAMES.AUTOMATION_REPLY,
    async (job: Job<AutomationReplyJobData>) => {
      return workerService.processJob(job);
    },
    {
      connection,
      concurrency: 5, // Xử lý đồng thời 5 tác vụ
      limiter: {
        max: 15,      // Tối đa 15 yêu cầu
        duration: 1000, // trên mỗi giây chống spam Meta
      },
    }
  );

  worker.on('completed', (job: Job<AutomationReplyJobData>, returnvalue: AutomationReplyProcessResult) => {
    logger.info(
      {
        jobId: job.id,
        commentId: returnvalue.commentId,
        commentReplied: returnvalue.commentReplied,
        privateReplySent: returnvalue.privateReplySent,
        durationMs: returnvalue.durationMs,
      },
      '[AutomationReplyWorker] ✔ Hoàn tất xử lý phản hồi tự động'
    );
  });

  worker.on('failed', (job: Job<AutomationReplyJobData> | undefined, err: Error) => {
    logger.error(
      { jobId: job?.id, err: err.message },
      '[AutomationReplyWorker] ✘ Job thất bại'
    );
  });

  return worker;
}
