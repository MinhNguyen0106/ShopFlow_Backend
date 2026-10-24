# Tasks: Màn Hình Báo Cáo Phân Tích Doanh Thu & Hiệu Quả Bán Hàng (TASK-24)

## 1. Backend Analytics API & Data Layer

- [x] 1.1 Khai báo DTOs và Zod validation schema tại `backend/src/api/dtos/analytics.dto.ts` (`analyticsQuerySchema`, `AnalyticsSummaryResponse`, `RevenueSeriesItem`, `ChannelBreakdownItem`, `TopProductItem`, `SalesHeatmapCell`).
- [x] 1.2 Xây dựng `AnalyticsRepository` tại `backend/src/infrastructure/database/repositories/analytics.repository.ts` với các câu truy vấn tổng hợp SQL PostgreSQL tối ưu hóa thời gian chạy (`DATE_TRUNC`, `EXTRACT(DOW)`, `EXTRACT(HOUR)`, `SUM`, `COUNT`, `AVG`).
- [x] 1.3 Xây dựng `AnalyticsService` tại `backend/src/core/services/analytics.service.ts` thực hiện logic tính toán các chỉ số kinh doanh, so sánh chu kỳ trước (Period-over-Period growth rate) và xử lý phòng vệ chia cho 0.
- [x] 1.4 Xây dựng `AnalyticsController` tại `backend/src/api/controllers/analytics.controller.ts` tiếp nhận request, gọi service và trả về chuẩn `ApiResponse<T>`.
- [x] 1.5 Thiết lập `analytics.routes.ts` tại `backend/src/api/routes/analytics.routes.ts` với xác thực `authenticateToken`, validate schema và đăng ký router vào `backend/src/api/routes/index.ts`.
- [x] 1.6 Viết bộ kiểm thử unit & integration test cho backend tại `backend/src/core/services/__tests__/analytics.service.test.ts` và `backend/src/api/routes/__tests__/analytics.routes.test.ts`.

## 2. Frontend Types & Zustand Store Architecture

- [x] 2.1 Khai báo types và interfaces tại `frontend/src/types/analytics.ts` (`AnalyticsSummary`, `RevenueDataPoint`, `ChannelMetric`, `TopProductItem`, `HeatmapCell`) cùng hàm phòng vệ `normalizeAnalyticsData`.
- [x] 2.2 Xây dựng Zustand store tại `frontend/src/lib/analytics.store.ts` quản lý state bộ lọc thời gian (`timeRange`, `customDateRange`), Fanpage được chọn, gọi API `/api/v1/analytics/*`, và tiện ích xuất báo cáo CSV UTF-8 BOM.
- [x] 2.3 Viết unit test suite cho `analytics.store.ts` tại `frontend/src/lib/__tests__/analytics.store.test.ts` kiểm thử các luồng fetch dữ liệu, đổi mốc thời gian, xử lý lỗi và xuất CSV.

## 3. macOS Clean Utility Bento UI Components

- [x] 3.1 Xây dựng Component `AnalyticsHeader` tại `frontend/src/components/analytics/analytics-header.tsx` với bộ chọn Fanpage dropdown, thanh chọn mốc thời gian (Segmented Control `7 ngày`, `30 ngày`, `90 ngày`, `Tùy chỉnh`), và nút xuất báo cáo CSV.
- [x] 3.2 Xây dựng Component `AnalyticsMetrics` tại `frontend/src/components/analytics/analytics-metrics.tsx` hiển thị 4 thẻ Bento KPIs (Doanh thu thuần, Tổng đơn hàng, Tỷ lệ chốt đơn, Giá trị đơn trung bình AOV) kèm biểu tượng và badge tăng trưởng xanh lá/đỏ.
- [x] 3.3 Xây dựng Component `RevenueTrendChart` tại `frontend/src/components/analytics/revenue-trend-chart.tsx` bằng SVG thuần tương tác với đường cong Bézier mượt mà, gradient fill phong cách macOS, và tooltip chi tiết khi di chuột.
- [x] 3.4 Xây dựng Component `ChannelBreakdownChart` tại `frontend/src/components/analytics/channel-breakdown-chart.tsx` trực quan hóa tỷ lệ doanh thu và số đơn từ Facebook Comment vs Facebook Inbox vs Manual kèm tỷ lệ hoàn tất/hủy.
- [x] 3.5 Xây dựng Component `TopProductsTable` tại `frontend/src/components/analytics/top-products-table.tsx` hiển thị bảng xếp hạng 10 sản phẩm bán chạy nhất kèm ảnh, SKU, số lượng bán, doanh thu và thanh tiến độ đóng góp.
- [x] 3.6 Xây dựng Component `GoldenHourHeatmap` tại `frontend/src/components/analytics/golden-hour-heatmap.tsx` với lưới ma trận nhiệt 24 giờ x 7 ngày, highlight nổi bật 2 khung giờ vàng (11:30-13:00 và 20:00-21:30) kèm tooltip số đơn.

## 4. Page Assembly, Navigation & Quality Gates

- [x] 4.1 Cập nhật thanh điều hướng `frontend/src/components/layout/sidebar.tsx` bổ sung mục menu `Báo cáo phân tích` (`/analytics`, icon `BarChart3`).
- [x] 4.2 Lắp ráp hoàn chỉnh trang chính `frontend/src/app/(dashboard)/analytics/page.tsx` kết nối với `usePageStore`, `useAnalyticsStore`, và toàn bộ các components Bento đã xây dựng.
- [x] 4.3 Viết integration test suite tại `frontend/src/app/(dashboard)/analytics/__tests__/analytics.test.tsx` kiểm thử toàn bộ luồng render, tương tác chuyển mốc thời gian, hiển thị tooltip biểu đồ và lọc theo Fanpage. Đảm bảo toàn bộ test pass 100% và TypeScript compile 0 lỗi.
