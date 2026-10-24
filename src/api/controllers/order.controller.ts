/**
 * ShopFlow - Order Management Controller
 * File: backend/src/api/controllers/order.controller.ts
 *
 * Tiếp nhận và xử lý HTTP Requests cho quản lý đơn hàng (/api/v1/orders)
 * tích hợp bộ lọc che dấu số điện thoại khách hàng (PII Data Masking) cho vai trò `staff`.
 */

import { Request, Response, NextFunction } from 'express';
import { OrderRepository } from '../../infrastructure/repositories/order.repository.js';
import { pageMemberRepository } from '../../infrastructure/repositories/page-member.repository.js';
import { sanitizeOrderForRole, sanitizeOrdersForRole } from '../../core/utils/pii-masking.helper.js';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../../core/errors/app-error.js';
import { OrderStatus } from '../../core/entities/order.entity.js';

export class OrderController {
  constructor(private readonly orderRepo: OrderRepository = new OrderRepository()) {}

  /**
   * GET /api/v1/orders
   * Lấy danh sách đơn hàng theo Fanpage (có phân trang, tìm kiếm, lọc trạng thái)
   * Tự động che SĐT nếu người gọi là staff
   */
  getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currentUserId = req.user?.id || req.user?.sub;
      if (!currentUserId) {
        throw new UnauthorizedError('Chưa xác thực người dùng');
      }

      const pageId = (req.query['pageId'] || req.params['pageId']) as string | undefined;
      if (!pageId) {
        throw new BadRequestError('Thiếu tham số pageId');
      }

      const status = req.query['status'] as OrderStatus | 'all' | undefined;
      const search = req.query['search'] as string | undefined;
      const page = Number(req.query['page']) || 1;
      const limit = Number(req.query['limit']) || 20;

      // Xác định vai trò của người gọi trên Fanpage này
      const member = await pageMemberRepository.findByPageAndUser(pageId, currentUserId);
      const role = member?.role || req.pageMember?.role;

      const result = await this.orderRepo.findMany({
        pageId,
        status,
        search,
        page,
        limit,
      });

      // Áp dụng bảo vệ PII nếu là vai trò staff
      const sanitizedOrders = sanitizeOrdersForRole(result.orders, role);

      res.status(200).json({
        success: true,
        data: {
          items: sanitizedOrders,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/orders/:orderId
   * Chi tiết đơn hàng (tự động che SĐT nếu là staff)
   */
  getOrderDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currentUserId = req.user?.id || req.user?.sub;
      if (!currentUserId) {
        throw new UnauthorizedError('Chưa xác thực người dùng');
      }

      const { orderId } = req.params;
      if (!orderId) {
        throw new BadRequestError('Thiếu orderId');
      }

      const order = await this.orderRepo.findById(orderId);
      if (!order) {
        throw new NotFoundError('Không tìm thấy đơn hàng');
      }

      // Xác định vai trò trên page của đơn hàng
      const member = await pageMemberRepository.findByPageAndUser(order.pageId, currentUserId);
      const role = member?.role || req.pageMember?.role;

      const sanitizedOrder = sanitizeOrderForRole(order, role);

      res.status(200).json({
        success: true,
        data: { order: sanitizedOrder },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/orders/:orderId/status
   * Cập nhật trạng thái đơn hàng
   */
  updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currentUserId = req.user?.id || req.user?.sub;
      if (!currentUserId) {
        throw new UnauthorizedError('Chưa xác thực người dùng');
      }

      const { orderId } = req.params;
      const { status, note } = req.body as { status: OrderStatus; note?: string };

      if (!orderId || !status) {
        throw new BadRequestError('Thiếu orderId hoặc status');
      }

      const updated = await this.orderRepo.updateStatus(orderId, status, note, currentUserId);

      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái đơn hàng thành công',
        data: { order: updated },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const orderController = new OrderController();
