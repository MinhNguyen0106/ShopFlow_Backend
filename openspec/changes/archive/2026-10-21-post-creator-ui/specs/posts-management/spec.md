# Spec Delta: posts-management

## ADDED Requirements

### Requirement: Soạn thảo nội dung bài viết và lựa chọn Fanpage xuất bản
Hệ thống SHALL cung cấp giao diện soạn thảo cho phép người dùng nhập nội dung văn bản, đếm ký tự, gợi ý hashtag bán hàng và chọn Fanpage mục tiêu để xuất bản.

#### Scenario: Soạn thảo nội dung và chọn Fanpage thành công
- **WHEN** Người dùng nhập nội dung vào trình soạn thảo và chọn một Fanpage đã kết nối từ danh sách
- **THEN** Hệ thống cập nhật số lượng ký tự theo thời gian thực và lưu trữ trạng thái Fanpage được chọn

#### Scenario: Cảnh báo khi chưa chọn Fanpage hoặc thiếu nội dung
- **WHEN** Người dùng bấm gửi bài viết mà chưa chọn Fanpage hoặc bỏ trống cả nội dung chữ và phương tiện đính kèm
- **THEN** Hệ thống hiển thị thông báo lỗi yêu cầu người dùng chọn Fanpage và cung cấp nội dung bài viết

### Requirement: Tải lên và quản lý đa phương tiện cho bài viết
Hệ thống SHALL cho phép người dùng tải lên hình ảnh hoặc video đính kèm qua dịch vụ lưu trữ đám mây và sắp xếp danh sách phương tiện trước khi đăng.

#### Scenario: Tải lên nhiều hình ảnh cho bài viết dạng Album
- **WHEN** Người dùng chọn một hoặc nhiều tệp hình ảnh hợp lệ (JPG, PNG, WEBP) để tải lên
- **THEN** Hệ thống tải các tệp lên máy chủ lưu trữ, nhận URL công khai HTTPS và hiển thị các hình ảnh thu nhỏ kèm nút gỡ bỏ

#### Scenario: Tải lên video đính kèm
- **WHEN** Người dùng chọn một tệp video hợp lệ (MP4, MOV)
- **THEN** Hệ thống tải video lên máy chủ lưu trữ và hiển thị khung xem trước video dạng thẻ

### Requirement: Thiết lập thời gian xuất bản và gợi ý khung giờ vàng
Hệ thống SHALL hỗ trợ người dùng lựa chọn xuất bản ngay lập tức hoặc hẹn giờ đăng bài trong tương lai kèm chỉ dẫn các khung giờ vàng tương tác cao.

#### Scenario: Đặt lịch đăng bài vào khung giờ vàng
- **WHEN** Người dùng nhấn chọn một trong các khung giờ vàng được gợi ý (ví dụ: 11:30 trưa hoặc 20:00 tối)
- **THEN** Hệ thống tự động điền thời gian đặt lịch vào trường hẹn giờ đảm bảo cách thời điểm hiện tại ít nhất 10 phút

#### Scenario: Kiểm tra tính hợp lệ của thời gian đặt lịch
- **WHEN** Người dùng chọn thời điểm hẹn giờ trong quá khứ hoặc cách thời điểm hiện tại dưới 10 phút
- **THEN** Hệ thống ngăn chặn gửi yêu cầu và hiển thị cảnh báo thời gian đặt lịch phải cách hiện tại tối thiểu 10 phút

### Requirement: Xem trước giao diện thực tế của bài viết trên Facebook
Hệ thống SHALL cung cấp modal xem trước giao diện giả lập sát thực tế bài viết trên bảng tin Facebook cho cả hai chế độ Desktop và Mobile.

#### Scenario: Mở khung xem trước giao diện Facebook
- **WHEN** Người dùng nhấn nút "Xem trước" (Preview) trên màn hình soạn thảo
- **THEN** Hệ thống hiển thị hộp thoại modal mô phỏng bài đăng Facebook gồm avatar Fanpage, tên Fanpage, thời gian giả định, nội dung bài viết và lưới hiển thị ảnh hoặc video tương ứng

#### Scenario: Chuyển đổi giữa chế độ xem Desktop và Mobile
- **WHEN** Người dùng chuyển đổi giữa tab Desktop và Mobile trên modal xem trước
- **THEN** Hệ thống điều chỉnh tỷ lệ khung hình và cách bố trí bài viết phù hợp với kích thước màn hình thiết bị đã chọn
