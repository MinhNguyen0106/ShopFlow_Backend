/**
 * ShopFlow - Centralized Inbox Routes
 * File: backend/src/api/routes/inbox.routes.ts
 *
 * Khai báo các tuyến đường cho Hộp thư tập trung (/api/v1/inbox).
 */

import { Router } from 'express';
import { inboxController } from '../controllers/inbox.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import {
  QueryConversationsDtoSchema,
  QueryMessagesDtoSchema,
  SendMessageDtoSchema,
  PrivateReplyDtoSchema,
  HideMessageDtoSchema,
  UpdateConversationStatusDtoSchema,
  UpdateCustomerDtoSchema,
} from '../dtos/inbox.dto.js';

export function createInboxRouter(): Router {
  const router = Router();

  // Mọi API trong Inbox đều yêu cầu xác thực Bearer token
  router.use(authenticateToken);

  // 1. Lấy danh sách hội thoại
  router.get(
    '/conversations',
    validateRequest({ query: QueryConversationsDtoSchema }),
    inboxController.getConversations
  );

  // 2. Xem chi tiết hội thoại
  router.get(
    '/conversations/:conversationId',
    inboxController.getConversationDetail
  );

  // 3. Lấy tin nhắn theo cursor pagination
  router.get(
    '/conversations/:conversationId/messages',
    validateRequest({ query: QueryMessagesDtoSchema }),
    inboxController.getMessages
  );

  // 4. Nhân viên gửi tin nhắn trả lời khách
  router.post(
    '/conversations/:conversationId/messages',
    validateRequest({ body: SendMessageDtoSchema }),
    inboxController.sendMessage
  );

  // 5. Gửi Private Reply cho một bình luận
  router.post(
    '/messages/:messageId/private-reply',
    validateRequest({ body: PrivateReplyDtoSchema }),
    inboxController.sendPrivateReply
  );

  // 6. Ẩn / Hiện bình luận Facebook
  router.patch(
    '/messages/:messageId/hide',
    validateRequest({ body: HideMessageDtoSchema }),
    inboxController.hideMessage
  );

  // 7. Cập nhật trạng thái hội thoại
  router.patch(
    '/conversations/:conversationId/status',
    validateRequest({ body: UpdateConversationStatusDtoSchema }),
    inboxController.updateConversationStatus
  );

  // 8. Cập nhật thông tin khách hàng CRM
  router.patch(
    '/customers/:customerId',
    validateRequest({ body: UpdateCustomerDtoSchema }),
    inboxController.updateCustomer
  );

  return router;
}

export const inboxRouter = createInboxRouter();
