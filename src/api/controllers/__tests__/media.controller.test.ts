/**
 * ShopFlow - Unit Tests: media.controller.ts
 * File: backend/src/api/controllers/__tests__/media.controller.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { MediaController } from '../media.controller.js';
import { MediaService, UploadedMediaResult } from '../../../core/services/media.service.js';
import { AppError } from '../../../core/errors/app-error.js';

describe('MediaController Unit Tests', () => {
  let controller: MediaController;
  let mockService: MediaService;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockService = {
      uploadMedia: vi.fn(),
      deleteMedia: vi.fn(),
    } as unknown as MediaService;

    controller = new MediaController(mockService);

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('throw AppError 400 MISSING_FILE khi req.file không tồn tại', async () => {
    mockReq = { file: undefined };

    await controller.uploadMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'MISSING_FILE',
        statusCode: 400,
      })
    );
  });

  it('chuyển tiếp lỗi từ service sang next() khi upload thất bại', async () => {
    mockReq = {
      file: {
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File,
    };

    const uploadError = new AppError('Cloudinary error', 502, 'CLOUDINARY_UPLOAD_ERROR');
    vi.spyOn(mockService, 'uploadMedia').mockRejectedValueOnce(uploadError);

    await controller.uploadMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(uploadError);
  });

  it('trả về HTTP 201 Created cùng dữ liệu media khi upload thành công', async () => {
    const mockResult: UploadedMediaResult = {
      url: 'https://res.cloudinary.com/shopflow/image/upload/v1/shopflow/posts/demo.jpg',
      public_id: 'shopflow/posts/demo',
      resource_type: 'image',
      format: 'jpg',
      bytes: 204800,
      width: 1200,
      height: 630,
    };

    mockReq = {
      file: {
        buffer: Buffer.from('image buffer content'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File,
    };

    vi.spyOn(mockService, 'uploadMedia').mockResolvedValueOnce(mockResult);

    await controller.uploadMedia(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: 'Tải lên tệp phương tiện thành công',
      data: {
        url: mockResult.url,
        public_id: mockResult.public_id,
        resource_type: mockResult.resource_type,
        format: mockResult.format,
        bytes: mockResult.bytes,
        width: mockResult.width,
        height: mockResult.height,
        duration: undefined,
      },
    });
  });
});
