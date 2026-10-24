/**
 * ShopFlow - Centralized Inbox Controller
 * File: backend/src/api/controllers/inbox.controller.ts
 *
 * Tiếp nhận và xử lý HTTP Requests cho Hộp thư tập trung (/api/v1/inbox).
 */

import { Request, Response, NextFunction } from 'express';
import { inboxService, InboxService } from '../../core/services/inbox.service.js';
import {
  QueryConversationsDto,
  QueryMessagesDto,
  SendMessageDto,
  PrivateReplyDto,
  HideMessageDto,
  UpdateConversationStatusDto,
  UpdateCustomerDto,
} from '../dtos/inbox.dto.js';
import { AppError } from '../../core/errors/app-error.js';
import { pageMemberRepository } from '../../infrastructure/repositories/page-member.repository.js';
import { sanitizeCustomerForRole } from '../../core/utils/pii-masking.helper.js';

export class InboxController {
  constructor(private readonly inboxSvc: InboxService = inboxService) {}

  /**
   * GET /api/v1/inbox/conversations
   */
  getConversations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Chưa xác thực người dùng', 401, 'UNAUTHORIZED');
      }

      const query = req.query as unknown as QueryConversationsDto;
      const result = await this.inboxSvc.getConversations(userId, query);

      res.status(200).json({
        success: true,
        data: {
          conversations: result.conversations,
        },
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/inbox/conversations/:conversationId
   */
  getConversationDetail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError('Chưa xác thực người dùng', 401, 'UNAUTHORIZED');
      }

      const conversationId = String(req.params.conversationId);
      if (!conversationId) {
        throw new AppError('Thiếu conversationId', 400, 'BAD_REQUEST');
      }

      const result = await this.inboxSvc.getConversationDetail(conversationId, userId);

      // Che dấu số điện thoại khách hàng nếu người gọi là staff
      if (result.customer && result.customer.phone_number) {
        const pageMember = await pageMemberRepository.findByPageAndUser(
          result.conversation.page_fb_id,
          userId
        );
        const role = pageMember?.role || req.pageMember?.role;
        if (role === 'staff') {
          result.customer = sanitizeCustomerForRole(result.customer, 'staff');
        }
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/inbox/conversations/:conversationId/messages
   */
  getMessages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Chưa xác thực người dùng', 401, 'UNAUTHORIZED');
      }

      const conversationId = String(req.params.conversationId);
      if (!conversationId) {
        throw new AppError('Thiếu conversationId', 400, 'BAD_REQUEST');
      }

      const query = req.query as unknown as QueryMessagesDto;
      const result = await this.inboxSvc.getMessages(conversationId, userId, query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/inbox/conversations/:conversationId/messages
   */
  sendMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Chưa xác thực người dùng', 401, 'UNAUTHORIZED');
      }

      const conversationId = String(req.params.conversationId);
      if (!conversationId) {
        throw new AppError('Thiếu conversationId', 400, 'BAD_REQUEST');
      }

      const dto = req.body as SendMessageDto;
      const message = await this.inboxSvc.sendMessage(conversationId, userId, dto);

      res.status(201).json({
        success: true,
        data: {
          message,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/inbox/messages/:messageId/private-reply
   */
  sendPrivateReply = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Chưa xác thực người dùng', 401, 'UNAUTHORIZED');
      }

      const messageId = String(req.params.messageId);
      if (!messageId) {
        throw new AppError('Thiếu messageId', 400, 'BAD_REQUEST');
      }

      const dto = req.body as PrivateReplyDto;
      const result = await this.inboxSvc.sendPrivateReply(messageId, userId, dto);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/inbox/messages/:messageId/hide
   */
  hideMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Chưa xác thực người dùng', 401, 'UNAUTHORIZED');
      }

      const messageId = String(req.params.messageId);
      if (!messageId) {
        throw new AppError('Thiếu messageId', 400, 'BAD_REQUEST');
      }

      const dto = req.body as HideMessageDto;
      const updated = await this.inboxSvc.hideComment(messageId, userId, dto.is_hidden);

      res.status(200).json({
        success: true,
        data: {
          message: updated,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/inbox/conversations/:conversationId/status
   */
  updateConversationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Chưa xác thực người dùng', 401, 'UNAUTHORIZED');
      }

      const conversationId = String(req.params.conversationId);
      if (!conversationId) {
        throw new AppError('Thiếu conversationId', 400, 'BAD_REQUEST');
      }

      const dto = req.body as UpdateConversationStatusDto;
      const updated = await this.inboxSvc.updateConversationStatus(
        conversationId,
        userId,
        dto.status
      );

      res.status(200).json({
        success: true,
        data: {
          conversation: updated,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/inbox/customers/:customerId
   */
  updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Chưa xác thực người dùng', 401, 'UNAUTHORIZED');
      }

      const customerId = String(req.params.customerId);
      if (!customerId) {
        throw new AppError('Thiếu customerId', 400, 'BAD_REQUEST');
      }

      const dto = req.body as UpdateCustomerDto;
      const updated = await this.inboxSvc.updateCustomer(customerId, userId, dto);

      res.status(200).json({
        success: true,
        data: {
          customer: updated,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const inboxController = new InboxController();
