# Proposal: Tích Hợp Cổng Thanh Toán VietQR Động & Đơn Vị Vận Chuyển (TASK-23)

## Why

Khi người mua chốt đơn hàng qua Fanpage Facebook (Messenger hoặc bình luận), việc chuyển khoản thủ công thường gặp rào cản lớn do khách hàng phải tự nhập số tài khoản, nhập sai số tiền hoặc sai cú pháp nội dung chuyển khoản, khiến chủ shop mất nhiều thời gian kiểm tra biến động số dư và làm giảm tỷ lệ thanh toán thành công. Đồng thời, việc nhập liệu thủ công đơn hàng sang các đơn vị vận chuyển (GHTK, GHN) gây chậm trễ, dễ nhầm lẫn địa chỉ và thiếu mã vận đơn realtime để chủ shop và khách hàng theo dõi hành trình giao nhận.

Tích hợp cổng thanh toán VietQR động chuẩn Napas 247 kết hợp Webhook đối soát số dư tự động và API kết nối đơn vị vận chuyển (GHN/GHTK) giúp khép kín chu trình bán hàng tự động 100%: Tạo đơn -> Khách quét mã VietQR trả tiền -> Hệ thống tự động xác nhận đơn -> Tự động đẩy vận đơn sang nhà vận chuyển và nhận mã tracking code.

## What Changes

- **Sinh mã VietQR động chuẩn Napas 247:** Xây dựng dịch vụ `VietQrService` sinh chuỗi payload EMVCo QR code hợp lệ và URL hình ảnh mã QR động theo chuẩn Napas 247, mã hóa đầy đủ Bank BIN, số tài khoản thụ hưởng của chủ shop, số tiền chính xác của đơn hàng và nội dung chuyển khoản bảo mật chứa mã đơn hàng (ví dụ: `SF ORD2026001`).
- **Webhook biến động số dư & tự động xác nhận đơn (Payment Auto-Reconciliation):** Cung cấp endpoint `POST /api/v1/payments/webhook` nhận thông báo biến động số dư tài khoản ngân hàng (hỗ trợ SePay/Casso/Ngân hàng), xác thực token bảo mật, trích xuất mã đơn hàng từ nội dung chuyển khoản, tự động cập nhật `payment_status = 'paid'`, chuyển `order_status = 'confirmed'` và phát thông báo WebSocket realtime `PAYMENT_RECEIVED` và `ORDER_STATUS_CHANGED`.
- **Kết nối API Đơn vị Vận chuyển (GHN / GHTK Integration):** Xây dựng `ShippingService` và Shipping Adapters giao tiếp với API nhà vận chuyển (Giao Hàng Nhanh / Giao Hàng Tiết Kiệm sandbox & production), endpoint `POST /api/v1/shipments/create` đẩy đơn hàng, nhận mã vận đơn `tracking_code`, nhãn in vận đơn và tự động chuyển trạng thái đơn sang `shipping`.
- **Cơ sở dữ liệu lưu trữ Đơn hàng & Vận chuyển (`003_orders_and_fulfillment.sql`):** Bổ sung bảng cơ sở dữ liệu PostgreSQL lưu trữ `orders`, `order_items`, `payments` (giao dịch thanh toán ngân hàng) và `shipments` (thông tin vận đơn, đối tác vận chuyển, tracking code, tiền COD).
- **Phòng vệ gian lận & Idempotency:** Kiểm tra chặt chẽ số tiền chuyển khoản thực nhận so với tổng tiền đơn hàng (`amount >= final_amount`), chặn xử lý lặp lại giao dịch thanh toán bằng Idempotency Key lưu trữ Redis 24h.

## Capabilities

### New Capabilities
- `payment-and-shipping`: Quản lý toàn bộ chu trình thanh toán ngân hàng qua mã VietQR động chuẩn Napas 247, đối soát tự động webhook biến động số dư và kết nối API đơn vị vận chuyển (GHN/GHTK) để sinh mã vận đơn `tracking_code`.

### Modified Capabilities
- `orders-management`: Mở rộng luồng trạng thái đơn hàng và schema hiển thị, hỗ trợ liên kết thông tin thanh toán VietQR (mã QR, trạng thái giao dịch ngân hàng) và thông tin vận chuyển (đơn vị giao hàng, tracking code, link tra cứu hành trình).

## Impact

- **Database:** Tạo file migration mới `003_orders_and_fulfillment.sql` (bảng `orders`, `order_items`, `payments`, `shipments`).
- **Backend APIs:**
  - `POST /api/v1/payments/vietqr`: Sinh mã VietQR động cho đơn hàng.
  - `POST /api/v1/payments/webhook`: Webhook nhận biến động số dư ngân hàng (đối soát tự động).
  - `POST /api/v1/shipments/create`: Đẩy đơn sang GHN/GHTK nhận tracking code.
  - `GET /api/v1/shipments/:trackingCode/track`: Tra cứu hành trình vận đơn.
- **WebSocket:** Phát sự kiện `PAYMENT_RECEIVED` và `ORDER_STATUS_CHANGED` theo room `page_<pageId>`.
- **Frontend:** Cập nhật `OrderDetailDrawer` và `OrderPrintModal` để hiển thị mã QR VietQR động và mã vận đơn tracking code cho shipper.
- **Dependencies:** Thêm tiện ích mã hóa tính CRC16 cho chuẩn EMVCo VietQR hoặc axios client gọi REST API GHN/GHTK.
