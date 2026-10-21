# Technical Design: Màn hình Quản lý Bài viết Đặt lịch (TASK-16)

## Context

Hệ thống ShopFlow đã có đầy đủ tầng Backend phục vụ quản lý bài viết đặt lịch:
- Endpoints RESTful tại `/api/v1/posts` (`GET /`, `GET /:postId`, `DELETE /:postId`, `POST /:postId/retry`).
- Hàng đợi BullMQ Worker xuất bản đa kênh và phát sự kiện WebSocket `POST_STATUS_CHANGED` qua Socket.io.
- Phía Frontend đã có sẵn Khung Layout macOS Clean Utility (`sidebar.tsx`, `topbar.tsx`, `mac-window-shell.tsx`), Socket Provider, và Design System Tokens.
Xem [proposal.md](proposal.md) để biết động lực và [spec.md](specs/posts-management/spec.md) để biết các yêu cầu hành vi chi tiết.

## Goals / Non-Goals

**Goals:**
- Xây dựng giao diện trang `/posts` hỗ trợ 2 chế độ hiển thị: Dạng bảng chi tiết (List View) và Dạng lịch trực quan (Calendar View).
- Xây dựng Zustand store `post.store.ts` kết nối với API backend, quản lý phân trang, lọc theo trạng thái (`pending`, `scheduled`, `published`, `failed`), lọc theo Fanpage, và tích hợp realtime socket.
- Thiết kế component `PostStatusBadge` chuẩn macOS Clean Utility với màu sắc trực quan (Published: xanh ngọc, Scheduled: xanh dương, Failed: đỏ san hô, Pending: vàng hổ phách).
- Hỗ trợ thao tác nhanh: Nút "Thử lại" (Retry) cho bài lỗi, nút "Hủy bài" (Cancel) có xác nhận.
- Đảm bảo tính nhất quán hợp đồng dữ liệu DTO (API Contract Sync) theo quy chuẩn [.agents/rules/api-contract-sync.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/rules/api-contract-sync.md).

**Non-Goals:**
- Trình soạn thảo và tạo bài viết mới (thuộc phạm vi TASK-17 tại `/posts/new`).
- Modal xem trước giao diện thật của Facebook (thuộc phạm vi TASK-17).

## Decisions

### Quyết định 1: Tự dựng lưới Calendar Grid bằng CSS Grid & Tailwind thuần
- **Lý do**: Không cần cài thêm thư viện lịch cồng kềnh (như FullCalendar hay React-Big-Calendar nặng >500KB), đảm bảo khả năng tùy biến 100% theo phong cách macOS Clean Utility của ShopFlow và tải trang cực nhanh.
- **Phương án thay thế đã xem xét**: Sử dụng thư viện FullCalendar (nặng, khó đồng bộ giao diện và token màu sắc).

### Quyết định 2: Quản lý trạng thái bằng Zustand Store với Defensive Parsing
- **Lý do**: `post.store.ts` bóc tách dữ liệu phòng vệ (kiểm tra `Array.isArray`, fallback giá trị mặc định) để tránh crash UI khi API trả về kết quả rỗng hoặc thay đổi cấu trúc phong bì.
- **Phương án thay thế đã xem xét**: Quản lý state cục bộ bằng `useState` trong component (dẫn đến phân mảnh và khó lắng nghe sự kiện WebSocket toàn cục).

### Quyết định 3: Tích hợp WebSocket cập nhật thời gian thực
- **Lý do**: Khi bài viết đến giờ hẹn và được worker xuất bản lên Meta Graph API thành công hoặc thất bại, worker phát sự kiện `POST_STATUS_CHANGED`. Store sẽ tự động cập nhật trạng thái bài viết ngay trên màn hình mà người dùng không cần F5 lại trang.

## Risks / Trade-offs

- **[Lệch múi giờ giữa máy khách và máy chủ]** → *Biện pháp giảm thiểu*: Lưu trữ và truyền tải thời gian bằng chuẩn ISO 8601 UTC; hiển thị trên giao diện theo múi giờ địa phương Việt Nam (`Asia/Ho_Chi_Minh` / `vi-VN`).
- **[Dữ liệu lớn làm chậm Calendar View]** → *Biện pháp giảm thiểu*: Gửi tham số `from` và `to` khi người dùng chuyển tháng/tuần trên lịch để chỉ tải bài viết trong khoảng thời gian đang xem.
