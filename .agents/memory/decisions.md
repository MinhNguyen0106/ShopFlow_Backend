# Architecture Decision Records (ADR) - ShopFlow

Tài liệu ghi nhận các quyết định kiến trúc quan trọng kèm bối cảnh, lý do lựa chọn và hệ quả đối với nền tảng **ShopFlow**.

---

## ADR-001: Lựa Chọn Express.js & TypeScript cho Backend Webhook & API Service
- **Ngày quyết định:** 2026-10-17
- **Trạng thái:** ACCEPTED
- **Bối cảnh:** Cần xử lý luồng Webhook Meta gửi đến liên tục với độ trễ thấp, đồng thời xác thực chữ ký thô (raw body buffer) và tích hợp các middleware bảo mật.
- **Quyết định:** Sử dụng Express.js kết hợp TypeScript ở chế độ Strict.
- **Hệ quả:** Kiểm soát toàn diện middleware (lưu raw body cho HMAC verification trước khi JSON parse), hệ sinh thái middleware phong phú, cộng đồng hỗ trợ lớn và dễ triển khai độc lập.

---

## ADR-002: Lựa Chọn Redis & BullMQ Cho Hàng Đợi Xử Lý Webhook & Scheduler
- **Ngày quyết định:** 2026-10-17 (Cập nhật 2026-10-19)
- **Trạng thái:** ACCEPTED
- **Bối cảnh:** Meta gửi hàng loạt webhook khi bài đăng có tương tác lớn. Nếu gọi ngược lại Graph API dồn dập, hệ thống sẽ bị chặn vì vi phạm chính sách Spam hoặc dính Rate Limit (Lỗi 613 / 80001).
- **Quyết định:** Phân tách Webhook Ingestion và Processing. Endpoint webhook phản hồi ngay `200 OK` trong vòng < 200ms. Sử dụng BullMQ để xử lý bất đồng bộ các tác vụ: quét Regex ẩn SĐT, gửi Private Reply, và lên lịch xuất bản bài viết hẹn giờ (Delay Job).
- **Cấu hình Retry Chuẩn Hóa:** `attempts: 5`, `backoff: { type: 'exponential', delay: 3000 }` (thử lại sau 3s, 6s, 12s, 24s, 48s).
- **Hệ quả:** Đảm bảo độ sẵn sàng cao, không bị Meta hủy webhook, và tự động hồi phục khi chạm trần Rate Limit.

---

## ADR-003: Chuyển Đổi Sang PostgreSQL 15+ Làm Cơ Sở Dữ Liệu Quan Hệ Trung Tâm
- **Ngày quyết định:** 2026-10-19 (Thay thế quyết định MySQL ban đầu)
- **Trạng thái:** SUPERSEDED
- **Bối cảnh:** Dự án cần lưu trữ cấu trúc JSON linh hoạt (`JSONB`), các chỉ mục có điều kiện (Partial Indexes) để lọc bài đăng `pending`, khách hàng có SĐT, quy tắc đang kích hoạt, và các trigger tự động cập nhật thời gian.
- **Quyết định:** Sử dụng **PostgreSQL 15+** với extension `uuid-ossp`, kiểu dữ liệu `JSONB`, và các hàm trigger native `update_updated_at_column`.
- **Hệ quả:** Tối ưu hóa hiệu năng truy vấn cho bảng hội thoại lớn, hỗ trợ chỉ mục từng phần khắt khe, kiểm soát toàn vẹn khóa ngoại (CASCADE/SET NULL) mượt mà.

---

## ADR-004: Chiến Lược Trích Xuất & Bảo Vệ Khách Hàng (Regex First, Auto-Hide SĐT < 3s)
- **Ngày quyết định:** 2026-10-17 (Cập nhật 2026-10-19)
- **Trạng thái:** ACCEPTED
- **Bối cảnh:** Khách hàng bình luận số điện thoại công khai trên Fanpage thường xuyên bị đối thủ cướp đơn hoặc lừa đảo.
- **Quyết định:** 
  1. Quét Regex số điện thoại Việt Nam `/(03|05|07|08|09|01[2689])+([0-9]{8})\b/` ngay tại Worker trong thời gian < 3 giây.
  2. Nếu phát hiện SĐT, lập tức gọi Graph API `POST /{comment_id}` với `is_hidden: true` và gắn tag `Co_SDT` cho khách hàng.
  3. Tự động gửi Private Reply thông báo cho khách hàng đã tiếp nhận thông tin (trong vòng 7 ngày).
- **Hệ quả:** Chống cướp đơn tuyệt đối, bảo mật PII khách hàng, cải thiện tỷ lệ chốt đơn mà không tốn chi phí gọi LLM liên tục.

---

## ADR-005: Xác Thực Webhook Chữ Ký Bắt Buộc (HMAC-SHA256 Timing-Safe)
- **Ngày quyết định:** 2026-10-17
- **Trạng thái:** ACCEPTED
- **Bối cảnh:** Kẻ tấn công có thể giả mạo request gửi đến endpoint Webhook nhằm spam dữ liệu giả hoặc khai thác lỗ hổng Timing Attack.
- **Quyết định:** Mọi request tới `/api/v1/webhooks/facebook` phải được giữ nguyên Raw Body Buffer và xác thực chữ ký `x-hub-signature-256` qua thuật toán `crypto.timingSafeEqual`.
- **Hệ quả:** Ngăn chặn triệt để tấn công giả mạo và tấn công thời gian.

---

## ADR-006: Lựa Chọn Next.js 14+ (App Router) Cho Bảng Quản Trị (Dashboard)
- **Ngày quyết định:** 2026-10-17
- **Trạng thái:** ACCEPTED
- **Bối cảnh:** Cần xây dựng giao diện hiện đại, tải trang nhanh, cung cấp Live Chat tương tác mượt mà và quản lý nhiều Fanpage.
- **Quyết định:** Sử dụng Next.js 14+ (App Router), Tailwind CSS, Lucide React, và Radix UI / Shadcn UI.
- **Hệ quả:** Phân tách rõ ràng giữa Server Components (render layout, SSR) và Client Components (`use client` cho Live Chat, tương tác DOM và Socket).

---

## ADR-007: Sử Dụng `pg` (node-postgres) + Repository Pattern Thay Thế Prisma ORM
- **Ngày quyết định:** 2026-10-19
- **Trạng thái:** ACCEPTED
- **Bối cảnh:** Tệp SQL DDL tại `docs/03_DATABASE_SCHEMA.md` chứa nhiều đặc tính native của PostgreSQL: `CREATE EXTENSION "uuid-ossp"`, Partial Indexes (`WHERE status = 'pending'`, `WHERE phone_number IS NOT NULL`), CHECK constraints và Triggers. Prisma gặp nhiều rào cản khi đồng bộ hóa các tính năng này và phát sinh overhead trừu tượng hóa.
- **Quyết định:** Chốt dứt khoát sử dụng thư viện **`pg` (node-postgres v8.x)** kết hợp `pg.Pool` Singleton và **Repository Pattern** có định kiểu TypeScript.
- **Hệ quả:** 
  - Tái sử dụng 100% tệp SQL DDL runnable mà không gặp lỗi migration.
  - Kiểm soát hoàn toàn câu lệnh tham số hóa `$1, $2,...` ngăn chặn 100% rủi ro SQL Injection.
  - Hiệu năng truy vấn cao, thời gian khởi động nhanh và dung lượng package nhỏ gọn.

---

## ADR-008: Lưu Trữ Phương Tiện Đám Mây Qua Multer MemoryStorage & Cloudinary Stream Upload
- **Ngày quyết định:** 2026-10-19
- **Trạng thái:** ACCEPTED
- **Bối cảnh:** Meta Graph API yêu cầu tham số hình ảnh (`POST /{page_id}/photos`) và video (`POST /{page_id}/videos`) phải trỏ tới một liên kết **Public HTTPS URL** có thể truy cập được từ máy chủ Meta.
- **Quyết định:** 
  1. Frontend gửi file qua `multipart/form-data`.
  2. Backend Express sử dụng `multer` cấu hình `memoryStorage()` giữ buffer trong RAM.
  3. Service stream trực tiếp buffer lên Cloudinary thông qua SDK `cloudinary.v2.uploader.upload_stream` với folder `shopflow/posts/`.
  4. Trả về `secure_url` (HTTPS URL) lưu vào DB và gửi sang Meta khi đến giờ xuất bản.
- **Hệ quả:** Không lưu file rác trên ổ cứng máy chủ Backend, tận dụng CDN toàn cầu của Cloudinary và luôn đáp ứng 100% chuẩn HTTPS của Meta Graph API.

---

## ADR-009: Chuẩn Hóa Kiến Trúc Monorepo, Zod Validation & Mã Hóa AES-256-GCM
- **Ngày quyết định:** 2026-10-19
- **Trạng thái:** ACCEPTED
- **Bối cảnh:** Cần đảm bảo tính đồng nhất tuyệt đối giữa Frontend và Backend, đồng thời bảo vệ bí mật Meta Token và validate dữ liệu chặt chẽ.
- **Quyết định:**
  - Tổ chức Monorepo với 2 thư mục gốc: `backend/` và `frontend/`.
  - Validate 100% Request Body, Query, Params và file biến môi trường (`.env`) bằng thư viện **`Zod`**.
  - Mã hóa toàn bộ `page_access_token` và `user_access_token` bằng thuật toán **AES-256-GCM** (khóa 32-byte hex ngẫu nhiên) trước khi lưu vào PostgreSQL.
- **Hệ quả:** Phát hiện sớm lỗi sai kiểu dữ liệu ngay tại tầng Middleware, ngăn chặn rò rỉ Access Token ngay cả khi cơ sở dữ liệu bị lộ.

---

## ADR-010: Kiến Trúc Live Chat Tập Trung (Centralized Inbox) Với Socket.io & Layout 3 Cột
- **Ngày quyết định:** 2026-10-19
- **Trạng thái:** ACCEPTED
- **Bối cảnh:** Nhân viên trực chat cần giao diện phản hồi nhanh, không bị phân tán giữa các Fanpage và cập nhật tin tức thời gian thực (< 1.5s).
- **Quyết định:**
  - Sử dụng **Socket.io** với phòng phân vùng theo người dùng (`room:user_{id}`) và theo trang (`room:page_{id}`).
  - Thiết kế màn hình Live Chat 3 cột chuyên dụng tại `frontend/src/app/(dashboard)/inbox/page.tsx`:
    - Cột 1: Kênh & Bộ lọc tương tác (Page, Messenger, Comment thread, Trạng thái).
    - Cột 2: Danh sách cuộc trò chuyện, tìm kiếm khách hàng, đếm tin chưa đọc, huy hiệu cửa sổ 24h.
    - Cột 3: Khung chat thời gian thực (Bubble chat, badge Ẩn SĐT, gửi Private Reply) kết hợp Bảng thông tin khách hàng (SĐT, tag, ghi chú).
- **Hệ quả:** Nâng cao 200% năng suất làm việc của nhân viên, không bao giờ bỏ sót tin nhắn của khách.

---

## ADR-011: Mô-đun Hóa Bộ Tài Liệu Thiết Kế Hệ Thống
- **Ngày quyết định:** 2026-10-19
- **Trạng thái:** ACCEPTED
- **Bối cảnh:** Tệp `docs/DESIGN.md` ban đầu vượt quá 1000 dòng, gây khó khăn cho việc tra cứu và làm quá tải Context Window của LLM khi code từng phân hệ độc lập.
- **Quyết định:** Phân tách `DESIGN.md` thành 5 tệp chuyên biệt:
  - `docs/00_INDEX.md`: Mục lục trung tâm & Ma trận chỉ dẫn "Code phần nào đọc file nào".
  - `docs/01_PRD.md`: Nghiệp vụ & Yêu cầu sản phẩm.
  - `docs/02_ARCHITECTURE_AND_FLOWS.md`: Luồng tương tác, kiến trúc tổng thể, tech stack, cây thư mục và `.env`.
  - `docs/03_DATABASE_SCHEMA.md`: Mô hình ERD, chi tiết 9 bảng và toàn bộ SQL DDL runnable.
  - `docs/04_API_AND_WEBSOCKET.md`: Chuẩn JSON response, 24+ REST APIs, Socket.io payload và Media upload sequence diagram.
- **Hệ quả:** Tối ưu hóa Context Window cho AI Coding Agent, mỗi nhiệm vụ chỉ cần nạp đúng 1 - 2 file tương ứng, loại bỏ 100% sự suy đoán mơ hồ.
