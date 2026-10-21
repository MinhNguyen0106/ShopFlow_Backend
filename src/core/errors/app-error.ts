/**
 * ShopFlow - Domain-Specific Application Errors
 * File: backend/src/core/errors/app-error.ts
 *
 * Định nghĩa hệ thống lớp ngoại lệ chuẩn hóa kế thừa từ Error gốc.
 * Tuân thủ quy chuẩn project-rules.md và Clean Architecture.
 */

export class AppError extends Error {
  constructor(
    public override readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_SERVER_ERROR',
    public readonly isOperational: boolean = true,
    public readonly details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface ValidationErrorDetail {
  field: string;
  issue: string;
}

export class ValidationError extends AppError {
  constructor(
    message: string = 'Dữ liệu yêu cầu không hợp lệ',
    details?: ValidationErrorDetail[]
  ) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'BAD_REQUEST', true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Không có quyền truy cập hoặc phiên đã hết hạn') {
    super(message, 401, 'UNAUTHORIZED', true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Bạn không có quyền thực hiện hành động này') {
    super(message, 403, 'FORBIDDEN', true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Tài nguyên yêu cầu không tồn tại') {
    super(message, 404, 'NOT_FOUND', true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message: string = 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
    details?: unknown
  ) {
    super(message, 429, 'TOO_MANY_REQUESTS', true, details);
  }
}
