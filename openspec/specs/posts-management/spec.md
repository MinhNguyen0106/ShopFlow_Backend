# posts-management Specification

## Purpose
Cung cấp giao diện trực quan cho phép người dùng quản lý, theo dõi, phân trang, lọc trạng thái, hiển thị lịch biểu và điều phối xuất bản bài viết trên các kênh Fanpage của ShopFlow.

## Requirements

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
