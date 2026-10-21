# Spec Delta

## Purpose

Cung cấp giải pháp thanh toán không tiền mặt tự động qua mã VietQR động chuẩn Napas 247, tự động đối soát giao dịch ngân hàng qua Webhook và kết nối API đơn vị vận chuyển (GHN/GHTK) để sinh mã vận đơn và tra cứu hành trình giao nhận.

## ADDED Requirements

### Requirement: Dynamic VietQR code generation according to Napas 247
Hệ thống SHALL cung cấp API sinh mã thanh toán VietQR động chuẩn Napas 247 (EMVCo QR standard) cho từng đơn hàng, chứa thông tin tài khoản thụ hưởng của Fanpage/Shop, số tiền chính xác và cú pháp nội dung chuyển khoản bảo mật.

#### Scenario: Generate dynamic VietQR for unpaid order
- **WHEN** Client gửi yêu cầu `POST /api/v1/payments/vietqr` với `orderId` hợp lệ
- **THEN** Hệ thống trả về chuỗi payload EMVCo, URL ảnh mã QR và cú pháp chuyển khoản chứa mã đơn hàng định danh

#### Scenario: Reject VietQR generation for non-existent or cancelled order
- **WHEN** Client yêu cầu sinh mã VietQR cho đơn hàng không tồn tại hoặc đã bị hủy (`cancelled`)
- **THEN** Hệ thống từ chối với mã lỗi 400 hoặc 404 và không tạo mã thanh toán

### Requirement: Bank balance webhook ingestion and auto-reconciliation
Hệ thống SHALL cung cấp endpoint nhận Webhook biến động số dư từ cổng thanh toán/ngân hàng, xác thực bảo mật qua API key bí mật, trích xuất mã đơn hàng từ nội dung chuyển khoản, kiểm tra số tiền khớp với tổng tiền đơn hàng và tự động cập nhật trạng thái thanh toán sang `paid` và trạng thái đơn hàng sang `confirmed`.

#### Scenario: Successful payment reconciliation
- **WHEN** Webhook gửi thông báo nhận tiền với nội dung khớp mã đơn hàng và số tiền `>= finalAmount`
- **THEN** Hệ thống ghi nhận bản ghi thanh toán `payments`, cập nhật `payment_status = 'paid'`, chuyển `order_status = 'confirmed'`, và phát sự kiện WebSocket `PAYMENT_RECEIVED` và `ORDER_STATUS_CHANGED`

#### Scenario: Underpayment detected
- **WHEN** Webhook gửi số tiền thanh toán thực nhận nhỏ hơn số tiền cần thanh toán của đơn hàng (`amount < finalAmount`)
- **THEN** Hệ thống ghi nhận giao dịch với trạng thái `partially_paid`, giữ nguyên trạng thái đơn hàng và gửi cảnh báo đến Dashboard

#### Scenario: Unauthorized webhook request
- **WHEN** Request gửi đến endpoint Webhook không có token bảo mật hợp lệ trong header
- **THEN** Hệ thống từ chối với mã HTTP 401 Unauthorized và ghi log cảnh báo bảo mật

### Requirement: Payment idempotency and replay attack prevention
Hệ thống SHALL ngăn chặn việc xử lý trùng lặp giao dịch thanh toán thông qua mã định danh giao dịch ngân hàng (`transactionId` / `referenceCode`) được lưu trữ trong cache Redis với TTL 24 giờ và ràng buộc UNIQUE trong cơ sở dữ liệu.

#### Scenario: Duplicate transaction notification ignored
- **WHEN** Cổng thanh toán gửi lại webhook cho một giao dịch ngân hàng đã được xử lý thành công trước đó
- **THEN** Hệ thống phản hồi HTTP 200 OK ngay lập tức mà không thực hiện cập nhật lại đơn hàng lần thứ hai

### Requirement: Shipping partner order creation and tracking code issuance
Hệ thống SHALL kết nối API với đối tác vận chuyển (GHN / GHTK) để tạo đơn giao hàng, truyền tải thông tin địa chỉ người gửi, người nhận, trọng lượng kiện hàng, số tiền thu hộ COD (nếu chưa thanh toán) và nhận về mã vận đơn `tracking_code`.

#### Scenario: Create shipment for confirmed order
- **WHEN** Người dùng hoặc hệ thống kích hoạt tạo vận đơn cho đơn hàng đang ở trạng thái `confirmed`
- **THEN** Hệ thống gửi thông tin sang API đơn vị vận chuyển, lưu bản ghi `shipments`, gán mã vận đơn `tracking_code`, chuyển trạng thái đơn hàng sang `shipping` và trả về kết quả cho client

#### Scenario: Shipping API failure handling
- **WHEN** API đơn vị vận chuyển gặp sự cố hoặc địa chỉ giao hàng không hợp lệ
- **THEN** Hệ thống giữ nguyên trạng thái đơn hàng ở `confirmed`, ghi nhận thông tin lỗi chi tiết và cho phép người dùng thử lại
