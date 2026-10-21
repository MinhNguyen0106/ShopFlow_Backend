# ShopFlow Project Context & Living Knowledge Base

Tài liệu ngữ cảnh dự án lưu giữ kiến thức nền tảng, kiến trúc kỹ thuật và hiện trạng của nền tảng **ShopFlow** (Được chuẩn hóa đồng bộ với bộ tài liệu thiết kế tại `docs/00_INDEX.md`).

---

## 1. Mục Đích & Sứ Mệnh Sản Phẩm

**ShopFlow** là nền tảng tự động hóa quản lý Fanpage Facebook dành cho các chủ shop nhỏ và cá nhân kinh doanh B2C tại Việt Nam:
1. **Quản lý Hộp thư Tập trung (Centralized Inbox):** Gom toàn bộ bình luận (comment thread) và tin nhắn Messenger từ nhiều Fanpage kết nối về một màn hình điều khiển Live Chat 3 cột duy nhất thời gian thực.
2. **Chống "Cướp Đơn" Tức Thì (< 3 giây):** Quét Regex số điện thoại ngay khi nhận sự kiện Webhook `feed`. Tự động gọi Graph API ẩn bình luận công khai để bảo vệ dữ liệu khách hàng.
3. **Phản hồi Tự động (Auto Reply & Private Reply):** Khớp từ khóa theo quy tắc cấu hình (`automation_rules`), tự động trả lời bình luận công khai và gửi tin nhắn riêng (Private Reply trong vòng 7 ngày) kèm link trích dẫn comment.
4. **Lên Lịch Đăng Bài Chuẩn API (Page Scheduler):** Soạn thảo bài viết, tải ảnh/video lên Cloudinary và đặt lịch xuất bản tự động qua Meta Graph API (`/{page_id}/photos`, `/{page_id}/videos`, `/{page_id}/feed`) từ 10 phút đến 30 ngày (hoặc 6 tháng cho video).
5. **Gắn Nhãn & Quản Lý Khách Hàng (Customer CRM):** Lưu trữ thông tin khách hàng, số điện thoại, địa chỉ, gắn thẻ tag phân loại (`Co_SDT`, `Khach_VIP`), và ghi chú tư vấn ngay trong khung chat.

---

## 2. Bộ Công Nghệ Chuẩn Hóa (Definitive Tech Stack)

Dự án áp dụng kiến trúc **Monorepo** chia 2 thư mục gốc độc lập:

### 2.1. Backend Service (`backend/`)
* **Nền tảng runtime:** **Node.js 20+ LTS**, **Express.js (v4.x/v5.x)**, **TypeScript Strict Mode** (`strict: true`, cấm `any`).
* **Cơ sở dữ liệu:** **PostgreSQL 15+** (Hỗ trợ extension `uuid-ossp`, cột kiểu `JSONB`, check constraints, trigger tự động `update_updated_at_column`, và partial indexes).
* **Database Client:** **`pg` (node-postgres v8.x)** + `pg.Pool` Singleton + **Repository Pattern** có định kiểu, thực thi trực tiếp bộ SQL DDL runnable tại `docs/03_DATABASE_SCHEMA.md` với câu lệnh tham số hóa `$1, $2,...` chống SQL Injection (thay thế hoàn toàn Prisma).
* **Validation Engine:** **`Zod` (v3.x)** kiểm thực toàn diện Request Body, Query String, URL Params và phân tích biến môi trường khởi chạy (`envSchema`).
* **Hàng đợi & Caching:** **Redis 7+** & **BullMQ (v5.x)**
  * Điều tiết tải Webhook, quét Regex SĐT, xuất bản bài viết hẹn giờ.
  * Cấu hình Exponential Backoff khi dính Meta Rate Limit (Error 613 / 80001): `attempts: 5`, `backoff: { type: 'exponential', delay: 3000 }`.
* **Lưu trữ Media:** **Multer (MemoryStorage)** kết hợp **Cloudinary SDK v2** (Stream buffer trực tiếp từ RAM), cấp đường dẫn HTTPS công khai (`secure_url`) theo yêu cầu của Meta Graph API.
* **Giao tiếp Thời gian Thực:** **Socket.io (v4.x)** với phân vùng phòng `room:user_{id}` và `room:page_{id}`.
* **Bảo mật & Mã hóa:**
  * Mã hóa **AES-256-GCM** cho toàn bộ `page_access_token` và `user_access_token` trong DB (khóa 32-byte hex ngẫu nhiên).
  * Xác thực Webhook bằng HMAC-SHA256 với `crypto.timingSafeEqual` trên raw body buffer.
  * Xác thực người dùng bằng JWT (Access Token 15 phút, Refresh Token 7 ngày trong HttpOnly Cookie).

### 2.2. Frontend Dashboard (`frontend/`)
* **Khung ứng dụng:** **Next.js 14+ (App Router)**, **React 18+**, **TypeScript Strict Mode**.
* **Giao diện & Styling:** **Tailwind CSS**, **Lucide React**, **Radix UI / Shadcn UI**.
* **Quản trị State & Realtime:** **Socket.io-client**, **Axios** (kèm Bearer Token Interceptor), **React Hook Form** + `@hookform/resolvers/zod`.
* **5 Màn hình cốt lõi:**
  1. `(auth)/login` & `(auth)/register`: Đăng nhập, đăng ký tài khoản.
  2. `(dashboard)/pages`: Quản lý danh sách Fanpage, kết nối Meta OAuth 2.0, toggle On/Off.
  3. `(dashboard)/automation`: Thiết lập quy tắc tự động ẩn SĐT, từ khóa kích hoạt, mẫu trả lời comment & private reply.
  4. `(dashboard)/posts`: Lịch đăng bài (Calendar view / Table view) và màn hình soạn bài viết `posts/new`.
  5. `(dashboard)/inbox`: Giao diện Live Chat 3 cột tập trung (Cột 1: Kênh & Lọc, Cột 2: Danh sách hội thoại, Cột 3: Khung chat thời gian thực & Bảng thông tin khách hàng).

---

## 3. Bản Đồ Dữ Liệu 9 Bảng (Core Data Schema)

1. `users`: Tài khoản chủ shop/nhân viên (`id`, `email`, `password_hash`, `full_name`, `role`).
2. `facebook_accounts`: Tài khoản Facebook cá nhân đã OAuth (`user_id`, `fb_user_id`, `user_access_token` encrypted).
3. `connected_pages`: Fanpage được kết nối (`page_id`, `page_name`, `page_access_token` encrypted, `is_active`, `webhook_subscribed`).
4. `automation_rules`: Quy tắc tự động của từng Page (`hide_phone_enabled`, `trigger_keywords`, `auto_comment_template`, `auto_private_reply_template`).
5. `posts_schedule`: Bài viết đặt lịch (`media_type`, `media_urls`, `scheduled_time`, `status`: pending/scheduled/published/failed).
6. `customers`: Khách hàng tương tác (`page_id`, `customer_fb_id`, `customer_name`, `phone_number`, `tags`, `notes`).
7. `conversations`: Hội thoại tập trung (`type`: messenger/comment_thread, `meta_thread_id`, `window_24h_expires_at`, `unread_count`, `status`).
8. `messages_and_comments`: Chi tiết từng tương tác (`meta_id`, `sender_type`, `content`, `is_hidden`, `private_reply_sent`, `media_payload`).
9. `webhook_logs`: Nhật ký sự kiện Webhook từ Meta đảm bảo tính Idempotency (`event_id`, `payload`, `status`).

---

## 4. Các Giới Hạn Kỹ Thuật & Ràng Buộc Bắt Buộc (Meta Compliance)

- **Cửa sổ Tin nhắn 24 giờ (Standard Messaging Window):** Chỉ gửi tin nhắn chủ động tới khách hàng trên Messenger trong vòng 24 giờ kể từ tương tác cuối cùng (`window_24h_expires_at`).
- **Giới hạn Private Reply:** Chỉ gửi tin nhắn riêng tối đa **1 lần duy nhất** cho mỗi bình luận và trong vòng **7 ngày** kể từ khi bình luận xuất hiện.
- **Ràng buộc Thời gian Đăng bài:** Thời điểm hẹn giờ `scheduled_time` phải lớn hơn hiện tại ít nhất **10 phút** và không quá **30 ngày** (ảnh/feed) hoặc tối đa **6 tháng** (video).
- **Ràng buộc Media:** Hình ảnh JPG/PNG/WEBP <= 4MB; Video MP4/MOV <= 1GB; URL media gửi sang Meta bắt buộc là **Public HTTPS URL** từ Cloudinary.
- **Tuyệt đối KHÔNG sử dụng Groups API:** Meta đã hủy quyền `publish_to_groups` từ 22/04/2024. Không sử dụng tool/extension lách luật tránh nguy cơ bị khóa Page/App ID vĩnh viễn.

---

## 5. Cấu Trúc Hệ Thống Tài Liệu (`docs/`)
- [`docs/00_INDEX.md`](file:///C:/Users/Dell/Desktop/ShopFlow/docs/00_INDEX.md): Mục lục trung tâm & Ma trận chỉ dẫn "Code phần nào đọc file nào".
- [`docs/01_PRD.md`](file:///C:/Users/Dell/Desktop/ShopFlow/docs/01_PRD.md): Khảo sát yêu cầu sản phẩm & phân tích nghiệp vụ.
- [`docs/02_ARCHITECTURE_AND_FLOWS.md`](file:///C:/Users/Dell/Desktop/ShopFlow/docs/02_ARCHITECTURE_AND_FLOWS.md): Luồng người dùng, sơ đồ kiến trúc, tech stack, thư mục & `.env.example`.
- [`docs/03_DATABASE_SCHEMA.md`](file:///C:/Users/Dell/Desktop/ShopFlow/docs/03_DATABASE_SCHEMA.md): Mô hình ERD, định nghĩa 9 bảng, toàn bộ mã SQL DDL Runnable.
- [`docs/04_API_AND_WEBSOCKET.md`](file:///C:/Users/Dell/Desktop/ShopFlow/docs/04_API_AND_WEBSOCKET.md): Chuẩn JSON Response, 24+ REST APIs, WebSocket events & Media upload sequence flow.
