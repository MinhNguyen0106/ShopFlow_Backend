# Spec Delta: posts-management

## Purpose

Cung cấp giao diện trực quan cho phép người dùng quản lý, theo dõi, phân trang, lọc trạng thái, hiển thị lịch biểu và điều phối xuất bản bài viết trên các kênh Fanpage của ShopFlow.

## ADDED Requirements

### Requirement: Hiển thị danh sách bài viết đặt lịch dạng bảng
Hệ thống SHALL hiển thị danh sách bài viết với đầy đủ thông tin về nội dung, phương tiện đính kèm, Fanpage mục tiêu, thời gian dự kiến và trạng thái xuất bản.

#### Scenario: Hiển thị danh sách bài viết có phân trang
- **WHEN** Người dùng truy cập trang danh sách bài viết
- **THEN** Hệ thống tải và hiển thị danh sách bài viết dạng bảng kèm thông số phân trang, số lượng bài trên trang và tổng số bài viết

#### Scenario: Lọc bài viết theo trạng thái xuất bản
- **WHEN** Người dùng chọn một trạng thái cụ thể như `pending`, `scheduled`, `published`, hoặc `failed`
- **THEN** Hệ thống lọc và chỉ hiển thị các bài viết phù hợp với trạng thái đã chọn

#### Scenario: Lọc bài viết theo Fanpage
- **WHEN** Người dùng chọn một Fanpage cụ thể từ bộ chọn kênh
- **THEN** Hệ thống cập nhật danh sách và chỉ hiển thị bài viết được lên lịch cho Fanpage đó

### Requirement: Hiển thị bài viết dạng lịch biểu
Hệ thống SHALL cung cấp khung nhìn dạng lịch biểu trực quan để người dùng theo dõi tần suất và kế hoạch xuất bản nội dung theo thời gian.

#### Scenario: Xem bài viết theo lịch biểu
- **WHEN** Người dùng chuyển sang tab Lịch biểu (Calendar View)
- **THEN** Hệ thống hiển thị các ô ngày trong tháng hoặc tuần với các thẻ bài viết tương ứng vào đúng thời điểm đã hẹn giờ

#### Scenario: Nhận diện khung giờ vàng
- **WHEN** Khung nhìn lịch biểu hiển thị các khung giờ được xác định là giờ vàng tương tác cao
- **THEN** Hệ thống hiển thị huy hiệu hoặc chỉ dẫn trực quan giúp chủ shop nhận biết thời điểm đăng bài tối ưu

### Requirement: Điều phối và xử lý bài viết
Hệ thống SHALL cho phép người dùng thực hiện các thao tác quản lý trực tiếp trên từng bài viết bao gồm thử lại bài viết bị lỗi hoặc hủy bỏ bài viết chưa xuất bản.

#### Scenario: Thử lại bài viết xuất bản bị lỗi
- **WHEN** Người dùng nhấn nút "Thử lại" trên một bài viết ở trạng thái `failed`
- **THEN** Hệ thống gửi yêu cầu đưa bài viết trở lại hàng đợi xuất bản và cập nhật trạng thái bài viết về `pending` hoặc `scheduled`

#### Scenario: Hủy bài viết đặt lịch
- **WHEN** Người dùng xác nhận hủy một bài viết đang ở trạng thái `scheduled` hoặc `pending`
- **THEN** Hệ thống gửi yêu cầu hủy bài viết, gỡ bỏ job khỏi hàng đợi xuất bản và cập nhật trạng thái bài viết thành `cancelled`

### Requirement: Đồng bộ trạng thái bài viết theo thời gian thực
Hệ thống SHALL tự động cập nhật trạng thái của bài viết trên giao diện ngay khi nhận được tín hiệu hoàn tất hoặc thất bại từ máy chủ mà không yêu cầu tải lại trang.

#### Scenario: Cập nhật trạng thái bài viết qua WebSocket
- **WHEN** Máy khách nhận được sự kiện `POST_STATUS_CHANGED` từ máy chủ thời gian thực
- **THEN** Hệ thống tự động cập nhật trạng thái của bài viết tương ứng trên bảng danh sách và lịch biểu
