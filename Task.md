# BẢNG KẾ HOẠCH THỰC THI DỰ ÁN SHOPFLOW (TASK.MD)

> **Sprint Hiện Tại:** Sprint 6 (CRM Leads Management, System Settings & Production Launch)  
> **Cập nhật lần cuối:** 24/10/2026  
> **Tài liệu tham chiếu:** [docs/00_INDEX.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/00_INDEX.md) • [docs/02_ARCHITECTURE_AND_FLOWS.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/02_ARCHITECTURE_AND_FLOWS.md) • [docs/03_DATABASE_SCHEMA.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/03_DATABASE_SCHEMA.md) • [docs/04_API_AND_WEBSOCKET.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/04_API_AND_WEBSOCKET.md) • [docs/05_DESIGN_SYSTEM.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/05_DESIGN_SYSTEM.md) • [docs/06_UI_SCREENS_AND_COMPONENTS.md](file:///c:/Users/Dell/Desktop/ShopFlow/docs/06_UI_SCREENS_AND_COMPONENTS.md)

---

## 📌 NGUYÊN TẮC VẬN HÀNH BẮT BUỘC (OPERATING PRINCIPLES)

1. **Đọc Trước Khi Làm (Read First):** Trước khi bắt tay vào viết mã cho bất kỳ tính năng hoặc tác vụ nào, AI Agent bắt buộc phải đọc lại tệp `Task.md` này để nắm vững bối cảnh, phạm vi và trạng thái hiện tại.
2. **Chuyển Xuống Nhật Ký Khi Hoàn Thành (Archive To Log):** Mỗi khi một task hoàn thành, chuyển task đó xuống bảng **Nhật Ký Cập Nhật Tiến Độ Sprint** ở cuối trang kèm ghi chú tóm tắt kết quả, đồng thời gỡ bỏ các checklist chi tiết thừa ở phần kế hoạch để giữ `Task.md` luôn tinh gọn, tập trung vào các công việc đang chờ xử lý.
3. **Đồng Bộ Lịch Sử (Sync History):** Sau khi hoàn thành trọn vẹn mỗi task, cập nhật vào [.agents/memory/history.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/memory/history.md) để lưu vết tiến độ dài hạn của dự án.
4. **An Toàn Hệ Thống (Strict Safety Gate):** Tuyệt đối không thực hiện các hành động nguy hiểm (như xóa cơ sở dữ liệu, `DROP TABLE`, thay đổi cấu trúc kiến trúc gốc, `git push --force`) mà chưa ghi chú rõ ràng vào kế hoạch và nhận được sự xác nhận từ người dùng.
5. **Chuẩn Mực Mã Nguồn (Code Quality):** Tuân thủ TypeScript Strict (`noImplicitAny`), Clean Architecture, không hardcode bí mật/token vào git, xác thực chữ ký Webhook HMAC-SHA256 với `timingSafeEqual`.
6. **Quy Trình Nhánh, Triển Khai An Toàn & Đẩy Mã Lên GitHub (Task Lifecycle, Safe Deploy & GitHub Push):** Mọi task bắt buộc phải thực hiện trên một nhánh riêng (`feature/<task-name>`). Chạy toàn bộ test suite; nếu lỗi phải tự động phân tích và sửa lỗi; khi toàn bộ bài test đã pass thì merge vào nhánh `main`, tạo commit chuẩn mực và **bắt buộc push lên GitHub (`git push origin <branch>/main`)**, sau đó thực hiện quy trình triển khai an toàn theo [.agents/workflows/safe-deploy.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/workflows/safe-deploy.md).
7. **Phát Triển Hướng Đặc Tả với OpenSpec (Spec-Driven Development):**
   - Mọi tính năng lớn từ Sprint 3 được quản lý ở cấp độ Vĩ mô (Milestone) trên `Task.md`.
   - Khi bắt đầu thực thi một TASK, khởi tạo một change trong OpenSpec qua `/opsx-propose <feature-name>` để sinh `proposal.md`, `specs/`, `design.md`, và `tasks.md`.
   - Các công việc kỹ thuật vi mô (từng file, hàm, unit test) được theo dõi trực tiếp trong `openspec/changes/<feature-name>/tasks.md`.
   - Sau khi hoàn thành kiểm thử, lưu trữ (`/opsx-archive <feature-name>`), merge và **push mã nguồn lên GitHub**, chuyển task xuống bảng nhật ký ở cuối `Task.md` và ghi log vào `history.md`.
8. **Quy Trình Đóng Sprint & Chuyển Giao Sprint Tiếp Theo (Sprint Completion & Transition Protocol):**
   - Khi toàn bộ các tác vụ trong một Sprint đạt 100% hoàn thành (pass toàn bộ test suite, type-check, build production, đã push đầy đủ lên GitHub), AI Agent bắt buộc phải thực hiện quy trình chuyển giao 3 bước:
     1. **Đóng Sprint:** Đánh dấu Sprint vừa hoàn thành là 100% DONE, lưu trữ các task đã hoàn tất vào bảng *Nhật Ký Cập Nhật Tiến Độ Sprint* ở cuối trang.
     2. **Đề Xuất Sprint Tiếp Theo:** Mô tả rõ ràng mục tiêu, phạm vi công việc, danh sách các tác vụ kế thừa (kèm mã `[TASK-xx]`) vào phần *[Kế Hoạch Tiếp Theo]* trong [.agents/memory/history.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/memory/history.md).
     3. **Cập Nhật Lại Task.md:** Cập nhật tiêu đề **Sprint Hiện Tại** ở đầu trang, chuyển danh mục công việc của Sprint mới vào mục **TRẠNG THÁI: CHỜ THỰC HIỆN (TODO)** với checklist chi tiết sẵn sàng để khởi tạo OpenSpec change (`/opsx-propose`).

---

## 🚀 DANH MỤC CÔNG VIỆC SPRINT 6: CRM LEADS MANAGEMENT, SYSTEM SETTINGS & PRODUCTION LAUNCH

### 📋 TRẠNG THÁI: CHỜ THỰC HIỆN (TODO)

#### [TASK-27] Màn Hình Quản Lý Khách Hàng & Leads Tập Trung (`/(dashboard)/customers`) - [P2]
- [ ] **27.1.** Xây dựng API CRM khách hàng (`/api/v1/customers`): lọc theo tag (Có SĐT, Khách VIP, Đã mua hàng), tìm kiếm đa năng, lịch sử đơn hàng và tổng chi tiêu (LTV).
- [ ] **27.2.** Thiết kế Zustand store `customer.store.ts` kết nối REST API quản lý danh bạ khách hàng kèm chức năng gán/xóa tags nhanh.
- [ ] **27.3.** Xây dựng giao diện Khách hàng & Leads chuẩn macOS Clean Utility Bento Grid (`CustomerMetrics`, `CustomerTable`, `CustomerDetailDrawer` với lịch sử mua hàng và ghi chú nội bộ).
- [ ] **27.4.** Viết unit & integration tests cho toàn bộ phân hệ quản lý quan hệ khách hàng CRM.
*(Khi bắt đầu thực thi: Chạy `/opsx-propose customer-crm`)*

#### [TASK-28] Màn Hình Cài Đặt Hệ Thống, Hồ Sơ & Giám Sát Meta API Limits (`/(dashboard)/settings`) - [P2]
- [ ] **28.1.** Xây dựng API cập nhật hồ sơ cá nhân, đổi mật khẩu và API giám sát hạn mức Meta Graph API (`/api/v1/settings/meta-limits`).
- [ ] **28.2.** Xây dựng giao diện Cài đặt đa tab macOS Clean Utility (`ProfileSettingsTab`, `SecurityPasswordTab`, `ApiLimitsMonitorTab` đếm ngược hạn ngạch 4,800 cuộc gọi/24h và trạng thái Webhook Health).
- [ ] **28.3.** Viết unit & integration tests cho phân hệ cấu hình hệ thống.
*(Khi bắt đầu thực thi: Chạy `/opsx-propose settings-profile`)*

#### [TASK-29] CI/CD Pipeline & Triển Khai Production Tự Động (GitHub Actions) - [P1]
- [ ] **29.1.** Thiết lập GitHub Actions Workflows `.github/workflows/ci.yml`: tự động chạy lint, type-check, unit tests và build trên mọi PR vào `main`.
- [ ] **29.2.** Thiết lập GitHub Actions Workflow `.github/workflows/deploy.yml`: tự động build Docker images, push lên Container Registry và deploy cập nhật an toàn.
- [ ] **29.3.** Hoàn tất tài liệu hướng dẫn vận hành Production Runbook và Disaster Recovery Plan.
*(Khi bắt đầu thực thi: Chạy `/opsx-propose cicd-production-deploy`)*

---

### 📦 SPRINT ĐÃ HOÀN THÀNH: SPRINT 5 (100% DONE)
- [x] **[TASK-24]** Màn Hình Báo Cáo Phân Tích Doanh Thu & Hiệu Quả Bán Hàng (`/analytics`) - 100% DONE
- [x] **[TASK-25]** Mở Rộng Quản Lý Đa Fanpage & Phân Quyền Nhân Viên (RBAC) - 100% DONE
- [x] **[TASK-26]** Tối Ưu Hóa Hiệu Năng & Hardening Môi Trường Production - 100% DONE

---

### 📦 SPRINT ĐÃ HOÀN THÀNH: SPRINT 4 (100% DONE)
- [x] **[TASK-20]** Mô-đun Trích Xuất Thực Thể Đơn Hàng Bằng Google Gemini AI (`OrderParserService`) - 100% DONE
- [x] **[TASK-21]** Nghiệp Vụ Quản Lý Danh Mục Sản Phẩm, Biến Thể & Tồn Kho (`/api/v1/products`) - 100% DONE
- [x] **[TASK-22]** Màn Hình Giao Diện Quản Lý Đơn Hàng & Vận Đơn (`/orders`) - 100% DONE
- [x] **[TASK-23]** Tích Hợp Cổng Thanh Toán VietQR Động & Đơn Vị Vận Chuyển - 100% DONE

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
| 21/10/2026 | [TASK-22] Màn Hình Giao Diện Quản Lý Đơn Hàng & Vận Đơn (`/orders`) | **DONE** | Zustand store `order.store.ts` (multi-status filter, debounced search, optimistic status update, WebSocket listener), Bento UI components (`OrderStatusBadge`, `OrderMetrics`, `OrderTable` macOS Clean Utility, `OrderDetailDrawer` với PII phone masking & copy address, `OrderPrintModal` phiếu in nhiệt A5/A6 `@media print`), Sidebar `/orders` navigation badge; 23/23 tests pass 100%, 0 lỗi TypeScript. Hoàn thành OpenSpec `orders-management-ui`. |
| 21/10/2026 | [TASK-23] Tích Hợp Cổng Thanh Toán VietQR Động & Đơn Vị Vận Chuyển | **DONE** | Migration DDL 4 bảng (`orders`, `order_items`, `payments`, `shipments`), `VietQrHelper` chuẩn Napas 247 CRC16 & QuickLink, `PaymentWebhookService` Idempotency Redis 24h & tự động đối soát chuyển `confirmed`, Adapter pattern đối tác vận chuyển (`MockCarrierAdapter`, `GhnCarrierAdapter`, `GhtkCarrierAdapter`), 4 REST APIs `/payments/vietqr`, `/payments/webhook`, `/shipments/create`, `/shipments/:trackingCode/track`; 54/54 tests pass 100%, 0 lỗi TypeScript. Hoàn thành OpenSpec `payment-shipping-integration`. **HOÀN THÀNH SPRINT 4 (100%)**. |
| 24/10/2026 | [TASK-24] Màn Hình Báo Cáo Phân Tích Doanh Thu & Hiệu Quả Bán Hàng (`/analytics`) | **DONE** | 5 REST APIs `/api/v1/analytics/*`, `AnalyticsRepository` SQL tối ưu, `AnalyticsService` tính PoP growth & zero-division safeguard, Zustand store `analytics.store.ts` có export CSV UTF-8 BOM, cụm Bento UI (Header, Metrics, RevenueTrendChart SVG, ChannelBreakdown, TopProducts, GoldenHourHeatmap), unit & integration tests pass 100%. Hoàn thành OpenSpec `analytics-dashboard`. |
| 24/10/2026 | [TASK-25] Mở Rộng Quản Lý Đa Fanpage & Phân Quyền Nhân Viên (RBAC) | **DONE** | Bảng PostgreSQL `page_members` (`004_page_members_and_rbac.sql`) kèm backfill tự động, middleware `requirePageRole`, REST APIs `/api/v1/pages/:pageId/members/*`, chính sách bảo vệ PII che SĐT khách hàng cho vai trò `staff` (`sanitizeOrderForRole`), cụm UI macOS Bento (`PageMembersModal`, `InviteMemberModal`, `MemberRoleBadge`), Zustand store `page-member.store.ts`, pass toàn bộ unit & integration tests. Hoàn thành OpenSpec `multi-page-rbac`. |
| 24/10/2026 | [TASK-26] Tối Ưu Hóa Hiệu Năng & Hardening Môi Trường Production | **DONE** | Tầng Redis Caching `CacheService` với invalidation tự động, nén HTTP Gzip/Brotli qua `compressionMiddleware`, bộ Rate Limiting phân tầng (`globalApiLimiter`, `authLimiter`, `heavyComputationLimiter`), gia cố `helmet`, multi-stage Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile` standalone mode), cụm `docker-compose.prod.yml` 5 containers + Nginx Gateway, test tải `scripts/load-test.ts` và OWASP Top 10 security test suite `owasp-security.test.ts`. Hoàn thành OpenSpec `production-hardening`. **HOÀN THÀNH SPRINT 5 (100%)**. |




