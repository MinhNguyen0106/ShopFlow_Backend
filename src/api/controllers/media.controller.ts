/**
 * ShopFlow - Media Controller
 * File: backend/src/api/controllers/media.controller.ts
 *
 * Điều khiển các yêu cầu upload tệp tin đa phương tiện phục vụ bài viết Fanpage.
 */

import { Request, Response, NextFunction } from 'express';
import { mediaService, MediaService } from '../../core/services/media.service.js';
import { AppError } from '../../core/errors/app-error.js';

export class MediaController {
  constructor(private readonly service: MediaService = mediaService) {}

  /**
   * POST /api/v1/media/upload
   * Tải lên tệp ảnh hoặc video qua multipart/form-data
   */
  uploadMedia = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError(
          'Vui lòng chọn tệp tin (ảnh hoặc video) để tải lên',
          400,
          'MISSING_FILE'
        );
      }

      const result = await this.service.uploadMedia(
        req.file.buffer,
        req.file.mimetype
      );

      res.status(201).json({
        success: true,
        message: 'Tải lên tệp phương tiện thành công',
        data: {
          url: result.url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          duration: result.duration,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const mediaController = new MediaController();
