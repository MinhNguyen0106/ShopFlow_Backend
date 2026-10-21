# Tasks: Tích Hợp Cổng Thanh Toán VietQR Động & Đơn Vị Vận Chuyển (TASK-23)

## 1. Database Migration & Data Contracts

- [x] 1.1 Tạo file migration DDL `backend/src/infrastructure/database/migrations/003_orders_and_fulfillment.sql` khởi tạo các bảng `orders`, `order_items`, `payments`, `shipments` kèm đầy đủ khóa ngoại, ràng buộc check, chỉ mục tối ưu truy vấn và trigger `update_updated_at_column()`.
- [x] 1.2 Khai báo DTOs và Zod validation schemas tại `backend/src/api/dtos/payment.dto.ts` và `backend/src/api/dtos/shipping.dto.ts` cho các luồng: sinh VietQR, webhook biến động số dư, tạo vận đơn và tra cứu hành trình. Viết unit tests kiểm thử DTO validation tại `backend/src/api/dtos/__tests__/payment-shipping.dto.test.ts`.

## 2. VietQR Generator & Payment Webhook Ingestion

- [x] 2.1 Xây dựng tiện ích `VietQrHelper` tại `backend/src/core/services/vietqr.helper.ts` định dạng chuỗi EMVCo Napas 247 TLV với thuật toán tính CRC16-CCITT và sinh URL ảnh QuickLink VietQR. Viết unit tests tại `backend/src/core/services/__tests__/vietqr.helper.test.ts`.
- [x] 2.2 Xây dựng `OrderRepository` và `PaymentRepository` tại `backend/src/infrastructure/repositories/` hỗ trợ lưu trữ đơn hàng, bản ghi thanh toán, cập nhật trạng thái `payment_status` và `status` có transaction an toàn. Viết unit tests cho repositories.
- [x] 2.3 Xây dựng `PaymentWebhookService` tại `backend/src/core/services/payment-webhook.service.ts` xử lý đối soát giao dịch ngân hàng, kiểm tra Idempotency Redis 24h, trích xuất mã đơn hàng bằng Regex, đối chiếu số tiền thực nhận (`amount >= final_amount`), tự động chuyển `confirmed` và phát sự kiện Socket.io. Viết unit tests.
- [x] 2.4 Xây dựng Controller & Route `POST /api/v1/payments/vietqr` và `POST /api/v1/payments/webhook` tại `backend/src/api/`. Viết integration test suite kiểm thử toàn bộ các kịch bản đối soát ngân hàng (thành công, thiếu tiền, token không hợp lệ, giao dịch lặp lại).

## 3. Shipping Carrier Integration & Quality Gates

- [x] 3.1 Xây dựng Adapter Pattern `ShippingCarrierAdapter` với các triển khai `GhnCarrierAdapter`, `GhtkCarrierAdapter` và `MockCarrierAdapter` tại `backend/src/infrastructure/shipping/`.
- [x] 3.2 Xây dựng `ShipmentRepository` và `ShippingService` tại `backend/src/core/services/shipping.service.ts` xử lý tạo vận đơn với đối tác vận chuyển, sinh mã `tracking_code`, chuyển trạng thái đơn sang `shipping` và tra cứu hành trình vận chuyển. Viết unit tests.
- [x] 3.3 Xây dựng Controller & Route `POST /api/v1/shipments/create` và `GET /api/v1/shipments/:trackingCode/track` tại `backend/src/api/`. Viết integration test suite cho luồng vận chuyển.
- [x] 3.4 Kiểm định toàn diện chất lượng (Quality Gates): Chạy toàn bộ test suites (`vitest run`), kiểm tra static type-checking (`npx tsc --noEmit`), đảm bảo 100% tests pass và 0 lỗi TypeScript.
