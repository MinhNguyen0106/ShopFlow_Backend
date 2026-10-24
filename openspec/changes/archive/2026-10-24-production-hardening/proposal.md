# Proposal: Tối Ưu Hóa Hiệu Năng & Hardening Môi Trường Production (TASK-26)

## Why

Sau khi hoàn thiện toàn bộ các phân hệ nghiệp vụ cốt lõi từ Sprint 1 đến Sprint 5 (Xử lý Webhook Facebook, AI Gemini trích xuất đơn hàng, Quản lý kho sản phẩm, Live Chat 4-Pane Bento, Đặt lịch xuất bản bài viết, Thanh toán VietQR động, Báo cáo phân tích doanh thu và Phân quyền nhân viên RBAC), hệ thống **ShopFlow** chuẩn bị bước vào giai đoạn triển khai và vận hành thực tế trên môi trường Production (Go-Live).

Tuy nhiên, mã nguồn và kiến trúc triển khai hiện tại vẫn còn tồn tại các điểm nghẽn về hiệu năng và rủi ro bảo mật hạ tầng cần được gia cố (hardening):
1. **Truy vấn cơ sở dữ liệu lặp lại nhiều lần (Database Overhead):** Các truy vấn xem danh mục sản phẩm, tìm kiếm sản phẩm và kiểm tra trạng thái Fanpage hiện đang truy vấn trực tiếp vào PostgreSQL trên mọi HTTP request. Khi hàng trăm nghìn khách hàng tương tác cùng lúc qua bình luận và tin nhắn Facebook, database sẽ dễ rơi vào trạng thái nghẽn cổ chai (I/O Bottleneck).
2. **Payload truyền tải chưa được tối ưu nén:** Các phản hồi JSON lớn (danh mục sản phẩm, lịch sử chat, báo cáo doanh thu) chưa được nén Gzip/Brotli ở tầng ứng dụng, dẫn đến tiêu tốn băng thông và tăng độ trễ mạng (latency) đối với người dùng di động.
3. **Thiếu cơ chế Rate Limiting phân tầng:** Hiện tại chỉ có rate limiter cơ bản lưu RAM cho endpoint đăng ký, chưa có Global API Rate Limiter hay chống DDoS/brute-force diện rộng đối với các endpoint nhạy cảm (Đăng nhập, Quét đơn AI, Webhook burst).
4. **Hạ tầng triển khai Production chưa được đóng gói hoàn chỉnh:** Dự án mới chỉ có `docker-compose.yml` cho môi trường phát triển cục bộ (chỉ chứa Postgres và Redis). Chưa có `Dockerfile` tối ưu hóa nhiều tầng (Multi-stage build) cho Backend và Next.js Frontend, chưa có cấu hình Nginx Reverse Proxy làm API Gateway bảo mật, định tuyến Socket.io, và xử lý SSL/TLS termination.
5. **Thiếu kịch bản kiểm thử tải và audit an ninh tự động:** Chưa có bộ script đo lường hiệu năng tải (Load Testing) và test suite tự động kiểm tra các tiêu chuẩn bảo mật OWASP Top 10 (SQL Injection, XSS, Security Headers, Rate Limiting).

Việc triển khai **TASK-26: Tối Ưu Hóa Hiệu Năng & Hardening Môi Trường Production** là bước đi quyết định để đưa ShopFlow thành nền tảng SaaS ổn định, chịu tải cao, sẵn sàng phục vụ hàng nghìn chủ shop online tại Việt Nam với SLA 99.9%.

---

## What Changes

- **Tầng Redis Caching & Cache Invalidation Service (`backend/src/infrastructure/cache/cache.service.ts`):**
  - Xây dựng module `CacheService` tái sử dụng kết nối `ioredis` hiện có trong hệ thống, cung cấp các phương thức chuẩn: `get`, `set` (hỗ trợ TTL theo giây), `del`, `invalidateByPattern`, `getOrSet` (Cache-Aside pattern).
  - Tích hợp caching cho phân hệ Sản phẩm (`/api/v1/products`):
    - Khóa cache: `cache:products:${pageId}:*` (lưu kết quả danh sách sản phẩm, phân trang, lọc danh mục) với TTL 10 phút (600s).
    - Tự động xóa sạch cache (Cache Invalidation) của Fanpage tương ứng ngay khi có thao tác tạo mới, cập nhật sản phẩm hoặc điều chỉnh tồn kho (`adjustStock`).
  - Tích hợp caching cho trạng thái kết nối Fanpage (`cache:fanpage:${pageId}`) với TTL 30 phút (1800s), tự động hủy cache khi cập nhật cài đặt hoặc ngắt kết nối.
- **Tầng Middleware Nén Dữ Liệu & Gia Cố Bảo Mật (Compression & Security Hardening):**
  - Tích hợp middleware `compression` nén Gzip/Deflate cho toàn bộ phản hồi HTTP có dung lượng trên 1KB (`threshold: 1024`), tự động bỏ qua các kết nối Server-Sent Events (SSE) hoặc streaming.
  - Xây dựng bộ Rate Limiting phân tầng bằng Redis/Memory:
    - `globalApiLimiter`: Giới hạn 100 requests / phút / IP cho toàn bộ các endpoint API công khai.
    - `authLimiter`: Giới hạn 10 requests / 15 phút / IP cho các endpoint đăng nhập (`/auth/login`) và đổi mật khẩu để ngăn chặn tấn công dò mật khẩu (Brute-force Attack).
    - `burstProtectionLimiter`: Bảo vệ các endpoint tính toán nặng (Gemini AI parsing, export CSV).
  - Bổ sung cấu hình `helmet` nâng cao: Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), X-Content-Type-Options, Referrer-Policy, và Cross-Origin Resource Policy.
- **Đóng Gói Docker Compose Production & Cấu Hình Nginx Reverse Proxy:**
  - Viết `backend/Dockerfile` multi-stage: Base -> Dependencies -> Builder (TypeScript compilation) -> Runner (node:20-alpine, non-root user `node`, chỉ chứa `dist/` và production `node_modules`, kích thước < 150MB).
  - Viết `frontend/Dockerfile` multi-stage: Base -> Dependencies -> Builder (`next build` với cấu hình standalone output) -> Runner (chạy file `server.js` độc lập siêu nhẹ, không cần cài đặt devDependencies).
  - Xây dựng cấu hình Nginx Reverse Proxy (`nginx/nginx.conf` và `nginx/conf.d/shopflow.conf`):
    - Định tuyến `/api/` và `/health` tới Backend container (`http://backend:5000`).
    - Định tuyến `/socket.io/` tới Backend với đầy đủ WebSocket upgrade headers (`Upgrade $http_upgrade`, `Connection "upgrade"`).
    - Định tuyến `/` và static assets tới Next.js Frontend container (`http://frontend:3000`).
    - Bật nén Gzip tại Nginx, cấu hình client buffer limits, SSL/TLS stub, và bảo mật ẩn phiên bản Nginx (`server_tokens off`).
  - Xây dựng `docker-compose.prod.yml`: Phối hợp 5 services (`nginx`, `frontend`, `backend`, `postgres`, `redis`) với healthcheck đồng bộ theo thứ tự phụ thuộc (`depends_on` với `condition: service_healthy`), gắn giới hạn tài nguyên CPU/RAM (`deploy.resources.limits`), và logging rotation an toàn.
- **Bộ Kiểm Thử Tải (Load Testing) & Bộ Kiểm Thử An Toàn OWASP Top 10:**
  - Kịch bản kiểm thử tải tự động `scripts/load-test.ts` (sử dụng Autocannon / benchmark script):
    - Đo lường thông số thông lượng (Requests Per Second - RPS), độ trễ trung bình, p95, p99 latency trên các endpoints đọc sản phẩm và analytics trước vs sau khi kích hoạt Redis Caching.
  - Bộ kiểm thử an toàn tự động `backend/tests/security/owasp-security.test.ts`:
    - Xác thực phòng chống SQL Injection (Prepared statements & validation reject).
    - Xác thực bảo vệ chống XSS và phản hồi các headers an toàn (HSTS, CSP, X-Frame-Options).
    - Xác thực hoạt động của Rate Limiting (trả về mã 429 Too Many Requests và header `Retry-After`).
    - Xác thực CORS Origin Whitelist (từ chối requests từ origin lạ không được cấu hình).

---

## Capabilities

### New Capabilities
- `production-hardening`: Kiến trúc gia cố môi trường Production toàn diện, bao gồm bộ nhớ đệm Redis Caching với invalidation tự động, nén HTTP Gzip/Brotli, rate limiting phân tầng, đóng gói Docker multi-stage, cấu hình Nginx Reverse Proxy Gateway và bộ kiểm thử an toàn bảo mật OWASP Top 10.

### Modified Capabilities
- `product-catalog-service`: Tích hợp tầng cache `CacheService` vào controller và service để tăng tốc độ truy vấn danh mục sản phẩm lên gấp 5-10 lần và tự động hủy cache khi có thay đổi dữ liệu.
- `pages-management`: Tích hợp cache thông tin và trạng thái Fanpage, giảm tải truy vấn lặp lại trên database PostgreSQL.

---

## Impact

- **Phần mềm bị ảnh hưởng:**
  - `backend/src/app.ts`: Đăng ký middleware `compression`, `helmet` cấu hình mở rộng, và `globalApiLimiter`.
  - `backend/src/infrastructure/cache/`: Thư mục mới chứa `cache.service.ts` và unit tests.
  - `backend/src/core/services/product.service.ts`: Bổ sung kiểm tra cache và xóa cache khi ghi dữ liệu.
  - `backend/src/core/services/connected-page.service.ts`: Bổ sung kiểm tra cache và xóa cache.
  - Thư mục gốc dự án: Thêm `backend/Dockerfile`, `frontend/Dockerfile`, `nginx/nginx.conf`, `nginx/conf.d/shopflow.conf`, `docker-compose.prod.yml`, và `.env.production.example`.
  - Thư mục kiểm thử: Thêm `backend/tests/security/owasp-security.test.ts` và `scripts/load-test.ts`.
- **Rủi ro & Giải pháp giảm thiểu:**
  - *Rủi ro dữ liệu cache bị cũ (Stale Cache):* Giải quyết triệt để bằng cơ chế chủ động xóa cache theo tiền tố Fanpage (`invalidateByPattern(`cache:products:${pageId}:*`)`) ngay trong cùng transaction hoặc ngay sau khi commit mutation.
  - *Rủi ro nén làm tăng tải CPU khi server đang chịu tải cao:* Đặt ngưỡng nén tối thiểu `threshold: 1024` bytes, chỉ nén các phản hồi dạng text/json đủ lớn.
  - *Rủi ro chặn nhầm request hợp lệ qua Rate Limiter:* Cấu hình ngưỡng rate limit rộng rãi cho API thông thường (100 req/min) và chỉ siết chặt ở các endpoint nhạy cảm (Auth, Brute-force). Hỗ trợ header `Retry-After` chuẩn RFC.
