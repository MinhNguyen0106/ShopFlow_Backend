/**
 * ShopFlow - Authentication Routes
 * File: backend/src/api/routes/auth.routes.ts
 *
 * Định nghĩa các endpoint xác thực người dùng và gắn validation middleware tương ứng.
 */

import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { registerRateLimiter } from '../middlewares/rate-limiter.middleware.js';
import {
  RegisterDtoSchema,
  LoginDtoSchema,
  RefreshTokenDtoSchema,
} from '../dtos/auth.dto.js';

export const authRouter = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Đăng ký tài khoản người dùng mới (được bảo vệ bởi Rate Limiter)
 * @access  Public
 */
authRouter.post(
  '/register',
  registerRateLimiter,
  validateRequest({ body: RegisterDtoSchema }),
  authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Đăng nhập hệ thống & nhận JWT tokens
 * @access  Public
 */
authRouter.post(
  '/login',
  validateRequest({ body: LoginDtoSchema }),
  authController.login
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Cấp lại access token từ refresh token
 * @access  Public
 */
authRouter.post(
  '/refresh-token',
  validateRequest({ body: RefreshTokenDtoSchema }),
  authController.refreshToken
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Lấy thông tin tài khoản hiện tại
 * @access  Private (Cần Bearer Token)
 */
authRouter.get(
  '/me',
  authenticateToken,
  authController.getMe
);
