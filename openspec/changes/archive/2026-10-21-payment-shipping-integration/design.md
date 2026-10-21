# Design: Tích Hợp Cổng Thanh Toán VietQR Động & Đơn Vị Vận Chuyển (TASK-23)

## Context

Hệ thống ShopFlow đã hoàn thành phân hệ trích xuất thực thể đơn hàng AI (TASK-20), danh mục sản phẩm & tồn kho (TASK-21) và giao diện điều khiển quản lý đơn hàng `/orders` (TASK-22). Để tạo thành một luồng thương mại điện tử khép kín (End-to-End Fulfillment Flow), hệ thống cần bổ sung tầng lưu trữ đơn hàng & vận đơn trong PostgreSQL, bộ sinh mã VietQR động chuẩn Napas 247, Webhook đối soát số dư ngân hàng tự động và Adapter kết nối đơn vị vận chuyển (GHN/GHTK) để sinh mã vận đơn.

Xem chi tiết động lực và yêu cầu nghiệp vụ tại [proposal.md](file:///c:/Users/Dell/Desktop/ShopFlow/openspec/changes/payment-shipping-integration/proposal.md) và các đặc tả tại [specs/payment-and-shipping/spec.md](file:///c:/Users/Dell/Desktop/ShopFlow/openspec/changes/payment-shipping-integration/specs/payment-and-shipping/spec.md).

## Goals / Non-Goals

**Goals:**
- Thiết kế cơ sở dữ liệu migration `003_orders_and_fulfillment.sql` lưu trữ: `orders`, `order_items`, `payments` (lịch sử giao dịch thanh toán) và `shipments` (thông tin vận chuyển, mã vận đơn).
- Xây dựng tiện ích `VietQrHelper` sinh payload EMVCo QR code hợp lệ và URL hình ảnh mã QR động theo chuẩn Napas 247, tính toán mã kiểm tra CRC16-CCITT chính xác.
- Xây dựng dịch vụ `PaymentWebhookService` và endpoint `POST /api/v1/payments/webhook`:
  - Xác thực API key bảo mật từ cổng thanh toán (SePay/Casso).
  - Trích xuất mã đơn hàng từ nội dung chuyển khoản bằng Regex linh hoạt.
  - Kiểm tra số tiền chuyển thực tế (`amount >= final_amount`).
  - Đảm bảo tính Idempotent chống xử lý lặp lại giao dịch (Redis 24h + DB unique index).
  - Tự động cập nhật `orders.status = 'confirmed'` và bắn Socket.io event realtime `ORDER_STATUS_CHANGED`, `PAYMENT_RECEIVED`.
- Xây dựng kiến trúc `ShippingService` sử dụng Adapter pattern:
  - Giao diện trừu tượng `ShippingCarrierAdapter` với các triển khai `GhnCarrierAdapter`, `GhtkCarrierAdapter` và `MockCarrierAdapter` (cho test).
  - Endpoint `POST /api/v1/shipments/create` đẩy đơn sang đơn vị vận chuyển, nhận mã `tracking_code`, cập nhật `orders.status = 'shipping'`.
  - Endpoint `GET /api/v1/shipments/:trackingCode/track` tra cứu hành trình vận đơn.

**Non-Goals:**
- Không tích hợp OpenBanking OAuth trực tiếp với từng ngân hàng riêng lẻ (sử dụng chuẩn Webhook đối soát trung gian phổ biến tại VN như SePay, Casso).
- Không tự động thực hiện hoàn tiền (refund) qua tài khoản ngân hàng (xử lý qua quy trình kế toán thủ công).

## Decisions

### 1. Thuật toán sinh mã VietQR EMVCo thuần (Pure TypeScript EMVCo Engine)
- **Quyết định:** Viết thuật toán định dạng chuỗi EMVCo TLV (Tag-Length-Value) kèm hàm tính CRC16-CCITT (Polynomial `0x1021`, Init `0xFFFF`) bằng TypeScript thuần, kết hợp sinh URL ảnh QuickLink VietQR (`https://img.vietqr.io/image/<bin>-<acc>-compact2.png`).
- **Lý do:** Không cần cài thêm thư viện npm cồng kềnh, tốc độ sinh mã siêu nhanh (< 1ms), kiểm soát 100% cấu trúc payload Napas 247 (AID `A000000727`, Tag 38, Tag 54 amount, Tag 62 reference note, Tag 63 CRC).
- **Phương án thay thế:** Dùng thư viện ngoài (dễ lỗi thời, khó tùy biến khi Napas cập nhật thông số).

### 2. Kiến trúc Shipping Carrier Adapter (Strategy Pattern)
- **Quyết định:** Định nghĩa interface `ShippingCarrierAdapter`:
  ```typescript
  export interface ShippingCarrierAdapter {
    readonly carrierCode: 'ghn' | 'ghtk' | 'mock';
    createShipment(order: OrderWithDetails): Promise<CreateShipmentResult>;
    trackShipment(trackingCode: string): Promise<TrackingShipmentResult>;
    calculateShippingFee(params: ShippingFeeParams): Promise<number>;
  }
  ```
- **Lý do:** Cho phép dễ dàng chuyển đổi giữa Giao Hàng Nhanh (GHN) và Giao Hàng Tiết Kiệm (GHTK) hoặc bổ sung Viettel Post trong tương lai. Cung cấp `MockCarrierAdapter` giúp kiểm thử tự động 100% độc lập không phụ thuộc Internet.
- **Phương án thay thế:** Gọi trực tiếp API GHN trong controller (gây coupling cao, khó test).

### 3. Đối soát thanh toán & Phòng vệ gian lận (Payment Anti-Fraud & Idempotency)
- **Quyết định:**
  - Khóa Idempotency kép: kiểm tra key `payment:idempotency:<transaction_id>` trên Redis (TTL 24h) và ràng buộc cơ sở dữ liệu `UNIQUE (transaction_id, gateway)`.
  - Kiểm tra giá trị đơn hàng: Nếu số tiền nhận được `< final_amount`, ghi nhận giao dịch nhưng gán trạng thái `partially_paid`, KHÔNG tự động chuyển trạng thái đơn sang `confirmed`, đồng thời cảnh báo cho chủ shop.
  - Regex matcher thông minh: Hỗ trợ các biến thể nội dung như `SF ORD2026001`, `ORD-2026-001`, `ORD2026001`.

### 4. Cơ chế lưu trữ Database (`003_orders_and_fulfillment.sql`)
- **Quyết định:** Tạo các bảng:
  - `orders`: `id`, `page_id`, `customer_id`, `order_code` (UNIQUE per page), `status` (pending, confirmed, shipping, completed, cancelled), `payment_status` (unpaid, partially_paid, paid, refunded), `payment_method`, `total_amount`, `shipping_fee`, `discount_amount`, `final_amount`, `notes`.
  - `order_items`: `id`, `order_id`, `product_id`, `sku`, `product_name`, `quantity`, `price`, `variant` (JSONB).
  - `payments`: `id`, `order_id`, `transaction_id`, `gateway`, `amount`, `transfer_content`, `status`, `paid_at`, `raw_payload` (JSONB).
  - `shipments`: `id`, `order_id`, `carrier`, `tracking_code`, `cod_amount`, `shipping_fee`, `status`, `label_url`, `estimated_delivery_at`.

## Risks / Trade-offs

- **[Khách hàng gõ sai cú pháp nội dung chuyển khoản]** → *Mitigation:* Chuẩn hóa QR code tự động điền sẵn nội dung; xây dựng Regex bóc tách linh hoạt; nếu không tìm thấy đơn khớp, lưu vào bảng `unmatched_payments` để chủ shop kiểm tra và gán thủ công chỉ với 1 click.
- **[Webhook ngân hàng bị gửi trùng lặp nhiều lần (At-least-once delivery)]** → *Mitigation:* Bắt buộc kiểm tra Idempotency key bằng Redis `SETNX` với TTL 24h kết hợp DB transaction và trả về ngay HTTP 200 OK nếu phát hiện trùng.
- **[Đơn vị vận chuyển (GHN/GHTK API) gặp sự cố mạng hoặc chậm trễ]** → *Mitigation:* Cấu hình Axios timeout 8s với AbortController; giữ nguyên đơn hàng ở `confirmed`, lưu log lỗi và hỗ trợ nút "Thử đẩy lại đơn" trên Dashboard UI.
- **[Bảo mật Webhook thanh toán]** → *Mitigation:* Xác thực header `x-api-key` hoặc chữ ký bảo mật được cấu hình qua biến môi trường `PAYMENT_WEBHOOK_SECRET`.
