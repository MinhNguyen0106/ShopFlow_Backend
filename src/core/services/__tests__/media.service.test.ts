/**
 * ShopFlow - Unit Tests: media.service.ts
 * File: backend/src/core/services/__tests__/media.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaService } from '../media.service.js';
import { cloudinary } from '../../../config/cloudinary.js';
import { Writable } from 'node:stream';

vi.mock('../../../config/cloudinary.js', () => ({
  cloudinary: {
    uploader: {
      upload_stream: vi.fn(),
      destroy: vi.fn(),
    },
  },
}));

describe('MediaService Unit Tests', () => {
  let service: MediaService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new MediaService();
  });

  describe('uploadMedia()', () => {
    it('throw AppError khi buffer bị rỗng hoặc không tồn tại', async () => {
      await expect(service.uploadMedia(Buffer.alloc(0), 'image/jpeg')).rejects.toThrow(
        expect.objectContaining({
          code: 'EMPTY_BUFFER',
          statusCode: 400,
        })
      );
    });

    it('upload hình ảnh thành công và trả về secure_url cùng thông số kỹ thuật', async () => {
      const mockResult = {
        secure_url: 'https://res.cloudinary.com/shopflow/image/upload/v1/shopflow/posts/img123.jpg',
        public_id: 'shopflow/posts/img123',
        resource_type: 'image',
        format: 'jpg',
        bytes: 102400,
        width: 1080,
        height: 1080,
      };

      vi.spyOn(cloudinary.uploader, 'upload_stream' as any).mockImplementation(
        (...args: any[]): any => {
          const [options, callback] = args;
          expect(options.folder).toBe('shopflow/posts');
          expect(options.resource_type).toBe('auto');
          expect(options.transformation).toEqual([
            { quality: 'auto', fetch_format: 'auto' },
          ]);

          const writable = new Writable({
            write(_chunk, _encoding, next) {
              next();
            },
          });

          // Giả lập callback được gọi khi stream kết thúc
          process.nextTick(() => {
            callback(null, mockResult);
          });

          return writable;
        }
      );

      const buffer = Buffer.from('mock image data');
      const result = await service.uploadMedia(buffer, 'image/jpeg');

      expect(result).toBeDefined();
      expect(result.url).toBe(mockResult.secure_url);
      expect(result.public_id).toBe('shopflow/posts/img123');
      expect(result.resource_type).toBe('image');
      expect(result.bytes).toBe(102400);
      expect(result.width).toBe(1080);
    });

    it('upload video thành công với resource_type là video và không gắn transformation ảnh', async () => {
      const mockResult = {
        secure_url: 'https://res.cloudinary.com/shopflow/video/upload/v1/shopflow/posts/vid456.mp4',
        public_id: 'shopflow/posts/vid456',
        resource_type: 'video',
        format: 'mp4',
        bytes: 10485760,
        width: 1920,
        height: 1080,
        duration: 15.5,
      };

      vi.spyOn(cloudinary.uploader, 'upload_stream' as any).mockImplementation(
        (...args: any[]): any => {
          const [options, callback] = args;
          expect(options.resource_type).toBe('video');
          expect(options.transformation).toBeUndefined();

          const writable = new Writable({
            write(_chunk, _encoding, next) {
              next();
            },
          });

          process.nextTick(() => {
            callback(null, mockResult);
          });

          return writable;
        }
      );

      const buffer = Buffer.from('mock video data');
      const result = await service.uploadMedia(buffer, 'video/mp4');

      expect(result.url).toBe(mockResult.secure_url);
      expect(result.duration).toBe(15.5);
      expect(result.resource_type).toBe('video');
    });

    it('throw AppError khi Cloudinary callback trả về lỗi', async () => {
      vi.spyOn(cloudinary.uploader, 'upload_stream' as any).mockImplementation(
        (...args: any[]): any => {
          const [, callback] = args;
          const writable = new Writable({
            write(_chunk, _encoding, next) {
              next();
            },
          });

          process.nextTick(() => {
            callback(new Error('Cloudinary rate limit reached'), null);
          });

          return writable;
        }
      );

      const buffer = Buffer.from('mock image data');
      await expect(service.uploadMedia(buffer, 'image/png')).rejects.toThrow(
        expect.objectContaining({
          code: 'CLOUDINARY_UPLOAD_ERROR',
          statusCode: 502,
        })
      );
    });
  });

  describe('deleteMedia()', () => {
    it('trả về true khi xóa thành công trên Cloudinary', async () => {
      vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValueOnce({
        result: 'ok',
      });

      const success = await service.deleteMedia('shopflow/posts/img123', 'image');
      expect(success).toBe(true);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('shopflow/posts/img123', {
        resource_type: 'image',
      });
    });

    it('trả về false khi tệp tin không tồn tại', async () => {
      vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValueOnce({
        result: 'not found',
      });

      const success = await service.deleteMedia('shopflow/posts/nonexistent');
      expect(success).toBe(false);
    });

    it('trả về false khi Cloudinary ném ngoại lệ mà không crash ứng dụng', async () => {
      vi.spyOn(cloudinary.uploader, 'destroy').mockRejectedValueOnce(
        new Error('Network error')
      );

      const success = await service.deleteMedia('shopflow/posts/error_case');
      expect(success).toBe(false);
    });
  });
});
