/**
 * ShopFlow - Unit Tests: page.service.ts
 * File: backend/src/core/services/__tests__/page.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageService } from '../page.service.js';
import { ConnectedPageRepository, ConnectedPage } from '../../../infrastructure/repositories/connected-page.repository.js';
import { MetaGraphApiClient } from '../../../infrastructure/meta/graph-api.client.js';
import { AppError } from '../../errors/app-error.js';
import { encryptToken } from '../../../utils/crypto.helper.js';

describe('PageService', () => {
  let service: PageService;
  let mockPageRepo: ConnectedPageRepository;
  let mockGraphClient: MetaGraphApiClient;

  const rawToken = 'sample_raw_page_access_token_xyz';
  const encryptedToken = encryptToken(rawToken);

  const mockPage: ConnectedPage = {
    id: 'page-uuid-1',
    user_id: 'user-1',
    fb_account_id: 'fb-acc-1',
    page_id: 'meta-page-123',
    page_name: 'Cửa Hàng Quần Áo',
    avatar_url: 'https://fb.com/avatar.png',
    page_access_token: encryptedToken,
    is_active: true,
    webhook_subscribed: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPageRepo = {
      findAllByUserId: vi.fn().mockResolvedValue([mockPage]),
      findByPageIdAndUserId: vi.fn().mockResolvedValue(mockPage),
      getPageStats: vi.fn().mockResolvedValue({ totalPosts: 5, totalConversations: 20 }),
      updateStatus: vi.fn().mockResolvedValue({ ...mockPage, is_active: false }),
      updateWebhookSubscribed: vi.fn().mockResolvedValue({ ...mockPage, webhook_subscribed: true }),
      deleteByPageIdAndUserId: vi.fn().mockResolvedValue(true),
      upsert: vi.fn(),
      findByPageId: vi.fn(),
      getAccessToken: vi.fn(),
    } as unknown as ConnectedPageRepository;

    mockGraphClient = {
      subscribePageApps: vi.fn().mockResolvedValue(true),
    } as unknown as MetaGraphApiClient;

    service = new PageService(mockPageRepo, mockGraphClient);
  });

  describe('getUserPages()', () => {
    it('nên trả về danh sách pages và ẩn trường page_access_token', async () => {
      const pages = await service.getUserPages('user-1');

      expect(pages).toHaveLength(1);
      expect(pages[0]!.page_id).toBe('meta-page-123');
      expect((pages[0]! as unknown as Record<string, unknown>).page_access_token).toBeUndefined();
    });
  });

  describe('getPageDetail()', () => {
    it('nên trả về chi tiết page và thống kê', async () => {
      const result = await service.getPageDetail('meta-page-123', 'user-1');

      expect(result.page.page_name).toBe('Cửa Hàng Quần Áo');
      expect(result.stats).toEqual({ totalPosts: 5, totalConversations: 20 });
      expect((result.page as unknown as Record<string, unknown>).page_access_token).toBeUndefined();
    });

    it('nên throw lỗi khi không tìm thấy page', async () => {
      vi.mocked(mockPageRepo.findByPageIdAndUserId).mockResolvedValueOnce(null);
      await expect(service.getPageDetail('non_existent', 'user-1')).rejects.toThrow(AppError);
    });
  });

  describe('updatePageStatus()', () => {
    it('nên cập nhật is_active thành công', async () => {
      const updated = await service.updatePageStatus('meta-page-123', 'user-1', false);

      expect(updated.is_active).toBe(false);
      expect(mockPageRepo.updateStatus).toHaveBeenCalledWith('meta-page-123', 'user-1', false);
    });

    it('nên throw lỗi khi không cập nhật được trạng thái', async () => {
      vi.mocked(mockPageRepo.updateStatus).mockResolvedValueOnce(null);
      await expect(service.updatePageStatus('non_existent', 'user-1', false)).rejects.toThrow(AppError);
    });
  });

  describe('subscribeWebhook()', () => {
    it('nên giải mã token, gọi Graph API và cập nhật trạng thái', async () => {
      const result = await service.subscribeWebhook('meta-page-123', 'user-1');

      expect(result.webhook_subscribed).toBe(true);
      expect(mockGraphClient.subscribePageApps).toHaveBeenCalledWith('meta-page-123', rawToken);
      expect(mockPageRepo.updateWebhookSubscribed).toHaveBeenCalledWith('meta-page-123', true);
    });

    it('nên throw lỗi khi không tìm thấy page', async () => {
      vi.mocked(mockPageRepo.findByPageIdAndUserId).mockResolvedValueOnce(null);
      await expect(service.subscribeWebhook('unknown', 'user-1')).rejects.toThrow(AppError);
    });
  });

  describe('disconnectPage()', () => {
    it('nên xóa page thành công', async () => {
      const result = await service.disconnectPage('meta-page-123', 'user-1');
      expect(result).toBe(true);
      expect(mockPageRepo.deleteByPageIdAndUserId).toHaveBeenCalledWith('meta-page-123', 'user-1');
    });

    it('nên throw lỗi khi xóa page không tồn tại', async () => {
      vi.mocked(mockPageRepo.deleteByPageIdAndUserId).mockResolvedValueOnce(false);
      await expect(service.disconnectPage('unknown', 'user-1')).rejects.toThrow(AppError);
    });
  });
});
