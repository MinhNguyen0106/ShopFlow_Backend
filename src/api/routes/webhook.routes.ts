/**
 * ShopFlow - Webhook Routes
 * File: backend/src/api/routes/webhook.routes.ts
 *
 * Định nghĩa endpoint Handshake (GET) và Ingestion (POST) cho Meta Webhooks.
 */

import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';
import { verifyWebhookSignature } from '../middlewares/webhook-verifier.middleware.js';

export const webhookRouter = Router();

/**
 * @route   GET /api/v1/webhook
 * @desc    Meta Webhook Verification Handshake
 * @access  Public (Xác thực qua hub.verify_token)
 */
webhookRouter.get('/', webhookController.handshake);

/**
 * @route   POST /api/v1/webhook
 * @desc    Meta Webhook Ingestion (Bình luận, tin nhắn, sự kiện Fanpage)
 * @access  Public (Bảo vệ bằng chữ ký HMAC-SHA256 x-hub-signature-256)
 */
webhookRouter.post('/', verifyWebhookSignature, webhookController.ingest);
