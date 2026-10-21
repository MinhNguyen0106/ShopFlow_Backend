/**
 * ShopFlow - Facebook OAuth Controller
 * File: backend/src/api/controllers/fb-oauth.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import { facebookOAuthService, FacebookOAuthService } from '../../core/services/facebook-oauth.service.js';
import { ConnectPagesDto } from '../dtos/fb-oauth.dto.js';
import { AppError } from '../../core/errors/app-error.js';

export class FacebookOAuthController {
  constructor(
    private readonly service: FacebookOAuthService = facebookOAuthService
  ) {}

  /**
   * GET /api/v1/fb-oauth/connect-url
   * Sinh URL xác thực Meta OAuth 2.0 kèm CSRF state token
   */
  getConnectUrl = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const redirectUri = (req.query.redirect_uri as string) || undefined;
      const result = this.service.generateConnectUrl(userId, redirectUri);

      res.status(200).json({
        success: true,
        data: { authUrl: result.authUrl },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/fb-oauth/callback
   * Tiếp nhận redirect callback từ Meta sau khi người dùng cấp quyền
   */
  handleCallback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { code, state, format } = req.query as { code?: string; state?: string; format?: string };

      if (!code || !state) {
        throw new AppError('Thiếu tham số code hoặc state từ Meta redirect', 400, 'BAD_REQUEST');
      }

      const result = await this.service.handleCallback(code, state);

      if (format === 'json') {
        res.status(200).json({
          success: true,
          message: 'Kết nối Facebook thành công',
          data: result,
        });
        return;
      }

      // Mặc định redirect về Frontend Dashboard
      res.redirect(`${env.CORS_ORIGIN}/pages?oauth_status=success&fb_user_id=${result.fbUserId}`);
    } catch (error) {
      if (req.query.format === 'json') {
        next(error);
        return;
      }
      const message = error instanceof Error ? error.message : 'Lỗi kết nối Facebook';
      res.redirect(`${env.CORS_ORIGIN}/pages?oauth_status=error&message=${encodeURIComponent(message)}`);
    }
  };

  /**
   * GET /api/v1/fb-oauth/accounts
   * Lấy danh sách Fanpage mà tài khoản Facebook cá nhân đang quản trị
   */
  getManageablePages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const pages = await this.service.getManageablePages(userId);
      res.status(200).json({
        success: true,
        data: { pages },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/fb-oauth/connect-pages
   * Kết nối các Fanpage được chọn vào hệ thống ShopFlow
   */
  connectPages = async (
    req: Request<unknown, unknown, ConnectPagesDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const result = await this.service.connectPages(userId, req.body.page_ids);

      // Mask token khi trả về client
      const safePages = result.pages.map(({ page_access_token: _, ...rest }) => rest);

      res.status(200).json({
        success: true,
        message: `Đã kết nối thành công ${result.connectedCount} Fanpage`,
        data: {
          connectedCount: result.connectedCount,
          pages: safePages,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const facebookOAuthController = new FacebookOAuthController();
