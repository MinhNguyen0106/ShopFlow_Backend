/**
 * ShopFlow - Webhook Controller
 * File: backend/src/api/controllers/webhook.controller.ts
 *
 * Tiếp nhận yêu cầu Handshake (GET) và Ingestion (POST) từ Meta Webhooks.
 */

import { Request, Response, NextFunction } from 'express';
import {
  WebhookService,
  webhookService as defaultWebhookService,
} from '../../core/services/webhook.service.js';
import { MetaWebhookPayload } from '../dtos/webhook.dto.js';

export class WebhookController {
  constructor(
    private readonly service: WebhookService = defaultWebhookService
  ) {}

  /**
   * GET /api/v1/webhook
   * Meta Webhook Handshake / Challenge Verification
   * Yêu cầu trả về raw challenge string (HTTP 200) để Meta verify endpoint.
   */
  handshake = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const mode      = req.query['hub.mode'] as string | undefined;
      const token     = req.query['hub.verify_token'] as string | undefined;
      const challenge = req.query['hub.challenge'] as string | undefined;

      const validChallenge = this.service.verifyHandshake(mode, token, challenge);

      // Meta Platform yêu cầu trả về chuỗi challenge THÔ (text/plain)
      res.status(200).type('text/plain').send(validChallenge);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/webhook
   * Meta Webhook Ingestion
   * Tiếp nhận các sự kiện: Comment bài viết, tin nhắn Messenger, thay đổi trạng thái Page.
   * Luôn phản hồi HTTP 200 OK ngay lập tức (< 1 giây) để ngăn Meta retry dồn dập.
   */
  ingest = async (
    req: Request<unknown, unknown, MetaWebhookPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Phản hồi 200 OK ngay lập tức cho Meta Platform
      res.status(200).json({
        success: true,
        message: 'EVENT_RECEIVED',
      });

      // Xử lý lưu log & phân luồng bất đồng bộ (không block HTTP response)
      await this.service.processIncomingWebhook(req.body);
    } catch (error) {
      next(error);
    }
  };
}

export const webhookController = new WebhookController();
