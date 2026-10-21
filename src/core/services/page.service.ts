/**
 * ShopFlow - Connected Pages Management Service
 * File: backend/src/core/services/page.service.ts
 *
 * Quản lý trạng thái, số liệu thống kê và cấu hình Webhook cho các Fanpage đã kết nối.
 */

import { connectedPageRepository, ConnectedPageRepository, ConnectedPage, PageStats } from '../../infrastructure/repositories/connected-page.repository.js';
import { metaGraphApiClient, MetaGraphApiClient } from '../../infrastructure/meta/graph-api.client.js';
import { decryptToken } from '../../utils/crypto.helper.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../../utils/logger.js';

export type SafeConnectedPage = Omit<ConnectedPage, 'page_access_token'>;

export class PageService {
  constructor(
    private readonly pageRepo: ConnectedPageRepository = connectedPageRepository,
    private readonly graphClient: MetaGraphApiClient = metaGraphApiClient
  ) {}

  /**
   * Ẩn thông tin nhạy cảm của token trước khi trả về cho client.
   */
  private toSafePage(page: ConnectedPage): SafeConnectedPage {
    const { page_access_token: _, ...safePage } = page;
    return safePage;
  }

  /**
   * Lấy danh sách toàn bộ Fanpage đã kết nối của người dùng.
   */
  async getUserPages(userId: string): Promise<SafeConnectedPage[]> {
    const pages = await this.pageRepo.findAllByUserId(userId);
    return pages.map((p) => this.toSafePage(p));
  }

  /**
   * Lấy chi tiết thông tin Fanpage kèm số liệu thống kê hoạt động.
   */
  async getPageDetail(
    pageIdOrDbId: string,
    userId: string
  ): Promise<{ page: SafeConnectedPage; stats: PageStats }> {
    const page = await this.pageRepo.findByPageIdAndUserId(pageIdOrDbId, userId);
    if (!page) {
      throw new AppError('Không tìm thấy Fanpage hoặc bạn không có quyền truy cập', 404, 'NOT_FOUND');
    }

    const stats = await this.pageRepo.getPageStats(page.id);
    return {
      page: this.toSafePage(page),
      stats,
    };
  }

  /**
   * Bật hoặc tắt trạng thái xử lý tự động của Fanpage.
   */
  async updatePageStatus(
    pageIdOrDbId: string,
    userId: string,
    isActive: boolean
  ): Promise<SafeConnectedPage> {
    const updated = await this.pageRepo.updateStatus(pageIdOrDbId, userId, isActive);
    if (!updated) {
      throw new AppError('Không tìm thấy Fanpage để cập nhật trạng thái', 404, 'NOT_FOUND');
    }

    logger.info({ pageId: updated.page_id, isActive }, '[PageService] ✔ Cập nhật trạng thái Fanpage');
    return this.toSafePage(updated);
  }

  /**
   * Đồng bộ và đăng ký lại Webhook với Meta cho Fanpage.
   */
  async subscribeWebhook(
    pageIdOrDbId: string,
    userId: string
  ): Promise<{ webhook_subscribed: boolean }> {
    const page = await this.pageRepo.findByPageIdAndUserId(pageIdOrDbId, userId);
    if (!page) {
      throw new AppError('Không tìm thấy Fanpage để đăng ký Webhook', 404, 'NOT_FOUND');
    }

    // Giải mã Page Access Token
    const plainToken = decryptToken(page.page_access_token);

    // Gọi Graph API đăng ký Subscribed Apps
    const success = await this.graphClient.subscribePageApps(page.page_id, plainToken);

    // Cập nhật trạng thái vào database
    await this.pageRepo.updateWebhookSubscribed(page.page_id, success);

    logger.info(
      { pageId: page.page_id, success },
      '[PageService] ✔ Đăng ký lại Webhook với Meta hoàn tất'
    );

    return { webhook_subscribed: success };
  }

  /**
   * Hủy kết nối Fanpage khỏi hệ thống ShopFlow.
   */
  async disconnectPage(pageIdOrDbId: string, userId: string): Promise<boolean> {
    const deleted = await this.pageRepo.deleteByPageIdAndUserId(pageIdOrDbId, userId);
    if (!deleted) {
      throw new AppError('Không tìm thấy Fanpage để hủy kết nối', 404, 'NOT_FOUND');
    }

    logger.info({ pageIdOrDbId, userId }, '[PageService] ✔ Đã hủy kết nối Fanpage');
    return true;
  }
}

export const pageService = new PageService();
