# TÀI LIỆU KIẾN TRÚC HỆ THỐNG & LUỒNG TƯƠNG TÁC (ARCHITECTURE & SYSTEM FLOWS)
## DỰ ÁN QUẢN LÝ FANPAGE FACEBOOK & TỰ ĐỘNG HÓA BÁN HÀNG

**Vai trò:** Software Architect & System Engineer  
**Hệ thống:** ShopFlow - Nền tảng Quản lý Fanpage, Đặt lịch Bài viết & Tự động hóa Hộp thư  
**Cơ sở công nghệ:** Node.js (TypeScript) / Express / Next.js 14+ / PostgreSQL / Redis / Meta Graph API v19.0+ / WebSockets  

---

### I. LUỒNG NGƯỜI DÙNG & TƯƠNG TÁC HỆ THỐNG (User Flow & Business Logic)

#### 1. Luồng 1: Xác thực Người dùng & Kết nối Fanpage qua Meta OAuth 2.0
*Mục đích:* Xác thực tài khoản người dùng ứng dụng và liên kết các Fanpage do người dùng quản lý, đổi lấy Mã truy cập dài hạn (Long-Lived Page Access Token).

```
+----------+          +----------+          +--------------+          +---------------+
| Frontend |          | Backend  |          | Meta Graph   |          | PostgreSQL DB |
+----+-----+          +----+-----+          +------+-------+          +-------+-------+
     |                     |                       |                          |
     |--- 1. Bấm Kết nối ->|                       |                          |
     |    Facebook         |                       |                          |
     |                     |--- 2. Tạo OAuth URL ->|                          |
     |<-- 3. Redirect Meta |    (Scopes: pages_*)  |                          |
     |    Login Dialog ----|                       |                          |
     |                                             |                          |
     |============== 4. Người dùng cấp quyền trên Meta =======================|
     |                                             |                          |
     |--- 5. Meta Redirect kèm Authorization Code -|                          |
     |    về Redirect URI (Backend) -------------->|                          |
     |                     |                       |                          |
     |                     |--- 6. Đổi Code lấy Short-Lived User Token ------>|
     |                     |<-- 7. Trả về Short-Lived Token (Hạn 1-2h) -------|
     |                     |                       |                          |
     |                     |--- 8. Đổi lấy Long-Lived User Token (Hạn 60 ngày)->
     |                     |<-- 9. Trả về Long-Lived User Token --------------|
     |                     |                       |                          |
     |                     |--- 10. GET /me/accounts (Lấy ds Pages + Token) ->|
     |                     |<-- 11. Trả về List Pages & Page Access Tokens ---|
     |                     |                       |                          |
     |                     |--- 12. Mã hóa Tokens (AES-256) & Lưu DB -------->|
     |                     |                       |                          |
     |                     |--- 13. POST /{page_id}/subscribed_apps --------->|
     |                     |    (Đăng ký Webhook Feed & Messages)             |
     |                     |<-- 14. Confirm Subscribed OK --------------------|
     |                     |                                                  |
     |<-- 15. Trả về danh -|                                                  |
     |    sách Pages đã    |                                                  |
     |    kết nối thành công                                                  |
```

* **Các bước tuần tự:**
  1. **Thao tác người dùng:** Người dùng truy cập trang "Cấu hình Kênh", bấm nút **"Kết nối Fanpage Facebook"**.
  2. **Khởi tạo OAuth:** Backend tạo URL đăng nhập Facebook OAuth 2.0 kèm `state` token (CSRF protection) và danh sách quyền bắt buộc: `pages_manage_posts`, `pages_messaging`, `pages_read_engagement`, `pages_show_list`.
  3. **Ủy quyền:** Người dùng đăng nhập Facebook, chọn các Page muốn kết nối và đồng ý cấp quyền. Meta chuyển hướng người dùng về `Redirect URI` của ứng dụng kèm mã `authorization_code`.
  4. **Xử lý Token tại Backend (Token Exchange Flow):**
     * **Bước 4a (Validation):** Backend kiểm tra tham số `state` chống tấn công CSRF.
     * **Bước 4b (Short Token):** Gọi endpoint Meta `GET /oauth/access_token` để đổi `code` lấy Short-Lived User Access Token (hiệu lực 1-2 giờ).
     * **Bước 4c (Long Token):** Gọi endpoint `GET /oauth/access_token?grant_type=fb_exchange_token` đổi lấy Long-Lived User Access Token (hiệu lực ~60 ngày).
     * **Bước 4d (Page Tokens):** Gọi `GET /me/accounts` với Long-Lived User Token để lấy danh sách Page IDs và **Long-Lived Page Access Tokens** (Page Tokens thu được từ Long Token sẽ **không bao giờ hết hạn** ngoại trừ khi người dùng đổi mật khẩu hoặc hủy quyền).
  5. **Lưu trữ & Đăng ký Webhooks:**
     * Mã hóa thông tin `page_access_token` bằng thuật toán **AES-256-GCM** trước khi lưu vào bảng `connected_pages` trong PostgreSQL.
     * Tự động gọi API Meta `POST /{page_id}/subscribed_apps` với tham số `subscribed_fields=['feed', 'messages', 'messaging_postbacks']` để kích hoạt nhận sự kiện thời gian thực.
  6. **Kết quả trả về:** Frontend nhận JSON danh sách các Page đã kết nối thành công cùng trạng thái Webhook `subscribed: true`.

---

#### 2. Luồng 2: Đặt lịch Bài viết & Cấu hình Kịch bản Tự động (Automation Rules)
*Mục đích:* Quản lý đăng bài hẹn giờ chuẩn Graph API Meta và thiết lập quy tắc tự động trả lời/ẩn comment.

* **Phân luồng A: Lên lịch đăng bài (Scheduled Post Flow)**
  1. **Thao tác người dùng:** Soạn văn bản bài viết, tải tập tin phương tiện (ảnh/video), chọn danh sách Fanpage áp dụng và chọn thời điểm đăng bài `scheduled_time` (Unix timestamp).
  2. **Kiểm tra & Validate (Backend Business Logic):**
     * Kiểm tra nội dung không được để trống.
     * Ràng buộc thời gian Meta: `scheduled_time` phải lớn hơn mốc hiện tại ít nhất **10 phút** và không quá **30 ngày** đối với bài viết hình ảnh (`/feed`), hoặc tối đa **6 tháng** đối với Video (`/videos`).
     * Kiểm tra định dạng media: Ảnh JPG/PNG < 4MB; Video MP4/MOV < 1GB.
  3. **Lưu DB & Khởi tạo Job:**
     * Lưu bài viết vào bảng `posts_schedule` với trạng thái `status = 'pending'`.
     * Nếu chọn tính năng **Scheduled Native Meta API**: Backend gọi trực tiếp API Meta:
       `POST /{page_id}/feed` kèm `published=false` và `scheduled_publish_time={timestamp}`. Meta lưu lịch đăng bài trực tiếp trên Server của Meta và trả về `meta_post_id`.
     * Nếu bài viết chứa nhiều ảnh phức tạp (Carousel/Album) không tương thích API scheduled native: Backend đẩy một Delay Job vào **Redis Queue (BullMQ)** với thời hạn đếm ngược đến `scheduled_time`.
  4. **Kết quả trả về:** Trạng thái bài viết cập nhật `status = 'scheduled'` hiển thị trên danh sách Lịch nội dung của Frontend.

* **Phân luồng B: Cấu hình Kịch bản Tự động (Automation Rules Setup)**
  1. **Thao tác người dùng:** Nhập từ khóa kích hoạt (VD: `"giá"`, `"bao nhiêu"`, `"inbox"`), nhập mẫu phản hồi comment công khai, nhập mẫu phản hồi tin nhắn riêng (Private Reply), và bật công tắc **"Tự động ẩn bình luận chứa Số điện thoại"**.
  2. **Validate & Lưu trữ:** Backend kiểm tra trùng lặp từ khóa, mã hóa các ký tự đặc biệt, sau đó chèn/cập nhật vào bảng `automation_rules` liên kết với `page_id`.

---

#### 3. Luồng 3: Webhook Realtime, Auto-Hide SĐT, Private Reply & Centralized Inbox Display
*Mục đích:* Tiếp nhận thông báo tức thì từ Meta, tự động xử lý ẩn SĐT chống cướp đơn trong < 3s, gửi Private Reply và cập nhật giao diện chat tập trung qua WebSocket.

```
[Khách Comment trên Facebook]
             │
             ▼
[Meta Webhook Event: feed]
             │
             ▼
[Backend: /api/v1/webhooks/facebook]
     │ (Kiểm tra X-Hub-Signature HMAC SHA256 -> Trả về 200 OK ngay lập tức trong <200ms)
     │
     ▼
[Đẩy Payload vào Redis Queue (stream:webhook_events)]
             │
             ▼
[Async Worker Service Bóc Tách Payload]
             │
             ├───> [BƯỚC 1: Kiểm tra Regex Số Điện Thoại]
             │      Regex: /(03|05|07|08|09|01[2689])+([0-9]{8})\b/
             │      │
             │      ├──> MATCH SĐT: Gọi Meta Graph API Lập tức:
             │      │    POST /{comment_id} -> { is_hidden: true }
             │      │    Lưu DB: messages_and_comments (is_hidden = true)
             │      │
             │      └──> NO MATCH: Bỏ qua bước ẩn.
             │
             ├───> [BƯỚC 2: Khớp Kịch bản Tự động (Automation Rule)]
             │      Kiểm tra từ khóa comment với rule của page
             │      │
             │      ├──> MATCH KEYWORD:
             │      │    1. Auto Comment: POST /{comment_id}/comments -> { message: "Mẫu reply" }
             │      │    2. Private Reply: POST /{comment_id}/private_replies -> { message: "Mẫu DM" }
             │      │       (Ràng buộc Meta: Chỉ gửi DM 1 lần/comment & trong vòng 7 ngày)
             │      │
             │      └──> NO MATCH: Chờ nhân viên phản hồi thủ công.
             │
             └───> [BƯỚC 3: Đồng bộ Hộp thư Tập trung (Centralized Inbox)]
                    1. Cập nhật/Tạo mới Record Customer & Conversation trong PostgreSQL.
                    2. Lưu chi tiết Comment/Message vào bảng messages_and_comments.
                    3. Phát sự kiện WebSocket (Socket.io) `NEW_INBOX_ITEM` tới Frontend.
                    4. Frontend re-render danh sách Inbox tức thì (< 1.5 giây).
```

---

### II. MÔ HÌNH KIẾN TRÚC TỔNG THỂ (System Architecture & Communication Model)

#### 1. Mô hình Sơ đồ Kiến trúc Tổng thể (System Communication Model)

```
[FRONTEND CLIENT]
  (React / Next.js SPA/PWA)
       │
       ├─── HTTP REST API / JSON ────────────────────────┐
       └─── WebSocket (Socket.io Realtime Inbox) ─────┐  │
                                                     │  │
                                                     ▼  ▼
                                        [API GATEWAY & LOAD BALANCER]
                                              (Nginx / Traefik)
                                                     │
                                                     ▼
                                        [BACKEND API CORE SERVICE]
                                        (Node.js / Express / TS)
                                         │           │           │
                     ┌───────────────────┘           │           └───────────────────┐
                     ▼                               ▼                               ▼
            [POSTGRESQL DB]                 [REDIS CACHE & QUEUE]            [META GRAPH API]
         (Primary Data Storage)            (BullMQ & Session Store)       (v19.0+ Feed & Messaging)
                                                     │
                                                     ▼
                                           [BACKGROUND WORKERS]
                                           (Node.js Worker Threads)
                                                     │
                                                     ├──> Auto-Hide Phone Execution (<3s)
                                                     ├──> Auto Comment & Private Reply
                                                     └──> Scheduled Posts Publisher
```

* **Mô tả tương tác giữa các tầng:**
  * **Client (Frontend):** Gọi REST API để thực hiện thao tác CRUD (tạo bài viết, thiết lập kịch bản, xem danh sách page). Duy trì kết nối **WebSocket** tới Backend để nhận thông báo có bình luận/tin nhắn mới thời gian thực mà không cần reload trang.
  * **Backend Core API:** Tiếp nhận Request từ Client, thực hiện Authentication (JWT), Validation và xử lý Logic nghiệp vụ chính. Tiếp nhận Webhook HTTP POST từ Meta (`/api/v1/webhooks/facebook`), phản hồi ngay `200 OK` trong vòng < 200ms để tránh Meta hủy Webhook.
  * **Redis & BullMQ Queue:** Đóng vai trò vùng đệm chịu tải (Buffer Queue). Mọi sự kiện Webhook từ Meta hoặc tác vụ hẹn giờ đăng bài đều được đẩy vào Redis Queue.
  * **Background Workers:** Các Process độc lập chạy ngầm ngắt kết nối với luồng chính API. Quét tin nhắn, chạy Regex SĐT, gọi API Meta để ẩn comment, gửi tin nhắn tự động và xử lý tác vụ Exponential Backoff khi dính Rate Limit (Error 613/80001).
  * **PostgreSQL Database:** Cơ sở dữ liệu trung tâm lưu trữ toàn bộ thông tin tài khoản, token đã mã hóa, bài viết, thông tin khách hàng và lịch sử hội thoại.

---

### III. CHỐT CÔNG NGHỆ PHỤ TRỢ (Definitive Tech Stack)

#### 1. Kiến trúc Kho mã nguồn (Monorepo Architecture)
Dự án được tổ chức theo mô hình **Monorepo** với 2 thư mục gốc độc lập:
* **`backend/`**: Xử lý toàn bộ logic nghiệp vụ, REST API, Webhook Ingestion, Background Workers (BullMQ) và Realtime Gateway (Socket.io).
  * Runtime: **Node.js 20+ LTS**
  * Framework: **Express.js (v4.x/v5.x)**
  * Ngôn ngữ: **TypeScript Strict Mode** (`"strict": true`, tuyệt đối cấm kiểu `any`).
* **`frontend/`**: Giao diện điều khiển trung tâm (Dashboard), quản lý Fanpage, cấu hình kịch bản tự động, đặt lịch bài viết và màn hình Live Chat tập trung.
  * Framework: **Next.js 14+ (App Router)**
  * Thư viện giao diện: **React 18+**, **Tailwind CSS**, **Lucide React**, **Radix UI / Shadcn UI**.
  * Ngôn ngữ: **TypeScript Strict Mode**.

#### 2. Database Client: Chốt dứt khoát `pg` (node-postgres) + Repository Pattern
* **Quyết định:** Sử dụng thư viện **`pg` (node-postgres v8.x)** kết hợp `pg.Pool` Singleton và **Repository Pattern** có định kiểu (Typed Queries).
* **Lý do kỹ thuật loại bỏ Prisma và chọn `pg`:**
  1. *Khớp 100% với tệp SQL DDL có sẵn:* Toàn bộ 9 bảng dữ liệu tại file `03_DATABASE_SCHEMA.md` đã được tối ưu hóa riêng cho PostgreSQL với extension `uuid-ossp`, các ràng buộc `CHECK (role IN (...))`, kiểu `JSONB` native, và trigger cập nhật thời gian tự động `update_updated_at_column()`.
  2. *Hỗ trợ trọn vẹn Partial Indexes:* Tệp DDL sử dụng nhiều chỉ mục có điều kiện (`CREATE INDEX ... WHERE status = 'pending'`, `WHERE phone_number IS NOT NULL`, `WHERE is_active = TRUE`) – tính năng này Prisma gặp nhiều hạn chế hoặc bắt buộc phải dùng raw SQL migration.
  3. *Hiệu năng và Kiểm soát tối đa:* `pg` cực kỳ nhẹ, không phát sinh overhead trừu tượng hóa của ORM, cho phép lập trình viên và AI Agent kiểm soát hoàn toàn câu lệnh SQL tham số hóa (`$1, $2, ...`) nhằm triệt tiêu 100% rủi ro SQL Injection.

```typescript
// backend/src/infrastructure/database/db.client.ts
import { Pool, QueryResult, QueryResultRow } from 'pg';

export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await dbPool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB Query]', { text: text.trim().slice(0, 100), duration, rows: res.rowCount });
  }
  return res;
}
```

#### 3. Cơ chế Kiểm thực Dữ liệu (Validation Engine): Chốt dùng `Zod`
* Sử dụng **`Zod` (v3.x)** cho toàn bộ hệ thống:
  * Validate biến môi trường khi Backend khởi chạy (`env.config.ts`).
  * Middleware kiểm thực tự động Express cho mọi Request (`body`, `query`, `params`).
  * Validate phía Frontend Next.js kết hợp cùng `react-hook-form` và `@hookform/resolvers/zod`.
* **Express Validation Middleware chuẩn:**

```typescript
// backend/src/common/middlewares/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest = (schema: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (schema.body) req.body = await schema.body.parseAsync(req.body);
    if (schema.query) req.query = await schema.query.parseAsync(req.query);
    if (schema.params) req.params = await schema.params.parseAsync(req.params);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu yêu cầu không hợp lệ',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
      });
      return;
    }
    next(error);
  }
};
```

#### 4. Cấu hình BullMQ Retry & Exponential Backoff cho Meta Rate Limits
* Khi gọi Meta Graph API, các lỗi phổ biến liên quan đến Rate Limit gồm:
  * **Mã lỗi 613 (`OAuthException`):** Calls to this api have exceeded the rate limit.
  * **Mã lỗi 80001 (`OAuthException`):** There have been too many calls to this Page.
* **Quy định cấu hình bắt buộc trong BullMQ:**
  * `attempts: 5` (Thử lại tối đa 5 lần)
  * `backoff: { type: 'exponential', delay: 3000 }` (Lần 1: 3s; Lần 2: 6s; Lần 3: 12s; Lần 4: 24s; Lần 5: 48s).
  * `removeOnComplete: 1000`, `removeOnFail: 5000` (Lưu vết để kiểm tra).

```typescript
// backend/src/queue/bullmq.client.ts
import { Queue, Worker, QueueOptions, JobsOptions } from 'bullmq';
import { redisConnection } from '../config/redis';

export const META_API_JOB_OPTS: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 3000,
  },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export const autoReplyQueue = new Queue('auto_reply_queue', {
  connection: redisConnection,
  defaultJobOptions: META_API_JOB_OPTS,
});

export const scheduledPostsQueue = new Queue('scheduled_posts_queue', {
  connection: redisConnection,
  defaultJobOptions: META_API_JOB_OPTS,
});
```

---

### IV. CẤU TRÚC THƯ MỤC DỰ ÁN (Project Directory Structure)

#### 1. Cấu trúc Thư mục Backend (`backend/`)

Cấu trúc thư mục Backend được thiết kế theo mô hình **Modular Monolith Architecture** chuẩn TypeScript:

```
backend/
├── .env.example                  # Mẫu biến môi trường
├── .gitignore
├── docker-compose.yml            # Docker Compose cho PostgreSQL, Redis & App
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts                   # Điểm khởi chạy hệ thống (Entry point)
│   ├── app.ts                    # Khởi tạo Express App & Middleware
│   │
│   ├── config/                   # Cấu hình môi trường & hằng số hệ thống
│   │   ├── database.ts           # Kết nối PostgreSQL (pg.Pool singleton)
│   │   ├── redis.ts              # Kết nối Redis client
│   │   ├── meta-api.ts           # Cấu hình Meta Graph API Client & Version (v19.0)
│   │   └── security.ts           # Mã hóa AES-256 cho Tokens & JWT Config
│   │
│   ├── common/                   # Thành phần dùng chung (Shared Utilities)
│   │   ├── constants/            # Mã lỗi Meta, Regex SĐT chuẩn Việt Nam
│   │   ├── errors/               # Custom AppError classes
│   │   ├── middlewares/          # AuthMiddleware, RateLimiter, ValidationMiddleware
│   │   └── utils/                # Crypto helper, Phone Regex Scanner, Date formatter
│   │
│   ├── modules/                  # Các Module Nghiệp vụ Chính
│   │   │
│   │   ├── auth/                 # Module Xác thực Người dùng
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.router.ts
│   │   │
│   │   ├── facebook-oauth/       # Module Kết nối Meta OAuth & Quản lý Token
│   │   │   ├── fb-oauth.controller.ts
│   │   │   ├── fb-oauth.service.ts
│   │   │   └── fb-oauth.router.ts
│   │   │
│   │   ├── pages/                # Module Quản lý Fanpage & Cấu hình Automation
│   │   │   ├── pages.controller.ts
│   │   │   ├── pages.service.ts
│   │   │   └── pages.router.ts
│   │   │
│   │   ├── posts-schedule/       # Module Đặt lịch Đăng bài
│   │   │   ├── posts.controller.ts
│   │   │   ├── posts.service.ts
│   │   │   └── posts.router.ts
│   │   │
│   │   ├── webhooks/             # Module Nhận & Verification Webhook Meta
│   │   │   ├── webhook.controller.ts  # Verification Challenge & Fast 200 OK Response
│   │   │   ├── webhook.service.ts     # Pushing events to Redis Queue
│   │   │   └── webhook.router.ts
│   │   │
│   │   └── inbox/                # Module Hộp thư Tập trung & Khách hàng
│   │       ├── inbox.controller.ts
│   │       ├── inbox.service.ts
│   │       ├── inbox.websocket.ts    # Socket.io Event Handlers
│   │       └── inbox.router.ts
│   │
│   ├── queue/                    # Quản lý Hàng đợi & Background Workers
│   │   ├── bullmq.client.ts
│   │   ├── workers/
│   │   │   ├── auto-hide-phone.worker.ts  # Worker ẩn SĐT tức thì (<3s)
│   │   │   ├── auto-reply.worker.ts       # Worker Auto Comment & Private Reply
│   │   │   └── scheduled-post.worker.ts   # Worker xuất bản bài viết hẹn giờ
│   │   └── queues/
│   │       ├── webhook.queue.ts
│   │       └── publisher.queue.ts
│   │
│   └── database/                 # Migration & Seeders
│       ├── migrations/           # File chứa mã SQL Migration (.sql)
│       └── seeds/                # Dữ liệu mẫu khởi tạo
└── tests/                        # Unit tests & Integration tests
    ├── unit/
    └── integration/
```

#### 2. Cấu trúc Thư mục Frontend (`frontend/`)

Cấu trúc thư mục áp dụng cho dự án Next.js 14+ App Router, ánh xạ chính xác 1-1 với 5 màn hình nghiệp vụ:

```
frontend/
├── .env.example
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
│
├── public/
│   ├── favicon.ico
│   └── images/                     # Logo, placeholder hình ảnh
│
└── src/
    ├── app/                        # Next.js 14+ App Router Routes
    │   ├── layout.tsx              # Root Layout (Fonts, Providers, Toast container)
    │   ├── globals.css             # Tailwind Directives & CSS Variables
    │   │
    │   ├── (auth)/                 # Nhóm màn hình Xác thực người dùng (Auth Group)
    │   │   ├── layout.tsx          # Layout trang xác thực (Card căn giữa)
    │   │   ├── login/
    │   │   │   └── page.tsx        # Màn hình Đăng nhập
    │   │   └── register/
    │   │       └── page.tsx        # Màn hình Đăng ký
    │   │
    │   └── (dashboard)/            # Nhóm màn hình Ứng dụng chính (Dashboard Layout)
    │       ├── layout.tsx          # Sidebar điều hướng, Header, SocketProvider
    │       ├── page.tsx            # Màn hình Tổng quan (KPIs, bài đăng hôm nay, tin mới)
    │       │
    │       ├── pages/              # MÀN HÌNH 1: QUẢN LÝ KẾT NỐI FANPAGE
    │       │   └── page.tsx        # Danh sách Page đã kết nối, nút kết nối Meta OAuth, toggle On/Off
    │       │
    │       ├── automation/         # MÀN HÌNH 2: CẤU HÌNH KỊCH BẢN TỰ ĐỘNG
    │       │   └── page.tsx        # Cấu hình ẩn SĐT, từ khóa kích hoạt, mẫu Auto Reply & Private Reply
    │       │
    │       ├── posts/              # MÀN HÌNH 3: ĐẶT LỊCH ĐĂNG BÀI
    │       │   ├── page.tsx        # Danh sách bài viết đặt lịch (Chuyển đổi Dạng Lịch / Dạng Bảng)
    │       │   └── new/
    │       │       └── page.tsx    # Soạn bài viết mới, tải media, chọn Fanpage, chọn giờ đăng
    │       │
    │       └── inbox/              # MÀN HÌNH 4: LIVE CHAT (CENTRALIZED INBOX)
    │           └── page.tsx        # Màn hình Hộp thư tập trung (Giao diện 3 cột chuyên dụng)
    │
    ├── components/                 # Các UI Components tái sử dụng
    │   │
    │   ├── ui/                     # Nguyên tử giao diện cơ bản (Shadcn/Radix UI)
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── textarea.tsx
    │   │   ├── modal.tsx
    │   │   ├── badge.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── tabs.tsx
    │   │   ├── switch.tsx
    │   │   └── toast.tsx
    │   │
    │   ├── layout/                 # Thành phần khung ứng dụng
    │   │   ├── sidebar.tsx         # Thanh menu bên trái (Pages, Automation, Posts, Inbox)
    │   │   ├── header.tsx          # Thanh tiêu đề trên cùng (User profile, Page selector)
    │   │   └── status-badge.tsx    # Hiển thị trạng thái kết nối Webhook / Socket
    │   │
    │   ├── pages-mgmt/             # Components cho Màn hình Quản lý Fanpage
    │   │   ├── page-card.tsx       # Thẻ hiển thị từng Page (Avatar, trạng thái webhook, toggle)
    │   │   └── connect-modal.tsx   # Modal chọn các Page muốn kết nối sau OAuth
    │   │
    │   ├── automation/             # Components cho Màn hình Cấu hình Automation
    │   │   ├── rule-card.tsx       # Thẻ hiển thị quy tắc tự động
    │   │   ├── keyword-tags.tsx    # Input nhập từ khóa kích hoạt (tags input)
    │   │   └── template-editor.tsx # Khung soạn thảo mẫu câu trả lời (hỗ trợ chèn biến {name})
    │   │
    │   ├── posts/                  # Components cho Màn hình Đặt lịch Bài viết
    │   │   ├── post-card.tsx       # Thẻ bài viết đặt lịch (Hiển thị media, status, hẹn giờ)
    │   │   ├── media-uploader.tsx  # Kéo thả tải ảnh/video lên Cloudinary kèm thanh tiến độ
    │   │   ├── post-preview.tsx    # Xem trước bài viết mô phỏng giao diện Facebook thật
    │   │   └── calendar-view.tsx   # Lịch biểu trực quan các bài viết trong tháng
    │   │
    │   └── inbox/                  # Components cho Màn hình Live Chat (Centralized Inbox)
    │       ├── column-channels.tsx # CỘT 1: Lọc Fanpage, Lọc Messenger / Comment, Lọc Trạng thái
    │       ├── column-threads.tsx  # CỘT 2: Danh sách cuộc trò chuyện, tìm kiếm khách hàng, đếm tin chưa đọc
    │       ├── thread-item.tsx     # Từng dòng hội thoại (Avatar, tên khách, tin nhắn cuối, badge 24h)
    │       ├── chat-window.tsx     # CỘT 3A: Khung chat chính (Lịch sử tin nhắn, bubble chat)
    │       ├── message-bubble.tsx  # Hiển thị từng tin nhắn/comment (Badge Ẩn SĐT, Private Reply)
    │       ├── chat-input.tsx      # Thanh nhập phản hồi, gửi ảnh, nút gửi tin nhắn riêng
    │       └── customer-panel.tsx  # CỘT 3B: Bảng thông tin khách hàng (SĐT, Gắn thẻ tag, Ghi chú)
    │
    ├── hooks/                      # Custom React Hooks
    │   ├── use-auth.ts             # Quản lý phiên đăng nhập, User state
    │   ├── use-socket.ts           # Quản lý kết nối Socket.io, lắng nghe và phát sự kiện
    │   ├── use-inbox.ts            # Quản lý danh sách hội thoại, tin nhắn realtime
    │   ├── use-pages.ts            # Fetch danh sách Fanpage và toggle trạng thái
    │   └── use-posts.ts            # Fetch lịch đăng bài và trigger tạo bài viết mới
    │
    ├── lib/                        # Khởi tạo Thư viện bên ngoài & Utilities
    │   ├── api-client.ts           # Axios Client cấu hình Base URL và Bearer Token Interceptor
    │   ├── socket-client.ts        # Socket.io Client Singleton
    │   └── utils.ts                # Helper xử lý chuỗi, format ngày tháng (date-fns), che số điện thoại
    │
    └── types/                      # Định nghĩa Kiểu Dữ liệu TypeScript (Khớp 100% với Backend DTO)
        ├── api.ts                  # ApiResponse<T>, ApiError, PaginationMeta
        ├── auth.ts                 # User, LoginCredentials, AuthResponse
        ├── page.ts                 # ConnectedPage, AutomationRule
        ├── post.ts                 # ScheduledPost, MediaType, PostStatus
        └── inbox.ts                # Conversation, Message, Customer, SocketInboxEvent
```

---

### V. ĐẶC TẢ FILE BIẾN MÔI TRƯỜNG (`.env.example` Specification)

#### 1. File `backend/.env.example`
```bash
# ==============================================================================
# SHOPFLOW BACKEND - BIẾN MÔI TRƯỜNG MẪU (.env.example)
# ==============================================================================

# Cấu hình Máy chủ Ứng dụng
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Cơ sở dữ liệu PostgreSQL
DATABASE_URL=postgresql://postgres:postgres_password@localhost:5432/shopflow?schema=public
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres_password
PGDATABASE=shopflow
PGSSL=false

# Bộ nhớ đệm & Hàng đợi Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Bảo mật Xác thực JWT
JWT_SECRET=shopflow_super_secret_jwt_access_token_key_min_32_chars_123456
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=shopflow_super_secret_refresh_token_key_min_32_chars_abcdef
JWT_REFRESH_EXPIRES_IN=7d

# Khóa Mã hóa Dữ liệu Nhạy cảm (AES-256-GCM)
# Bắt buộc phải là chuỗi Hex 64 ký tự (tương đương chính xác 32 bytes)
# Sinh ngẫu nhiên bằng lệnh: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AES_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Cấu hình Ứng dụng Meta Developer (Graph API)
FB_APP_ID=123456789012345
FB_APP_SECRET=a1b2c3d4e5f60718293a4b5c6d7e8f90
FB_VERIFY_TOKEN=shopflow_meta_webhook_secure_verify_token_2026
FB_GRAPH_VERSION=v19.0
FB_REDIRECT_URI=http://localhost:5000/api/v1/fb-oauth/callback

# Cấu hình Lưu trữ Media Đám mây (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz12345
```

#### 2. File `frontend/.env.example`
```bash
# ==============================================================================
# SHOPFLOW FRONTEND - BIẾN MÔI TRƯỜNG MẪU (.env.example)
# ==============================================================================

# URL kết nối Backend REST API
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

# URL kết nối Realtime WebSocket (Socket.io)
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Meta Facebook App ID (Dùng cho Facebook SDK phía Client nếu cần)
NEXT_PUBLIC_FB_APP_ID=123456789012345
```
