/**
 * ShopFlow - Unit Tests: webhook.service.ts
 * File: backend/src/core/services/__tests__/webhook.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from '../webhook.service.js';
import { WebhookLogRepository } from '../../../infrastructure/repositories/webhook-log.repository.js';
import { ForbiddenError } from '../../errors/app-error.js';
import { env } from '../../../config/env.js';
import { MetaWebhookPayload } from '../../../api/dtos/webhook.dto.js';

describe('WebhookService — verifyHandshake()', () => {
  let service: WebhookService;
  let mockRepo: WebhookLogRepository;

  beforeEach(() => {
    mockRepo = {
      create:        vi.fn(),
      findByEventId: vi.fn(),
      updateStatus:  vi.fn(),
    } as unknown as WebhookLogRepository;

    service = new WebhookService(mockRepo);
  });

  it('nên trả về challenge string thô khi mode=subscribe và verify_token đúng', () => {
    const validToken = env.FACEBOOK_VERIFY_TOKEN;
    const challenge = '1158201444';

    const result = service.verifyHandshake('subscribe', validToken, challenge);
    expect(result).toBe(challenge);
  });

  it('nên throw ForbiddenError khi verify_token không khớp', () => {
    expect(() =>
      service.verifyHandshake('subscribe', 'wrong_token', '123456')
    ).toThrow(ForbiddenError);
  });

  it('nên throw ForbiddenError khi mode không phải là subscribe', () => {
    const validToken = env.FACEBOOK_VERIFY_TOKEN;
    expect(() =>
      service.verifyHandshake('other_mode', validToken, '123456')
    ).toThrow(ForbiddenError);
  });

  it('nên throw ForbiddenError khi challenge bị thiếu', () => {
    const validToken = env.FACEBOOK_VERIFY_TOKEN;
    expect(() =>
      service.verifyHandshake('subscribe', validToken, undefined)
    ).toThrow(ForbiddenError);
  });
});

describe('WebhookService — processIncomingWebhook()', () => {
  let service: WebhookService;
  let mockRepo: WebhookLogRepository;
  let mockQueue: { add: ReturnType<typeof vi.fn> };
  let mockReplyQueue: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRepo = {
      create:        vi.fn().mockResolvedValue({ id: 'log-uuid' }),
      findByEventId: vi.fn(),
      updateStatus:  vi.fn(),
    } as unknown as WebhookLogRepository;

    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    };

    mockReplyQueue = {
      add: vi.fn().mockResolvedValue({ id: 'reply-job-1' }),
    };

    service = new WebhookService(
      mockRepo,
      mockQueue as unknown as any,
      mockReplyQueue as unknown as any
    );
  });

  it('nên bóc tách sự kiện bình luận feed và lưu vào repository', async () => {
    const payload: MetaWebhookPayload = {
      object: 'page',
      entry: [
        {
          id:   'page-123456',
          time: 1718000000,
          changes: [
            {
              field: 'feed',
              value: {
                item:         'comment',
                verb:         'add',
                comment_id:   'cmt_987654321',
                message:      'Cho mình hỏi giá sản phẩm này ạ 0912345678',
                created_time: 1718000000,
              },
            },
          ],
        },
      ],
    };

    const result = await service.processIncomingWebhook(payload);

    expect(result.received).toBe(1);
    expect(result.events[0]?.eventType).toBe('comment');
    expect(result.events[0]?.eventId).toBe('cmt_987654321');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id:   'cmt_987654321',
        page_id:    'page-123456',
        event_type: 'comment',
      })
    );
    expect(mockQueue.add).toHaveBeenCalledWith(
      'mask-phone-in-comment',
      expect.objectContaining({
        commentId: 'cmt_987654321',
        pageId: 'page-123456',
        message: 'Cho mình hỏi giá sản phẩm này ạ 0912345678',
      }),
      expect.objectContaining({
        jobId: 'comment-cmt_987654321',
      })
    );
  });

  it('nên bóc tách sự kiện tin nhắn Messenger và lưu vào repository', async () => {
    const payload: MetaWebhookPayload = {
      object: 'page',
      entry: [
        {
          id:   'page-messenger-999',
          time: 1718000100,
          messaging: [
            {
              sender:    { id: 'customer-fb-id-1' },
              recipient: { id: 'page-messenger-999' },
              timestamp: 1718000100,
              message: {
                mid:  'm_mid_abcdef12345',
                text: 'Xin chào shop, shop có ship COD không?',
              },
            },
          ],
        },
      ],
    };

    const result = await service.processIncomingWebhook(payload);

    expect(result.received).toBe(1);
    expect(result.events[0]?.eventType).toBe('message');
    expect(result.events[0]?.eventId).toBe('m_mid_abcdef12345');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id:   'm_mid_abcdef12345',
        page_id:    'page-messenger-999',
        event_type: 'message',
      })
    );
  });

  it('khi repository.create bị lỗi thì không throw exception làm crash endpoint', async () => {
    vi.mocked(mockRepo.create).mockRejectedValueOnce(new Error('DB Connection Timeout'));

    const payload: MetaWebhookPayload = {
      object: 'page',
      entry: [
        {
          id:   'page-1',
          time: 1718000000,
          changes: [
            {
              field: 'feed',
              value: { item: 'comment', comment_id: 'cmt_err_1' },
            },
          ],
        },
      ],
    };

    const result = await service.processIncomingWebhook(payload);
    expect(result.received).toBe(1);
  });
});
