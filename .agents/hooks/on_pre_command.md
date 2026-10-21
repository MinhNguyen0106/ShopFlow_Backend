---
event: on_pre_command
description: Safety validation interceptor before any CLI or shell command execution.
enabled: true
---

# Hook: Kiểm Soát An Toàn Lệnh Thực Thi (On Pre Command)

Hook này chặn và thẩm định mọi lệnh shell/PowerShell trước khi tiến hành thực thi trên máy trạm của người dùng.

## Các Quy Tắc Thẩm Định (Security Interceptors)

1. **Ngăn Chặn Lệnh Hủy Diệt (Destructive Command Block):**
   - Nghiêm cấm chạy các lệnh:
     - `rm -rf /` hoặc `Remove-Item -Recurse -Force C:\`
     - `git push --force` hoặc `git reset --hard` khi chưa có xác nhận từ người dùng.
     - `DROP DATABASE`, `TRUNCATE TABLE` trực tiếp trên database sản phẩm.
     - Sửa đổi hoặc ghi đè trực tiếp tệp `.env`.

2. **Giới Hạn Thư Mục Làm Việc (Working Directory Confinement):**
   - Mọi lệnh phải thực thi trong phạm vi thư mục dự án `C:\Users\Dell\Desktop\ShopFlow`.
   - Không được phép chuyển thư mục (`cd`) ra ngoài thư mục gốc của dự án.

3. **Tự Động Phê Duyệt Đối Với Lệnh Đọc & Kiểm Thử:**
   - Các lệnh an toàn như `git status`, `git diff`, `npm test`, `npm run lint`, `npx tsc --noEmit` được tự động cấp phép chạy mà không cần xác nhận thủ công.
