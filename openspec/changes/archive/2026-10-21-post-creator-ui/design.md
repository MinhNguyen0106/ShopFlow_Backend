# Technical Design: Màn hình Soạn thảo Bài viết Mới & Preview Facebook (TASK-17)

## Context

Hệ thống ShopFlow đã có sẵn các nền tảng phía backend và frontend:
- Backend: Endpoint tải lên đa phương tiện `POST /api/v1/media/upload` (Multer memory buffer stream trực tiếp lên Cloudinary) và endpoint tạo bài viết `POST /api/v1/posts` (nhận `pageId`, `contentText`, `mediaType`, `mediaUrls`, `scheduledTime`).
- Frontend: Đã có sẵn layout macOS Clean Utility, API Client với interceptor Bearer token, Zustand stores (`page.store.ts` cung cấp danh sách Fanpage đã kết nối, `post.store.ts` quản lý trạng thái bài viết).
Xem [proposal.md](proposal.md) để biết động lực và [specs/posts-management/spec.md](specs/posts-management/spec.md) để biết chi tiết các yêu cầu hành vi.

## Goals / Non-Goals

**Goals:**
- Xây dựng giao diện trang `/(dashboard)/posts/new` bố cục 2 cột hiện đại theo phong cách macOS Clean Utility: Cột bên trái gồm form soạn thảo, bộ chọn Fanpage, khu vực kéo thả upload media, và bộ chọn ngày giờ đặt lịch; Cột bên phải hiển thị Live Preview giả lập Facebook News Feed tức thời.
- Component `MediaUploader`: Kéo thả tải lên nhiều ảnh (hỗ trợ album) hoặc video ngắn, hiển thị thumbnail, thanh tiến trình upload, nút xóa và sắp xếp ảnh.
- Component `SchedulePicker`: Lựa chọn "Đăng ngay" (tự động tính thời gian phù hợp) hoặc "Hẹn giờ", tích hợp các nút phím tắt gợi ý Khung giờ vàng (11:30 trưa & 20:00 tối).
- Component `PostPreviewModal`: Modal phóng to xem trước chi tiết bài viết trên cả 2 giao diện Facebook Desktop và Facebook Mobile, hỗ trợ thuật toán bố trí lưới ảnh chuẩn Facebook (1 ảnh, 2 ảnh, 3 ảnh, 4+ ảnh với huy hiệu `+N`).
- Gửi yêu cầu đặt lịch xuất bản thành công, xử lý lỗi chi tiết và điều hướng mượt mà về `/posts`.

**Non-Goals:**
- Chỉnh sửa ảnh nâng cao trực tiếp trên trình duyệt (cắt xén, thêm filter, vẽ hình).
- Xuất bản lên các mạng xã hội ngoài Facebook (như TikTok, Shopee Video - sẽ làm ở các sprint sau).

## Decisions

### Quyết định 1: Bố cục Chia đôi Màn hình (Split-Pane Editor & Live Preview)
- **Lý do**: Cho phép chủ shop vừa soạn thảo nội dung, vừa thấy ngay lập tức diện mạo bài đăng trên Facebook mà không cần phải bấm xem trước nhiều lần. Nút "Mở rộng Xem trước" sẽ mở modal toàn màn hình để kiểm tra chi tiết cả 2 phiên bản Desktop & Mobile.
- **Phương án thay thế đã xem xét**: Chỉ hiển thị form nhập liệu và mở modal khi bấm nút "Xem trước" (gây gián đoạn trải nghiệm, người dùng phải bật/tắt modal liên tục khi chỉnh sửa).

### Quyết định 2: Quản lý tải lên Đa phương tiện qua Axios FormData
- **Lý do**: Sử dụng thẳng `apiClient` gọi `POST /api/v1/media/upload` với `multipart/form-data`, hiển thị trạng thái `uploading` cho từng file và thu thập mảng URL HTTPS từ Cloudinary để đính kèm vào payload `POST /api/v1/posts`.
- **Phương án thay thế đã xem xét**: Đẩy file base64 trực tiếp lên backend (làm phình to dung lượng payload JSON và gây tràn bộ nhớ đệm).

### Quyết định 3: Mô phỏng Bố cục Lưới Ảnh Facebook (Facebook Photo Grid Layout)
- **Lý do**: Facebook hiển thị ảnh theo các bố cục rất đặc thù:
  - 1 ảnh: Khung chữ nhật / vuông toàn phần.
  - 2 ảnh: Chia đôi dọc hoặc ngang.
  - 3 ảnh: 1 ảnh lớn bên trái/trên và 2 ảnh nhỏ bên phải/dưới.
  - 4+ ảnh: Lưới 4 ô với ô cuối cùng có lớp phủ đen `+X` ảnh còn lại.
  Thuật toán CSS Grid gọn nhẹ trong `post-preview-modal.tsx` sẽ mang lại cảm giác chân thật 100% như trên Facebook Feed.

### Quyết định 4: Validation Thời gian Đặt lịch Phía Máy khách
- **Lý do**: Meta Graph API và backend ShopFlow yêu cầu bài viết đặt lịch phải cách hiện tại ít nhất 10 phút. Form sẽ validate ngay lập tức khi người dùng chọn ngày giờ, chặn người dùng submit giờ sai và hiển thị gợi ý các khung giờ vàng gần nhất.

## Risks / Trade-offs

- **[Tải lên file dung lượng lớn gây chậm mạng]** → *Biện pháp giảm thiểu*: Giới hạn kích thước file ở client (ảnh tối đa 5MB, video tối đa 50MB), hiển thị spinner loading rõ ràng và cho phép hủy bỏ tải lên.
- **[Lệch múi giờ giữa giao diện và server]** → *Biện pháp giảm thiểu*: Sử dụng đối tượng `Date` cục bộ chuyển đổi sang chuỗi chuẩn ISO 8601 UTC trước khi gửi lên API backend.
