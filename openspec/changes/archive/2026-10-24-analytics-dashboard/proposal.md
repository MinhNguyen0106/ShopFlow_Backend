# Proposal: Màn Hình Báo Cáo Phân Tích Doanh Thu & Hiệu Quả Bán Hàng (TASK-24)

## Why

Sau khi hoàn thành chu trình bán hàng tự động từ thu thập lead, tạo đơn hàng AI (`OrderParserService`), quản lý danh mục sản phẩm (`/api/v1/products`) đến thanh toán VietQR động và vận chuyển (`TASK-20` -> `TASK-23`), chủ shop kinh doanh trên Fanpage Facebook cần một trung tâm phân tích kinh doanh trực quan và chuyên sâu.

Hiện tại, chủ shop gặp các khó khăn lớn trong việc đo lường hiệu quả vận hành:
1. **Thiếu cái nhìn tổng quan về doanh thu và chỉ số tăng trưởng:** Chưa có thống kê doanh thu theo mốc thời gian (hôm nay, 7 ngày, 30 ngày, 90 ngày) và so sánh tỷ lệ tăng trưởng so với chu kỳ trước (Period-over-Period growth).
2. **Không đo lường được hiệu quả chuyển đổi từ các kênh:** Không rõ đơn hàng đến từ bình luận (`facebook_comment`) hay tin nhắn Messenger (`facebook_inbox`), tỷ lệ chốt đơn thành công (Conversion Rate) trên tổng lead tương tác là bao nhiêu để tối ưu kịch bản trả lời tự động.
3. **Mù mờ về mặt hàng chiến lược:** Chưa xác định được sản phẩm nào đang bán chạy nhất (Top-selling products) theo doanh thu và số lượng để chủ động nhập hàng và thiết lập giá combo.
4. **Không nắm được thời điểm vàng khách mua hàng:** Thiếu ma trận phân tích khung giờ vàng (Golden Hour Heatmap) theo từng giờ trong ngày và các thứ trong tuần để phân bổ bài đăng và sắp xếp nhân sự trực live chat.

Việc xây dựng phân hệ Báo Cáo Phân Tích Doanh Thu & Hiệu Quả Bán Hàng (`/analytics`) giải quyết trọn vẹn bài toán trên, cung cấp cho chủ shop bức tranh tài chính và vận hành thời gian thực, trực quan chuẩn phong cách macOS Clean Utility.

## What Changes

- **Backend Analytics APIs (`/api/v1/analytics`):**
  - Cung cấp endpoint tổng hợp các chỉ số KPIs kinh doanh: Tổng doanh thu thực nhận, số đơn hàng, giá trị trung bình mỗi đơn (AOV), tỷ lệ chốt đơn (Conversion Rate) kèm tỷ lệ tăng trưởng so với chu kỳ liền trước (`GET /api/v1/analytics/summary`).
  - Cung cấp dữ liệu chuỗi thời gian phân bổ doanh thu và đơn hàng theo từng ngày/tuần, hỗ trợ lọc theo phương thức thanh toán (COD vs VietQR) (`GET /api/v1/analytics/revenue-series`).
  - Cung cấp phân tích tỷ lệ chuyển đổi đơn hàng theo nguồn xuất phát (Facebook Comment, Facebook Inbox, Manual) và trạng thái hoàn tất (`GET /api/v1/analytics/channel-breakdown`).
  - Cung cấp danh sách bảng xếp hạng Top 10 sản phẩm bán chạy nhất kèm tỷ trọng doanh thu (`GET /api/v1/analytics/top-products`).
  - Cung cấp ma trận nhiệt (Sales Heatmap) theo 24 khung giờ và 7 ngày trong tuần làm nổi bật 2 đỉnh giờ vàng (11:30 - 13:00 và 20:00 - 21:30) (`GET /api/v1/analytics/sales-heatmap`).
  - Hỗ trợ tham số truy vấn linh hoạt: `pageId` (lọc theo từng Fanpage hoặc tất cả), `timeRange` (`7d`, `30d`, `90d`, `custom`), `startDate`, `endDate`.
- **Frontend Zustand Store (`analytics.store.ts`):**
  - Quản lý trạng thái bộ lọc thời gian, Fanpage được chọn, và lưu trữ dữ liệu báo cáo đa tầng.
  - Tích hợp chuẩn phòng vệ dữ liệu (Defensive Data Parsing) theo quy chuẩn `.agents/rules/api-contract-sync.md`.
  - Hỗ trợ xuất báo cáo dữ liệu định dạng CSV cho chủ shop lưu trữ hoặc đối soát kế toán.
- **Frontend Analytics Dashboard UI (`/analytics`) - macOS Clean Utility:**
  - Thiết kế bố cục Bento Grid đa tầng với Apple-inspired visual aesthetics (bo góc mềm mại, viền border tinh tế, glassmorphism thanh lịch).
  - Khối thẻ KPI Tinh gọn (Executive Bento Cards) hiển thị 4 chỉ số cốt lõi kèm biểu tượng và huy hiệu tăng trưởng màu xanh lá/đỏ.
  - Biểu đồ tương tác SVG thuần (Interactive SVG Area & Line Chart) trực quan hóa xu hướng doanh thu và số lượng đơn hàng kèm tooltip chi tiết khi di chuột.
  - Biểu đồ phân rã nguồn đơn (Sales Channel Breakdown) so sánh hiệu quả chốt đơn giữa Comment, Messenger và Manual.
  - Bảng xếp hạng Top sản phẩm bán chạy (Top Products Leaderboard) hiển thị ảnh, SKU, số lượng bán, tổng tiền và thanh tiến độ đóng góp doanh thu.
  - Ma trận nhiệt khung giờ vàng (Golden Hour Sales Heatmap) trực quan hóa mật độ đơn chốt theo 24 giờ x 7 ngày, gắn nhãn đánh dấu khung giờ vàng chốt đơn cao nhất.
  - Bổ sung tab điều hướng `/analytics` trong thanh `Sidebar` với icon `BarChart3`.

## Capabilities

### New Capabilities
- `sales-analytics`: Cung cấp toàn bộ dịch vụ phân tích dữ liệu kinh doanh, tính toán doanh thu, tỷ lệ chốt đơn theo kênh, bảng xếp hạng sản phẩm bán chạy, ma trận khung giờ vàng và giao diện báo cáo Dashboard chuẩn macOS Clean Utility.

### Modified Capabilities
- `dashboard-overview`: Mở rộng khả năng liên kết nhanh từ Widget tổng quan sang màn hình chi tiết `/analytics` để xem phân tích chuyên sâu.
- `navigation`: Thêm mục menu `Báo cáo doanh thu` (`/analytics`) trong thanh `Sidebar` chính.

## Impact

- **Database:**
  - Tối ưu hóa truy vấn PostgreSQL trên các bảng hiện có `orders`, `order_items`, `payments`, `customers` thông qua các lệnh query tổng hợp (`SUM`, `COUNT`, `AVG`, `DATE_TRUNC`, `EXTRACT(DOW)`, `EXTRACT(HOUR)`).
  - Không yêu cầu thay đổi cấu trúc bảng bắt buộc, nhưng có thể bổ sung composite index `(page_id, created_at, status)` nếu cần thiết để tăng tốc truy vấn phân tích chuỗi thời gian.
- **Backend APIs:**
  - Tạo mới module `backend/src/api/routes/analytics.routes.ts`, `analytics.controller.ts`, `analytics.service.ts`, `analytics.repository.ts`, `analytics.dto.ts`.
  - Đăng ký endpoint `/api/v1/analytics` trong `backend/src/api/routes/index.ts`.
- **Frontend Stores & Components:**
  - Tạo mới `frontend/src/lib/analytics.store.ts` và `frontend/src/types/analytics.ts`.
  - Tạo cụm components tại `frontend/src/components/analytics/`:
    - `analytics-metrics.tsx`: 4 thẻ Bento KPIs tổng quan.
    - `revenue-trend-chart.tsx`: Biểu đồ SVG tương tác doanh thu và đơn hàng theo ngày.
    - `channel-breakdown-chart.tsx`: Phân rã tỷ lệ nguồn đơn (Bình luận vs Tin nhắn vs Thủ công).
    - `top-products-table.tsx`: Bảng xếp hạng sản phẩm bán chạy.
    - `golden-hour-heatmap.tsx`: Ma trận nhiệt 24h x 7 ngày đánh dấu khung giờ vàng.
    - `analytics-header.tsx`: Bộ chọn Fanpage, khoảng thời gian (7d, 30d, 90d, tùy chỉnh) và nút xuất CSV.
  - Trang chính `frontend/src/app/(dashboard)/analytics/page.tsx`.
- **Quality Gates & Tests:**
  - Backend unit & integration tests kiểm thử trọn vẹn repository queries, service calculation (growth rate, zero-division safeguard), và route handlers.
  - Frontend unit tests cho store và integration test render giao diện trang `/analytics`. Đảm bảo pass 100% tests và 0 lỗi TypeScript.
