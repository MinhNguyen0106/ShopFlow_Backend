/**
 * ShopFlow - Facebook OAuth Service
 * File: backend/src/core/services/facebook-oauth.service.ts
 *
 * Xử lý nghiệp vụ kết nối tài khoản Meta Facebook cá nhân, đổi mã xác thực,
 * quản lý danh sách Fanpage và đăng ký Webhook tự động.
 */

import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { encryptToken, decryptToken } from '../../utils/crypto.helper.js';
import { metaGraphApiClient, MetaGraphApiClient } from '../../infrastructure/meta/graph-api.client.js';
import { facebookAccountRepository, FacebookAccountRepository } from '../../infrastructure/repositories/facebook-account.repository.js';
import { connectedPageRepository, ConnectedPageRepository, ConnectedPage } from '../../infrastructure/repositories/connected-page.repository.js';
import { AppError } from '../errors/app-error.js';

export interface OAuthStatePayload {
  userId: string;
  nonce: string;
}

export interface ManageablePageItem {
  page_id: string;
  page_name: string;
  avatar_url: string | null;
  is_connected: boolean;
}

export class FacebookOAuthService {
  constructor(
    private readonly graphClient: MetaGraphApiClient = metaGraphApiClient,
    private readonly fbAccountRepo: FacebookAccountRepository = facebookAccountRepository,
    private readonly pageRepo: ConnectedPageRepository = connectedPageRepository
  ) {}

  /**
   * Tạo URL kết nối Facebook OAuth kèm chữ ký CSRF State.
   */
  generateConnectUrl(userId: string, redirectUri?: string): { authUrl: string; state: string } {
    const callbackUrl = redirectUri || `${env.CORS_ORIGIN}/api/v1/fb-oauth/callback`;
    const stateToken = jwt.sign(
      { userId, nonce: Math.random().toString(36).substring(2) },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const authUrl = this.graphClient.getOAuthDialogUrl(stateToken, callbackUrl);
    return { authUrl, state: stateToken };
  }

  /**
   * Xác thực state CSRF và trích xuất userId.
   */
  verifyState(state: string): string {
    try {
      const decoded = jwt.verify(state, env.JWT_ACCESS_SECRET) as OAuthStatePayload;
      if (!decoded.userId) {
        throw new AppError('State payload không hợp lệ', 400, 'BAD_REQUEST');
      }
      return decoded.userId;
    } catch (err) {
      throw new AppError('Mã state xác thực không hợp lệ hoặc đã hết hạn', 400, 'BAD_REQUEST');
    }
  }

  /**
   * Xử lý callback từ Meta: đổi code lấy token, lưu tài khoản cá nhân.
   */
  async handleCallback(
    code: string,
    state: string,
    redirectUri?: string
  ): Promise<{ success: boolean; fbUserId: string; fbName: string | null }> {
    const userId = this.verifyState(state);
    const callbackUrl = redirectUri || `${env.CORS_ORIGIN}/api/v1/fb-oauth/callback`;

    // 1. Đổi Code lấy Short-Lived và nâng lên Long-Lived Token
    const tokens = await this.graphClient.exchangeCodeForTokens(code, callbackUrl);

    // 2. Lấy thông tin cá nhân Facebook User
    const profile = await this.graphClient.getFbUserProfile(tokens.longLivedToken);

    // 3. Mã hóa token bảo vệ dữ liệu với AES-256-GCM
    const encryptedToken = encryptToken(tokens.longLivedToken);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    // 4. Lưu vào cơ sở dữ liệu
    await this.fbAccountRepo.upsert({
      userId,
      fbUserId: profile.id,
      fbName: profile.name,
      userAccessToken: encryptedToken,
      tokenExpiresAt: expiresAt,
    });

    logger.info(
      { userId, fbUserId: profile.id, fbName: profile.name },
      '[FacebookOAuthService] ✔ Kết nối tài khoản Meta thành công'
    );

    return {
      success: true,
      fbUserId: profile.id,
      fbName: profile.name,
    };
  }

  /**
   * Lấy danh sách các Fanpage người dùng đang quản lý trên Facebook.
   */
  async getManageablePages(userId: string): Promise<ManageablePageItem[]> {
    const account = await this.fbAccountRepo.findByUserId(userId);
    if (!account) {
      throw new AppError('Tài khoản chưa kết nối Facebook cá nhân. Vui lòng kết nối trước.', 404, 'NOT_FOUND');
    }

    // Giải mã User Access Token
    const userAccessToken = decryptToken(account.user_access_token);

    // Lấy danh sách Pages từ Graph API
    const metaPages = await this.graphClient.getManageablePages(userAccessToken);

    // Lấy danh sách Pages đã kết nối trong ShopFlow để đánh dấu is_connected
    const connectedPages = await this.pageRepo.findAllByUserId(userId);
    const connectedPageIds = new Set(connectedPages.map((p) => p.page_id));

    return metaPages.map((mp) => ({
      page_id: mp.id,
      page_name: mp.name,
      avatar_url: mp.picture?.data?.url ?? null,
      is_connected: connectedPageIds.has(mp.id),
    }));
  }

  /**
   * Kết nối hàng loạt Fanpage được chọn vào hệ thống ShopFlow.
   */
  async connectPages(
    userId: string,
    pageIds: string[]
  ): Promise<{ connectedCount: number; pages: ConnectedPage[] }> {
    if (!pageIds || pageIds.length === 0) {
      throw new AppError('Danh sách Fanpage cần kết nối không được để trống', 400, 'BAD_REQUEST');
    }

    const account = await this.fbAccountRepo.findByUserId(userId);
    if (!account) {
      throw new AppError('Tài khoản chưa kết nối Facebook cá nhân.', 404, 'NOT_FOUND');
    }

    const userAccessToken = decryptToken(account.user_access_token);
    const metaPages = await this.graphClient.getManageablePages(userAccessToken);

    const pagesToConnect = metaPages.filter((mp) => pageIds.includes(mp.id));
    if (pagesToConnect.length === 0) {
      throw new AppError('Không tìm thấy Fanpage nào khớp với quyền quản trị của tài khoản', 404, 'NOT_FOUND');
    }

    const connectedResults: ConnectedPage[] = [];

    for (const page of pagesToConnect) {
      // 1. Mã hóa Page Access Token bằng AES-256-GCM
      const encryptedPageToken = encryptToken(page.access_token);

      // 2. Tự động đăng ký Subscribed Apps để nhận Webhook
      const subscribed = await this.graphClient.subscribePageApps(page.id, page.access_token);

      // 3. Lưu vào bảng connected_pages
      const savedPage = await this.pageRepo.upsert({
        userId,
        fbAccountId: account.id,
        pageId: page.id,
        pageName: page.name,
        avatarUrl: page.picture?.data?.url ?? null,
        pageAccessToken: encryptedPageToken,
        isActive: true,
        webhookSubscribed: subscribed,
      });

      connectedResults.push(savedPage);
    }

    logger.info(
      { userId, count: connectedResults.length },
      '[FacebookOAuthService] ✔ Kết nối Fanpage thành công'
    );

    return {
      connectedCount: connectedResults.length,
      pages: connectedResults,
    };
  }
}

export const facebookOAuthService = new FacebookOAuthService();
