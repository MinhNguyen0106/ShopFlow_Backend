/**
 * ShopFlow - Unit Tests: upload.middleware.ts
 * File: backend/src/api/middlewares/__tests__/upload.middleware.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { uploadSingleMedia } from '../upload.middleware.js';

// Mock multer
vi.mock('multer', async () => {
  class MockMulterError extends Error {
    code: string;
    field?: string;
    constructor(code: string, field?: string) {
      super(code);
      this.name = 'MulterError';
      this.code = code;
      this.field = field;
    }
  }

  const memoryStorage = vi.fn(() => ({}));
  const multerFn = vi.fn((options: any) => {
    return {
      single: vi.fn((fieldName: string) => {
        return (req: any, _res: any, callback: (err?: any) => void) => {
          // Xử lý mô phỏng fileFilter và execution
          if (req.__simulateMulterError) {
            return callback(new MockMulterError(req.__simulateMulterError, fieldName));
          }
          if (req.__simulateGenericError) {
            return callback(new Error('Generic stream error'));
          }

          if (req.__fileToProcess) {
            // Chạy qua fileFilter nếu có
            if (options?.fileFilter) {
              let filterError: any = null;
              options.fileFilter(req, req.__fileToProcess, (err: any) => {
                if (err) filterError = err;
              });
              if (filterError) {
                return callback(filterError);
              }
            }
            req.file = req.__fileToProcess;
          }

          callback();
        };
      }),
    };
  });

  (multerFn as any).memoryStorage = memoryStorage;
  (multerFn as any).MulterError = MockMulterError;

  return {
    default: multerFn,
    MulterError: MockMulterError,
  };
});

describe('Upload Middleware (uploadSingleMedia)', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('cho phép tải lên hình ảnh hợp lệ (< 4MB)', () => {
    mockReq.__fileToProcess = {
      fieldname: 'file',
      originalname: 'sanpham.jpg',
      mimetype: 'image/jpeg',
      size: 2 * 1024 * 1024, // 2MB
      buffer: Buffer.from('mock image buffer'),
    };

    uploadSingleMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockReq.file).toBeDefined();
    expect(mockReq.file.originalname).toBe('sanpham.jpg');
  });

  it('cho phép tải lên video hợp lệ (< 100MB)', () => {
    mockReq.__fileToProcess = {
      fieldname: 'file',
      originalname: 'clip_demo.mp4',
      mimetype: 'video/mp4',
      size: 50 * 1024 * 1024, // 50MB
      buffer: Buffer.from('mock video buffer'),
    };

    uploadSingleMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockReq.file).toBeDefined();
    expect(mockReq.file.originalname).toBe('clip_demo.mp4');
  });

  it('từ chối khi tệp tin có định dạng MIME không được hỗ trợ', () => {
    mockReq.__fileToProcess = {
      fieldname: 'file',
      originalname: 'document.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('mock pdf'),
    };

    uploadSingleMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNSUPPORTED_MEDIA_TYPE',
        statusCode: 400,
      })
    );
  });

  it('từ chối khi hình ảnh vượt quá giới hạn 4MB', () => {
    mockReq.__fileToProcess = {
      fieldname: 'file',
      originalname: 'giant_image.png',
      mimetype: 'image/png',
      size: 5 * 1024 * 1024, // 5MB > 4MB
      buffer: Buffer.from('too large image'),
    };

    uploadSingleMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FILE_TOO_LARGE',
        statusCode: 400,
      })
    );
  });

  it('từ chối khi video vượt quá giới hạn 100MB', () => {
    mockReq.__fileToProcess = {
      fieldname: 'file',
      originalname: 'giant_video.mov',
      mimetype: 'video/quicktime',
      size: 105 * 1024 * 1024, // 105MB > 100MB
      buffer: Buffer.from('too large video'),
    };

    uploadSingleMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FILE_TOO_LARGE',
        statusCode: 400,
      })
    );
  });

  it('từ chối khi không có tệp tin nào được gửi kèm', () => {
    mockReq.__fileToProcess = undefined;

    uploadSingleMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'MISSING_FILE',
        statusCode: 400,
      })
    );
  });

  it('xử lý MulterError LIMIT_FILE_SIZE', () => {
    mockReq.__simulateMulterError = 'LIMIT_FILE_SIZE';

    uploadSingleMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FILE_TOO_LARGE',
        statusCode: 400,
      })
    );
  });

  it('xử lý MulterError LIMIT_UNEXPECTED_FILE', () => {
    mockReq.__simulateMulterError = 'LIMIT_UNEXPECTED_FILE';

    uploadSingleMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INVALID_FIELD_NAME',
        statusCode: 400,
      })
    );
  });

  it('xử lý MulterError bất kỳ khác', () => {
    mockReq.__simulateMulterError = 'LIMIT_PART_COUNT';

    uploadSingleMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UPLOAD_ERROR',
        statusCode: 400,
      })
    );
  });

  it('xử lý ngoại lệ generic bất kỳ', () => {
    mockReq.__simulateGenericError = true;

    uploadSingleMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
      })
    );
  });
});
