---
event: on_task_start
description: Context initialization hook executed at the beginning of each agent task or session.
enabled: true
---

# Hook: Khởi Tạo Phiên Làm Việc (On Task Start)

Hook này được tự động kích hoạt mỗi khi AI Agent bắt đầu một tác vụ mới hoặc nhận chỉ thị từ người dùng.

## Các Hành Động Bắt Buộc

1. **Tải Ngữ Cảnh Dài Hạn (Memory Loading):**
   - Đọc lướt tệp ngữ cảnh dự án: `[.agents/memory/project_context.md](file:///C:/Users/Dell/Desktop/ShopFlow/.agents/memory/project_context.md)`.
   - Kiểm tra các quyết định kiến trúc đã thống nhất: `[.agents/memory/decisions.md](file:///C:/Users/Dell/Desktop/ShopFlow/.agents/memory/decisions.md)`.

2. **Kiểm Tra Trạng Thái Kho Mã Nguồn (VCS Sanity Check):**
   - Chạy lệnh `git status` để nắm các tệp đang thay đổi dở dang.
   - Đảm bảo nhánh làm việc chính xác (tránh làm việc trực tiếp trên branch bị khóa).

3. **Áp Dụng Quy Chuẩn Toàn Cục:**
   - Đảm bảo toàn bộ phản hồi và giải thích bằng tiếng Việt.
   - Tuyệt đối không hardcode API key, Secret Token.
   - Mọi liên kết tệp tin tạo ra phải có định dạng markdown nhấp chuột được `[tên_file](file:///đường_dẫn)`.
