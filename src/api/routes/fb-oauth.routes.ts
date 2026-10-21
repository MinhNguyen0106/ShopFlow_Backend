/**
 * ShopFlow - Facebook OAuth Routes
 * File: backend/src/api/routes/fb-oauth.routes.ts
 */

import { Router } from 'express';
import { facebookOAuthController } from '../controllers/fb-oauth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { ConnectPagesDtoSchema } from '../dtos/fb-oauth.dto.js';

export const fbOAuthRouter = Router();

/**
 * @route   GET /api/v1/fb-oauth/connect-url
 * @desc    Tạo URL đăng nhập Facebook OAuth 2.0 kèm CSRF State
 * @access  Private (Bearer JWT)
 */
fbOAuthRouter.get(
  '/connect-url',
  authenticateToken,
  facebookOAuthController.getConnectUrl
);

/**
 * @route   GET /api/v1/fb-oauth/callback
 * @desc    Meta redirect URL xử lý Authorization Code
 * @access  Public
 */
fbOAuthRouter.get(
  '/callback',
  facebookOAuthController.handleCallback
);

/**
 * @route   GET /api/v1/fb-oauth/accounts
 * @desc    Lấy danh sách các Fanpage user quản lý
 * @access  Private (Bearer JWT)
 */
fbOAuthRouter.get(
  '/accounts',
  authenticateToken,
  facebookOAuthController.getManageablePages
);

/**
 * @route   POST /api/v1/fb-oauth/connect-pages
 * @desc    Lưu danh sách Fanpage và đăng ký Webhook
 * @access  Private (Bearer JWT)
 */
fbOAuthRouter.post(
  '/connect-pages',
  authenticateToken,
  validateRequest({ body: ConnectPagesDtoSchema }),
  facebookOAuthController.connectPages
);
