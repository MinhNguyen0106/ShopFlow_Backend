/**
 * ShopFlow - Unit Tests: connected-page.repository.ts
 * File: backend/src/infrastructure/repositories/__tests__/connected-page.repository.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectedPageRepository, ConnectedPage } from '../connected-page.repository.js';
import * as dbClient from '../../database/db.client.js';

vi.mock('../../database/db.client.js', () => ({
  query: vi.fn(),
}));

describe('ConnectedPageRepository', () => {
  let repo: ConnectedPageRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ConnectedPageRepository();
  });

  const mockPage: ConnectedPage = {
    id: 'page-uuid-1',
    user_id: 'user-uuid-1',
    fb_account_id: 'fb-acc-uuid-1',
    page_id: '1029384756',
    page_name: 'Shop Thời Trang ABC',
    avatar_url: 'https://cdn.fb.com/avatar.jpg',
    page_access_token: 'iv:tag:encrypted',
    is_active: true,
    webhook_subscribed: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  it('upsert() nên chèn hoặc cập nhật fanpage', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockPage],
      rowCount: 1,
      command: 'INSERT',
    });

    const result = await repo.upsert({
      userId: 'user-uuid-1',
      pageId: '1029384756',
      pageName: 'Shop Thời Trang ABC',
      pageAccessToken: 'iv:tag:encrypted',
    });

    expect(result).toEqual(mockPage);
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (page_id) DO UPDATE'),
      expect.any(Array)
    );
  });

  it('findByPageId() nên tìm thấy fanpage theo page_id', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockPage],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.findByPageId('1029384756');
    expect(result).toEqual(mockPage);
  });

  it('findByPageIdAndUserId() nên tìm thấy page theo page_id và user_id', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockPage],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.findByPageIdAndUserId('1029384756', 'user-uuid-1');
    expect(result).toEqual(mockPage);
  });

  it('findAllByUserId() nên trả về danh sách các pages của user', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockPage],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.findAllByUserId('user-uuid-1');
    expect(result).toEqual([mockPage]);
  });

  it('updateStatus() nên cập nhật is_active', async () => {
    const updatedPage = { ...mockPage, is_active: false };
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [updatedPage],
      rowCount: 1,
      command: 'UPDATE',
    });

    const result = await repo.updateStatus('1029384756', 'user-uuid-1', false);
    expect(result?.is_active).toBe(false);
  });

  it('updateWebhookSubscribed() nên cập nhật webhook_subscribed', async () => {
    const updatedPage = { ...mockPage, webhook_subscribed: true };
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [updatedPage],
      rowCount: 1,
      command: 'UPDATE',
    });

    const result = await repo.updateWebhookSubscribed('1029384756', true);
    expect(result?.webhook_subscribed).toBe(true);
  });

  it('getPageStats() nên tính đúng số lượng posts và conversations', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [{ total_posts: 12, total_conversations: 45 }],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.getPageStats('page-uuid-1');
    expect(result).toEqual({ totalPosts: 12, totalConversations: 45 });
  });

  it('deleteByPageIdAndUserId() nên xóa page thành công', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
      command: 'DELETE',
    });

    const result = await repo.deleteByPageIdAndUserId('1029384756', 'user-uuid-1');
    expect(result).toBe(true);
  });

  it('getAccessToken() nên trả về access token của page', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockPage],
      rowCount: 1,
      command: 'SELECT',
    });

    const token = await repo.getAccessToken('1029384756');
    expect(token).toBe(mockPage.page_access_token);
  });
});
