/**
 * ShopFlow - Unit Tests: graph-api.client.ts
 * File: backend/src/infrastructure/meta/__tests__/graph-api.client.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetaGraphApiClient } from '../graph-api.client.js';
import { AppError } from '../../../core/errors/app-error.js';
import { env } from '../../../config/env.js';

describe('MetaGraphApiClient', () => {
  let client: MetaGraphApiClient;
  const originalFetch = globalThis.fetch;
  const originalAppId = env.FACEBOOK_APP_ID;
  const originalAppSecret = env.FACEBOOK_APP_SECRET;

  beforeEach(() => {
    env.FACEBOOK_APP_ID = 'test_fb_app_id';
    env.FACEBOOK_APP_SECRET = 'test_fb_app_secret';
    client = new MetaGraphApiClient('v19.0');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    env.FACEBOOK_APP_ID = originalAppId;
    env.FACEBOOK_APP_SECRET = originalAppSecret;
    vi.restoreAllMocks();
  });

  describe('getOAuthDialogUrl()', () => {
    it('nên tạo URL OAuth dialog chứa đầy đủ scopes và state', () => {
      const url = client.getOAuthDialogUrl('state-xyz', 'http://localhost:3000/callback');
      expect(url).toContain('https://www.facebook.com/v19.0/dialog/oauth');
      expect(url).toContain('client_id=test_fb_app_id');
      expect(url).toContain('state=state-xyz');
      expect(url).toContain('pages_manage_posts');
      expect(url).toContain('pages_messaging');
    });
  });

  describe('exchangeCodeForTokens()', () => {
    it('nên throw AppError nếu thiếu FACEBOOK_APP_ID hoặc FACEBOOK_APP_SECRET', async () => {
      env.FACEBOOK_APP_ID = undefined;
      await expect(client.exchangeCodeForTokens('code', 'http://localhost:3000/callback')).rejects.toThrow(
        AppError
      );
    });

    it('nên đổi code lấy short-lived token và nâng cấp lên long-lived token', async () => {
      const mockFetch = vi
        .fn()
        // Call 1: Short token
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: 'short_token_123', expires_in: 3600 }),
        })
        // Call 2: Long token
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: 'long_token_456', expires_in: 5184000 }),
        });
      globalThis.fetch = mockFetch;

      const result = await client.exchangeCodeForTokens('mock_auth_code', 'http://localhost:3000/callback');

      expect(result.shortLivedToken).toBe('short_token_123');
      expect(result.longLivedToken).toBe('long_token_456');
      expect(result.expiresIn).toBe(5184000);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('nên fallback về short token nếu nâng cấp long-lived token không thành công', async () => {
      const mockFetch = vi
        .fn()
        // Call 1: Short token ok
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: 'short_token_only', expires_in: 3600 }),
        })
        // Call 2: Long token fails
        .mockResolvedValueOnce({
          ok: false,
          json: vi.fn().mockResolvedValue({ error: 'Cannot exchange' }),
        });
      globalThis.fetch = mockFetch;

      const result = await client.exchangeCodeForTokens('mock_auth_code', 'http://localhost:3000/callback');
      expect(result.shortLivedToken).toBe('short_token_only');
      expect(result.longLivedToken).toBe('short_token_only');
    });

    it('nên throw AppError khi đổi short token thất bại', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Code expired' }),
      });
      globalThis.fetch = mockFetch;

      await expect(client.exchangeCodeForTokens('bad_code', 'http://localhost:3000/callback')).rejects.toThrow(
        AppError
      );
    });
  });

  describe('getFbUserProfile()', () => {
    it('nên trả về thông tin id và name của user', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'fb-user-123', name: 'Le Van C' }),
      });
      globalThis.fetch = mockFetch;

      const profile = await client.getFbUserProfile('user_token');
      expect(profile).toEqual({ id: 'fb-user-123', name: 'Le Van C' });
    });

    it('nên throw AppError khi lấy profile thất bại', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
      });
      globalThis.fetch = mockFetch;

      await expect(client.getFbUserProfile('bad_token')).rejects.toThrow(AppError);
    });
  });

  describe('getManageablePages()', () => {
    it('nên trả về danh sách accounts từ /me/accounts', async () => {
      const mockPages = [
        {
          id: 'p-1',
          name: 'My Page',
          access_token: 'tok-1',
          picture: { data: { url: 'https://fb.com/pic.png' } },
        },
      ];
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockPages }),
      });
      globalThis.fetch = mockFetch;

      const pages = await client.getManageablePages('user_token');
      expect(pages).toEqual(mockPages);
    });

    it('nên throw AppError khi gọi /me/accounts thất bại', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Failed' }),
      });
      globalThis.fetch = mockFetch;

      await expect(client.getManageablePages('bad_token')).rejects.toThrow(AppError);
    });
  });

  describe('subscribePageApps()', () => {
    it('nên trả về true khi subscribed_apps thành công', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });
      globalThis.fetch = mockFetch;

      const success = await client.subscribePageApps('page-123', 'tok-page');
      expect(success).toBe(true);
    });

    it('nên trả về false khi API trả về lỗi', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Permission denied' }),
      });
      globalThis.fetch = mockFetch;

      const success = await client.subscribePageApps('page-123', 'tok-page');
      expect(success).toBe(false);
    });

    it('nên trả về false khi fetch ném ngoại lệ mạng', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network offline'));
      globalThis.fetch = mockFetch;

      const success = await client.subscribePageApps('page-123', 'tok-page');
      expect(success).toBe(false);
    });
  });

  describe('hideComment()', () => {
    it('gọi đúng URL và headers khi ẩn bình luận thành công', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.hideComment('cmt_999', 'EAA_token_test');

      expect(result.success).toBe(true);
      expect(result.commentId).toBe('cmt_999');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v19.0/cmt_999',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_hidden: true, access_token: 'EAA_token_test' }),
        })
      );
    });

    it('xử lý lỗi khi Graph API trả về HTTP 400/500 có body lỗi', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({
          error: { message: 'Invalid OAuth access token.', code: 190 },
        }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.hideComment('cmt_err_token', 'EAA_invalid_token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid OAuth access token.');
    });

    it('xử lý khi fetch ném ra ngoại lệ mạng hoặc AbortError (timeout)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      const mockFetch = vi.fn().mockRejectedValue(abortError);
      globalThis.fetch = mockFetch;

      const result = await client.hideComment('cmt_timeout', 'EAA_token_test', true, 100);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('replyComment()', () => {
    it('gọi đúng endpoint /{comment-id}/comments khi trả lời bình luận thành công', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'reply_comment_123' }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.replyComment('cmt_parent_456', 'Dạ chào bạn!', 'EAA_token_test');

      expect(result.success).toBe(true);
      expect(result.commentId).toBe('reply_comment_123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v19.0/cmt_parent_456/comments',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Dạ chào bạn!', access_token: 'EAA_token_test' }),
        })
      );
    });

    it('xử lý khi Meta trả về lỗi thất bại', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: { message: 'Comment not found', code: 100 } }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.replyComment('cmt_parent_456', 'Dạ chào bạn!', 'EAA_token_test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Comment not found');
    });
  });

  describe('sendPrivateReply()', () => {
    it('gọi đúng endpoint /{page-id}/messages với recipient.comment_id thành công', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ recipient_id: 'cmt_456', message_id: 'm_mid_123' }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.sendPrivateReply('page_123', 'cmt_456', 'Chào bạn!', 'EAA_token_test');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('m_mid_123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v19.0/page_123/messages',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { comment_id: 'cmt_456' },
            message: { text: 'Chào bạn!' },
            access_token: 'EAA_token_test',
          }),
        })
      );
    });

    it('xử lý khi gửi tin nhắn riêng thất bại hoặc vi phạm 7 ngày của Meta', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: { message: 'Private replies only allowed within 7 days', code: 230 },
        }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.sendPrivateReply('page_123', 'cmt_456', 'Chào bạn!', 'EAA_token_test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Private replies');
    });
  });

  describe('publishFeedPost()', () => {
    it('gọi POST /{page-id}/feed thành công', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'feed_post_123' }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.publishFeedPost('p_123', 'Hello world', 'tok_test');
      expect(result.success).toBe(true);
      expect(result.postId).toBe('feed_post_123');
    });

    it('xử lý khi đăng bài feed thất bại', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: { message: 'Feed error' } }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.publishFeedPost('p_123', 'Hello', 'tok_test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Feed error');
    });
  });

  describe('publishPhotoPost()', () => {
    it('gọi POST /{page-id}/photos thành công', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'photo_123', post_id: 'post_456' }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.publishPhotoPost('p_123', 'https://img.com/a.jpg', 'Caption', 'tok_test');
      expect(result.success).toBe(true);
      expect(result.postId).toBe('post_456');
    });

    it('xử lý khi đăng ảnh thất bại', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: { message: 'Photo error' } }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.publishPhotoPost('p_123', 'https://img.com/a.jpg', 'Caption', 'tok_test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Photo error');
    });
  });

  describe('publishVideoPost()', () => {
    it('gọi POST /{page-id}/videos thành công', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'video_123' }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.publishVideoPost('p_123', 'https://vid.com/v.mp4', 'Desc', 'tok_test');
      expect(result.success).toBe(true);
      expect(result.postId).toBe('video_123');
    });

    it('xử lý khi đăng video thất bại', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: { message: 'Video error' } }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.publishVideoPost('p_123', 'https://vid.com/v.mp4', 'Desc', 'tok_test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Video error');
    });
  });

  describe('uploadUnpublishedPhoto() & publishAlbumPost()', () => {
    it('upload unpublished photo thành công', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'media_fbid_999' }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.uploadUnpublishedPhoto('p_123', 'https://img.com/a.jpg', 'tok_test');
      expect(result.success).toBe(true);
      expect(result.mediaFbid).toBe('media_fbid_999');
    });

    it('xử lý khi upload unpublished photo thất bại', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: { message: 'Upload fail' } }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.uploadUnpublishedPhoto('p_123', 'https://img.com/a.jpg', 'tok_test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload fail');
    });

    it('publishAlbumPost thành công với attached_media', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'album_post_777' }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.publishAlbumPost('p_123', ['fbid_1', 'fbid_2'], 'Album caption', 'tok_test');
      expect(result.success).toBe(true);
      expect(result.postId).toBe('album_post_777');
    });

    it('xử lý khi publishAlbumPost thất bại', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: { message: 'Album fail' } }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.publishAlbumPost('p_123', ['fbid_1'], 'Album caption', 'tok_test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Album fail');
    });
  });

  describe('sendMessage()', () => {
    it('gửi tin nhắn văn bản qua Facebook Messenger thành công', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message_id: 'mid_msg_123' }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.sendMessage('page_123', 'recipient_456', 'Hello text', 'tok_test');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('mid_msg_123');

      const calledBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(calledBody.recipient.id).toBe('recipient_456');
      expect(calledBody.message.text).toBe('Hello text');
    });

    it('gửi tin nhắn đính kèm mediaUrl thành công', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message_id: 'mid_msg_media' }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.sendMessage(
        'page_123',
        'recipient_456',
        '',
        'tok_test',
        'https://img.com/pic.jpg'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('mid_msg_media');

      const calledBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(calledBody.message.attachment.payload.url).toBe('https://img.com/pic.jpg');
    });

    it('xử lý khi Meta API trả về lỗi', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({ error: { message: 'Policy violation' } }),
      });
      globalThis.fetch = mockFetch;

      const result = await client.sendMessage('page_123', 'recipient_456', 'Hello', 'tok_test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Policy violation');
    });

    it('xử lý khi gọi sendMessage bị timeout hoặc lỗi mạng', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      const mockFetch = vi.fn().mockRejectedValue(abortError);
      globalThis.fetch = mockFetch;

      const result = await client.sendMessage('page_123', 'recipient_456', 'Hello', 'tok_test', undefined, 100);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });
});



