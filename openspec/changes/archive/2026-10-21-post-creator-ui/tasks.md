# Tasks: Màn hình Soạn thảo Bài viết Mới & Preview Facebook (TASK-17)

## 1. Sub-Components Phục Vụ Soạn Thảo

- [x] 1.1 Xây dựng Component `MediaUploader` tại `frontend/src/components/posts/media-uploader.tsx` hỗ trợ chọn và kéo thả nhiều tệp ảnh/video, kết nối gọi `POST /api/v1/media/upload`, hiển thị thumbnail và nút gỡ bỏ tệp. Xác minh render và upload media thành công.
- [x] 1.2 Xây dựng Component `SchedulePicker` tại `frontend/src/components/posts/schedule-picker.tsx` hỗ trợ chuyển đổi giữa "Đăng ngay" và "Lên lịch", tích hợp bộ chọn ngày giờ (validate cách hiện tại ≥ 10 phút) và phím tắt 1-click chọn khung giờ vàng (11:30 & 20:00). Xác minh tính năng tính toán và cảnh báo giờ hợp lệ.
- [x] 1.3 Xây dựng Component `PostPreviewModal` tại `frontend/src/components/posts/post-preview-modal.tsx` mô phỏng chân thực bảng tin Facebook Feed trên cả 2 chế độ Desktop và Mobile, hỗ trợ thuật toán lưới ảnh linh hoạt (1, 2, 3, 4+ ảnh có lớp phủ `+X`). Xác minh hiển thị đầy đủ avatar, nội dung và lưới media.

## 2. Editor & Page Assembly

- [x] 2.1 Xây dựng Component `PostEditor` tại `frontend/src/components/posts/post-editor.tsx` tích hợp textarea nhập liệu, bộ đếm ký tự trực quan và danh sách nút gợi ý hashtag bán hàng phổ biến (`#sale`, `#freeship`, `#shopflow`). Xác minh cập nhật nội dung và chèn hashtag tự động.
- [x] 2.2 Lắp ráp trang chính `frontend/src/app/(dashboard)/posts/new/page.tsx` theo bố cục Split-Pane phong cách macOS Clean Utility (cột trái: form soạn thảo & upload media & đặt lịch; cột phải: Live Preview tức thời kèm nút mở rộng Modal), kết nối API `POST /api/v1/posts` và điều hướng về `/posts`. Xác minh luồng tạo và đặt lịch xuất bản bài viết thành công.

## 3. End-to-End Verification & Quality Gates

- [x] 3.1 Viết và chạy toàn bộ unit/integration tests cho phân hệ soạn thảo bài viết trong `frontend/src/app/(dashboard)/posts/new/__tests__/post-creator.test.tsx`, kiểm thử đầy đủ editor, media uploader, schedule picker và preview modal, đạt 100% test pass.
- [x] 3.2 Chạy kiểm tra tĩnh kiểu dữ liệu `npx tsc --noEmit` và build thử nghiệm `npm run build` trên gói `frontend`, đảm bảo 0 lỗi lint/type.
