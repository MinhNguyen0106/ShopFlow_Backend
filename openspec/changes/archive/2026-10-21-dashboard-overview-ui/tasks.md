# Tasks: Bảng Điều Khiển Tổng Quan & Báo Cáo KPIs (TASK-19)

## 1. Sub-Components & Types

- [x] 1.1 Định nghĩa kiểu dữ liệu tại `frontend/src/types/dashboard.ts` (`DashboardMetrics`, `HourlyTrafficPoint`, `MetaWindowLead`, `QuickActionItem`) và tiện ích che số điện thoại PII `maskPhoneNumber`. Xác minh types compile không lỗi.
- [x] 1.2 Xây dựng Component `BentoMetrics` tại `frontend/src/components/dashboard/bento-metrics.tsx` hiển thị 4 chỉ số KPIs điều hành cốt lõi (Tổng hội thoại, Ẩn SĐT < 3s, Bài viết chờ đăng, Tỷ lệ tuân thủ Meta 24h). Xác minh render đầy đủ các chỉ số và badge tăng trưởng.
- [x] 1.3 Xây dựng Component `TrafficChart` tại `frontend/src/components/dashboard/traffic-chart.tsx` trực quan hóa mật độ tương tác theo giờ (08:00 - 22:00) bằng SVG/Tailwind thuần và đánh dấu 2 đỉnh khung giờ vàng (11:30 & 20:00). Xác minh render biểu đồ và tooltip mốc giờ.

## 2. Operational Widgets

- [x] 2.1 Xây dựng Component `MetaWindowWidget` tại `frontend/src/components/dashboard/meta-window-widget.tsx` hiển thị danh sách đếm ngược khách hàng sắp hết hạn Cửa sổ 24h của Meta kèm nút CTA mở Live Chat. Xác minh tính toán thời gian và liên kết điều hướng.
- [x] 2.2 Xây dựng Component `HotLeadsWidget` tại `frontend/src/components/dashboard/hot-leads-widget.tsx` hiển thị danh sách leads nóng cần chốt đơn gấp với số điện thoại được che ký tự tự động (`098****123`). Xác minh áp dụng che thông tin nhạy cảm PII.
- [x] 2.3 Xây dựng Component `QuickActions` tại `frontend/src/components/dashboard/quick-actions.tsx` với 4 phím tắt chuyển trang nhanh (Soạn bài mới, Hộp thư Live Chat, Quản lý Page, Cấu hình Automation). Xác minh các liên kết điều hướng chính xác.

## 3. Page Assembly & Quality Gates

- [x] 3.1 Tái cấu trúc và lắp ráp trang chính `frontend/src/app/(dashboard)/page.tsx` thành màn hình Dashboard hoàn chỉnh thay thế lệnh chuyển hướng cũ, kết hợp lời chào cá nhân hóa, bộ chọn Fanpage và lưới Bento đa tầng. Xác minh hiển thị đầy đủ các phân khu giao diện.
- [x] 3.2 Viết và chạy unit/integration tests cho phân hệ Dashboard tại `frontend/src/app/(dashboard)/__tests__/dashboard.test.tsx`, kiểm thử đầy đủ metrics, traffic chart, meta window widget, quick actions và hot leads, đạt 100% test pass.
- [x] 3.3 Chạy kiểm tra tĩnh kiểu dữ liệu `npx tsc --noEmit` và build thử nghiệm `npm run build` trên gói `frontend`, đảm bảo 0 lỗi lint/type.
