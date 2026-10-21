/**
 * ShopFlow - Unit Tests: phone-masking.worker.ts
 * File: backend/src/infrastructure/queue/__tests__/phone-masking.worker.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Job } from 'bullmq';
import {
  PhoneMaskingWorkerService,
} from '../phone-masking.worker.js';
import { PhoneMaskingJobData } from '../bullmq.client.js';
import { MetaGraphApiClient } from '../../meta/graph-api.client.js';
import { ConnectedPageRepository } from '../../repositories/connected-page.repository.js';
import { CustomerRepository } from '../../repositories/customer.repository.js';
import { MessageCommentRepository } from '../../repositories/message-comment.repository.js';
import { WebhookLogRepository } from '../../repositories/webhook-log.repository.js';

describe('PhoneMaskingWorkerService — processJob()', () => {
  let workerService: PhoneMaskingWorkerService;
  let mockGraphClient: MetaGraphApiClient;
  let mockPageRepo: ConnectedPageRepository;
  let mockCustomerRepo: CustomerRepository;
  let mockMessageCommentRepo: MessageCommentRepository;
  let mockWebhookLogRepo: WebhookLogRepository;

  beforeEach(() => {
    mockGraphClient = {
      hideComment: vi.fn().mockResolvedValue({ success: true, commentId: 'cmt_123' }),
    } as unknown as MetaGraphApiClient;

    mockPageRepo = {
      findByPageId: vi.fn().mockResolvedValue({
        id: 'uuid-page-1',
        page_id: 'page_meta_1',
        page_name: 'Shop Thời Trang',
        page_access_token: 'EAAB_test_token_123',
        is_active: true,
        webhook_subscribed: true,
      }),
      getAccessToken: vi.fn().mockResolvedValue('EAAB_test_token_123'),
    } as unknown as ConnectedPageRepository;

    mockCustomerRepo = {
      upsertWithPhone: vi.fn().mockResolvedValue({
        id: 'uuid-cust-1',
        page_id: 'uuid-page-1',
        customer_fb_id: 'cust_fb_1',
        customer_name: 'Nguyễn Văn A',
        phone_number: '0981234567',
        tags: ['Co_SDT'],
        last_interaction_at: new Date(),
        created_at: new Date(),
      }),
      findByFbId: vi.fn(),
    } as unknown as CustomerRepository;

    mockMessageCommentRepo = {
      ensureConversation: vi.fn().mockResolvedValue({ id: 'uuid-conv-1' }),
      saveComment: vi.fn().mockResolvedValue({ id: 'uuid-msg-1' }),
    } as unknown as MessageCommentRepository;

    mockWebhookLogRepo = {
      create: vi.fn(),
      findByEventId: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(null),
    } as unknown as WebhookLogRepository;

    workerService = new PhoneMaskingWorkerService(
      mockGraphClient,
      mockPageRepo,
      mockCustomerRepo,
      mockMessageCommentRepo,
      mockWebhookLogRepo
    );
  });

  it('khi bình luận chứa SĐT: gọi Meta Graph API ẩn bình luận, lưu customer với tag Co_SDT và hoàn tất < 3 giây', async () => {
    const jobData: PhoneMaskingJobData = {
      eventId: 'evt_cmt_100',
      pageId: 'page_meta_1',
      commentId: 'cmt_123',
      postId: 'post_456',
      fromId: 'cust_fb_1',
      fromName: 'Nguyễn Văn A',
      message: 'Shop ơi ship cho mình về địa chỉ này nhé: 098.123.4567',
      createdTime: 1718000000,
    };

    const mockJob = {
      id: 'job-1',
      data: jobData,
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as unknown as Job<PhoneMaskingJobData>;

    const result = await workerService.processJob(mockJob);

    // 1. Kết quả trả về
    expect(result.hasPhone).toBe(true);
    expect(result.hidden).toBe(true);
    expect(result.commentId).toBe('cmt_123');
    expect(result.durationMs).toBeLessThan(3000); // Tiêu chuẩn < 3 giây

    // 2. Kiểm tra gọi Graph API với comment_id và Page Access Token
    expect(mockGraphClient.hideComment).toHaveBeenCalledWith(
      'cmt_123',
      'EAAB_test_token_123'
    );

    // 3. Kiểm tra lưu Customer CRM với tag 'Co_SDT' và số điện thoại đã chuẩn hóa
    expect(mockCustomerRepo.upsertWithPhone).toHaveBeenCalledWith(
      'uuid-page-1',
      'cust_fb_1',
      'Nguyễn Văn A',
      '0981234567',
      'Co_SDT'
    );

    // 4. Kiểm tra lưu bình luận với isHidden = true
    expect(mockMessageCommentRepo.saveComment).toHaveBeenCalledWith(
      expect.objectContaining({
        pageInternalId: 'uuid-page-1',
        customerId: 'uuid-cust-1',
        commentId: 'cmt_123',
        senderFbId: 'cust_fb_1',
        isHidden: true,
      })
    );

    // 5. Kiểm tra cập nhật webhook_logs thành processed
    expect(mockWebhookLogRepo.updateStatus).toHaveBeenCalledWith(
      'evt_cmt_100',
      'processed'
    );
  });

  it('khi bình luận lách kiểm duyệt bằng chữ O/o: vẫn nhận diện và kích hoạt ẩn tức thời', async () => {
    const jobData: PhoneMaskingJobData = {
      eventId: 'evt_cmt_101',
      pageId: 'page_meta_1',
      commentId: 'cmt_o_trick',
      fromId: 'cust_fb_2',
      fromName: 'Trần Thị B',
      message: 'Gọi mình O90 912 3456 tư vấn nhé',
    };

    const mockJob = {
      id: 'job-2',
      data: jobData,
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as unknown as Job<PhoneMaskingJobData>;

    const result = await workerService.processJob(mockJob);

    expect(result.hasPhone).toBe(true);
    expect(result.hidden).toBe(true);
    expect(mockGraphClient.hideComment).toHaveBeenCalledWith('cmt_o_trick', 'EAAB_test_token_123');
    expect(mockCustomerRepo.upsertWithPhone).toHaveBeenCalledWith(
      'uuid-page-1',
      'cust_fb_2',
      'Trần Thị B',
      '0909123456',
      'Co_SDT'
    );
  });

  it('khi bình luận KHÔNG chứa SĐT: không gọi API ẩn và đánh dấu processed', async () => {
    const jobData: PhoneMaskingJobData = {
      eventId: 'evt_cmt_200',
      pageId: 'page_meta_1',
      commentId: 'cmt_no_phone',
      fromId: 'cust_fb_3',
      fromName: 'Lê Văn C',
      message: 'Sản phẩm này có màu đen size XL không shop?',
    };

    const mockJob = {
      id: 'job-3',
      data: jobData,
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as unknown as Job<PhoneMaskingJobData>;

    const result = await workerService.processJob(mockJob);

    expect(result.hasPhone).toBe(false);
    expect(result.hidden).toBe(false);
    expect(mockGraphClient.hideComment).not.toHaveBeenCalled();
    expect(mockCustomerRepo.upsertWithPhone).not.toHaveBeenCalled();
    expect(mockWebhookLogRepo.updateStatus).toHaveBeenCalledWith('evt_cmt_200', 'processed');
  });

  it('khi Graph API gặp lỗi: ghi nhận hidden = false mà không gây unhandled crash', async () => {
    vi.mocked(mockGraphClient.hideComment).mockResolvedValueOnce({
      success: false,
      commentId: 'cmt_err',
      error: 'Graph API OAuthException (#200)',
    });

    const jobData: PhoneMaskingJobData = {
      eventId: 'evt_cmt_err',
      pageId: 'page_meta_1',
      commentId: 'cmt_err',
      fromId: 'cust_fb_4',
      message: 'SĐT 0978123456',
    };

    const mockJob = {
      id: 'job-4',
      data: jobData,
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as unknown as Job<PhoneMaskingJobData>;

    const result = await workerService.processJob(mockJob);

    expect(result.hasPhone).toBe(true);
    expect(result.hidden).toBe(false);
    expect(mockWebhookLogRepo.updateStatus).toHaveBeenCalledWith('evt_cmt_err', 'processed');
  });

  it('khi lưu customer gặp lỗi cơ sở dữ liệu: không crash và vẫn hoàn tất chu trình', async () => {
    vi.mocked(mockCustomerRepo.upsertWithPhone).mockRejectedValueOnce(
      new Error('DB Unique constraint error')
    );

    const jobData: PhoneMaskingJobData = {
      eventId: 'evt_cmt_dberr',
      pageId: 'page_meta_1',
      commentId: 'cmt_dberr',
      fromId: 'cust_fb_5',
      message: 'SĐT 0912345678',
    };

    const mockJob = {
      id: 'job-5',
      data: jobData,
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as unknown as Job<PhoneMaskingJobData>;

    const result = await workerService.processJob(mockJob);
    expect(result.hasPhone).toBe(true);
    expect(result.hidden).toBe(true);
    expect(mockWebhookLogRepo.updateStatus).toHaveBeenCalledWith('evt_cmt_dberr', 'processed');
  });
});
