/**
 * ShopFlow - Meta Graph API Client
 * File: backend/src/infrastructure/meta/graph-api.client.ts
 *
 * Client tương tác trực tiếp với Meta Graph API v19+ (OAuth 2.0, Pages API, Subscribed Apps, Comments).
 */

import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../core/errors/app-error.js';

export interface HideCommentResult {
  success: boolean;
  commentId: string;
  error?: string;
}

export interface MetaPageAccount {
  id: string;
  name: string;
  access_token: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

export interface MetaUserProfile {
  id: string;
  name: string;
}

export interface TokenExchangeResult {
  shortLivedToken: string;
  longLivedToken: string;
  expiresIn: number;
}

export class MetaGraphApiClient {
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(apiVersion: string = 'v19.0') {
    this.apiVersion = apiVersion;
    this.baseUrl = `https://graph.facebook.com/${apiVersion}`;
  }

  /**
   * Tạo URL chuyển hướng đăng nhập Facebook OAuth 2.0.
   */
  getOAuthDialogUrl(state: string, redirectUri: string): string {
    const appId = env.FACEBOOK_APP_ID || '';
    const scopes = [
      'pages_manage_posts',
      'pages_messaging',
      'pages_read_engagement',
      'pages_show_list',
    ].join(',');

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: scopes,
      response_type: 'code',
    });

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
  }

  /**
   * Đổi Authorization Code lấy Short-Lived User Token và nâng cấp thành Long-Lived Token (60 ngày).
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenExchangeResult> {
    const appId = env.FACEBOOK_APP_ID || '';
    const appSecret = env.FACEBOOK_APP_SECRET || '';

    if (!appId || !appSecret) {
      throw new AppError('Chưa cấu hình FACEBOOK_APP_ID hoặc FACEBOOK_APP_SECRET', 500, 'INTERNAL_SERVER_ERROR');
    }

    // 1. Đổi Code lấy Short-Lived User Token
    const codeExchangeParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const shortTokenUrl = `${this.baseUrl}/oauth/access_token?${codeExchangeParams.toString()}`;
    const shortTokenRes = await fetch(shortTokenUrl);
    if (!shortTokenRes.ok) {
      const err = await shortTokenRes.json().catch(() => ({}));
      logger.error({ err }, '[MetaGraphApiClient] Đổi code lấy Short-Lived token thất bại');
      throw new AppError('Xác thực mã OAuth với Meta thất bại', 502, 'META_API_ERROR');
    }

    const shortTokenData = (await shortTokenRes.json()) as { access_token: string; expires_in?: number };
    const shortLivedToken = shortTokenData.access_token;

    // 2. Nâng cấp Short-Lived Token thành Long-Lived Token (60 ngày)
    const longTokenParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const longTokenUrl = `${this.baseUrl}/oauth/access_token?${longTokenParams.toString()}`;
    const longTokenRes = await fetch(longTokenUrl);
    if (!longTokenRes.ok) {
      const err = await longTokenRes.json().catch(() => ({}));
      logger.error({ err }, '[MetaGraphApiClient] Nâng cấp sang Long-Lived token thất bại');
      // Fallback sử dụng shortLivedToken nếu Facebook không cho cấp long-lived
      return {
        shortLivedToken,
        longLivedToken: shortLivedToken,
        expiresIn: shortTokenData.expires_in ?? 5184000,
      };
    }

    const longTokenData = (await longTokenRes.json()) as { access_token: string; expires_in?: number };
    return {
      shortLivedToken,
      longLivedToken: longTokenData.access_token,
      expiresIn: longTokenData.expires_in ?? 5184000, // 60 ngày = 5184000 giây
    };
  }

  /**
   * Lấy thông tin cá nhân của Facebook User (id, name).
   */
  async getFbUserProfile(userAccessToken: string): Promise<MetaUserProfile> {
    const url = `${this.baseUrl}/me?fields=id,name&access_token=${encodeURIComponent(userAccessToken)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      logger.error({ err }, '[MetaGraphApiClient] Lấy Facebook profile thất bại');
      throw new AppError('Không thể lấy thông tin tài khoản Facebook từ Meta', 502, 'META_API_ERROR');
    }
    return (await res.json()) as MetaUserProfile;
  }

  /**
   * Lấy danh sách các Fanpage mà Facebook User đang quản lý.
   */
  async getManageablePages(userAccessToken: string): Promise<MetaPageAccount[]> {
    const url = `${this.baseUrl}/me/accounts?fields=id,name,access_token,picture{url}&access_token=${encodeURIComponent(
      userAccessToken
    )}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      logger.error({ err }, '[MetaGraphApiClient] Lấy danh sách Fanpage từ Meta thất bại');
      throw new AppError('Không thể lấy danh sách Fanpage từ Meta Graph API', 502, 'META_API_ERROR');
    }
    const data = (await res.json()) as { data?: MetaPageAccount[] };
    return data.data ?? [];
  }

  /**
   * Đăng ký ứng dụng nhận Webhook từ Fanpage qua endpoint `/{page_id}/subscribed_apps`.
   */
  async subscribePageApps(pageId: string, pageAccessToken: string): Promise<boolean> {
    const url = `${this.baseUrl}/${encodeURIComponent(pageId)}/subscribed_apps`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: ['feed', 'messages', 'messaging_postbacks'],
          access_token: pageAccessToken,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        logger.error({ pageId, err }, '[MetaGraphApiClient] Đăng ký subscribed_apps thất bại');
        return false;
      }

      const body = (await res.json()) as { success?: boolean };
      return body.success === true;
    } catch (error) {
      logger.error({ pageId, error }, '[MetaGraphApiClient] Lỗi kết nối khi gọi subscribed_apps');
      return false;
    }
  }

  /**
   * Gọi Graph API để ẩn bình luận vi phạm hoặc chứa số điện thoại riêng tư.
   */
  async hideComment(
    commentId: string,
    pageAccessToken: string,
    isHidden: boolean = true,
    timeoutMs: number = 2500
  ): Promise<HideCommentResult> {
    const url = `${this.baseUrl}/${encodeURIComponent(commentId)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_hidden: isHidden,
          access_token: pageAccessToken,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number };
        };
        const errorMsg =
          errorBody.error?.message || `HTTP ${response.status} ${response.statusText}`;

        logger.error(
          { commentId, status: response.status, error: errorMsg },
          '[MetaGraphApiClient] ✘ Gọi API ẩn bình luận thất bại'
        );

        return {
          success: false,
          commentId,
          error: errorMsg,
        };
      }

      logger.info(
        { commentId },
        '[MetaGraphApiClient] ✔ Ẩn bình luận Facebook thành công qua Graph API'
      );

      return {
        success: true,
        commentId,
      };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = (err as Error).name === 'AbortError';
      const errorMsg = isTimeout
        ? `Graph API request timeout sau ${timeoutMs}ms`
        : (err as Error).message;

      logger.error(
        { commentId, error: errorMsg, isTimeout },
        '[MetaGraphApiClient] ✘ Lỗi kết nối khi gọi Graph API'
      );

      return {
        success: false,
        commentId,
        error: errorMsg,
      };
    }
  }

  /**
   * Đăng bình luận trả lời cho một bình luận trên bài viết Facebook.
   * Endpoint: POST /{comment-id}/comments
   */
  async replyComment(
    commentId: string,
    message: string,
    pageAccessToken: string,
    timeoutMs: number = 3000
  ): Promise<{ success: boolean; commentId?: string; error?: string }> {
    const url = `${this.baseUrl}/${encodeURIComponent(commentId)}/comments`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          access_token: pageAccessToken,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number };
        };
        const errorMsg = errorBody.error?.message || `HTTP ${response.status} ${response.statusText}`;
        logger.error({ commentId, error: errorMsg }, '[MetaGraphApiClient] ✘ Trả lời bình luận thất bại');
        return { success: false, error: errorMsg };
      }

      const body = (await response.json()) as { id?: string };
      logger.info({ commentId, replyId: body.id }, '[MetaGraphApiClient] ✔ Đăng bình luận trả lời thành công');
      return { success: true, commentId: body.id };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = (err as Error).name === 'AbortError';
      const errorMsg = isTimeout ? `Request timeout sau ${timeoutMs}ms` : (err as Error).message;
      logger.error({ commentId, error: errorMsg }, '[MetaGraphApiClient] ✘ Lỗi khi gọi replyComment');
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Gửi tin nhắn riêng (Private Reply) qua Messenger cho người đã bình luận.
   * Chính sách Meta: Chỉ được gửi 1 lần duy nhất trong vòng 7 ngày kể từ khi có comment.
   * Endpoint: POST /{page-id}/messages
   */
  async sendPrivateReply(
    pageId: string,
    commentId: string,
    message: string,
    pageAccessToken: string,
    timeoutMs: number = 3500
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const url = `${this.baseUrl}/${encodeURIComponent(pageId)}/messages`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: { text: message },
          access_token: pageAccessToken,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number };
        };
        const errorMsg = errorBody.error?.message || `HTTP ${response.status} ${response.statusText}`;
        logger.error({ pageId, commentId, error: errorMsg }, '[MetaGraphApiClient] ✘ Gửi Private Reply thất bại');
        return { success: false, error: errorMsg };
      }

      const body = (await response.json()) as { message_id?: string };
      logger.info(
        { pageId, commentId, messageId: body.message_id },
        '[MetaGraphApiClient] ✔ Gửi Private Reply Messenger thành công'
      );
      return { success: true, messageId: body.message_id };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = (err as Error).name === 'AbortError';
      const errorMsg = isTimeout ? `Request timeout sau ${timeoutMs}ms` : (err as Error).message;
      logger.error({ pageId, commentId, error: errorMsg }, '[MetaGraphApiClient] ✘ Lỗi khi gửi Private Reply');
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Gửi tin nhắn trực tiếp qua Facebook Messenger cho khách hàng (theo recipientFbId / PSID).
   * Endpoint: POST /{page-id}/messages
   */
  async sendMessage(
    pageId: string,
    recipientFbId: string,
    text: string,
    pageAccessToken: string,
    mediaUrl?: string,
    timeoutMs: number = 5000
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const url = `${this.baseUrl}/${encodeURIComponent(pageId)}/messages`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const messagePayload: Record<string, unknown> = {};
      if (mediaUrl) {
        messagePayload.attachment = {
          type: 'image',
          payload: { url: mediaUrl, is_reusable: true },
        };
      } else {
        messagePayload.text = text;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientFbId },
          message: messagePayload,
          messaging_type: 'RESPONSE',
          access_token: pageAccessToken,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number };
        };
        const errorMsg = errorBody.error?.message || `HTTP ${response.status} ${response.statusText}`;
        logger.error({ pageId, recipientFbId, error: errorMsg }, '[MetaGraphApiClient] ✘ Gửi tin nhắn Messenger thất bại');
        return { success: false, error: errorMsg };
      }

      const body = (await response.json()) as { message_id?: string };
      logger.info(
        { pageId, recipientFbId, messageId: body.message_id },
        '[MetaGraphApiClient] ✔ Gửi tin nhắn Messenger thành công'
      );
      return { success: true, messageId: body.message_id };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = (err as Error).name === 'AbortError';
      const errorMsg = isTimeout ? `Request timeout sau ${timeoutMs}ms` : (err as Error).message;
      logger.error({ pageId, recipientFbId, error: errorMsg }, '[MetaGraphApiClient] ✘ Lỗi khi gửi tin nhắn Messenger');
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Đăng bài viết dạng văn bản thuần (Text-only) lên Fanpage.
   * Endpoint: POST /{page-id}/feed
   */
  async publishFeedPost(
    pageId: string,
    message: string,
    pageAccessToken: string,
    timeoutMs: number = 8000
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    const url = `${this.baseUrl}/${encodeURIComponent(pageId)}/feed`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          access_token: pageAccessToken,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number };
        };
        const errorMsg = errorBody.error?.message || `HTTP ${response.status} ${response.statusText}`;
        logger.error({ pageId, error: errorMsg }, '[MetaGraphApiClient] ✘ Đăng bài viết feed thất bại');
        return { success: false, error: errorMsg };
      }

      const body = (await response.json()) as { id?: string };
      logger.info({ pageId, postId: body.id }, '[MetaGraphApiClient] ✔ Đăng bài feed thành công');
      return { success: true, postId: body.id };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = (err as Error).name === 'AbortError';
      const errorMsg = isTimeout ? `Request timeout sau ${timeoutMs}ms` : (err as Error).message;
      logger.error({ pageId, error: errorMsg }, '[MetaGraphApiClient] ✘ Lỗi publishFeedPost');
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Đăng bài viết kèm 1 hình ảnh lên Fanpage.
   * Endpoint: POST /{page-id}/photos
   */
  async publishPhotoPost(
    pageId: string,
    photoUrl: string,
    caption: string,
    pageAccessToken: string,
    timeoutMs: number = 10000
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    const url = `${this.baseUrl}/${encodeURIComponent(pageId)}/photos`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: photoUrl,
          caption,
          access_token: pageAccessToken,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number };
        };
        const errorMsg = errorBody.error?.message || `HTTP ${response.status} ${response.statusText}`;
        logger.error({ pageId, error: errorMsg }, '[MetaGraphApiClient] ✘ Đăng bài ảnh thất bại');
        return { success: false, error: errorMsg };
      }

      const body = (await response.json()) as { id?: string; post_id?: string };
      const resolvedPostId = body.post_id || body.id;
      logger.info({ pageId, postId: resolvedPostId }, '[MetaGraphApiClient] ✔ Đăng bài ảnh thành công');
      return { success: true, postId: resolvedPostId };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = (err as Error).name === 'AbortError';
      const errorMsg = isTimeout ? `Request timeout sau ${timeoutMs}ms` : (err as Error).message;
      logger.error({ pageId, error: errorMsg }, '[MetaGraphApiClient] ✘ Lỗi publishPhotoPost');
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Đăng bài viết video lên Fanpage.
   * Endpoint: POST /{page-id}/videos
   */
  async publishVideoPost(
    pageId: string,
    fileUrl: string,
    description: string,
    pageAccessToken: string,
    timeoutMs: number = 15000
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    const url = `${this.baseUrl}/${encodeURIComponent(pageId)}/videos`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: fileUrl,
          description,
          access_token: pageAccessToken,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number };
        };
        const errorMsg = errorBody.error?.message || `HTTP ${response.status} ${response.statusText}`;
        logger.error({ pageId, error: errorMsg }, '[MetaGraphApiClient] ✘ Đăng bài video thất bại');
        return { success: false, error: errorMsg };
      }

      const body = (await response.json()) as { id?: string };
      logger.info({ pageId, postId: body.id }, '[MetaGraphApiClient] ✔ Đăng bài video thành công');
      return { success: true, postId: body.id };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = (err as Error).name === 'AbortError';
      const errorMsg = isTimeout ? `Request timeout sau ${timeoutMs}ms` : (err as Error).message;
      logger.error({ pageId, error: errorMsg }, '[MetaGraphApiClient] ✘ Lỗi publishVideoPost');
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Upload ảnh dạng unpublished để chuẩn bị đăng Album (nhiều ảnh).
   * Endpoint: POST /{page-id}/photos với published=false
   */
  async uploadUnpublishedPhoto(
    pageId: string,
    photoUrl: string,
    pageAccessToken: string,
    timeoutMs: number = 8000
  ): Promise<{ success: boolean; mediaFbid?: string; error?: string }> {
    const url = `${this.baseUrl}/${encodeURIComponent(pageId)}/photos`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: photoUrl,
          published: false,
          access_token: pageAccessToken,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number };
        };
        const errorMsg = errorBody.error?.message || `HTTP ${response.status} ${response.statusText}`;
        logger.error({ pageId, error: errorMsg }, '[MetaGraphApiClient] ✘ Upload unpublished photo thất bại');
        return { success: false, error: errorMsg };
      }

      const body = (await response.json()) as { id?: string };
      return { success: true, mediaFbid: body.id };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = (err as Error).name === 'AbortError';
      const errorMsg = isTimeout ? `Request timeout sau ${timeoutMs}ms` : (err as Error).message;
      logger.error({ pageId, error: errorMsg }, '[MetaGraphApiClient] ✘ Lỗi uploadUnpublishedPhoto');
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Xuất bản bài viết Album (nhiều ảnh đã upload trước đó).
   * Endpoint: POST /{page-id}/feed với attached_media
   */
  async publishAlbumPost(
    pageId: string,
    mediaFbids: string[],
    message: string,
    pageAccessToken: string,
    timeoutMs: number = 10000
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    const url = `${this.baseUrl}/${encodeURIComponent(pageId)}/feed`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const attachedMedia = mediaFbids.map((id) => ({ media_fbid: id }));

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          attached_media: attachedMedia,
          access_token: pageAccessToken,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number };
        };
        const errorMsg = errorBody.error?.message || `HTTP ${response.status} ${response.statusText}`;
        logger.error({ pageId, error: errorMsg }, '[MetaGraphApiClient] ✘ Đăng bài Album thất bại');
        return { success: false, error: errorMsg };
      }

      const body = (await response.json()) as { id?: string };
      logger.info({ pageId, postId: body.id }, '[MetaGraphApiClient] ✔ Đăng bài Album thành công');
      return { success: true, postId: body.id };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = (err as Error).name === 'AbortError';
      const errorMsg = isTimeout ? `Request timeout sau ${timeoutMs}ms` : (err as Error).message;
      logger.error({ pageId, error: errorMsg }, '[MetaGraphApiClient] ✘ Lỗi publishAlbumPost');
      return { success: false, error: errorMsg };
    }
  }
}

export const metaGraphApiClient = new MetaGraphApiClient();

