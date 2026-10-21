---
description: ShopFlow core architectural rules, coding standards, and directory conventions for Next.js, Express.js, and MySQL.
trigger: always_on
---

# ShopFlow Core Architectural Rules & Coding Standards

Tài liệu quy chuẩn kiến trúc và phong cách lập trình bắt buộc dành cho AI Agent khi sinh mã nguồn trong dự án **ShopFlow** (Bộ công nghệ: **Next.js + Express.js + MySQL**).

## 1. Kiến Trúc Hệ Thống (Next.js Frontend & Express.js Backend)

Hệ thống được thiết kế theo mô hình phân tách rõ ràng giữa giao diện điều khiển (Frontend Dashboard) và dịch vụ xử lý nền tảng / Webhook (Backend API):

```
ShopFlow/
├── apps/
│   ├── web/                    # Next.js 14+ (App Router, Tailwind CSS, Dashboard)
│   │   ├── app/                # Next.js routes (dashboard, posts, orders, analytics)
│   │   ├── components/         # Reusable React components (UI kits, charts, tables)
│   │   └── lib/                # Client API callers & session hooks
│   └── api/                    # Express.js Backend Service & Webhook Engine
│       ├── src/
│       │   ├── api/            # Express Routers, Controllers, Middlewares
│       │   │   ├── middlewares/# Webhook HMAC verification, auth, rate limiting
│       │   │   └── routes/     # Route definitions (/webhook, /posts, /orders)
│       │   ├── core/           # Domain Logic & Services (Clean Architecture)
│       │   │   ├── services/   # FacebookService, OrderParserService, GeminiService
│       │   │   └── entities/   # Domain Models & Value Objects
│       │   ├── infrastructure/ # External Services & DB Access
│       │   │   ├── database/   # Prisma Client (MySQL 8.x), Repositories
│       │   │   ├── queue/      # BullMQ & Redis Workers (Spam throttle)
│       │   │   └── meta/       # Graph API v19+ SDK & HTTP clients
│       │   └── config/         # Environment schema (Zod)
└── prisma/                     # Shared Prisma Schema (provider = "mysql")
    └── schema.prisma           # MySQL tables, relations, and indexes
```

### Nguyên Tắc Bắt Buộc:
- **Tách biệt Controller & Service:** Express Controller chỉ nhận request, validate DTO (Zod), chuyển sang Service xử lý và trả về HTTP response. Tuyệt đối không viết logic nghiệp vụ trong Router/Controller.
- **Frontend Next.js:** Ưu tiên Server Components cho các trang đọc dữ liệu tĩnh/SSR; sử dụng Client Components (`'use client'`) chỉ khi cần tương tác DOM, state cục bộ hoặc hook sự kiện.
- **Database Access:** Mọi thao tác ghi/đọc cơ sở dữ liệu MySQL phải đi qua Prisma ORM hoặc Repository pattern. Không viết raw SQL không an toàn để tránh SQL Injection.
- **Dependency Injection:** Khởi tạo service thông qua constructor/factory injection để thuận tiện viết unit test với mock data.

---

## 2. Tiêu Chuẩn Lập Trình TypeScript (Strict Typing)

- **Strict Mode:** Mọi tệp `.ts` và `.tsx` phải tuân thủ nghiêm ngặt cấu hình TypeScript (`"strict": true`, `"noImplicitAny": true`).
- **Nghiêm cấm `any`:** Không sử dụng kiểu `any`. Sử dụng `unknown` khi chưa rõ cấu trúc và kiểm tra kiểu bằng Zod schema hoặc type guards (`is` operator).
- **Quy ước đặt tên (Naming Conventions):**
  - **Tệp tin:** `kebab-case.ts` (ví dụ: `order-parser.service.ts`, `webhook-verifier.middleware.ts`), component React: `PascalCase.tsx` (ví dụ: `OrderTable.tsx`).
  - **Classes & Types & Interfaces:** `PascalCase` (ví dụ: `OrderParserService`, `WebhookPayload`).
  - **Biến, Thuộc tính & Hàm:** `camelCase` (ví dụ: `parseCustomerComment`, `fanpageAccessToken`).
  - **Hằng số toàn cục:** `UPPER_SNAKE_CASE` (ví dụ: `MAX_WEBHOOK_RETRY_ATTEMPTS`).

---

## 3. Xử Lý Ngoại Lệ & Ghi Log (Error Handling & Logging)

- **Domain-Specific Errors:** Định nghĩa các lớp lỗi kế thừa từ `AppError`:
  ```typescript
  export class AppError extends Error {
    constructor(
      public readonly message: string,
      public readonly statusCode: number = 500,
      public readonly code: string = 'INTERNAL_SERVER_ERROR',
      public readonly isOperational: boolean = true
    ) {
      super(message);
      Object.setPrototypeOf(this, new.target.prototype);
    }
  }
  ```
- **Không nuốt lỗi (No Silent Failures):** Nghiêm cấm `catch (e) {}` trống. Phải log lỗi có context (request ID, fanpage ID, timestamp) bằng structured logger (Winston/Pino) và re-throw hoặc xử lý fallback an toàn.
- **Bảo mật log:** Tuyệt đối không in thông tin nhạy cảm vào log: `access_token`, `client_secret`, số điện thoại, địa chỉ khách hàng.

---

## 4. Đồng Bộ Hợp Đồng API & DTO (API Contract & Data Synchronization)

- **Chi tiết bắt buộc:** Xem toàn bộ quy chuẩn tại [api-contract-sync.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/rules/api-contract-sync.md).
- **Chuẩn hóa Envelope:** Backend luôn trả về format `{ success: boolean, message?: string, data?: T }`.
- **Phòng vệ ở Frontend (Defensive Data Parsing):** Frontend store/hook tuyệt đối không bóc tách mù quáng `res.data.data` gán trực tiếp vào mảng (`Array.isArray` check) hay chuỗi token (dùng optional chaining `?.`).
- **Quy ước `camelCase`:** 100% tên trường trao đổi giữa FE và BE qua JSON phải dùng `camelCase`.
- **Rà soát chéo khi sửa API:** Mỗi khi sửa đổi endpoint Backend, bắt buộc grep tìm và đồng bộ các component/store tương ứng ở Frontend trước khi commit.

---

## 5. Quy Chuẩn Chuyển Giao Sprint (Sprint Completion & Transition Protocol)

Khi toàn bộ các tác vụ trong một Sprint đạt 100% hoàn thành (pass toàn bộ test suite, type-check, build production), AI Agent bắt buộc phải thực hiện quy trình chuyển giao 3 bước:
1. **Đóng Sprint (Sprint Closure):** Đánh dấu Sprint vừa hoàn thành là 100% DONE, lưu trữ các task đã hoàn tất vào bảng *Nhật Ký Cập Nhật Tiến Độ Sprint* trong `Task.md` và ghi nhận mốc trong `history.md`.
2. **Đề Xuất Sprint Tiếp Theo (Propose Next Sprint to History):** Mô tả rõ ràng mục tiêu, phạm vi công việc, danh sách các tác vụ kế thừa (kèm mã `[TASK-xx]`) vào phần *[Kế Hoạch Tiếp Theo]* trong [.agents/memory/history.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/memory/history.md).
3. **Cập Nhật Lại `Task.md` (Update Task.md for Execution):** Cập nhật tiêu đề **Sprint Hiện Tại** ở đầu tệp `Task.md`, chuyển danh mục công việc của Sprint mới vào mục **TRẠNG THÁI: CHỜ THỰC HIỆN (TODO)** với checklist chi tiết sẵn sàng để khởi tạo OpenSpec change (`/opsx-propose`).


