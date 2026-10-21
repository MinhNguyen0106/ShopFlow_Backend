/**
 * ShopFlow - Unit Tests: webhook-log.repository.ts
 * File: backend/src/infrastructure/repositories/__tests__/webhook-log.repository.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookLogRepository, WebhookLog } from '../webhook-log.repository.js';
import * as dbClient from '../../database/db.client.js';

vi.mock('../../database/db.client.js', () => ({
  query: vi.fn(),
}));

describe('WebhookLogRepository', () => {
  let repo: WebhookLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new WebhookLogRepository();
  });

  describe('create()', () => {
    it('nên chèn bản ghi mới và trả về WebhookLog khi chưa tồn tại', async () => {
      const mockLog: WebhookLog = {
        id:         'log-uuid-1',
        event_id:   'mid_123',
        page_id:    'page_1',
        event_type: 'message',
        payload:    { text: 'hello' },
        status:     'pending',
        created_at: new Date(),
      };

      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [mockLog],
        rowCount: 1,
        command: 'INSERT',
      });

      const result = await repo.create({
        event_id:   'mid_123',
        page_id:    'page_1',
        event_type: 'message',
        payload:    { text: 'hello' },
      });

      expect(result).toEqual(mockLog);
      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (event_id) DO NOTHING'),
        ['mid_123', 'page_1', 'message', JSON.stringify({ text: 'hello' })]
      );
    });

    it('khi xảy ra xung đột event_id (ON CONFLICT), nên query lại bản ghi cũ', async () => {
      const existingLog: WebhookLog = {
        id:         'log-uuid-old',
        event_id:   'mid_duplicate',
        page_id:    'page_1',
        event_type: 'message',
        payload:    { text: 'first attempt' },
        status:     'processed',
        created_at: new Date(),
      };

      // Call 1: INSERT returns 0 rows (conflict)
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'INSERT',
      });

      // Call 2: SELECT returns existingLog
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [existingLog],
        rowCount: 1,
        command: 'SELECT',
      });

      const result = await repo.create({
        event_id:   'mid_duplicate',
        page_id:    'page_1',
        event_type: 'message',
        payload:    { text: 'second attempt' },
      });

      expect(result).toEqual(existingLog);
      expect(dbClient.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('findByEventId()', () => {
    it('nên tìm thấy log theo event_id', async () => {
      const mockLog: WebhookLog = {
        id:         'log-1',
        event_id:   'evt_find_1',
        page_id:    'page_1',
        event_type: 'comment',
        payload:    {},
        status:     'pending',
        created_at: new Date(),
      };

      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [mockLog],
        rowCount: 1,
        command: 'SELECT',
      });

      const result = await repo.findByEventId('evt_find_1');
      expect(result).toEqual(mockLog);
    });

    it('nên trả về null khi không tìm thấy event_id', async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
      });

      const result = await repo.findByEventId('non_existent');
      expect(result).toBeNull();
    });
  });

  describe('updateStatus()', () => {
    it('nên cập nhật status thành processed', async () => {
      const updatedLog: WebhookLog = {
        id:         'log-1',
        event_id:   'evt_1',
        page_id:    'page_1',
        event_type: 'comment',
        payload:    {},
        status:     'processed',
        created_at: new Date(),
      };

      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [updatedLog],
        rowCount: 1,
        command: 'UPDATE',
      });

      const result = await repo.updateStatus('evt_1', 'processed');
      expect(result?.status).toBe('processed');
    });

    it('nên trả về null nếu event_id không tồn tại để update', async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
      });

      const result = await repo.updateStatus('missing', 'failed');
      expect(result).toBeNull();
    });
  });
});
