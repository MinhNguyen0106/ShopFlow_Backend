# BẢNG KẾ HOẠCH THỰC THI DỰ ÁN SHOPFLOW (TASK.MD)

> **Sprint Hiện Tại:** Sprint 4 (Order Management, AI Entity Extraction & Payment Integration)  
> **Cập nhật lần cuối:** 21/10/2026  
> **Tài liệu tham chiếu:** [docs/00_INDEX.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/00_INDEX.md) • [docs/02_ARCHITECTURE_AND_FLOWS.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/02_ARCHITECTURE_AND_FLOWS.md) • [docs/03_DATABASE_SCHEMA.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/03_DATABASE_SCHEMA.md) • [docs/04_API_AND_WEBSOCKET.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/04_API_AND_WEBSOCKET.md) • [docs/05_DESIGN_SYSTEM.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/05_DESIGN_SYSTEM.md) • [docs/06_UI_SCREENS_AND_COMPONENTS.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/06_UI_SCREENS_AND_COMPONENTS.md)

---

## 📌 NGUYÊN TẮC VẬN HÀNH BẮT BUỘC (OPERATING PRINCIPLES)

1. **Đọc Trước Khi Làm (Read First):** Trước khi bắt tay vào viết mã cho bất kỳ tính năng hoặc tác vụ nào, AI Agent bắt buộc phải đọc lại tệp `Task.md` này để nắm vững bối cảnh, phạm vi và trạng thái hiện tại.
2. **Chuyển Xuống Nhật Ký Khi Hoàn Thành (Archive To Log):** Mỗi khi một task hoàn thành, chuyển task đó xuống bảng **Nhật Ký Cập Nhật Tiến Độ Sprint** ở cuối trang kèm ghi chú tóm tắt kết quả, đồng thời gỡ bỏ các checklist chi tiết thừa ở phần kế hoạch để giữ `Task.md` luôn tinh gọn, tập trung vào các công việc đang chờ xử lý.
3. **Đồng Bộ Lịch Sử (Sync History):** Sau khi hoàn thành trọn vẹn mỗi task, cập nhật vào [.agents/memory/history.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/memory/history.md) để lưu vết tiến độ dài hạn của dự án.
4. **An Toàn Hệ Thống (Strict Safety Gate):** Tuyệt đối không thực hiện các hành động nguy hiểm (như xóa cơ sở dữ liệu, `DROP TABLE`, thay đổi cấu trúc kiến trúc gốc, `git push --force`) mà chưa ghi chú rõ ràng vào kế hoạch và nhận được sự xác nhận từ người dùng.
5. **Chuẩn Mực Mã Nguồn (Code Quality):** Tuân thủ TypeScript Strict (`noImplicitAny`), Clean Architecture, không hardcode bí mật/token vào git, xác thực chữ ký Webhook HMAC-SHA256 với `timingSafeEqual`.
6. **Quy Trình Nhánh & Triển Khai An Toàn (Task Lifecycle & Safe Deploy):** Mọi task bắt buộc phải thực hiện trên một nhánh riêng (`feature/<task-name>`). Chạy toàn bộ test suite; nếu lỗi phải tự động phân tích và sửa lỗi; nếu pass mới merge vào `main` và chạy quy trình triển khai an toàn theo [.agents/workflows/safe-deploy.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/workflows/safe-deploy.md).
7. **Phát Triển Hướng Đặc Tả với OpenSpec (Spec-Driven Development):**
   - Mọi tính năng lớn từ Sprint 3 được quản lý ở cấp độ Vĩ mô (Milestone) trên `Task.md`.
   - Khi bắt đầu thực thi một TASK, khởi tạo một change trong OpenSpec qua `/opsx-propose <feature-name>` để sinh `proposal.md`, `specs/`, `design.md`, và `tasks.md`.
   - Các công việc kỹ thuật vi mô (từng file, hàm, unit test) được theo dõi trực tiếp trong `openspec/changes/<feature-name>/tasks.md`.
   - Sau khi hoàn thành kiểm thử và lưu trữ (`/opsx-archive <feature-name>`), chuyển task xuống bảng nhật ký ở cuối `Task.md` và ghi log vào `history.md`.
8. **Quy Trình Đóng Sprint & Chuyển Giao Sprint Tiếp Theo (Sprint Completion & Transition Protocol):**
   - Khi toàn bộ các tác vụ trong một Sprint đạt 100% hoàn thành (pass toàn bộ test suite, type-check, build production), AI Agent bắt buộc phải thực hiện quy trình chuyển giao 3 bước:
     1. **Đóng Sprint:** Đánh dấu Sprint vừa hoàn thành là 100% DONE, lưu trữ các task đã hoàn tất vào bảng *Nhật Ký Cập Nhật Tiến Độ Sprint* ở cuối trang.
     2. **Đề Xuất Sprint Tiếp Theo:** Mô tả rõ ràng mục tiêu, phạm vi công việc, danh sách các tác vụ kế thừa (kèm mã `[TASK-xx]`) vào phần *[Kế Hoạch Tiếp Theo]* trong [.agents/memory/history.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/memory/history.md).
     3. **Cập Nhật Lại Task.md:** Cập nhật tiêu đề **Sprint Hiện Tại** ở đầu trang, chuyển danh mục công việc của Sprint mới vào mục **TRẠNG THÁI: CHỜ THỰC HIỆN (TODO)** với checklist chi tiết sẵn sàng để khởi tạo OpenSpec change (`/opsx-propose`).

---

## 🚀 DANH MỤC CÔNG VIỆC SPRINT 4: ORDER MANAGEMENT, AI ENTITY EXTRACTION & PAYMENT INTEGRATION

### 📋 TRẠNG THÁI: CHỜ THỰC HIỆN (TODO)

#### [TASK-21] Nghiệp Vụ Quản Lý Danh Mục Sản Phẩm, Biến Thể & Tồn Kho (`/api/v1/products`) - [P1] - **[HOÀN THÀNH]**
- [x] **21.1.** Xây dựng Repository & Service quản lý sản phẩm (`products`), biến thể (`variants` JSON) và trừ kho an toàn (`stock_quantity`).
- [x] **21.2.** Xây dựng REST APIs CRUD: `GET /api/v1/products`, `POST /api/v1/products`, `PUT /api/v1/products/:id`, `DELETE /api/v1/products/:id`, `PATCH /api/v1/products/:id/stock`.
- [x] **21.3.** Tích hợp cơ chế trừ kho nguyên tử (`atomicDecrementStock`) chống overselling & race conditions với SQL `stock_quantity >= $1`.
- [x] **21.4.** Viết unit & integration tests kiểm thử nghiệp vụ kho và đồng thời (concurrency check), 37/37 tests pass, 59/59 files backend pass 100%.

#### [TASK-22] Màn Hình Giao Diện Quản Lý Đơn Hàng & Vận Đơn (`/orders`) - [P0]
- [ ] **22.1.** Thiết kế Zustand store `order.store.ts` kết nối REST APIs `/api/v1/orders` và lắng nghe socket `ORDER_STATUS_CHANGED`.
- [ ] **22.2.** Xây dựng bảng danh sách đơn hàng Bento phong cách macOS Clean Utility với bộ lọc trạng thái đa tầng (`pending`, `confirmed`, `shipping`, `completed`, `cancelled`).
- [ ] **22.3.** Xây dựng Drawer/Modal xem chi tiết đơn hàng, lịch sử thay đổi trạng thái, thông tin CRM khách hàng (PII masked) và in phiếu vận đơn.
- [ ] **22.4.** Viết unit & integration tests cho toàn bộ phân hệ quản lý đơn hàng.
*(Khi bắt đầu thực thi: Chạy `/opsx-propose orders-management-ui`)*

#### [TASK-23] Tích Hợp Cổng Thanh Toán VietQR Động & Đơn Vị Vận Chuyển - [P1]
- [ ] **23.1.** Xây dựng tiện ích sinh mã VietQR động theo chuẩn Napas 247 (chứa đúng số tiền đơn hàng và mã nội dung chuyển khoản bảo mật).
- [ ] **23.2.** Tích hợp Webhook nhận thông báo biến động số dư chuyển khoản tự động đổi trạng thái đơn hàng sang `confirmed`.
- [ ] **23.3.** Kết nối API đẩy đơn sang đối tác vận chuyển (GHN / GHTK) và nhận mã vận đơn `tracking_code`.
- [ ] **23.4.** Viết integration tests cho luồng thanh toán và cập nhật vận đơn.
*(Khi bắt đầu thực thi: Chạy `/opsx-propose payment-shipping-integration`)*

---

## 📅 NHẬT KÝ CẬP NHẬT TIẾN ĐỘ SPRINT (PROGRESS LOG)

| Thời gian | Tác vụ | Trạng thái | Ghi chú & Kết quả |
| :--- | :--- | :---: | :--- |
| 19/10/2026 | Khởi tạo bảng kế hoạch chi tiết `Task.md` | **DONE** | Lập kế hoạch 8 hạng mục công việc lớn, phân chia các milestone cụ thể. |
| 19/10/2026 | [TASK-01] Khởi tạo Monorepo (`backend/` & `frontend/`) | **DONE** | Express Clean Architecture + Next.js 14, pass type-check & health check HTTP 200 OK. |
| 19/10/2026 | Khởi tạo Git & Push Remote GitHub | **DONE** | Tạo commit đầu tiên (`chore: initial commit for ShopFlow project`), đổi nhánh sang `main` và push lên GitHub. |
| 19/10/2026 | [TASK-02] Docker Compose (PostgreSQL 15 + Redis 7) | **DONE** | Cấu hình `docker-compose.yml`, `.env.docker.example`, `scripts/test-services.ps1`; merge vào `main`. |
| 19/10/2026 | [TASK-03] SQL DDL Schema (9 bảng + Indexes + Triggers) | **DONE** | Tạo `001_initial_schema.sql` (9 bảng, 12 indexes, 5 partial indexes, 2 GIN, 4 triggers), `migrate.ts` runner. |
| 19/10/2026 | [TASK-04] Database Infrastructure (`db.client.ts` pg.Pool Singleton) | **DONE** | Quản lý kết nối PostgreSQL, query profiling, withTransaction, shutdown hooks; 16/16 unit tests passed. |
| 19/10/2026 | [TASK-05] Request Validation & Error Handling (Zod + AppError) | **DONE** | `validateRequest` middleware, `AppError` domain hierarchy, `errorHandler` & `notFoundHandler`; 41/41 tests passed. |
| 19/10/2026 | [TASK-06] Authentication Module (JWT + Bcrypt + Auth Service) | **DONE** | Tạo DTOs, `auth.helper.ts`, `user.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.middleware.ts`; 84/84 tests passed. |
| 19/10/2026 | [TASK-07] Webhook Ingestion & HMAC-SHA256 Verifier | **DONE** | Xác thực chữ ký Meta `x-hub-signature-256`, raw body retention, idempotency log; 113/113 tests passed. |
| 19/10/2026 | [TASK-08] BullMQ Queue & Worker ẩn SĐT < 3s | **DONE** | Regex SĐT Việt Nam, Meta Graph `hideComment`, lưu CRM `customers` tag `["Co_SDT"]`, DLQ & Rate Limiter; 145/145 tests passed. |
| 20/10/2026 | [TASK-09] Meta Facebook OAuth 2.0, AES-256-GCM & Quản lý Fanpage | **DONE** | Tiện ích AES-256-GCM (`crypto.helper.ts`), OAuth 2.0 flow, `subscribed_apps`, CRUD `/api/v1/pages`; 207/207 tests passed. |
| 20/10/2026 | [TASK-10] Automation Rules Engine & Reply Worker | **DONE** | KeywordMatcherService, Worker BullMQ auto-reply rate limit 15 req/s, Meta Private Reply & Comment Reply; 254/254 tests passed. |
| 20/10/2026 | [TASK-11] Cloudinary Media Stream Upload Service | **DONE** | Multer memoryStorage, Cloudinary SDK stream upload ảnh/video, endpoint `POST /api/v1/media/upload`; 278/278 tests passed. |
| 20/10/2026 | [TASK-12] Đặt lịch Xuất bản Bài viết Đa kênh & BullMQ Worker | **DONE** | REST APIs CRUD/Retry, Worker BullMQ delay job, xuất bản Feed/Photo/Video/Album lên Meta Graph API; 337/337 tests passed. |
| 20/10/2026 | [TASK-13] Máy chủ WebSocket Realtime & Centralized Inbox APIs | **DONE** | Socket.io Server JWT auth & room routing, 8 REST APIs `/api/v1/inbox` (Messenger & Comment Reply, CRM); 393/393 tests passed. |
| 20/10/2026 | [TASK-14] Khung Layout macOS Clean Utility, Màn hình Auth & Fanpage Management | **DONE** | Axios client auto-refresh token, Zustand stores, MacTrafficLights, Topbar Spotlight (`⌘K`), Sidebar, Pages management; 21/21 tests passed. |
| 20/10/2026 | [TASK-15] Màn hình Hộp thư Tập trung Live Chat 4-Pane Bento (`/inbox`) | **DONE** | 4 Pane Bento (Channels & Filters, Threads với Meta 24h Window & SĐT shield, Chat Window với ShopFlow Shield & Macro chốt đơn, CRM & Thẻ Đơn Hàng AI Gemini); 30/30 tests passed. **HOÀN THÀNH SPRINT 2 (100%)**. |
| 21/10/2026 | Đăng ký tài khoản & Rate Limiting (`user-registration`) | **DONE** | Hoàn thành OpenSpec change đầu tiên: rate limiter 10 req/15 min, DTO validation, 63/63 backend tests, 30/30 frontend tests passed; lưu trữ living spec `user-registration`. |
| 21/10/2026 | [TASK-16] Màn hình Quản lý Danh sách Bài viết Đặt lịch & Calendar View (`/posts`) | **DONE** | Zustand store `post.store.ts`, `PostStatusBadge`, `PostsListView` phân trang & retry/cancel, `PostsCalendarView` CSS Grid thuần tự động phát hiện khung giờ vàng (11h-13h & 19h30-21h30), lắng nghe Socket `POST_STATUS_CHANGED`. 19/19 tests pass (49/49 toàn frontend pass), build Next.js 14 thành công; lưu trữ living spec `posts-management`. |
| 21/10/2026 | [TASK-17] Màn hình Soạn thảo Bài viết Mới & Preview Facebook (`/posts/new`) | **DONE** | Bố cục Split-Pane macOS Clean Utility, MediaUploader (Cloudinary album đa ảnh & video), SchedulePicker (gợi ý giờ vàng 11:30 & 20:00, validate >= 10m), PostPreviewModal (Facebook Feed Desktop/Mobile đa layout ảnh `+N`), 10/10 tests pass (59/59 toàn frontend pass), build Next.js 14 thành công; hoàn thành OpenSpec `post-creator-ui`. |
| 21/10/2026 | [TASK-18] Màn hình Cấu hình Kịch bản Tự động & Ẩn SĐT (`/automation`) | **DONE** | Zustand store `automation.store.ts`, Bento cards `RuleCard` (switch iOS, tag chips, preview templates), `RuleModal` (Tag Input, chèn biến động), `DeleteRuleDialog` an toàn, 13/13 unit tests & 12/12 integration tests pass (84/84 toàn frontend pass), build Next.js 14 thành công; hoàn thành OpenSpec `automation-rules-ui`. |
| 21/10/2026 | [TASK-19] Bảng Điều Khiển Tổng Quan & Báo Cáo KPIs (`/(dashboard)`) | **DONE** | Lưới Bento đa tầng 4 KPI thẻ điều hành, `TrafficChart` SVG thuần trực quan hóa lưu lượng & khung giờ vàng (11:30 & 20:00), `MetaWindowWidget` đếm ngược SLA 24h, `HotLeadsWidget` với PII phone masking (`098****123`), `QuickActions` 4 phím tắt chuyển trang nhanh; 9/9 tests pass (93/93 toàn frontend pass), build Next.js 14 thành công. **HOÀN THÀNH SPRINT 3 (100%)**. |
| 21/10/2026 | [TASK-20] Mô-đun Trích Xuất Thực Thể Đơn Hàng Bằng Google Gemini AI (`OrderParserService`) | **DONE** | Kiến trúc Hybrid 2 tầng: Regex Fast-path (< 50ms) + Gemini 2.5 Flash Fallback (< 1.5s), prompt injection guard `<customer_input>`, REST API `POST /api/v1/orders/parse`, 23/23 Golden test fixtures passed (đạt 100% độ chính xác), 55/55 files test (457/457 tests backend) pass 100%, 0 lỗi TypeScript. Hoàn thành OpenSpec `order-ai-parser`. |
| 21/10/2026 | [TASK-21] Nghiệp Vụ Quản Lý Danh Mục Sản Phẩm, Biến Thể & Tồn Kho (`/api/v1/products`) | **DONE** | Bảng PostgreSQL `products` (`002_products_and_inventory.sql`), Zod DTOs, `ProductRepository` với trừ kho nguyên tử (`atomicDecrementStock` chống overselling/race conditions), `ProductService` kiểm tra trùng SKU trên cùng page, 6 REST APIs CRUD & `/stock`, 59/59 test files pass 100% (494/494 tests passed), 0 lỗi TypeScript; hoàn thành OpenSpec `product-catalog-service`. |


