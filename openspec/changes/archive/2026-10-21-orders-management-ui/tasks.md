# Tasks: Màn Hình Giao Diện Quản Lý Đơn Hàng & Vận Đơn (TASK-22)

## 1. Types & Zustand Store Architecture

- [x] 1.1 Khai báo types và interfaces tại `frontend/src/types/order.ts` (`Order`, `OrderItem`, `OrderStatus`, `PaymentStatus`, `OrderTimelineEvent`, `OrderMetrics`) cùng các hàm tiện ích phòng vệ `normalizeOrder` và `maskPhoneNumber`.
- [x] 1.2 Xây dựng Zustand store tại `frontend/src/lib/order.store.ts` quản lý state danh sách đơn hàng, bộ lọc trạng thái đa tầng, tìm kiếm, phân trang, kết nối REST API `/api/v1/orders` và tích hợp WebSocket listener `ORDER_STATUS_CHANGED`.
- [x] 1.3 Viết unit test suite cho `order.store.ts` tại `frontend/src/lib/__tests__/order.store.test.ts` kiểm thử các luồng nạp dữ liệu, lọc, cập nhật trạng thái Optimistic UI và xử lý sự kiện Socket.

## 2. Order Components & Print Modal

- [x] 2.1 Xây dựng Component `OrderStatusBadge` tại `frontend/src/components/orders/order-status-badge.tsx` hiển thị badge màu sắc chuẩn Apple Bento cho 5 trạng thái đơn hàng và 3 trạng thái thanh toán.
- [x] 2.2 Xây dựng Component `OrderMetrics` tại `frontend/src/components/orders/order-metrics.tsx` hiển thị 4 thẻ Bento thống kê (Tổng đơn, Chờ xác nhận, Đang giao, Doanh thu ước tính) kèm icon và badge tăng trưởng.
- [x] 2.3 Xây dựng Component `OrderTable` tại `frontend/src/components/orders/order-table.tsx` với giao diện bảng Bento macOS Clean Utility, dải Tab lọc trạng thái ngang, ô tìm kiếm debounced, checkbox chọn hàng loạt và phân trang.
- [x] 2.4 Xây dựng Component `OrderDetailDrawer` tại `frontend/src/components/orders/order-detail-drawer.tsx` hiển thị toàn bộ chi tiết giỏ hàng, thông tin khách hàng (PII masked), địa chỉ (kèm nút copy), timeline lịch sử và cụm nút chuyển trạng thái nhanh.
- [x] 2.5 Xây dựng Component `OrderPrintModal` tại `frontend/src/components/orders/order-print-modal.tsx` hiển thị khung xem trước và in phiếu vận đơn chuẩn A5/A6 tối ưu in nhiệt cho shipper kèm CSS `@media print`.

## 3. Page Assembly, Navigation & Quality Gates

- [x] 3.1 Cập nhật thanh điều hướng `frontend/src/components/layout/sidebar.tsx` bổ sung mục menu `Quản lý đơn hàng` (`/orders`, icon `ShoppingBag`) với badge số lượng đơn chờ duyệt.
- [x] 3.2 Lắp ráp hoàn chỉnh trang chính `frontend/src/app/(dashboard)/orders/page.tsx` kết nối với `usePageStore`, các components OrderMetrics, OrderTable, OrderDetailDrawer, và OrderPrintModal.
- [x] 3.3 Viết integration test suite tại `frontend/src/app/(dashboard)/orders/__tests__/orders.test.tsx` kiểm thử đầy đủ render giao diện, chuyển đổi tab lọc, mở drawer chi tiết, và kích hoạt in phiếu. Đảm bảo toàn bộ test pass 100% và TypeScript compile 0 lỗi.
