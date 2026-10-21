/**
 * ShopFlow - Media Routes
 * File: backend/src/api/routes/media.routes.ts
 *
 * Định tuyến các endpoints tải lên và xử lý tệp phương tiện đa định dạng.
 */

import { Router } from 'express';
import { mediaController } from '../controllers/media.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { uploadSingleMedia } from '../middlewares/upload.middleware.js';

export const mediaRouter = Router();

/**
 * POST /api/v1/media/upload
 * Tải lên tệp ảnh hoặc video (Yêu cầu xác thực Bearer token, multipart/form-data field 'file')
 */
mediaRouter.post(
  '/upload',
  authenticateToken,
  uploadSingleMedia,
  mediaController.uploadMedia
);

