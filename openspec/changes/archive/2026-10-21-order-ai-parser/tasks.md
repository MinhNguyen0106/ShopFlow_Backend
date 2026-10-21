# Tasks: Mô-đun Trích Xuất Thực Thể Đơn Hàng Bằng Google Gemini AI (TASK-20)

## 1. DTOs, Normalization & Config

- [x] 1.1 Khai báo DTOs & types tại `backend/src/api/dtos/order-parser.dto.ts` (`ExtractedOrderEntity`, `ExtractedOrderItem`, `ParseOrderInput`, `ParseOrderOutput`) kèm Zod schema validation nghiêm ngặt. Xác minh types compile không lỗi.
- [x] 1.2 Xây dựng tiện ích chuẩn hóa tiếng Việt tại `backend/src/core/utils/vietnamese-parser.helper.ts` (chuẩn hóa số điện thoại 10 số, chuẩn hóa từ số lượng chữ thành số, chuẩn hóa mã SKU và thuộc tính màu/size). Viết unit tests kiểm thử bộ helper đạt 100% pass.
- [x] 1.3 Cập nhật biến môi trường tại `backend/src/config/env.ts` bổ sung `GEMINI_API_KEY` và `GEMINI_MODEL` (`gemini-2.5-flash`). Xác minh nạp env không gây lỗi khởi động.

## 2. Extraction Engines (Regex & Gemini AI)

- [x] 2.1 Xây dựng Regex Extraction Engine tại `backend/src/core/services/regex-order-parser.ts` xử lý các cú pháp bình luận tiêu biểu của shop bán hàng Việt Nam (`#SP...`, `[mã]`, số lượng, màu sắc, size, SĐT). Viết unit test xác minh thời gian phản hồi < 50ms.
- [x] 2.2 Xây dựng Gemini AI Client tại `backend/src/infrastructure/ai/gemini.client.ts` hỗ trợ gọi model Gemini 2.5 Flash, structured JSON mode, mockable interface và prompt chống prompt injection. Viết unit test với mock data kiểm thử các trường hợp AI phản hồi hợp lệ và lỗi quota/timeout.

## 3. OrderParserService & REST API Assembly

- [x] 3.1 Xây dựng `OrderParserService` tại `backend/src/core/services/order-parser.service.ts` kết hợp cơ chế Hybrid: Regex Fast-path (trả kết quả ngay khi confidence >= 0.8) và Gemini AI Fallback khi bình luận ngôn ngữ tự nhiên tự do. Xác minh chuyển tiếp fallback mượt mà.
- [x] 3.2 Xây dựng Express Controller & Router tại `backend/src/api/controllers/order-parser.controller.ts` và `backend/src/api/routes/order-parser.routes.ts` với endpoint `POST /api/v1/orders/parse`. Đăng ký route vào app chính và xác minh trả về chuẩn JSON Envelope.
- [x] 3.3 Xây dựng bộ 20+ Golden Test Fixtures thực tế của shop thời trang/B2C Việt Nam tại `backend/tests/fixtures/order-parser-cases.json` và viết integration test suite tại `backend/tests/integration/order-parser.test.ts`, đảm bảo tỷ lệ trích xuất chính xác đạt ≥ 95% và toàn bộ test pass 100%.
