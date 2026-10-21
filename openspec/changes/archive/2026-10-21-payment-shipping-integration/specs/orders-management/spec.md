# Spec Delta

## MODIFIED Requirements

### Requirement: Order status transition with optimistic UI and WebSocket sync
Hệ thống SHALL cho phép cập nhật trạng thái đơn hàng trực tiếp thủ công hoặc tự động qua Webhook thanh toán/vận chuyển, hỗ trợ liên kết thông tin thanh toán VietQR và mã vận đơn tracking code của đơn vị vận chuyển. Thao tác áp dụng cơ chế cập nhật lạc quan (Optimistic UI) và tự động đồng bộ khi nhận sự kiện WebSocket `ORDER_STATUS_CHANGED`.

#### Scenario: Update order status to confirmed
- **WHEN** Người dùng bấm nút "Xác nhận đơn" trên đơn hàng đang ở trạng thái `pending`
- **THEN** Giao diện cập nhật tức thì trạng thái sang `confirmed`, gửi request `PATCH /api/v1/orders/:id/status` đến backend, và tự động hoàn tác (rollback) nếu server phản hồi lỗi

#### Scenario: Real-time update via WebSocket
- **WHEN** Hệ thống nhận được sự kiện Socket `ORDER_STATUS_CHANGED` từ server với payload trạng thái mới của đơn hàng
- **THEN** Zustand store tự động cập nhật bản ghi đơn hàng tương ứng trong bảng danh sách và Drawer chi tiết mà không yêu cầu người dùng tải lại trang

#### Scenario: Automatic confirmation upon VietQR payment verification
- **WHEN** Webhook thanh toán xác nhận giao dịch ngân hàng thành công cho đơn hàng
- **THEN** Hệ thống tự động chuyển trạng thái đơn hàng sang `confirmed`, hiển thị badge đã thanh toán và cập nhật thông tin giao dịch trong lịch sử đơn hàng

#### Scenario: Automatic transition to shipping when tracking code is issued
- **WHEN** Đơn vị vận chuyển tạo vận đơn thành công và cấp mã `tracking_code`
- **THEN** Đơn hàng tự động chuyển sang trạng thái `shipping`, lưu trữ thông tin nhà vận chuyển và mã vận đơn để tra cứu hành trình
