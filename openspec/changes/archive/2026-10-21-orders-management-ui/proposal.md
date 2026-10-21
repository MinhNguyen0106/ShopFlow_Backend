# Proposal: Màn Hình Giao Diện Quản Lý Đơn Hàng & Vận Đơn (orders-management-ui)

## Why

Sau khi hoàn thành mô-đun trích xuất thực thể đơn hàng bằng AI (`OrderParserService` - TASK-20) và hệ thống quản lý danh mục sản phẩm & trừ kho an toàn (`product-catalog-service` - TASK-21), các chủ shop online trên Facebook cần một giao diện quản trị đơn hàng tập trung (`/orders`) chuyên nghiệp. Giao diện này đóng vai trò trạm điều phối trung tâm (Fulfillment & Order Command Center), giúp chủ shop theo dõi trực quan các đơn hàng phát sinh từ tin nhắn/bình luận, phân loại trạng thái đơn hàng (`pending`, `confirmed`, `shipping`, `completed`, `cancelled`), xem chi tiết giỏ hàng và biến thể (màu sắc, kích cỡ, SKU), in phiếu vận đơn chuẩn cho shipper, và nhận thông báo cập nhật thời gian thực qua WebSocket.

## What Changes

- **Order Types & DTO Interfaces (`frontend/src/types/order.ts`)**:
  - Định nghĩa kiểu dữ liệu `Order`, `OrderItem`, `OrderStatus`, `PaymentStatus`, `OrderTimelineEvent`, `OrderMetrics`.
  - Xây dựng hàm phòng vệ `normalizeOrder` chuẩn hóa dữ liệu từ backend (snake_case/camelCase).
  - Tiện ích che số điện thoại PII `maskPhoneNumber` bảo vệ quyền riêng tư của khách hàng (`098****123`).
- **Zustand Store Quản Lý Đơn Hàng (`frontend/src/lib/order.store.ts`)**:
  - Quản lý state danh sách đơn hàng, phân trang, bộ lọc đa tầng (trạng thái, ngày tạo, tìm kiếm mã đơn / tên / SĐT / SKU), đơn hàng đang chọn (`selectedOrder`).
  - Kết nối REST APIs `/api/v1/orders` (GET danh sách, GET chi tiết, PATCH trạng thái, DELETE đơn hủy).
  - Tích hợp Optimistic UI khi đổi trạng thái đơn hàng kèm cơ chế rollback an toàn khi xảy ra lỗi mạng.
  - Lắng nghe sự kiện WebSocket thời gian thực `ORDER_STATUS_CHANGED` và `NEW_ORDER_CREATED` từ `socket.ts`.
- **Huy Hiệu Trạng Thái Đơn Hàng & Thanh Toán (`frontend/src/components/orders/order-status-badge.tsx`)**:
  - Hiển thị badge màu sắc trực quan theo chuẩn Apple Bento cho từng trạng thái:
    - `pending` (Chờ xác nhận - Vàng ấm)
    - `confirmed` (Đã chốt đơn - Xanh dương)
    - `shipping` (Đang giao hàng - Tím Indigo)
    - `completed` (Hoàn thành - Xanh ngọc)
    - `cancelled` (Đã hủy - Đỏ/Xám)
- **Thẻ Thống Kê Nhanh Bento Metrics (`frontend/src/components/orders/order-metrics.tsx`)**:
  - 4 chỉ số điều hành cốt lõi: Tổng đơn hàng hôm nay, Đơn chờ xác nhận, Đơn đang giao, Doanh thu ước tính trong ngày.
- **Bảng Danh Sách Đơn Hàng Bento macOS (`frontend/src/components/orders/order-table.tsx`)**:
  - Thiết kế bảng Clean Utility với checkbox chọn hàng loạt, cột Mã đơn hàng, Khách hàng (kèm SĐT masked), Sản phẩm tóm tắt (số lượng + SKU), Tổng tiền, Trạng thái đơn, Trạng thái thanh toán (COD/Chuyển khoản), và Nút thao tác nhanh 1-click.
  - Thanh tìm kiếm và bộ lọc Tab trạng thái ngang mượt mà.
- **Drawer Chi Tiết Đơn Hàng Slide-over (`frontend/src/components/orders/order-detail-drawer.tsx`)**:
  - Drawer trượt từ bên phải hiển thị toàn diện thông tin đơn hàng:
    - Thông tin khách hàng & địa chỉ giao hàng (hỗ trợ nút Copy địa chỉ).
    - Danh sách sản phẩm chi tiết (hình ảnh, tên, biến thể màu/size, đơn giá, số lượng, thành tiền).
    - Timeline lịch sử cập nhật trạng thái đơn hàng (Audit trail).
    - Cụm nút đổi trạng thái nhanh (`Xác nhận đơn`, `Giao hàng`, `Hoàn thành`, `Hủy đơn`).
    - Nút mở phiếu in vận đơn.
- **Modal In Phiếu Vận Đơn / Packing Slip (`frontend/src/components/orders/order-print-modal.tsx`)**:
  - Modal xem trước và in phiếu giao hàng chuẩn A5/A6 tối ưu in nhiệt cho shipper, bao gồm mã vạch/mã QR đơn hàng, thông tin người gửi (Fanpage), người nhận (SĐT rõ khi in), danh sách mặt hàng và số tiền thu hộ COD.
- **Trang Chính Giao Diện Đơn Hàng (`frontend/src/app/(dashboard)/orders/page.tsx`)**:
  - Lắp ráp bố cục tổng thể kết nối với `usePageStore`, hiển thị 4 Bento Metrics hàng đầu, thanh công cụ tìm kiếm và lọc trạng thái, bảng đơn hàng và modal/drawer chi tiết.
- **Cập Nhật Thanh Điều Hướng (`frontend/src/components/layout/sidebar.tsx`)**:
  - Thêm mục menu `Quản lý đơn hàng` (`/orders`, icon `ShoppingBag` hoặc `Package`) với huy hiệu đếm số đơn chờ xác nhận (`pending`).
- **Kiểm Định Tự Động Toàn Diện**:
  - Viết unit tests cho `order.store.ts` và integration tests cho toàn bộ phân hệ giao diện tại `frontend/src/app/(dashboard)/orders/__tests__/orders.test.tsx`.

## Capabilities

### New Capabilities

- `orders-management`: Phân hệ quản lý đơn hàng & vận đơn tập trung, hiển thị danh sách đơn hàng đa trạng thái, tìm kiếm, lọc nhanh, xem chi tiết giỏ hàng, cập nhật trạng thái đơn thời gian thực và in phiếu vận đơn.

### Modified Capabilities

- `layout-navigation`: Bổ sung đường dẫn `/orders` vào Sidebar chính với huy hiệu đếm số lượng đơn hàng chờ xử lý.

## Impact

- **Frontend Codebase**:
  - Thêm mới trang `frontend/src/app/(dashboard)/orders/page.tsx`.
  - Thêm mới thư mục `frontend/src/components/orders/` chứa các components giao diện.
  - Thêm mới store `frontend/src/lib/order.store.ts` và types `frontend/src/types/order.ts`.
  - Cập nhật `frontend/src/components/layout/sidebar.tsx`.
  - Thêm test suites tại `frontend/src/app/(dashboard)/orders/__tests__/` và `frontend/src/lib/__tests__/order.store.test.ts`.
- **API Dependencies**:
  - Tiêu thụ REST API `/api/v1/orders` và WebSocket events `ORDER_STATUS_CHANGED`.
