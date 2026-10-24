# Technical Design: Tối Ưu Hóa Hiệu Năng & Hardening Môi Trường Production (TASK-26)

## 1. Kiến Trúc Tổng Thể Môi Trường Production (System Architecture)

Hệ thống ShopFlow khi vận hành trên môi trường Production được tổ chức theo mô hình cụm container biệt lập, định tuyến qua Nginx Reverse Proxy làm API Gateway duy nhất, có phân tách mạng nội bộ và kiểm soát tải qua Redis Cache.

```mermaid
graph TD
    Client["Client (Browser / Mobile / Facebook Webhook)"] -->|HTTP / HTTPS: 80 / 443| Nginx["Nginx Reverse Proxy & API Gateway"]
    
    subgraph "Docker Production Network (shopflow_network)"
        Nginx -->|/ (Dashboard & Static)| Frontend["Next.js 14 Frontend (Standalone Mode :3000)"]
        Nginx -->|/api/* & /health| Backend["Express.js Backend Service (:5000)"]
        Nginx -->|/socket.io/* (WS Upgrade)| Backend
        
        Backend -->|Query / Mutation| Postgres[("PostgreSQL 15 (ACID Storage :5432)")]
        Backend -->|Cache Get/Set & Invalidate| Redis[("Redis 7 (BullMQ & Caching :6379)")]
    end
```

---

## 2. Thiết Kế Tầng Đệm Redis Cache (`CacheService`)

### 2.1 Cấu Trúc Module & Quy Ước Đặt Tên Khóa (Key Convention)

Mô-đun `CacheService` được đặt tại `backend/src/infrastructure/cache/cache.service.ts`, quản lý tập trung toàn bộ tương tác lưu trữ tạm thời với Redis.

- **Namespace phân định rõ ràng:**
  - Danh mục sản phẩm theo Fanpage: `cache:products:${pageId}:list:${queryStringHash}` (TTL: 600 giây - 10 phút)
  - Chi tiết sản phẩm: `cache:products:${pageId}:item:${productId}` (TTL: 600 giây)
  - Thông tin & Trạng thái Fanpage: `cache:fanpage:${pageId}:info` (TTL: 1800 giây - 30 phút)
  - Token Blacklist / Session Flag: `cache:auth:blacklist:${jti}` (TTL: theo thời gian hết hạn của JWT)

### 2.2 Giao Diện Lập Trình (API Interface)

```typescript
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidateByPattern(pattern: string): Promise<number>;
  getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T>;
}
```

### 2.3 Cơ Chế Hủy Cache Tự Động (Active Cache Invalidation)

Để ngăn chặn hiện tượng dữ liệu cũ (stale data):
- Khi bất kỳ thao tác nào làm biến động danh mục sản phẩm của Fanpage diễn ra (`createProduct`, `updateProduct`, `deleteProduct`, `adjustStock`):
  ```typescript
  // Invalidate toàn bộ cache danh sách và chi tiết của page đó
  await cacheService.invalidateByPattern(`cache:products:${pageId}:*`);
  ```
- Khi Fanpage cập nhật cấu hình hoặc ngắt kết nối:
  ```typescript
  await cacheService.del(`cache:fanpage:${pageId}:info`);
  ```

---

## 3. Thiết Kế Tầng Middleware: Nén Dữ Liệu & Bảo Mật Rate Limiting

### 3.1 Nén Dữ Liệu HTTP (`compression`)

- Tích hợp middleware `compression` vào `backend/src/app.ts`:
  - Thuật toán: Hỗ trợ Gzip và Deflate.
  - Ngưỡng nén: `threshold: 1024` (chỉ nén phản hồi ≥ 1KB để tránh lãng phí chu kỳ CPU trên các gói tin nhỏ).
  - Bộ lọc: Bỏ qua nén khi client không hỗ trợ hoặc khi phản hồi là Server-Sent Events (SSE) `text/event-stream`.

### 3.2 Bộ Rate Limiting Phân Tầng Chống Brute-force & DDoS

| Tên Limiter | Phạm vi áp dụng | Cấu hình giới hạn | Mục đích bảo vệ |
| :--- | :--- | :--- | :--- |
| `globalApiLimiter` | Toàn bộ endpoint `/api/v1/*` | 100 requests / 1 phút / IP | Chống spam API dồn dập và DDoS cơ bản |
| `authLimiter` | `/api/v1/auth/login`, `/auth/register` | 10 requests / 15 phút / IP | Chống brute-force dò tìm mật khẩu |
| `heavyComputationLimiter` | `/api/v1/analytics/export-csv`, AI Parsing | 15 requests / 1 phút / IP | Bảo vệ tài nguyên tính toán máy chủ |

Khi vượt quá giới hạn:
- Trả về mã lỗi HTTP `429 Too Many Requests`.
- Đính kèm header `Retry-After: <seconds>` và `X-RateLimit-Reset`.

### 3.3 Thiết Lập Tiêu Đề An Toàn Nâng Cao (Helmet Hardening)

Cấu hình `helmet` trong `backend/src/app.ts`:
- `contentSecurityPolicy`: Giới hạn nguồn script, style, image, connect.
- `strictTransportSecurity`: `max-age=15552000; includeSubDomains; preload` (HSTS 180 ngày).
- `noSniff`: `X-Content-Type-Options: nosniff`.
- `frameguard`: Chặn clickjacking với `X-Frame-Options: SAMEORIGIN`.
- `hidePoweredBy`: Loại bỏ hoàn toàn header `X-Powered-By: Express`.

---

## 4. Thiết Kế Đóng Gói Docker & Nginx Reverse Proxy Gateway

### 4.1 Backend Multi-stage Dockerfile (`backend/Dockerfile`)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 5000
CMD ["dumb-init", "node", "dist/index.js"]
```

### 4.2 Frontend Next.js Standalone Dockerfile (`frontend/Dockerfile`)

- Bật chế độ `output: 'standalone'` trong `frontend/next.config.js`.
- Multi-stage build (deps -> builder -> runner) với base `node:20-alpine`.
- Chỉ sao chép thư mục standalone `.next/standalone` và thư mục static `.next/static`, `public/`.
- Chạy bằng lệnh `node server.js` với tài khoản `USER node`, kích thước image giảm từ ~1.2GB xuống < 180MB.

### 4.3 Cấu Hình Nginx Reverse Proxy (`nginx/conf.d/shopflow.conf`)

- Khai báo upstream:
  - `upstream backend_server { server backend:5000; keepalive 32; }`
  - `upstream frontend_server { server frontend:3000; keepalive 32; }`
- Định tuyến phân luồng:
  - `location /api/`: Chuyển tiếp tới `backend_server` với đầy đủ `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.
  - `location /health`: Chuyển tiếp tới backend để kiểm tra trạng thái dịch vụ.
  - `location /socket.io/`: Chuyển tiếp tới `backend_server` với các tiêu đề WebSocket Upgrade:
    ```nginx
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    ```
  - `location /_next/static/`: Cấu hình client cache vĩnh viễn (`Cache-Control "public, max-age=31536000, immutable"`).
  - `location /`: Chuyển tiếp toàn bộ trang giao diện tới `frontend_server`.
- Ẩn thông tin phiên bản máy chủ (`server_tokens off;`), bật nén Gzip ở tầng Nginx, giới hạn `client_max_body_size 25M`.

### 4.4 Cấu Hình Docker Compose Môi Trường Production (`docker-compose.prod.yml`)

- Chạy 5 dịch vụ đồng bộ: `postgres`, `redis`, `backend`, `frontend`, `nginx`.
- Thiết lập cơ chế kiểm tra sức khỏe (Healthchecks) chặt chẽ: Backend chờ Postgres & Redis khỏe mạnh mới khởi động; Nginx chờ Backend & Frontend khỏe mạnh mới bắt đầu nhận request.
- Giới hạn tài nguyên phần cứng (Resource Limits) cho từng container:
  - `backend`: max 1.0 CPU, 512MB RAM.
  - `frontend`: max 1.0 CPU, 512MB RAM.
  - `postgres`: max 1.5 CPU, 1024MB RAM.
  - `redis`: max 0.5 CPU, 256MB RAM.
  - `nginx`: max 0.5 CPU, 128MB RAM.

---

## 5. Chiến Lược Kiểm Thử Tải & Xác Thực An Toàn OWASP Top 10

### 5.1 Kịch Bản Kiểm Thử Tải (`scripts/load-test.ts`)

- Sử dụng thư viện benchmark hoặc script gọi đa luồng (ví dụ: `autocannon` / concurrent HTTP runner):
  - Kịch bản 1: Đo lường truy vấn `GET /api/v1/products` khi chưa có cache (Database hit).
  - Kịch bản 2: Đo lường truy vấn `GET /api/v1/products` khi đã lưu Redis Cache (Cache hit).
  - Tiêu chí chấp thuận: Cache hit phải đạt tốc độ xử lý nhanh hơn tối thiểu 300% (RPS tăng từ ~50 lên > 250 RPS, latency p95 giảm từ > 120ms xuống < 30ms).

### 5.2 Bộ Kiểm Thử An Toàn OWASP Top 10 (`backend/tests/security/owasp-security.test.ts`)

- **SQL Injection:** Gửi payload độc hại qua query params (`' OR '1'='1`, `'; DROP TABLE users; --`) và xác nhận request bị từ chối bởi Zod hoặc được xử lý an toàn qua parameterized SQL.
- **XSS & Content Sniffing:** Xác nhận phản hồi HTTP luôn có header `X-Content-Type-Options: nosniff` và không bị reflection script.
- **Clickjacking Protection:** Xác nhận phản hồi có header `X-Frame-Options` hoặc CSP tương đương.
- **Rate Limiting Enforcement:** Gửi liên tục vượt ngưỡng cho phép và xác nhận nhận HTTP 429 kèm header `Retry-After`.
- **CORS Isolation:** Gửi request với header `Origin: https://malicious-site.com` và xác thực backend từ chối cấp phép truy cập tài nguyên.
