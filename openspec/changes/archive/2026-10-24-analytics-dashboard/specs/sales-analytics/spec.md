# Spec Delta: sales-analytics

## Purpose

Cung cấp khả năng phân tích dữ liệu kinh doanh đa chiều cho chủ shop bao gồm thống kê doanh thu theo chu kỳ, tỷ lệ chuyển đổi đơn hàng từ bình luận/tin nhắn Facebook, xếp hạng sản phẩm bán chạy nhất, ma trận nhiệt khung giờ vàng chốt đơn và bảng điều khiển trực quan macOS Clean Utility.

## ADDED Requirements

### Requirement: Business Executive Summary Metrics
Hệ thống SHALL cung cấp API và giao diện hiển thị 4 chỉ số tài chính và vận hành cốt lõi: Tổng doanh thu thực nhận (`totalRevenue`), Tổng số đơn hàng thành công (`totalOrders`), Giá trị trung bình mỗi đơn (`averageOrderValue` - AOV), và Tỷ lệ chuyển đổi chốt đơn (`conversionRate`), đồng thời tính toán tỷ lệ phần trăm tăng trưởng so với kỳ liền trước (`growthRate`).

#### Scenario: Fetching summary KPIs for selected time range
- **WHEN** người dùng chọn khoảng thời gian (`7d`, `30d`, `90d` hoặc ngày tùy chỉnh) và Fanpage cần phân tích
- **THEN** hệ thống tổng hợp dữ liệu đơn hàng trong kỳ hiện tại và kỳ trước, tính toán tỷ lệ tăng trưởng và trả về 4 thẻ chỉ số Bento kèm huy hiệu trạng thái

#### Scenario: Safeguarding against zero-division in growth calculation
- **WHEN** kỳ trước đó có doanh thu hoặc số đơn bằng 0
- **THEN** hệ thống xử lý phòng vệ an toàn, không để xảy ra lỗi chia cho 0 (`NaN` hoặc `Infinity`), trả về tỷ lệ tăng trưởng hợp lý (+100% hoặc 0%)

---

### Requirement: Interactive Revenue & Orders Trend Series
Hệ thống SHALL tổng hợp dữ liệu chuỗi thời gian doanh thu và số lượng đơn hàng theo từng ngày trong khoảng thời gian đã chọn, hỗ trợ phân tách doanh thu theo phương thức thanh toán (COD vs VietQR), và trực quan hóa bằng biểu đồ SVG tương tác mượt mà kèm tooltip thông tin chi tiết.

#### Scenario: Visualizing daily revenue trend with interactive tooltip
- **WHEN** người dùng di chuột hoặc chạm vào một điểm dữ liệu trên biểu đồ doanh thu
- **THEN** hệ thống hiển thị tooltip nổi hiển thị ngày tháng, tổng doanh thu thực nhận, số đơn hàng phát sinh và cơ cấu thanh toán

---

### Requirement: Sales Channel Conversion Breakdown
Hệ thống SHALL phân tích và trực quan hóa tỷ lệ phân rã đơn hàng và doanh thu theo 3 nguồn xuất phát chính: Bình luận Fanpage (`facebook_comment`), Hộp thư Messenger (`facebook_inbox`), và Tạo thủ công (`manual`), kèm theo tỷ lệ chốt đơn thành công và tỷ lệ hủy đơn của từng kênh.

#### Scenario: Analyzing sales performance by interaction channel
- **WHEN** người dùng xem khối phân rã kênh bán hàng
- **THEN** hệ thống hiển thị biểu đồ phân bổ doanh thu và bảng so sánh chi tiết số đơn, tỷ lệ hoàn tất và tỷ lệ hủy giữa bình luận và tin nhắn

---

### Requirement: Top-Selling Products Leaderboard
Hệ thống SHALL truy vấn và xếp hạng Top 10 sản phẩm bán chạy nhất trong kỳ báo cáo dựa trên tổng doanh thu và số lượng mặt hàng đã bán ra từ bảng chi tiết đơn hàng (`order_items`), hiển thị thông tin SKU, tên sản phẩm, ảnh đại diện, số lượng đã bán, doanh thu và tỷ lệ phần trăm đóng góp vào tổng doanh thu cửa hàng.

#### Scenario: Displaying top selling products ranking
- **WHEN** người dùng xem bảng xếp hạng sản phẩm bán chạy
- **THEN** hệ thống sắp xếp danh sách sản phẩm theo thứ tự doanh thu giảm dần, kèm thanh tiến độ trực quan thể hiện tỷ trọng đóng góp doanh thu của từng sản phẩm

---

### Requirement: Golden Hour Sales Heatmap Matrix
Hệ thống SHALL xây dựng ma trận nhiệt 24 giờ trong ngày x 7 ngày trong tuần thể hiện mật độ đơn hàng chốt thành công và tổng giá trị đơn hàng, làm nổi bật trực quan 2 khoảng thời gian đỉnh (khung giờ vàng trưa 11:30 - 13:00 và tối 20:00 - 21:30) để hỗ trợ chủ shop lập lịch đăng bài và phân bổ nhân sự trực chat.

#### Scenario: Rendering hourly sales heatmap matrix
- **WHEN** người dùng xem khối bản đồ nhiệt khung giờ vàng
- **THEN** hệ thống hiển thị lưới 7x24 ô với dải màu gradient tương ứng mật độ đơn hàng, gắn nhãn đánh dấu các khung giờ vàng chốt đơn cao nhất và hiển thị chi tiết số đơn khi di chuột qua từng ô

---

### Requirement: Analytics Data Export to CSV
Hệ thống SHALL hỗ trợ chức năng xuất khẩu dữ liệu báo cáo kinh doanh của khoảng thời gian đang xem thành tệp tin CSV chuẩn UTF-8 có BOM (tương thích hoàn hảo với Microsoft Excel tiếng Việt), bao gồm bảng tóm tắt doanh thu theo ngày và danh sách top sản phẩm.

#### Scenario: Exporting analytics report to CSV
- **WHEN** người dùng nhấn nút "Xuất báo cáo CSV" trên thanh công cụ
- **THEN** hệ thống tự động khởi tạo và tải về tệp tin CSV chứa đầy đủ dữ liệu thống kê doanh thu và sản phẩm tương ứng với bộ lọc hiện tại
