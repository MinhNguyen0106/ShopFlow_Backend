# Proposal: Bảng Điều Khiển Tổng Quan & Báo Cáo KPIs (dashboard-overview-ui)

## Why

Chủ shop online cần một trung tâm chỉ huy tổng quan (Executive Command Center) tại `/(dashboard)` để nắm bắt tức thì toàn bộ nhịp đập kinh doanh trong ngày: lưu lượng tương tác đa kênh, số lượng số điện thoại được bảo vệ tự động, các bài viết sẵn sàng xuất bản, và cảnh báo khách hàng sắp hết hạn trong Cửa sổ 24h của Meta. Hiện tại trang `/(dashboard)/page.tsx` chỉ đang là một lệnh điều hướng tạm bợ (`router.replace('/pages')`).

## What Changes

- **Dashboard Types & Metrics Data (`frontend/src/types/dashboard.ts`)**: Định nghĩa cấu trúc dữ liệu KPIs tổng quan, điểm dữ liệu biểu đồ lưu lượng theo giờ (`HourlyTrafficPoint`), cảnh báo cửa sổ 24h (`MetaWindowLead`), và danh sách thao tác nhanh (`QuickActionItem`).
- **4 Thẻ Bento Metrics Hàng Đầu (`frontend/src/components/dashboard/bento-metrics.tsx`)**:
  1. *Tổng hội thoại mới hôm nay:* Số lượng hội thoại kèm tỷ lệ tăng trưởng so với ngày trước.
  2. *Bình luận chứa SĐT đã ẩn:* Số lượt bảo vệ thành công với tốc độ SLA trung bình `< 3s`.
  3. *Bài viết sẵn sàng xuất bản:* Số bài đã lên lịch trải đều các khung giờ vàng trong ngày.
  4. *Tỷ lệ tuân thủ Cửa sổ 24h Meta:* Tỷ lệ phản hồi kịp thời đạt chuẩn chính sách Messenger.
- **Biểu Đồ Lưu Lượng Thời Gian Thực (`frontend/src/components/dashboard/traffic-chart.tsx`)**: Biểu đồ trực quan hóa mật độ tương tác theo từng giờ trong ngày (08:00 - 22:00), đánh dấu 2 đỉnh khung giờ vàng tương tác cao (11:30 - 13:00 và 20:00 - 21:30).
- **Widget Cảnh Báo Cửa Sổ 24h Meta (`frontend/src/components/dashboard/meta-window-widget.tsx`)**: Danh sách đếm ngược thời gian phản hồi cho các khách hàng sắp hết hạn 24h kèm nút 1-click mở khung chat trả lời ngay.
- **Widget Lối Tắt Thao Tác Nhanh (`frontend/src/components/dashboard/quick-actions.tsx`)**: Cụm 4 phím tắt: Soạn bài mới (`/posts/new`), Hộp thư Live Chat (`/inbox`), Quản lý Fanpage (`/pages`), và Kịch bản tự động (`/automation`).
- **Khối Hot Leads Cần Chốt Đơn Gấp (`frontend/src/components/dashboard/hot-leads-widget.tsx`)**: Hiển thị khách hàng tiềm năng kèm số điện thoại được che ký tự tự động (`098****123`) tuân thủ bảo vệ PII.
- **Trang Chính Dashboard (`frontend/src/app/(dashboard)/page.tsx`)**: Lắp ráp toàn diện các khối Bento widgets theo chuẩn macOS Clean Utility.
- **Kiểm Định Tự Động**: Viết 100% unit & integration test suites cho phân hệ Dashboard.

## Capabilities

### New Capabilities

- `dashboard-overview`: Cung cấp giao diện bảng điều khiển trung tâm hiển thị các chỉ số kinh doanh KPIs tổng quan, biểu đồ tương tác thời gian thực, giám sát tuân thủ chính sách Meta 24h, và cụm lối tắt thao tác nhanh.

### Modified Capabilities

*(Không có)*

## Impact

- **Frontend Codebase**:
  - Cập nhật `frontend/src/app/(dashboard)/page.tsx` thành màn hình Dashboard hoàn chỉnh.
  - Tạo mới `frontend/src/types/dashboard.ts`.
  - Tạo mới thư mục `frontend/src/components/dashboard/` với các widgets chuyên biệt.
  - Viết tests tại `frontend/src/app/(dashboard)/__tests__/dashboard.test.tsx`.
- **APIs**: Kết hợp dữ liệu từ các store hiện có (`usePageStore`, `usePostStore`, `useInboxStore`, `useAutomationStore`).
