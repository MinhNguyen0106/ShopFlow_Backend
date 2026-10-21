# Orders Management Specification

## Purpose

Cung cấp giao diện quản lý đơn hàng & vận đơn tập trung (`/orders`) trên Next.js Dashboard theo phong cách macOS Clean Utility, hỗ trợ chủ shop theo dõi trực quan danh sách đơn hàng, lọc theo trạng thái, xem chi tiết giỏ hàng và biến thể, cập nhật trạng thái đơn hàng (optimistic & realtime WebSocket), bảo vệ thông tin PII khách hàng và in phiếu vận đơn chuẩn cho shipper.

## Requirements

### Requirement: Order list retrieval and multi-dimensional filtering
Hệ thống SHALL hiển thị danh sách đơn hàng gắn với Fanpage đang được chọn trong `usePageStore`, hỗ trợ phân trang (`page`, `limit`), tìm kiếm linh hoạt (theo mã đơn, tên khách hàng, số điện thoại, mã SKU sản phẩm) và lọc theo trạng thái đơn hàng (`all`, `pending`, `confirmed`, `shipping`, `completed`, `cancelled`).

#### Scenario: Display paginated order list with metrics
- **WHEN** Người dùng truy cập trang `/orders` với Fanpage hợp lệ
- **THEN** Hệ thống tải danh sách đơn hàng, hiển thị 4 thẻ Bento thống kê (Tổng đơn, Chờ xác nhận, Đang giao, Doanh thu ước tính) và bảng dữ liệu đơn hàng với đầy đủ thông tin (Mã đơn, Khách hàng, Sản phẩm tóm tắt, Tổng tiền, Trạng thái đơn, Trạng thái thanh toán)

#### Scenario: Filter orders by status tab
- **WHEN** Người dùng nhấn chọn tab `Chờ xác nhận (pending)`
- **THEN** Bảng đơn hàng lọc và chỉ hiển thị các đơn hàng đang ở trạng thái `pending`, cập nhật số lượng đếm trên badge

#### Scenario: Search orders by customer phone or SKU
- **WHEN** Người dùng nhập từ khóa tìm kiếm `"098"` hoặc `"AOPOLO"` vào ô tìm kiếm
- **THEN** Bảng dữ liệu tự động cập nhật hiển thị các đơn hàng có số điện thoại hoặc mã SKU sản phẩm khớp với từ khóa tìm kiếm

### Requirement: Order detail inspection and PII masking
Hệ thống SHALL cung cấp Drawer/Modal trượt từ cạnh phải khi người dùng nhấp vào một dòng đơn hàng, hiển thị toàn bộ chi tiết: thông tin khách hàng, số điện thoại bị che giấu theo quy chuẩn bảo vệ dữ liệu cá nhân (`098****123`), địa chỉ nhận hàng (kèm nút copy nhanh), danh sách sản phẩm (tên, biến thể màu/size, đơn giá, số lượng, thành tiền), ghi chú đơn hàng và timeline lịch sử thay đổi trạng thái (Audit Trail).

#### Scenario: Inspect order details in drawer
- **WHEN** Người dùng bấm vào hàng đơn hàng `#ORD-2026-001`
- **THEN** Drawer trượt mở ra từ cạnh phải hiển thị đầy đủ chi tiết giỏ hàng, thông tin khách hàng với số điện thoại bị che `098****123` và lịch sử chuyển đổi trạng thái

#### Scenario: Copy shipping address to clipboard
- **WHEN** Người dùng nhấn vào nút "Sao chép địa chỉ" trong Drawer chi tiết
- **THEN** Hệ thống sao chép chuỗi địa chỉ giao hàng vào clipboard và hiển thị toast thông báo thành công

### Requirement: Order status transition with optimistic UI and WebSocket sync
Hệ thống SHALL cho phép người dùng thay đổi trạng thái đơn hàng trực tiếp (`pending` -> `confirmed` -> `shipping` -> `completed` hoặc `cancelled`) từ bảng danh sách hoặc từ Drawer chi tiết. Thao tác áp dụng cơ chế cập nhật lạc quan (Optimistic UI) và tự động đồng bộ khi nhận sự kiện WebSocket `ORDER_STATUS_CHANGED`.

#### Scenario: Update order status to confirmed
- **WHEN** Người dùng bấm nút "Xác nhận đơn" trên đơn hàng đang ở trạng thái `pending`
- **THEN** Giao diện cập nhật tức thì trạng thái sang `confirmed`, gửi request `PATCH /api/v1/orders/:id/status` đến backend, và tự động hoàn tác (rollback) nếu server phản hồi lỗi

#### Scenario: Real-time update via WebSocket
- **WHEN** Hệ thống nhận được sự kiện Socket `ORDER_STATUS_CHANGED` từ server với payload trạng thái mới của đơn hàng
- **THEN** Zustand store tự động cập nhật bản ghi đơn hàng tương ứng trong bảng danh sách và Drawer chi tiết mà không yêu cầu người dùng tải lại trang

### Requirement: Printable waybill and packing slip generation
Hệ thống SHALL cung cấp modal xem trước và hỗ trợ in phiếu giao hàng / vận đơn (Packing Slip / Waybill) chuẩn A5/A6 tối ưu in nhiệt cho đối tác vận chuyển, bao gồm: Mã đơn hàng (kèm Barcode/QR code), Thông tin người gửi (Shop/Fanpage), Thông tin người nhận (hiển thị số điện thoại đầy đủ phục vụ giao hàng), Danh sách chi tiết các mặt hàng và Số tiền thu hộ COD.

#### Scenario: Open and print packing slip
- **WHEN** Người dùng bấm vào nút "In phiếu giao hàng" trên Drawer chi tiết hoặc bảng danh sách
- **THEN** Modal xem trước phiếu giao hàng hiển thị chuẩn bố cục A5/A6 và nút "In phiếu" kích hoạt hộp thoại in trình duyệt (`window.print()`) với CSS `@media print` tối ưu hóa không in các thành phần giao diện thừa
