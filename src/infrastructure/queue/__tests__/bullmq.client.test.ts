/**
 * ShopFlow - Unit Tests: bullmq.client.ts
 * File: backend/src/infrastructure/queue/__tests__/bullmq.client.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import {
  QUEUE_NAMES,
  createRedisConnection,
  closeQueueConnections,
  webhookProcessingQueue,
  phoneMaskingQueue,
  phoneMaskingDlq,
} from '../bullmq.client.js';

describe('BullMQ Client Configuration', () => {
  it('định nghĩa đúng các hằng số tên hàng đợi chuẩn', () => {
    expect(QUEUE_NAMES.WEBHOOK_PROCESSING).toBe('webhook-processing-queue');
    expect(QUEUE_NAMES.PHONE_MASKING).toBe('phone-masking-queue');
    expect(QUEUE_NAMES.PHONE_MASKING_DLQ).toBe('phone-masking-dlq');
  });

  it('khởi tạo các instance hàng đợi với options phù hợp', () => {
    expect(webhookProcessingQueue.name).toBe(QUEUE_NAMES.WEBHOOK_PROCESSING);
    expect(phoneMaskingQueue.name).toBe(QUEUE_NAMES.PHONE_MASKING);
    expect(phoneMaskingDlq.name).toBe(QUEUE_NAMES.PHONE_MASKING_DLQ);
  });

  it('createRedisConnection cấu hình đúng maxRetriesPerRequest = null', () => {
    const client = createRedisConnection();
    expect(client.options.maxRetriesPerRequest).toBeNull();
    // Đóng client để tránh leak
    client.disconnect();
  });

  it('closeQueueConnections đóng các queue an toàn không gây lỗi', async () => {
    vi.spyOn(webhookProcessingQueue, 'close').mockResolvedValueOnce();
    vi.spyOn(phoneMaskingQueue, 'close').mockResolvedValueOnce();
    vi.spyOn(phoneMaskingDlq, 'close').mockResolvedValueOnce();

    await expect(closeQueueConnections()).resolves.toBeUndefined();
  });
});
