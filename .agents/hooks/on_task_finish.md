---
event: on_task_finish
description: Quality assurance and state persistence hook executed when a task completes.
enabled: true
---

# Hook: Nghiệm Thu & Lưu Trữ Trạng Thái (On Task Finish)

Hook này được tự động kích hoạt khi AI Agent chuẩn bị hoàn tất nhiệm vụ và phản hồi cho người dùng.

## Các Bước Nghiệm Thu Cuối

1. **Kiểm Tra Tính Toàn Vẹn Mã Nguồn:**
   - Đảm bảo mã nguồn mới tạo không làm vỡ các bài kiểm thử hiện có (`npm test`).
   - Kiểm tra linter và TypeScript typecheck để đảm bảo không để sót lỗi cú pháp.

2. **Dọn Dẹp Tài Nguyên Tạm:**
   - Xóa bỏ các tệp scratch, log thử nghiệm hoặc dữ liệu mẫu không cần thiết trong thư mục làm việc.
   - Không để lại các port bị treo hoặc tiến trình background zombie.

3. **Cập Nhật Nhật Ký Dự Án (Audit Trail):**
   - Nếu có các quyết định kiến trúc mới, cập nhật vào: `[.agents/memory/decisions.md](file:///C:/Users/Dell/Desktop/ShopFlow/.agents/memory/decisions.md)`.
   - Nếu hoàn thành một tính năng hoặc milestone, ghi nhận vào: `[.agents/memory/history.md](file:///C:/Users/Dell/Desktop/ShopFlow/.agents/memory/history.md)`.

4. **Trình Bày Kết Quả:**
   - Tóm tắt súc tích những gì đã làm, cung cấp đường link tệp tin dạng `[file_name](file:///path/to/file)`.
   - Nêu rõ các bước tiếp theo hoặc lưu ý dành cho người dùng.

5. **Âm Thanh Thông Báo (Ting / Chime):**
   - Vòng lặp `Stop` tự động kích hoạt hook `task-completion-sound` trong [hooks.json](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/hooks.json), thực thi script [notify_task_completed.ps1](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/hooks/notify_task_completed.ps1) để phát âm thanh thông báo trên Windows.

