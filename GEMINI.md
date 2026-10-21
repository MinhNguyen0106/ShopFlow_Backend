# Quy Tắc Hoạt Động Của AI Agent (Antigravity & Gemini) - Dự Án ShopFlow

Tệp tin này được tự động phát hiện và áp dụng cho toàn bộ phạm vi dự án `ShopFlow` (Next.js + Express.js + MySQL).

## 1. Tham Chiếu Cẩm Nang Chỉ Dẫn Chính
AI Agent bắt buộc đọc và tuân theo toàn bộ hướng dẫn tại [AGENTS.md](file:///C:/Users/Dell/Desktop/ShopFlow/AGENTS.md).
Toàn bộ tài liệu phân tích nghiệp vụ gốc nằm tại [deep-research-report.md](file:///C:/Users/Dell/Desktop/ShopFlow/docs/deep-research-report.md).

## 2. Công Nghệ Nền Tảng (Core Stack)
- **Frontend:** Next.js 14+ (App Router, React, Tailwind CSS).
- **Backend API & Webhooks:** Express.js (TypeScript, Clean Architecture).
- **Cơ Sở Dữ Liệu:** MySQL 8.x (InnoDB, JSON type, Prisma ORM).
- **Hàng Đợi:** Redis + BullMQ.
- **AI Engine:** Google Gemini API.
- **Tích Hợp:** Meta Graph API v19+.

## 3. Các Quy Tắc Bắt Buộc (Strict Directives)
- **Ngôn ngữ phản hồi:** Luôn trả lời và giải thích bằng tiếng Việt (giữ nguyên các thuật ngữ kỹ thuật tiếng Anh).
- **Định dạng liên kết:** Luôn đính kèm đường dẫn tệp tin dưới dạng markdown link có thể nhấp chuột (`[file_name](file:///path/to/file)`).
- **Bảo mật tuyệt đối:** Không bao giờ hardcode token, app secret, hoặc password vào mã nguồn. Luôn đọc từ biến môi trường (`.env`).
- **An toàn hệ thống:** Hỏi ý kiến người dùng trước khi thực thi các lệnh có tính hủy diệt (`rm -rf`, `DROP TABLE`, `git push --force`).
