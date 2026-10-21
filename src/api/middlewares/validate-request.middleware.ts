/**
 * ShopFlow - Generic Request Validation Middleware (Zod)
 * File: backend/src/api/middlewares/validate-request.middleware.ts
 *
 * Middleware thẩm định dữ liệu đầu vào (body, query, params) sử dụng Zod schema.
 * Nếu dữ liệu không hợp lệ, trả về HTTP 400 Bad Request với cấu trúc JSON chuẩn hóa:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Dữ liệu yêu cầu không hợp lệ",
 *     "details": [
 *       { "field": "email", "issue": "Email không đúng định dạng" }
 *     ]
 *   }
 * }
 */

import { Request, Response, NextFunction } from 'express';
import { ZodIssue, ZodTypeAny } from 'zod';
import { ValidationErrorDetail } from '../../core/errors/app-error.js';

/**
 * Interface cấu hình Zod schemas cho từng thành phần của HTTP request.
 */
export interface RequestValidators {
  body?:   ZodTypeAny;
  query?:  ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Chuyển đổi danh sách ZodIssue thành mảng ValidationErrorDetail chuẩn hóa.
 */
export function formatZodIssues(issues: ZodIssue[]): ValidationErrorDetail[] {
  return issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.join('.') : '_root_';
    return {
      field,
      issue: issue.message,
    };
  });
}

/**
 * Higher-order middleware thẩm định request bằng Zod.
 *
 * @param schemas - Object chứa các schema cho body, query, hoặc params
 * @returns Express Middleware
 *
 * @example
 * router.post(
 *   '/register',
 *   validateRequest({ body: RegisterDtoSchema }),
 *   authController.register
 * );
 */
export function validateRequest(schemas: RequestValidators) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const allDetails: ValidationErrorDetail[] = [];

    // 1. Thẩm định req.params
    if (schemas.params) {
      const paramsResult = await schemas.params.safeParseAsync(req.params);
      if (!paramsResult.success) {
        allDetails.push(...formatZodIssues(paramsResult.error.issues));
      } else {
        req.params = paramsResult.data as Record<string, string>;
      }
    }

    // 2. Thẩm định req.query
    if (schemas.query) {
      const queryResult = await schemas.query.safeParseAsync(req.query);
      if (!queryResult.success) {
        allDetails.push(...formatZodIssues(queryResult.error.issues));
      } else {
        // Gán dữ liệu đã được parse/coerce vào req.query
        req.query = queryResult.data as Record<string, unknown> as typeof req.query;
      }
    }

    // 3. Thẩm định req.body
    if (schemas.body) {
      const bodyResult = await schemas.body.safeParseAsync(req.body);
      if (!bodyResult.success) {
        allDetails.push(...formatZodIssues(bodyResult.error.issues));
      } else {
        req.body = bodyResult.data;
      }
    }

    // Nếu có bất kỳ lỗi thẩm định nào, trả về 400 Bad Request ngay lập tức
    if (allDetails.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: 'Dữ liệu yêu cầu không hợp lệ',
          details: allDetails,
        },
      });
      return;
    }

    next();
  };
}
