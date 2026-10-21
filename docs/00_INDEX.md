# BỘ TÀI LIỆU THIẾT KẾ HỆ THỐNG SHOPFLOW (SYSTEM DOCUMENTATION INDEX)
## NỀN TẢNG QUẢN LÝ FANPAGE, ĐẶT LỊCH ĐĂNG BÀI & LIVE CHAT TẬP TRUNG

Chào mừng AI Coding Agent và đội ngũ kỹ sư phát triển dự án **ShopFlow**!

Để tối ưu hóa Context Window của LLM, tránh tình trạng quá tải ngữ cảnh và loại bỏ hoàn toàn việc suy đoán logic, toàn bộ tài liệu thiết kế hệ thống được phân tách thành **6 tập tin chuyên biệt theo từng miền nghiệp vụ** dưới sự điều hướng của tệp chỉ mục này.

---

### I. DANH MỤC CÁC TẬP TIN TÀI LIỆU CHUYÊN BIỆT

| Tệp tin | Tên tài liệu & Phạm vi nội dung | Khi nào cần đọc? |
| :--- | :--- | :--- |
| [`01_PRD.md`](file:///C:/Users/Dell/Desktop/ShopFlow/docs/01_PRD.md) | **Yêu cầu Sản phẩm & Nghiệp vụ (PRD)**<br>• Bối cảnh Social Commerce & Nỗi đau người dùng<br>• Chân dung khách hàng (Casual vs Power User)<br>• Phạm vi MVP vs Roadmap tương lai<br>• Ràng buộc Meta (Cửa sổ 24h, Private Reply 7 ngày, cấm Group API) | Đọc khi cần hiểu rõ mục tiêu sản phẩm, lý do sinh ra tính năng, và các ràng buộc chính sách khắt khe từ Meta. |
| [`02_ARCHITECTURE_AND_FLOWS.md`](file:///C:/Users/Dell/Desktop/ShopFlow/docs/02_ARCHITECTURE_AND_FLOWS.md) | **Kiến trúc Hệ thống & Luồng Tương tác**<br>• 3 Luồng nghiệp vụ chuẩn (OAuth, Đặt lịch, Webhook)<br>• Sơ đồ Kiến trúc Tổng thể & Giao tiếp đa tầng<br>• Chốt Tech Stack (Monorepo, `pg.Pool`, `Zod`, BullMQ Retry)<br>• Cấu trúc thư mục Backend & Frontend (Next.js 14+ App Router)<br>• Bản mẫu biến môi trường `backend/.env.example` & `frontend/.env.example` | Bắt buộc đọc khi bắt đầu dựng khung dự án (Scaffolding), cấu hình môi trường, thiết lập BullMQ workers hoặc viết các luồng nghiệp vụ liên tầng. |
| [`03_DATABASE_SCHEMA.md`](file:///C:/Users/Dell/Desktop/ShopFlow/docs/03_DATABASE_SCHEMA.md) | **Thiết kế Cơ sở Dữ liệu & SQL DDL Runnable**<br>• Sơ đồ Thực thể Quan hệ (ERD Overview)<br>• Đặc tả chi tiết 9 bảng dữ liệu quan hệ<br>• Toàn bộ mã SQL DDL chạy trực tiếp trên PostgreSQL (Tables, Indexes có điều kiện, Triggers tự động)<br>• Quy ước an toàn mã hóa AES-256 cho Meta Tokens | Bắt buộc đọc khi viết Database Migrations, Seeders, Repositories, hoặc các truy vấn SQL thao tác dữ liệu. |
| [`04_API_AND_WEBSOCKET.md`](file:///C:/Users/Dell/Desktop/ShopFlow/docs/04_API_AND_WEBSOCKET.md) | **Đặc tả REST API Nội bộ, WebSocket & Quản lý Media**<br>• Chuẩn JSON Response Envelope (`success`, `data`, `meta`, `error`)<br>• Danh mục 24+ REST API Endpoints (Auth, OAuth, Pages, Posts, Inbox, Media)<br>• Đặc tả sự kiện Socket.io (`NEW_INBOX_ITEM`, `INBOX_UPDATED`, `POST_STATUS_CHANGED`)<br>• Giải pháp upload Media qua Multer + Cloudinary Stream Upload & Sơ đồ tuần tự Sequence Diagram | Bắt buộc đọc khi viết Controller, Service, Route Middleware ở Backend, hoặc viết API Callers, React Hooks, Socket Handlers ở Frontend. |
| [`05_DESIGN_SYSTEM.md`](file:///C:/Users/Dell/Desktop/ShopFlow/docs/05_DESIGN_SYSTEM.md) | **Quy chuẩn Thiết kế Giao diện (Design System Specification)**<br>• Phong cách macOS Clean Utility & Linear Minimalist<br>• Hệ thống Design Tokens (Màu sắc, Typography, Bo góc Squircle, Đổ bóng đa tầng, Spacing 8pt)<br>• Cấu hình Tailwind CSS (`tailwind.config.ts`) và CSS Custom Properties<br>• Quy chuẩn UI Components (macOS Window & Traffic Lights, Pill CTA, Command Palette, Tables) | Bắt buộc đọc khi xây dựng giao diện người dùng, viết Components React/Next.js, cấu hình Tailwind, tạo theme hoặc chỉnh sửa CSS. |
| [`06_UI_SCREENS_AND_COMPONENTS.md`](file:///C:/Users/Dell/Desktop/ShopFlow/docs/06_UI_SCREENS_AND_COMPONENTS.md) | **Đặc tả Danh mục Màn hình & Kiến trúc Thông tin (Screen Inventory)**<br>• Sơ đồ Điều hướng Site Map & Phân cấp Tuyến đường (App Router)<br>• Phân loại mức độ ưu tiên 14 màn hình (P0 Core MVP, P1 Release Candidate, P2 Roadmap)<br>• Đặc tả chi tiết từng màn hình (Inbox 3 cột, Pages, Posts, Automation)<br>• Danh mục Modals & Khung nhìn con (Command Palette, Preview, Connect Modal) | Bắt buộc đọc khi thiết kế UI/UX, phân chia công việc Frontend, tạo các Page và Layouts trong Next.js App Router. |

---

### II. MA TRẬN HƯỚNG DẪN CHO AI CODING AGENT: "CODE PHẦN NÀO ĐỌC FILE NÀO"

Khi AI Coding Agent được giao một nhiệm vụ cụ thể, **bắt buộc phải đọc chính xác các tài liệu tương ứng** theo bảng chỉ dẫn dưới đây trước khi sinh mã:

```
+---------------------------------------------------------------------------------------------------------+
| NHIỆM VỤ ĐANG TRIỂN KHAI             | TÀI LIỆU BẮT BUỘC ĐỌC        | NỘI DUNG TRỌNG TÂM CẦN NẮM         |
+======================================+==============================+===================================+
| 1. Khởi tạo Database, Migrations,   | • 03_DATABASE_SCHEMA.md      | Chạy 100% script SQL DDL, hiểu    |
|    viết BaseRepository với pg.Pool   | • 02_ARCHITECTURE_AND_FLOWS | 9 bảng, partial indexes & triggers|
|                                      |                              | Code mẫu dbPool singleton         |
+--------------------------------------+------------------------------+-----------------------------------+
| 2. Module Xác thực (Auth & JWT)      | • 04_API_AND_WEBSOCKET.md    | Nhóm API 1 (/api/v1/auth)         |
|                                      | • 03_DATABASE_SCHEMA.md      | Bảng users, password_hash, roles  |
|                                      | • 02_ARCHITECTURE_AND_FLOWS  | Cấu hình JWT trong .env.example   |
+--------------------------------------+------------------------------+-----------------------------------+
| 3. Facebook OAuth 2.0 & Quản lý     | • 02_ARCHITECTURE_AND_FLOWS  | Luồng 1 (Token exchange, Scopes)  |
|    Page Access Tokens (AES-256)      | • 04_API_AND_WEBSOCKET.md    | Nhóm API 2 (/api/v1/fb-oauth)     |
|                                      | • 03_DATABASE_SCHEMA.md      | Bảng facebook_accounts & pages    |
+--------------------------------------+------------------------------+-----------------------------------+
| 4. Webhook Receiver, Regex Ẩn SĐT & | • 02_ARCHITECTURE_AND_FLOWS  | Luồng 3, Regex SĐT, BullMQ Retry  |
|    Auto Private Reply                | • 03_DATABASE_SCHEMA.md      | Bảng webhook_logs, rules, msgs    |
|                                      | • 04_API_AND_WEBSOCKET.md    | Phát socket NEW_INBOX_ITEM        |
+--------------------------------------+------------------------------+-----------------------------------+
| 5. Đặt lịch Đăng bài & Upload Media | • 04_API_AND_WEBSOCKET.md    | Nhóm API 4 & Luồng Media Upload   |
|    (Cloudinary -> Meta Graph API)    | • 02_ARCHITECTURE_AND_FLOWS  | Luồng 2A, scheduled_posts_queue   |
|                                      | • 03_DATABASE_SCHEMA.md      | Bảng posts_schedule, JSONB urls   |
+--------------------------------------+------------------------------+-----------------------------------+
| 6. Hộp thư Tập trung (Live Chat      | • 04_API_AND_WEBSOCKET.md    | Nhóm API 5, Socket.io Handshake,  |
|    Centralized Inbox & WebSocket)    |                              | Events NEW_INBOX_ITEM, UPDATED    |
|                                      | • 03_DATABASE_SCHEMA.md      | Bảng conversations, messages      |
|                                      | • 02_ARCHITECTURE_AND_FLOWS  | Layout 3 cột trong cây thư mục    |
+--------------------------------------+------------------------------+-----------------------------------+
| 7. Xây dựng Giao diện Frontend       | • 02_ARCHITECTURE_AND_FLOWS  | Cây thư mục Next.js 14+ chuẩn     |
|    (Next.js 14+ App Router & UI)     | • 04_API_AND_WEBSOCKET.md    | DTO types, ApiError & Envelope    |
|                                      | • 05_DESIGN_SYSTEM.md        | Design tokens, macOS components,  |
|                                      |                              | Tailwind config, Traffic lights   |
|                                      | • 06_UI_SCREENS_AND_COMPONENTS| Site Map, Danh mục 14 màn hình    |
|                                      |                              | Ưu tiên P0/P1/P2, bố cục 3 cột    |
+---------------------------------------------------------------------------------------------------------+
```

---

### III. NGUYÊN TẮC BẤT BIẾN KHI VIẾT CODE (Non-Negotiable Directives)

1. **Tuyệt đối cấm kiểu `any`:** Sử dụng TypeScript Strict Mode. Định nghĩa rõ ràng DTO/Interface khớp 100% với tệp `04_API_AND_WEBSOCKET.md`.
2. **Kiểm thực qua Zod:** Mọi dữ liệu đi vào Express (Body, Query, Params) phải đi qua generic middleware `validateRequest`.
3. **Chống SQL Injection:** Luôn sử dụng câu lệnh tham số hóa `$1, $2,...` qua `dbPool.query()`.
4. **Bảo mật Khóa & Token:** Không bao giờ lưu plain text token hoặc hardcode secret. Đọc từ `.env` và mã hóa AES-256-GCM các khóa nhạy cảm.
5. **Cửa sổ 24h của Meta:** Luôn kiểm tra trường `window_24h_expires_at` trước khi gửi tin nhắn chủ động tới khách hàng trên Messenger.
