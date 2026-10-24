# ShopFlow - Cẩm Nang Chỉ Dẫn AI Agent (Agent Instructions)

Tài liệu hướng dẫn tổng thể dành cho các AI Agent (Antigravity, Cursor, Claude Code, Copilot) khi tham gia phát triển dự án **ShopFlow**.

---

## 1. Tổng Quan Dự Án & Bộ Công Nghệ Cốt Lõi

**ShopFlow** là nền tảng tự động hóa quản lý Fanpage Facebook dành cho các chủ shop nhỏ và cá nhân kinh doanh B2C tại Việt Nam. Hệ thống tự động tạo nội dung bằng AI, lên lịch đăng bài theo giờ vàng, phản hồi bình luận/tin nhắn tự động, và trích xuất thông tin đặt hàng từ comment để tạo đơn hàng.

### Bộ Công Nghệ Chuẩn Hóa:
- **Frontend / Dashboard:** **Next.js 14+** (App Router, React, Tailwind CSS, TypeScript)
  - Quản trị Fanpage, danh mục sản phẩm, theo dõi lịch đăng bài, giao diện quản lý đơn hàng.
- **Backend / Webhook Ingestion API:** **Express.js** (Node.js 20+ LTS, TypeScript Strict Mode)
  - Xử lý Webhook Facebook thời gian thực, middleware xác thực HMAC-SHA256, API RESTful.
- **Cơ Sở Dữ Liệu:** **MySQL 8.x** (InnoDB Storage Engine)
  - Quản lý giao dịch ACID, quan hệ chặt chẽ giữa `orders`, `products`, `fanpages`, cột kiểu `JSON` cho biến thể và media.
- **ORM / Database Migrations:** **Prisma ORM** (cấu hình `provider = "mysql"`).
- **Hàng Đợi Tác Vụ & Caching:** **Redis 7 + BullMQ**
  - Điều tiết tốc độ gửi tin nhắn chống spam Meta, lưu trữ Idempotency key tránh xử lý trùng.
- **Mô Hình AI:** **Google Gemini API** (Gemini 2.5 Pro / Flash)
  - Trích xuất thực thể đơn hàng (NLP fallback) và sáng tạo nội dung bài viết bán hàng.
- **Tích Hợp Bên Thứ Ba:** **Meta Graph API v19+** (Pages API, Webhooks, Messenger Platform).

---

## 2. Quy Chuẩn Kỹ Thuật Bắt Buộc (Rules of Engagement)

1. **Bảo Mật Webhook (HMAC-SHA256):**
   - Mọi request đến endpoint Webhook (`POST /api/v1/webhook`) phải được xác thực chữ ký `x-hub-signature-256` bằng `crypto.timingSafeEqual`.
   - Giữ nguyên raw body buffer để tính mã hash HMAC.
2. **Tuân Thủ TypeScript Strict:**
   - Tuyệt đối cấm sử dụng kiểu `any`. Dùng `unknown` kèm Zod parser hoặc Type Guards.
3. **Chống Tấn Công SQL Injection:**
   - Mọi truy vấn MySQL phải thực hiện qua Prisma ORM hoặc Prepared Statements tham số hóa.
4. **Chính Sách Chống Spam của Meta:**
   - Không được spam gửi tin nhắn/bình luận dồn dập. Mọi thao tác trả lời tự động phải đi qua hàng đợi BullMQ với độ trễ an toàn (>= 5 giây giữa các hành động).
   - Quyền `publish_to_groups` đã bị Meta hủy từ 4/2024, không lập trình tính năng tự động đăng vào Group.
5. **Đồng Bộ Hợp Đồng Dữ Liệu (API Contract & DTO Sync):**
   - Đảm bảo tính nhất quán 100% giữa API response/request (Backend) và UI state/store (Frontend).
   - Bắt buộc tuân thủ chuẩn `ApiResponse<T>`, quy ước `camelCase`, và bóc tách dữ liệu phòng vệ (Defensive Data Parsing) theo [.agents/rules/api-contract-sync.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/rules/api-contract-sync.md).
6. **Đồng Bộ Mã Nguồn Lên GitHub & Chuyển Giao Sprint:**
   - Sau khi hoàn thành mỗi Task (vượt qua toàn bộ tests & review), bắt buộc commit và push mã nguồn lên GitHub (`git push origin <branch>/main`).
   - Sau khi hoàn thành 100% một Sprint, bắt buộc đóng Sprint đó, đề xuất mục tiêu và danh sách tasks Sprint tiếp theo vào [.agents/memory/history.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/memory/history.md), cập nhật lại [Task.md](file:///c:/Users/Dell/Desktop/ShopFlow/Task.md), và push bản cập nhật lên GitHub.

---

## 3. Bản Đồ Cấu Trúc Dự Án (Project Anatomy)

```
ShopFlow/
├── apps/
│   ├── web/                    # Next.js 14+ Frontend (App Router, Tailwind CSS)
│   └── api/                    # Express.js Backend (Webhooks, Domain Services)
├── prisma/
│   └── schema.prisma           # Prisma MySQL schema
├── docs/
│   └── deep-research-report.md # Báo cáo nghiên cứu nghiệp vụ chi tiết
├── openspec/                   # OpenSpec spec-driven changes & capabilities
└── .agents/
    ├── rules/                  # project-rules.md, security.md, testing-standards.md, api-contract-sync.md
    ├── workflows/              # opsx-*.md (OpenSpec), safe-deploy.md, deploy.md, test.md, code-review.md
    ├── skills/                 # db-migration/, openspec-*
    ├── agents/                 # security-auditor.md, devops.md
    ├── memory/                 # project_context.md, decisions.md, history.md
    └── hooks/                  # on_task_start.md, on_pre_command.md, on_task_finish.md
```

---

## 4. Lệnh Thao Tác Nhanh (Cheatsheet Commands)

```bash
# Thẩm định cơ sở dữ liệu MySQL
python .agents/skills/db-migration/scripts/validate.py

# Sinh và áp dụng migration Prisma MySQL
npx prisma migrate dev --name <migration_name>

# Chạy kiểm thử tự động
npm run test:unit
npm run test:int
npm run test:coverage

# Kiểm tra tĩnh & kiểu dữ liệu
npm run lint
npx tsc --noEmit
```
