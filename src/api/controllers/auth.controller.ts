/**
 * ShopFlow - Authentication Controller
 * File: backend/src/api/controllers/auth.controller.ts
 *
 * Tiếp nhận HTTP requests, gọi AuthService xử lý và trả về phản hồi chuẩn hóa.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService, authService as defaultAuthService } from '../../core/services/auth.service.js';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../dtos/auth.dto.js';

export class AuthController {
  constructor(
    private readonly service: AuthService = defaultAuthService
  ) {}

  /**
   * POST /api/v1/auth/register
   * Đăng ký tài khoản mới
   */
  register = async (
    req: Request<unknown, unknown, RegisterDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công',
        data:    result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/login
   * Đăng nhập hệ thống
   */
  login = async (
    req: Request<unknown, unknown, LoginDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.login(req.body);
      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data:    result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/refresh-token
   * Cấp lại Access Token mới
   */
  refreshToken = async (
    req: Request<unknown, unknown, RefreshTokenDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokens = await this.service.refreshToken(req.body.refreshToken);
      res.status(200).json({
        success: true,
        message: 'Làm mới phiên đăng nhập thành công',
        data:    { tokens },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/auth/me
   * Lấy thông tin tài khoản hiện tại (Endpoint được bảo vệ)
   */
  getMe = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        data:    { user: req.user },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
