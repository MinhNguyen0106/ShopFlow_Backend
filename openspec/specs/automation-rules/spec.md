# automation-rules Specification

## Purpose
Cung cấp giao diện quản trị trực quan cho chủ shop cấu hình các kịch bản tự động phản hồi bình luận, gửi tin nhắn riêng Messenger theo từ khóa, và kích hoạt tính năng bảo vệ ẩn số điện thoại tự động cho từng Fanpage.

## Requirements

### Requirement: Automation Rules List & Page Selection
Hệ thống SHALL hiển thị danh sách toàn bộ các kịch bản tự động hóa của Fanpage đang được chọn dưới dạng lưới thẻ Bento trực quan, bao gồm tên kịch bản, danh sách từ khóa kích hoạt, mẫu phản hồi bình luận, mẫu tin nhắn riêng, cờ ẩn SĐT, và công tắc bật/tắt nhanh.

#### Scenario: Displaying rules for selected fanpage
- **WHEN** người dùng truy cập màn hình `/automation` và đã chọn một Fanpage hợp lệ
- **THEN** hệ thống tải và hiển thị danh sách các quy tắc tự động hóa tương ứng của Fanpage đó cùng trạng thái hoạt động hiện tại

#### Scenario: Empty state when no rules exist
- **WHEN** Fanpage được chọn chưa có bất kỳ quy tắc tự động hóa nào
- **THEN** hệ thống hiển thị giao diện trạng thái trống (Empty State) kèm nút kêu gọi hành động (CTA) "Tạo kịch bản đầu tiên"

### Requirement: Automation Rule Creation & Dynamic Templates
Hệ thống SHALL cho phép người dùng tạo mới một kịch bản tự động hóa với các trường bắt buộc (tên quy tắc, ít nhất một từ khóa kích hoạt) cùng các trường tùy chọn (mẫu bình luận tự động, mẫu tin nhắn riêng hỗ trợ biến `{{customer_name}}` và `{{page_name}}`, cờ kích hoạt ẩn số điện thoại).

#### Scenario: Successfully creating a rule with keyword tags and template placeholders
- **WHEN** người dùng nhập tên quy tắc, thêm danh sách từ khóa, soạn mẫu phản hồi có chứa `{{customer_name}}`, và nhấn "Lưu kịch bản"
- **THEN** hệ thống gửi yêu cầu `POST /api/v1/pages/:pageId/rules`, thêm kịch bản mới vào danh sách hiển thị và đóng modal

#### Scenario: Validation error on missing required fields
- **WHEN** người dùng nhấn lưu khi tên quy tắc trống hoặc không có từ khóa nào
- **THEN** hệ thống hiển thị thông báo lỗi xác thực trực quan và ngăn chặn gửi request đến máy chủ

### Requirement: Automation Rule Editing & Quick Status Toggle
Hệ thống SHALL cho phép người dùng bật hoặc tắt nhanh trạng thái hoạt động (`is_active`) của quy tắc trực tiếp từ thẻ Bento, hoặc mở modal chỉnh sửa để cập nhật toàn bộ nội dung kịch bản đã tồn tại.

#### Scenario: Toggling active status with optimistic UI update
- **WHEN** người dùng gạt switch bật/tắt trạng thái hoạt động của một kịch bản
- **THEN** hệ thống cập nhật tức thì trạng thái trên giao diện và gửi yêu cầu `PUT /api/v1/pages/:pageId/rules/:ruleId` cập nhật cơ sở dữ liệu

#### Scenario: Updating existing rule contents
- **WHEN** người dùng mở modal chỉnh sửa quy tắc, thay đổi từ khóa hoặc mẫu tin nhắn riêng và nhấn "Cập nhật"
- **THEN** hệ thống gửi yêu cầu `PUT /api/v1/pages/:pageId/rules/:ruleId` và làm mới dữ liệu của thẻ kịch bản trên giao diện

### Requirement: Automation Rule Deletion & Safeguard
Hệ thống SHALL cung cấp tính năng xóa quy tắc tự động hóa kèm hộp thoại xác nhận cảnh báo an toàn để phòng tránh việc xóa nhầm kịch bản đang vận hành.

#### Scenario: Confirming deletion of a rule
- **WHEN** người dùng nhấn nút xóa kịch bản và xác nhận "Đồng ý xóa" trên hộp thoại cảnh báo
- **THEN** hệ thống gửi yêu cầu `DELETE /api/v1/pages/:pageId/rules/:ruleId`, gỡ bỏ kịch bản khỏi giao diện và hiển thị thông báo thành công

#### Scenario: Cancelling deletion
- **WHEN** người dùng nhấn nút hủy bỏ hoặc đóng hộp thoại xác nhận xóa
- **THEN** hệ thống đóng hộp thoại mà không thực hiện bất kỳ thay đổi nào lên dữ liệu
