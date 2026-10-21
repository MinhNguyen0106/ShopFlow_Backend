# Spec Delta: dashboard-overview

## Purpose

Cung cấp trung tâm chỉ huy tổng quan cho chủ shop theo dõi tức thì các chỉ số KPIs kinh doanh, biểu đồ lưu lượng tương tác theo khung giờ vàng, giám sát tuân thủ Cửa sổ 24h Meta và truy cập nhanh các nghiệp vụ cốt lõi.

## ADDED Requirements

### Requirement: Executive Operational Bento Metrics
Hệ thống SHALL hiển thị 4 chỉ số KPIs điều hành cốt lõi dạng thẻ Bento nổi bật trên đầu trang: tổng số cuộc hội thoại mới trong ngày, số lượng bình luận chứa SĐT đã được ẩn tự động đạt chuẩn SLA < 3s, số bài viết đã đặt lịch sẵn sàng xuất bản, và tỷ lệ phản hồi kịp thời trong Cửa sổ 24h của Meta.

#### Scenario: Displaying KPIs on dashboard load
- **WHEN** người dùng đăng nhập và truy cập màn hình chính `/(dashboard)`
- **THEN** hệ thống tổng hợp và hiển thị trực quan 4 thẻ chỉ số KPIs cùng các huy hiệu tăng trưởng và trạng thái tương ứng

### Requirement: Golden Hour Hourly Traffic Visualization
Hệ thống SHALL trực quan hóa biểu đồ lưu lượng tương tác theo từng giờ trong ngày (từ 08:00 đến 22:00) bằng đồ thị thuần tinh gọn, làm nổi bật 2 đỉnh khung giờ vàng tương tác cao của người dùng Việt Nam (11:30 - 13:00 và 20:00 - 21:30).

#### Scenario: Visualizing hourly interactions and golden hour spikes
- **WHEN** người dùng xem khối biểu đồ lưu lượng trên Dashboard
- **THEN** hệ thống vẽ các cột/điểm dữ liệu tương tác theo giờ và gắn huy hiệu nhận diện khung giờ vàng để định hướng xuất bản bài viết

### Requirement: Meta 24-Hour Messaging Window Compliance Monitor
Hệ thống SHALL hiển thị danh sách các khách hàng tiềm năng kèm đồng hồ đếm ngược thời gian còn lại trong Cửa sổ 24h của Meta, đồng thời tự động che số điện thoại khách hàng (PII Data Masking dạng `098****123`) và cung cấp nút 1-click mở hội thoại trả lời ngay trong Live Chat.

#### Scenario: Alerting near-expired customer conversations
- **WHEN** có khách hàng gửi tin nhắn/bình luận sắp vượt qua mốc 24 giờ phản hồi của Meta
- **THEN** hệ thống hiển thị thẻ cảnh báo khẩn cấp màu vàng/đỏ kèm thời gian đếm ngược và nút "Trả lời ngay"

#### Scenario: Protecting customer personal phone numbers
- **WHEN** danh sách khách hàng tiềm năng chứa số điện thoại
- **THEN** hệ thống tự động che các chữ số ở giữa để bảo vệ bí mật thông tin khách hàng và phòng chống cướp đơn

### Requirement: One-Click Quick Actions Launcher
Hệ thống SHALL cung cấp thanh công cụ các lối tắt thao tác nhanh (Quick Actions) giúp chủ shop chuyển hướng siêu tốc đến các nghiệp vụ trọng tâm: Soạn bài mới (`/posts/new`), Hộp thư trực tiếp (`/inbox`), Quản lý Fanpage (`/pages`), và Kịch bản tự động (`/automation`).

#### Scenario: Navigating via quick action button
- **WHEN** người dùng nhấp vào một nút trong khối lối tắt thao tác nhanh
- **THEN** hệ thống chuyển hướng tức thì sang màn hình tương ứng
