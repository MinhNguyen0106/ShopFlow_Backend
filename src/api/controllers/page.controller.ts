/**
 * ShopFlow - Connected Pages Controller
 * File: backend/src/api/controllers/page.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import { pageService, PageService } from '../../core/services/page.service.js';
import { UpdatePageStatusDto } from '../dtos/page.dto.js';
import { AppError } from '../../core/errors/app-error.js';

export class PageController {
  constructor(
    private readonly service: PageService = pageService
  ) {}

  /**
   * GET /api/v1/pages
   * Lấy danh sách Fanpage đã kết nối của người dùng
   */
  getPages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const pages = await this.service.getUserPages(userId);
      res.status(200).json({
        success: true,
        data: { pages },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/pages/:pageId
   * Chi tiết Fanpage và số liệu thống kê
   */
  getPageDetail = async (
    req: Request<{ pageId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const { pageId } = req.params;
      const result = await this.service.getPageDetail(pageId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/pages/:pageId/status
   * Bật/Tắt trạng thái hoạt động của Fanpage
   */
  updateStatus = async (
    req: Request<{ pageId: string }, unknown, UpdatePageStatusDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const { pageId } = req.params;
      const updated = await this.service.updatePageStatus(pageId, userId, req.body.is_active);

      res.status(200).json({
        success: true,
        message: `Đã ${req.body.is_active ? 'kích hoạt' : 'tạm dừng'} Fanpage thành công`,
        data: { page: updated },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/pages/:pageId/subscribe-webhook
   * Đăng ký lại Webhook với Meta
   */
  subscribeWebhook = async (
    req: Request<{ pageId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const { pageId } = req.params;
      const result = await this.service.subscribeWebhook(pageId, userId);

      res.status(200).json({
        success: true,
        message: result.webhook_subscribed
          ? 'Đăng ký Webhook với Meta thành công'
          : 'Đăng ký Webhook không thành công. Vui lòng kiểm tra quyền hạn tài khoản.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/pages/:pageId
   * Hủy kết nối Fanpage an toàn
   */
  disconnectPage = async (
    req: Request<{ pageId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Yêu cầu xác thực tài khoản', 401, 'UNAUTHORIZED');
      }

      const { pageId } = req.params;
      await this.service.disconnectPage(pageId, userId);

      res.status(200).json({
        success: true,
        message: 'Đã hủy kết nối Fanpage thành công',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const pageController = new PageController();
