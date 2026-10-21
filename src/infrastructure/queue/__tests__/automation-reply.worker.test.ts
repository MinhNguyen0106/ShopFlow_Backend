/**
 * ShopFlow - Unit Tests: automation-reply.worker.ts
 * File: backend/src/infrastructure/queue/__tests__/automation-reply.worker.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationReplyWorkerService } from '../automation-reply.worker.js';
import { MetaGraphApiClient } from '../../meta/graph-api.client.js';
import { ConnectedPageRepository, ConnectedPage } from '../../repositories/connected-page.repository.js';
import { AutomationRuleRepository, AutomationRule } from '../../repositories/automation-rule.repository.js';
import { MessageCommentRepository } from '../../repositories/message-comment.repository.js';
import { KeywordMatcherService } from '../../../core/services/keyword-matcher.service.js';
import { encryptToken } from '../../../utils/crypto.helper.js';
import { Job } from 'bullmq';
import { AutomationReplyJobData } from '../bullmq.client.js';

describe('AutomationReplyWorkerService', () => {
  let workerService: AutomationReplyWorkerService;
  let mockGraphClient: MetaGraphApiClient;
  let mockPageRepo: ConnectedPageRepository;
  let mockRuleRepo: AutomationRuleRepository;
  let mockMessageCommentRepo: MessageCommentRepository;
  let mockKeywordMatcher: KeywordMatcherService;

  const rawToken = 'raw_page_access_token_xyz';
  const encryptedToken = encryptToken(rawToken);

  const mockPage: ConnectedPage = {
    id: 'page-internal-uuid',
    user_id: 'user-1',
    page_id: 'meta-page-123',
    page_name: 'Shop Thời Trang',
    page_access_token: encryptedToken,
    is_active: true,
    webhook_subscribed: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockRule: AutomationRule = {
    id: 'rule-uuid-1',
    page_id: mockPage.id,
    rule_name: 'Tư vấn báo giá',
    hide_phone_enabled: true,
    trigger_keywords: ['giá', 'tư vấn'],
    auto_comment_template: 'Chào {{customer_name}}, shop đã gửi tin nhắn riêng cho bạn rồi nhé!',
    auto_private_reply_template: 'Chào {{customer_name}}, cảm ơn bạn đã quan tâm {{page_name}}. Giá là 199k ạ!',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGraphClient = {
      replyComment: vi.fn().mockResolvedValue({ success: true, commentId: 'reply_comment_123' }),
      sendPrivateReply: vi.fn().mockResolvedValue({ success: true, messageId: 'm_msg_123' }),
    } as unknown as MetaGraphApiClient;

    mockPageRepo = {
      findByPageId: vi.fn().mockResolvedValue(mockPage),
    } as unknown as ConnectedPageRepository;

    mockRuleRepo = {
      findActiveRulesByPageId: vi.fn().mockResolvedValue([mockRule]),
    } as unknown as AutomationRuleRepository;

    mockMessageCommentRepo = {
      isPrivateReplySent: vi.fn().mockResolvedValue(false),
      markPrivateReplySent: vi.fn().mockResolvedValue(true),
    } as unknown as MessageCommentRepository;

    mockKeywordMatcher = new KeywordMatcherService();

    workerService = new AutomationReplyWorkerService(
      mockGraphClient,
      mockPageRepo,
      mockRuleRepo,
      mockMessageCommentRepo,
      mockKeywordMatcher
    );
  });

  const createMockJob = (data: Partial<AutomationReplyJobData> = {}): Job<AutomationReplyJobData> => {
    return {
      id: 'job-123',
      data: {
        commentId: 'cmt_456',
        pageId: 'meta-page-123',
        senderFbId: 'fb_user_789',
        senderName: 'Trần Thị Mai',
        commentText: 'Shop ơi báo giá cho mình với',
        ...data,
      },
    } as Job<AutomationReplyJobData>;
  };

  it('nên tự động reply comment và gửi private reply khi khớp từ khóa', async () => {
    const job = createMockJob();
    const result = await workerService.processJob(job);

    expect(result.commentReplied).toBe(true);
    expect(result.privateReplySent).toBe(true);
    expect(result.matchedRuleId).toBe('rule-uuid-1');

    // Kiểm tra gọi Graph API replyComment
    expect(mockGraphClient.replyComment).toHaveBeenCalledWith(
      'cmt_456',
      'Chào Trần Thị Mai, shop đã gửi tin nhắn riêng cho bạn rồi nhé!',
      rawToken
    );

    // Kiểm tra gọi Graph API sendPrivateReply
    expect(mockGraphClient.sendPrivateReply).toHaveBeenCalledWith(
      'meta-page-123',
      'cmt_456',
      'Chào Trần Thị Mai, cảm ơn bạn đã quan tâm Shop Thời Trang. Giá là 199k ạ!',
      rawToken
    );

    // Kiểm tra cập nhật database private_reply_sent
    expect(mockMessageCommentRepo.markPrivateReplySent).toHaveBeenCalledWith('cmt_456');
  });

  it('nên bỏ qua Private Reply nếu trước đó đã gửi (chính sách Meta 1 lần)', async () => {
    vi.mocked(mockMessageCommentRepo.isPrivateReplySent).mockResolvedValueOnce(true);

    const job = createMockJob();
    const result = await workerService.processJob(job);

    expect(result.commentReplied).toBe(true);
    expect(result.privateReplySent).toBe(false);
    expect(mockGraphClient.sendPrivateReply).not.toHaveBeenCalled();
    expect(mockMessageCommentRepo.markPrivateReplySent).not.toHaveBeenCalled();
  });

  it('không làm gì nếu bình luận không khớp từ khóa nào', async () => {
    const job = createMockJob({ commentText: 'Hôm nay trời đẹp thật' });
    const result = await workerService.processJob(job);

    expect(result.commentReplied).toBe(false);
    expect(result.privateReplySent).toBe(false);
    expect(result.matchedRuleId).toBeUndefined();
    expect(mockGraphClient.replyComment).not.toHaveBeenCalled();
    expect(mockGraphClient.sendPrivateReply).not.toHaveBeenCalled();
  });

  it('bỏ qua nếu Fanpage không tồn tại hoặc is_active = false', async () => {
    vi.mocked(mockPageRepo.findByPageId).mockResolvedValueOnce({
      ...mockPage,
      is_active: false,
    });

    const job = createMockJob();
    const result = await workerService.processJob(job);

    expect(result.commentReplied).toBe(false);
    expect(result.privateReplySent).toBe(false);
    expect(mockGraphClient.replyComment).not.toHaveBeenCalled();
  });

  it('bỏ qua nếu Fanpage không có kịch bản nào đang kích hoạt', async () => {
    vi.mocked(mockRuleRepo.findActiveRulesByPageId).mockResolvedValueOnce([]);

    const job = createMockJob();
    const result = await workerService.processJob(job);

    expect(result.commentReplied).toBe(false);
    expect(result.privateReplySent).toBe(false);
  });
});
