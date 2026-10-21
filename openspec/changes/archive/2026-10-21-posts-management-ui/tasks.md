# Tasks: Màn hình Quản lý Danh sách Bài viết Đặt lịch (TASK-16)

## 1. Types & Zustand Store

- [x] 1.1 Khởi tạo tệp khai báo kiểu dữ liệu `frontend/src/types/post.ts` đồng bộ hợp đồng DTO từ backend (`ScheduledPostItem`, `PostStatus`, `PostMediaType`, `QueryPostsParams`, `PaginationMeta`). Xác minh bằng `npx tsc --noEmit`.
- [x] 1.2 Xây dựng Zustand Store `frontend/src/lib/post.store.ts` kết nối với API `/api/v1/posts` (actions: `fetchPosts`, `filterByStatus`, `filterByPage`, `changePage`, `retryPost`, `cancelPost`, `handlePostStatusChanged`). Xác minh bằng kiểm thử tự động trong `frontend/src/lib/__tests__/post.store.test.ts`.

## 2. Components & UI Views

- [x] 2.1 Xây dựng Component `PostStatusBadge` tại `frontend/src/components/posts/post-status-badge.tsx` hiển thị huy hiệu màu sắc tương ứng cho các trạng thái `pending`, `scheduled`, `published`, `failed`, `cancelled`. Xác minh render chính xác badge theo từng trạng thái.
- [x] 2.2 Triển khai Giao diện Tab List View `frontend/src/components/posts/posts-list-view.tsx` dạng bảng hiển thị thông tin bài viết, thumbnail media, Fanpage mục tiêu, thời gian dự kiến đăng, và nút Thao tác (Retry cho bài lỗi, Hủy bài). Xác minh bằng kiểm thử component.
- [x] 2.3 Triển khai Giao diện Tab Calendar View `frontend/src/components/posts/posts-calendar-view.tsx` hiển thị lịch biểu trực quan theo tháng, đánh dấu thẻ bài viết theo ngày giờ và highlight khung giờ vàng đăng bài. Xác minh thao tác điều hướng tháng và hiển thị bài viết trên lưới lịch.

## 3. Page Assembly & Realtime Integration

- [x] 3.1 Xây dựng trang chính `frontend/src/app/(dashboard)/posts/page.tsx` tích hợp thanh công cụ chuyển đổi Tab List/Calendar, bộ chọn Fanpage, bộ lọc trạng thái và lắng nghe sự kiện WebSocket `POST_STATUS_CHANGED`. Xác minh chuyển đổi qua lại giữa 2 khung nhìn mượt mà.

## 4. End-to-End Verification & Quality Gates

- [x] 4.1 Viết và chạy toàn bộ unit/integration tests cho phân hệ quản lý bài viết trong `frontend/src/app/(dashboard)/posts/__tests__/posts.test.tsx` và `frontend/src/lib/__tests__/post.store.test.ts`, đạt 100% test pass.
- [x] 4.2 Chạy kiểm tra tĩnh kiểu dữ liệu `npx tsc --noEmit` và build thử nghiệm `npm run build` trên gói `frontend`, đảm bảo 0 lỗi lint/type.
