# Tasks: Tối Ưu Hóa Hiệu Năng & Hardening Môi Trường Production (TASK-26)

## 1. Redis Caching Layer & Invalidation Logic (26.1)

- [x] 1.1 Xây dựng `CacheService` tại `backend/src/infrastructure/cache/cache.service.ts` tái sử dụng `ioredis` với các phương thức: `get`, `set` (hỗ trợ TTL), `del`, `invalidateByPattern`, `getOrSet`.
- [x] 1.2 Tích hợp `CacheService` vào `ProductService` và `ProductController` (`backend/src/core/services/product.service.ts`, `backend/src/api/controllers/product.controller.ts`) để lưu cache danh mục sản phẩm (`cache:products:${pageId}:*`) và tự động xóa cache khi tạo, sửa, xóa sản phẩm hoặc cập nhật tồn kho (`adjustStock`).
- [x] 1.3 Tích hợp `CacheService` vào `ConnectedPageService` để lưu cache thông tin/trạng thái Fanpage (`cache:fanpage:${pageId}:info`) với TTL 30 phút và xóa cache khi cập nhật Fanpage.
- [x] 1.4 Viết bộ unit test cho `CacheService` tại `backend/src/infrastructure/cache/__tests__/cache.service.test.ts`.

## 2. HTTP Compression, Rate Limiting & Security Hardening (26.2)

- [x] 2.1 Tích hợp middleware `compression` vào `backend/src/app.ts` với ngưỡng nén `threshold: 1024` bytes và bộ lọc bỏ qua các kết nối streaming/SSE.
- [x] 2.2 Xây dựng bộ Rate Limiting phân tầng trong `backend/src/api/middlewares/rate-limiter.middleware.ts` (`globalApiLimiter`: 100 req/min, `authLimiter`: 10 req/15 min, `heavyComputationLimiter`: 15 req/min).
- [x] 2.3 Gia cố cấu hình `helmet` trong `backend/src/app.ts` (HSTS 180 ngày, X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN, ẩn hoàn toàn X-Powered-By, CSP).
- [x] 2.4 Viết bộ unit test kiểm thử nén dữ liệu và phân tầng rate limiting tại `backend/src/api/middlewares/__tests__/rate-limiter.test.ts`.

## 3. Production Docker Containers & Nginx Reverse Proxy Gateway (26.3)

- [x] 3.1 Xây dựng multi-stage `backend/Dockerfile` (node:20-alpine, tách biệt build stage và production runner, non-root user `node`, dumb-init).
- [x] 3.2 Cập nhật `frontend/next.config.js` kích hoạt `output: 'standalone'` và xây dựng multi-stage `frontend/Dockerfile` (runner siêu nhẹ < 180MB).
- [x] 3.3 Thiết lập cấu hình Nginx Reverse Proxy tại `nginx/nginx.conf` và `nginx/conf.d/shopflow.conf` (định tuyến `/api/`, `/health`, `/socket.io/` WebSocket, `/`, nén Gzip, client caching static assets).
- [x] 3.4 Tạo cấu hình triển khai hoàn chỉnh `docker-compose.prod.yml` gồm 5 dịch vụ (`nginx`, `frontend`, `backend`, `postgres`, `redis`) với healthcheck đồng bộ, mạng nội bộ cô lập và giới hạn tài nguyên CPU/RAM.
- [x] 3.5 Tạo tệp cấu hình mẫu môi trường production `.env.production.example`.

## 4. Automated OWASP Top 10 Security Audit & Load Testing (26.4)

- [x] 4.1 Xây dựng kịch bản kiểm thử tải `scripts/load-test.ts` đo lường thông lượng (RPS) và độ trễ p95/p99 latency trước và sau khi kích hoạt cache.
- [x] 4.2 Xây dựng test suite kiểm thử an toàn bảo mật `backend/tests/security/owasp-security.test.ts` xác thực phòng chống SQL Injection, XSS, Security Headers, CORS isolation và Rate Limiting 429.
- [x] 4.3 Thực thi toàn diện kiểm thử type-check (`tsc --noEmit`) và chạy các test suites bảo đảm 100% tests pass và hệ thống đạt chất lượng production ready.
