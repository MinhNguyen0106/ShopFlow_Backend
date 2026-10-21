/**
 * ShopFlow - Unit Tests: facebook-oauth.service.ts
 * File: backend/src/core/services/__tests__/facebook-oauth.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FacebookOAuthService } from '../facebook-oauth.service.js';
import { MetaGraphApiClient } from '../../../infrastructure/meta/graph-api.client.js';
import { FacebookAccountRepository } from '../../../infrastructure/repositories/facebook-account.repository.js';
import { ConnectedPageRepository } from '../../../infrastructure/repositories/connected-page.repository.js';
import { AppError } from '../../errors/app-error.js';
import { encryptToken, decryptToken } from '../../../utils/crypto.helper.js';

describe('FacebookOAuthService', () => {
  let service: FacebookOAuthService;
  let mockGraphClient: MetaGraphApiClient;
  let mockFbAccountRepo: FacebookAccountRepository;
  let mockPageRepo: ConnectedPageRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGraphClient = {
      getOAuthDialogUrl: vi.fn().mockImplementation((state, redirectUri) => `https://facebook.com/dialog?state=${state}&redirect=${redirectUri}`),
      exchangeCodeForTokens: vi.fn().mockResolvedValue({
        shortLivedToken: 'short_token',
        longLivedToken: 'long_lived_token_meta',
        expiresIn: 5184000,
      }),
      getFbUserProfile: vi.fn().mockResolvedValue({
        id: 'fb-user-123',
        name: 'Nguyen Van B',
      }),
      getManageablePages: vi.fn().mockResolvedValue([
        {
          id: 'page-101',
          name: 'Page Thu 1',
          access_token: 'raw_page_token_101',
          picture: { data: { url: 'https://fb.com/p1.jpg' } },
        },
        {
          id: 'page-102',
          name: 'Page Thu 2',
          access_token: 'raw_page_token_102',
          picture: { data: { url: 'https://fb.com/p2.jpg' } },
        },
      ]),
      subscribePageApps: vi.fn().mockResolvedValue(true),
      hideComment: vi.fn(),
    } as unknown as MetaGraphApiClient;

    mockFbAccountRepo = {
      upsert: vi.fn().mockResolvedValue({ id: 'fb-acc-uuid' }),
      findByUserId: vi.fn().mockResolvedValue({
        id: 'fb-acc-uuid',
        user_id: 'user-1',
        fb_user_id: 'fb-user-123',
        fb_name: 'Nguyen Van B',
        user_access_token: encryptToken('long_lived_token_meta'),
        token_expires_at: new Date(),
        created_at: new Date(),
      }),
      findByFbUserId: vi.fn(),
      deleteByUserId: vi.fn(),
    } as unknown as FacebookAccountRepository;

    mockPageRepo = {
      findAllByUserId: vi.fn().mockResolvedValue([
        { page_id: 'page-101' },
      ]),
      upsert: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'new-page-uuid', ...data })),
      findByPageId: vi.fn(),
      findByPageIdAndUserId: vi.fn(),
      updateStatus: vi.fn(),
      updateWebhookSubscribed: vi.fn(),
      getPageStats: vi.fn(),
      deleteByPageIdAndUserId: vi.fn(),
      getAccessToken: vi.fn(),
    } as unknown as ConnectedPageRepository;

    service = new FacebookOAuthService(mockGraphClient, mockFbAccountRepo, mockPageRepo);
  });

  describe('generateConnectUrl() & verifyState()', () => {
    it('nên tạo URL xác thực hợp lệ kèm state token', () => {
      const result = service.generateConnectUrl('user-uuid-1');
      expect(result.authUrl).toContain('https://facebook.com/dialog');
      expect(result.state).toBeDefined();

      const verifiedUserId = service.verifyState(result.state);
      expect(verifiedUserId).toBe('user-uuid-1');
    });

    it('verifyState() nên throw lỗi khi state bị sai hoặc hết hạn', () => {
      expect(() => service.verifyState('invalid-state')).toThrow(AppError);
    });
  });

  describe('handleCallback()', () => {
    it('nên xử lý callback thành công, mã hóa token và lưu tài khoản', async () => {
      const { state } = service.generateConnectUrl('user-uuid-1');
      const result = await service.handleCallback('valid-auth-code', state);

      expect(result.success).toBe(true);
      expect(result.fbUserId).toBe('fb-user-123');
      expect(result.fbName).toBe('Nguyen Van B');

      expect(mockFbAccountRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          fbUserId: 'fb-user-123',
          fbName: 'Nguyen Van B',
          userAccessToken: expect.any(String),
        })
      );

      // Token được lưu phải ở dạng mã hóa
      const savedToken = vi.mocked(mockFbAccountRepo.upsert).mock.calls[0]![0].userAccessToken;
      expect(savedToken).not.toBe('long_lived_token_meta');
      expect(decryptToken(savedToken)).toBe('long_lived_token_meta');
    });
  });

  describe('getManageablePages()', () => {
    it('nên lấy danh sách pages và gắn đúng trạng thái is_connected', async () => {
      const pages = await service.getManageablePages('user-1');

      expect(pages).toHaveLength(2);
      expect(pages[0]!).toEqual({
        page_id: 'page-101',
        page_name: 'Page Thu 1',
        avatar_url: 'https://fb.com/p1.jpg',
        is_connected: true, // Vì page-101 đã có trong findAllByUserId
      });
      expect(pages[1]!.is_connected).toBe(false);
    });

    it('nên throw lỗi khi user chưa kết nối Facebook', async () => {
      vi.mocked(mockFbAccountRepo.findByUserId).mockResolvedValueOnce(null);
      await expect(service.getManageablePages('user-without-fb')).rejects.toThrow(AppError);
    });
  });

  describe('connectPages()', () => {
    it('nên mã hóa token, đăng ký webhook và lưu pages', async () => {
      const result = await service.connectPages('user-1', ['page-101', 'page-102']);

      expect(result.connectedCount).toBe(2);
      expect(mockGraphClient.subscribePageApps).toHaveBeenCalledTimes(2);
      expect(mockPageRepo.upsert).toHaveBeenCalledTimes(2);

      const firstPageUpsertCall = vi.mocked(mockPageRepo.upsert).mock.calls[0]![0];
      expect(firstPageUpsertCall.webhookSubscribed).toBe(true);
      expect(decryptToken(firstPageUpsertCall.pageAccessToken)).toBe('raw_page_token_101');
    });

    it('nên throw lỗi khi mảng page_ids rỗng', async () => {
      await expect(service.connectPages('user-1', [])).rejects.toThrow(AppError);
    });

    it('nên throw lỗi khi không tìm thấy page nào khớp quyền quản lý', async () => {
      await expect(service.connectPages('user-1', ['page-999'])).rejects.toThrow(AppError);
    });
  });
});
