# Proposal: post-creator-ui

## Why

Sau khi hoàn thành màn hình xem và quản lý danh sách bài viết (`/posts` - TASK-16), chủ shop cần một giao diện trực quan và chuyên nghiệp tại `/(dashboard)/posts/new` để soạn thảo nội dung bài viết mới, tải lên hình ảnh/video đa phương tiện (hỗ trợ bài đơn và album nhiều ảnh), chọn ngày giờ hẹn đăng tối ưu (gợi ý các khung giờ vàng) và đặc biệt là xem trước giao diện thực tế bài viết giả lập trên Facebook (Desktop & Mobile) trước khi bấm đăng hoặc lên lịch.

## What Changes

- **Trình soạn thảo bài viết mới (`/posts/new`)**:
  - Giao diện form soạn thảo nội dung có bộ đếm ký tự, gợi ý hashtag bán hàng phổ biến.
  - Bộ chọn kênh Fanpage xuất bản (hỗ trợ chọn trang từ danh sách trang đã kết nối).
- **Tích hợp Tải lên Đa phương tiện (Media Upload)**:
  - Kết nối endpoint `POST /api/v1/media/upload` (Multer + Cloudinary).
  - Tải lên nhiều ảnh (Album) hoặc video ngắn, hiển thị thumbnail trực quan, cho phép xóa hoặc kéo thả sắp xếp thứ tự ảnh.
- **Bộ chọn Thời gian Đặt lịch & Khung Giờ Vàng**:
  - Hỗ trợ 2 chế độ: "Đăng ngay" hoặc "Lên lịch xuất bản".
  - Khi lên lịch: chọn ngày giờ với validation cách hiện tại tối thiểu 10 phút.
  - Gợi ý phím bấm 1-click chọn các khung giờ vàng tương tác cao (Trưa 11h30, Tối 20h00).
- **Modal Xem trước Giao diện Facebook Thật (`PostPreviewModal`)**:
  - Giả lập chuẩn xác khung bài viết News Feed của Facebook trên cả 2 phiên bản Desktop và Mobile (Avatar Fanpage, Tên Fanpage, Dấu tick xanh nếu có, Thời gian giả lập, Nội dung text với hashtag, Bố cục hiển thị lưới ảnh 1/2/3/4+ ảnh, Nút Like/Comment/Share).
- **Kết nối API Đặt lịch Xuất bản**:
  - Gửi request `POST /api/v1/posts` với payload chuẩn (`page_id`, `content_text`, `media_type`, `media_urls`, `scheduled_time`).
  - Xử lý thông báo thành công và chuyển hướng về `/posts`.

## Capabilities

### Modified Capabilities
- `posts-management`: Bổ sung các yêu cầu về Soạn thảo bài viết mới, Quản lý tải lên đa phương tiện, Đặt lịch xuất bản kèm gợi ý giờ vàng, và Xem trước giao diện thực tế trên Facebook.

## Impact

- **Frontend**: Tạo trang mới `frontend/src/app/(dashboard)/posts/new/page.tsx`, các components `post-editor.tsx`, `media-uploader.tsx`, `schedule-picker.tsx`, `post-preview-modal.tsx`.
- **API Backend**: Sử dụng trực tiếp các endpoint backend sẵn có: `POST /api/v1/media/upload`, `POST /api/v1/posts`, `GET /api/v1/pages`.
- **Dependencies**: Tận dụng `lucide-react`, `zustand`, `apiClient`, không cần cài đặt thêm thư viện ngoài nặng nề.
