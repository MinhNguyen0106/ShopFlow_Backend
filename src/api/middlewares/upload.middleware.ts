/**
 * ShopFlow - Multer Media Upload Middleware
 * File: backend/src/api/middlewares/upload.middleware.ts
 *
 * Xử lý tải lên tệp tin đa phương tiện (ảnh/video) vào RAM (MemoryStorage) trước khi stream lên Cloudinary.
 * Đảm bảo các ràng buộc nghiêm ngặt của Meta Graph API:
 * - Ảnh: JPG, PNG, WEBP (tối đa 4MB)
 * - Video: MP4, MOV (tối đa 100MB)
 */

import multer, { MulterError } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import { logger } from '../../utils/logger.js';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
];

export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
];

export const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;    // 4MB (Chuẩn Meta photo API)
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;  // 100MB (Chuẩn Meta video API)

// Cấu hình Multer lưu tạm trong RAM dưới dạng Buffer
const storage = multer.memoryStorage();

const multerInstance = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_SIZE_BYTES, // Ngưỡng trần tối đa cho video
    files: 1,                       // Chỉ nhận 1 tệp tin trong một request
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new AppError(
          'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận ảnh (JPG, PNG, WEBP) hoặc video (MP4, MOV)',
          400,
          'UNSUPPORTED_MEDIA_TYPE'
        )
      );
    }
    cb(null, true);
  },
});

/**
 * Middleware tải lên 1 tệp phương tiện (field name: 'file') kèm kiểm tra dung lượng theo loại MIME.
 */
export const uploadSingleMedia = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const upload = multerInstance.single('file');

  upload(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError(
              'Dung lượng tệp vượt quá giới hạn tối đa cho phép',
              400,
              'FILE_TOO_LARGE'
            )
          );
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(
            new AppError(
              `Trường tải lên không hợp lệ. Vui lòng sử dụng trường có tên 'file'`,
              400,
              'INVALID_FIELD_NAME'
            )
          );
        }
        return next(
          new AppError(`Lỗi tải lên tệp tin: ${err.message}`, 400, 'UPLOAD_ERROR')
        );
      }

      if (err instanceof AppError) {
        return next(err);
      }

      return next(
        new AppError(
          err instanceof Error ? err.message : 'Lỗi tải lên không xác định',
          500,
          'INTERNAL_SERVER_ERROR'
        )
      );
    }

    // Kiểm tra tệp tin có được cung cấp hay không
    if (!req.file) {
      return next(
        new AppError(
          'Vui lòng chọn tệp tin (ảnh hoặc video) để tải lên',
          400,
          'MISSING_FILE'
        )
      );
    }

    // Kiểm tra ngưỡng dung lượng riêng biệt cho ảnh
    if (ALLOWED_IMAGE_MIME_TYPES.includes(req.file.mimetype)) {
      if (req.file.size > MAX_IMAGE_SIZE_BYTES) {
        return next(
          new AppError(
            `Dung lượng ảnh (${(req.file.size / (1024 * 1024)).toFixed(2)}MB) vượt quá giới hạn tối đa 4MB của Facebook`,
            400,
            'FILE_TOO_LARGE'
          )
        );
      }
    }

    // Kiểm tra ngưỡng dung lượng riêng biệt cho video
    if (ALLOWED_VIDEO_MIME_TYPES.includes(req.file.mimetype)) {
      if (req.file.size > MAX_VIDEO_SIZE_BYTES) {
        return next(
          new AppError(
            `Dung lượng video (${(req.file.size / (1024 * 1024)).toFixed(2)}MB) vượt quá giới hạn tối đa 100MB`,
            400,
            'FILE_TOO_LARGE'
          )
        );
      }
    }

    logger.debug(
      {
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
      '[uploadMiddleware] ✔ Nhận buffer tệp tin hợp lệ'
    );

    next();
  });
};
