# Proposal: Màn hình Quản lý Danh sách Bài viết Đặt lịch & Calendar View (TASK-16)

## Why

Chủ shop trực tuyến trên Facebook cần theo dõi, quản lý và điều phối toàn bộ các bài đăng bán hàng đã lên lịch theo thời gian thực để duy trì tương tác ổn định vào các khung giờ vàng. Hiện tại hệ thống đã có Backend APIs hoàn chỉnh cho bài viết đặt lịch (`/api/v1/posts`), nhưng Frontend chưa có giao diện trực quan cho phép chủ shop tra cứu, lọc trạng thái (`pending`, `scheduled`, `published`, `failed`), xem dạng bảng (List View), xem dạng lịch trực quan (Calendar View) và thực hiện các thao tác nhanh (Thử lại bài lỗi, hủy bài đặt lịch).

## What Changes

- **Xây dựng tầng quản lý trạng thái bài viết (`post.store.ts`):**
  - Tích hợp Zustand store gọi các API RESTful `/api/v1/posts`: lấy danh sách có phân trang, lọc theo Fanpage, trạng thái và khoảng ngày.
  - Cung cấp các actions: `fetchPosts`, `retryPost`, `cancelPost`, `changePage`, `filterByStatus`, `filterByPage`.
  - Đồng bộ tự động với sự kiện WebSocket `POST_STATUS_CHANGED` từ Socket.io Server để cập nhật tức thì khi bài viết được xuất bản hoặc thất bại.
- **Xây dựng Màn hình Quản lý Bài viết (`/posts`):**
  - **Tab 1 - Khung nhìn Danh sách (List View):** Bảng hiển thị thông tin bài viết (Ảnh thumbnail, tóm tắt nội dung, Fanpage mục tiêu, thời gian dự kiến đăng, huy hiệu trạng thái sắc nét, nút Thao tác: Chi tiết, Thử lại, Hủy).
  - **Tab 2 - Khung nhìn Lịch biểu (Calendar View):** Lưới lịch biểu theo tháng và tuần, hiển thị thẻ bài viết trực quan tại từng ô ngày giờ, đánh dấu các khung giờ vàng tương tác cao.
  - Bộ thanh công cụ trên cùng: Nút chuyển đổi Tab List/Calendar, bộ lọc Fanpage (`PageSelector`), bộ lọc trạng thái, thanh tìm kiếm từ khóa trong nội dung bài viết, và nút CTA `+ Soạn bài mới` điều hướng sang `/posts/new`.
  - Phân trang chuẩn hóa (Pagination) và hiển thị trạng thái trống (Empty State) khi chưa có bài viết.

## Capabilities

### New Capabilities
- `posts-management`: Khả năng hiển thị, quản lý, phân trang, lọc trạng thái, hiển thị dạng lịch biểu và điều phối bài viết đặt lịch xuất bản lên Fanpage trên giao diện người dùng.

### Modified Capabilities
<!-- Không có capability hiện hữu nào bị thay đổi yêu cầu -->

## Impact

- **Frontend Application:**
  - Route mới: `frontend/src/app/(dashboard)/posts/page.tsx`
  - Components mới: `frontend/src/components/posts/posts-list-view.tsx`, `frontend/src/components/posts/posts-calendar-view.tsx`, `frontend/src/components/posts/post-status-badge.tsx`
  - Store mới: `frontend/src/lib/post.store.ts`
  - Types mới: `frontend/src/types/post.ts`
- **Tích hợp Backend:**
  - Sử dụng các API sẵn có tại `/api/v1/posts` (`GET /`, `POST /:postId/retry`, `DELETE /:postId`).
  - Lắng nghe Socket.io event `POST_STATUS_CHANGED`.
