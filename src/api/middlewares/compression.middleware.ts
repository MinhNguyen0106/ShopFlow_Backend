/**
 * ShopFlow - HTTP Response Compression Middleware (TASK-26.2)
 * File: backend/src/api/middlewares/compression.middleware.ts
 *
 * Middleware tự động nén phản hồi HTTP dạng văn bản/JSON bằng Gzip hoặc Deflate
 * sử dụng module built-in node:zlib chuẩn hiệu năng cao:
 * - Ngưỡng nén: threshold mặc định 1024 bytes (1KB)
 * - Tự động bỏ qua streaming SSE (text/event-stream) hoặc khi có header x-no-compression
 */

import { Request, Response, NextFunction } from 'express';
import zlib from 'node:zlib';

export interface CompressionOptions {
  threshold?: number; // Kích thước tối thiểu để kích hoạt nén (bytes)
  level?: number;     // Mức nén zlib (1: nhanh nhất - 9: nén tối đa, mặc định 6)
}

export function compressionMiddleware(options: CompressionOptions = {}) {
  const threshold = options.threshold ?? 1024;
  const level = options.level ?? 6;

  return (req: Request, res: Response, next: NextFunction): void => {
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // Nếu client không hỗ trợ gzip hoặc deflate, hoặc yêu cầu bỏ qua nén
    if (
      typeof acceptEncoding !== 'string' ||
      (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) ||
      req.headers['x-no-compression']
    ) {
      return next();
    }

    const encoding = acceptEncoding.includes('gzip') ? 'gzip' : 'deflate';

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const chunks: Buffer[] = [];
    let isStreamHandled = false;

    // Ghi đè res.write để tích lũy chunks
    res.write = function (chunk: any, encodingOrCb?: any, cb?: any): boolean {
      const contentType = res.getHeader('Content-Type');
      if (typeof contentType === 'string' && contentType.includes('text/event-stream')) {
        isStreamHandled = true;
        return originalWrite(chunk, encodingOrCb, cb);
      }

      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encodingOrCb));
      }
      return true;
    } as any;

    // Ghi đè res.end để thực hiện nén nếu payload vượt threshold
    res.end = function (chunk?: any, encodingOrCb?: any, cb?: any): Response {
      if (isStreamHandled) {
        return originalEnd(chunk, encodingOrCb, cb);
      }

      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encodingOrCb));
      }

      const totalBuffer = Buffer.concat(chunks);

      // Nếu payload nhỏ hơn threshold hoặc header cấm nén
      const cacheControl = res.getHeader('Cache-Control');
      if (
        totalBuffer.length < threshold ||
        (typeof cacheControl === 'string' && cacheControl.includes('no-transform'))
      ) {
        res.setHeader('Content-Length', totalBuffer.length);
        return originalEnd(totalBuffer, cb);
      }

      // Thực hiện nén dữ liệu
      try {
        const compressed =
          encoding === 'gzip'
            ? zlib.gzipSync(totalBuffer, { level })
            : zlib.deflateSync(totalBuffer, { level });

        res.setHeader('Content-Encoding', encoding);
        res.removeHeader('Content-Length');
        res.setHeader('Content-Length', compressed.length);

        const vary = res.getHeader('Vary');
        if (!vary) {
          res.setHeader('Vary', 'Accept-Encoding');
        } else if (typeof vary === 'string' && !vary.includes('Accept-Encoding')) {
          res.setHeader('Vary', `${vary}, Accept-Encoding`);
        }

        return originalEnd(compressed, cb);
      } catch {
        // Fallback gửi dữ liệu gốc nếu xảy ra lỗi nén
        res.setHeader('Content-Length', totalBuffer.length);
        return originalEnd(totalBuffer, cb);
      }
    } as any;

    next();
  };
}
