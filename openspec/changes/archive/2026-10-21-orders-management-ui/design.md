# Design: Màn Hình Giao Diện Quản Lý Đơn Hàng & Vận Đơn (orders-management-ui)

## 1. Kiến Trúc Phân Hệ & Luồng Dữ Liệu

```
[WebSocket Client: ORDER_STATUS_CHANGED] ──┐
                                           │
[REST APIs: /api/v1/orders] ───────────────┼──> [order.store.ts (Zustand)]
                                           │           │
[User Actions: Filter, Search, Update] ────┘           ▼
                                           ┌───────────────────────────────┐
                                           │  Orders Page Component Tree   │
                                           │  - OrderMetrics (4 Bento)     │
                                           │  - OrderFilters (Tabs & Input)│
                                           │  - OrderTable (Bento List)    │
                                           │  - OrderDetailDrawer (Detail) │
                                           │  - OrderPrintModal (Packing)  │
                                           └───────────────────────────────┘
```

## 2. Thiết Kế Trạng Thái Store (Zustand Store Architecture)

### 2.1 State Interface (`frontend/src/lib/order.store.ts`)
```typescript
interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  metrics: OrderMetrics;
  filters: {
    status: OrderStatus | 'all';
    search: string;
    pageId: string | null;
    startDate?: string;
    endDate?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;

  // Actions
  fetchOrders: (pageId: string) => Promise<void>;
  selectOrder: (order: Order | null) => void;
  setStatusFilter: (status: OrderStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
  setPage: (page: number) => void;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => Promise<boolean>;
  handleSocketStatusUpdate: (payload: { orderId: string; status: OrderStatus; updatedAt: string }) => void;
  handleSocketNewOrder: (order: Order) => void;
}
```

### 2.2 Defensive Data Parsing (`frontend/src/types/order.ts`)
Áp dụng quy chuẩn phòng vệ tại `.agents/rules/api-contract-sync.md`:
- `normalizeOrder`: Chuyển đổi dữ liệu `snake_case` từ PostgreSQL thành `camelCase` an toàn, gán giá trị mặc định cho mảng items (`raw.items || []`), mảng timeline (`raw.timeline || []`), và chuyển đổi số tiền an toàn (`Number(raw.total_amount || 0)`).
- `maskPhoneNumber`: Ẩn 4 chữ số giữa của số điện thoại (`098****123`) khi hiển thị trên giao diện bảng và drawer để bảo vệ PII theo luật bảo vệ dữ liệu cá nhân.

## 3. Thiết Kế Giao Diện Người Dùng (macOS Clean Utility UI Kits)

1. **OrderMetrics (`order-metrics.tsx`)**:
   - 4 thẻ Bento với các chỉ số:
     - *Tổng đơn hôm nay*: Thống kê tổng số đơn hàng phát sinh trong ngày kèm badge tăng trưởng %.
     - *Chờ xác nhận (pending)*: Số lượng đơn hàng cần duyệt hoặc bổ sung thông tin từ AI extraction.
     - *Đang giao hàng (shipping)*: Số lượng đơn hàng đang trên đường giao của các shipper.
     - *Doanh thu dự kiến*: Tổng giá trị tiền tệ của các đơn hàng thành công và đang giao (định dạng `2.450.000 đ`).

2. **OrderFilters & Status Tabs**:
   - Dải Tab ngang chuyển đổi trạng thái: `Tất cả`, `Chờ xác nhận`, `Đã xác nhận`, `Đang giao`, `Hoàn thành`, `Đã hủy`.
   - Mỗi tab có huy hiệu (pill badge) hiển thị số lượng tương ứng.
   - Ô tìm kiếm tức thì (Debounced search) lọc theo mã đơn `#ORD-...`, tên khách, số điện thoại hoặc mã SKU sản phẩm.

3. **OrderTable (`order-table.tsx`)**:
   - Bảng phong cách macOS Clean Utility bo góc nhẹ (`rounded-2xl`), viền mảnh `border-border/60`, hàng có hiệu ứng hover mượt mà.
   - Cột dữ liệu:
     - Checkbox chọn nhiều đơn hàng để thao tác hàng loạt.
     - Mã đơn hàng (UUID vắn tắt hoặc SKU code).
     - Khách hàng (Tên + SĐT masked `098****123`).
     - Sản phẩm (Tóm tắt: tên sản phẩm đầu tiên + `+N sản phẩm khác`).
     - Tổng thanh toán (Đậm nét, kèm nhãn `COD` hoặc `Chuyển khoản`).
     - Trạng thái đơn hàng (`OrderStatusBadge`).
     - Thao tác nhanh: Nút xem chi tiết, Nút in phiếu, Dropdown đổi trạng thái.

4. **OrderDetailDrawer (`order-detail-drawer.tsx`)**:
   - Drawer trượt mượt mà từ bên phải màn hình (`w-full sm:w-[480px] lg:w-[540px]`).
   - Phân khu thông tin rõ ràng:
     - Header: Mã đơn, ngày tạo, Badge trạng thái.
     - Card Khách hàng: Họ tên, SĐT masked, Địa chỉ giao hàng (kèm nút "Sao chép" 1-click), Nguồn đơn (Facebook Comment / Messenger).
     - Card Danh sách sản phẩm: Bảng chi tiết từng món hàng (Tên, Mã SKU, Biến thể Màu/Size, Số lượng, Đơn giá, Thành tiền).
     - Card Thanh toán: Tạm tính, Phí vận chuyển, Giảm giá, Tổng cộng thanh toán.
     - Card Timeline: Lịch sử audit trail các mốc thay đổi trạng thái (Tạo đơn -> AI Parse -> Xác nhận -> Xuất kho -> Giao hàng -> Hoàn tất).
     - Footer: Cụm nút hành động chuyển đổi trạng thái tiếp theo và nút "In phiếu giao hàng".

5. **OrderPrintModal (`order-print-modal.tsx`)**:
   - Khung xem trước phiếu in nhiệt khổ A5/A6 tiêu chuẩn.
   - Chứa thông tin người gửi (ShopFlow / Fanpage), người nhận (hiển thị số điện thoại đầy đủ để shipper liên hệ), danh sách mặt hàng, tiền thu hộ COD.
   - Thiết lập CSS Print Stylesheet `@media print`:
     ```css
     @media print {
       body * { visibility: hidden; }
       #printable-waybill, #printable-waybill * { visibility: visible; }
       #printable-waybill { position: absolute; left: 0; top: 0; width: 100%; }
     }
     ```

## 4. Tích Hợp WebSocket Thời Gian Thực (Socket.io)

Lắng nghe kênh sự kiện trên client (`frontend/src/lib/socket.ts`):
- `ORDER_STATUS_CHANGED`: Nhận `{ orderId, status, updatedAt, actor }` -> Cập nhật trực tiếp vào danh sách đơn hàng mà không cần reload trang.
- `NEW_ORDER_CREATED`: Nhận `{ order }` -> Chèn lên đầu danh sách đơn hàng và kích hoạt âm thanh / thông báo nhẹ.

## 5. Chiến Lược Kiểm Thử (Testing Strategy)

- **Unit Tests (`order.store.test.ts`)**:
  - Kiểm thử `fetchOrders`: nạp danh sách, lọc theo trạng thái, tìm kiếm từ khóa.
  - Kiểm thử `updateOrderStatus`: kiểm thử cập nhật thành công và cơ chế rollback khi lỗi.
  - Kiểm thử `handleSocketStatusUpdate`: cập nhật trạng thái thời gian thực.
  - Kiểm thử `normalizeOrder` và `maskPhoneNumber`.
- **Integration Tests (`orders.test.tsx`)**:
  - Kiểm thử render giao diện trang `/orders` với 4 thẻ Bento Metrics.
  - Kiểm thử chuyển đổi tab bộ lọc trạng thái.
  - Kiểm thử mở Drawer chi tiết đơn hàng và kiểm tra ẩn số điện thoại PII.
  - Kiểm thử mở Modal in phiếu giao hàng.
