# Spec Delta: production-hardening

## Purpose

Thiết lập hạ tầng vận hành Production an toàn, tin cậy và đạt hiệu năng cao cho hệ thống ShopFlow: tối ưu hóa tốc độ truy vấn cơ sở dữ liệu qua tầng đệm Redis Cache với cơ chế tự động hủy cache khi dữ liệu thay đổi (Cache Invalidation), nén luồng dữ liệu HTTP Gzip/Brotli, thiết lập Rate Limiting phân tầng chống DDoS/brute-force, chuẩn hóa cấu hình đóng gói Docker Compose Production kèm Nginx Reverse Proxy Gateway, và xác lập bộ kiểm thử an toàn theo tiêu chuẩn OWASP Top 10.

---

## ADDED Requirements

### Requirement: Redis Caching Layer with Automatic Invalidation
Hệ thống SHALL cung cấp tầng bộ nhớ đệm `CacheService` tích hợp với Redis, hỗ trợ các thao tác đọc/ghi với thời gian sống (TTL), xóa cache theo tiền tố mẫu (Pattern Invalidation), và tự động đồng bộ hóa trạng thái để không trả về dữ liệu cũ (stale data).

#### Scenario: Cached product catalog query
- **GIVEN** danh mục sản phẩm của Fanpage `page-101` đã được truy vấn và lưu vào cache với khóa `cache:products:page-101:page=1&limit=20`
- **WHEN** client gửi request `GET /api/v1/products?pageId=page-101&page=1&limit=20`
- **THEN** hệ thống trả về kết quả ngay lập tức từ bộ nhớ Redis cache mà không thực hiện truy vấn xuống cơ sở dữ liệu PostgreSQL, kèm theo header hoặc metadata chỉ báo thời gian phản hồi dưới 10ms.

#### Scenario: Automatic cache invalidation upon product modification
- **GIVEN** danh mục sản phẩm của Fanpage `page-101` đang được lưu trong nhiều khóa cache khác nhau (`cache:products:page-101:*`)
- **WHEN** chủ shop hoặc quản lý thực hiện tạo sản phẩm mới, cập nhật thông tin sản phẩm, hoặc điều chỉnh số lượng tồn kho (`adjustStock`)
- **THEN** hệ thống tự động quét và xóa toàn bộ các khóa cache có tiền tố `cache:products:page-101:*`, bảo đảm các request tiếp theo sẽ truy vấn dữ liệu mới nhất từ database và cập nhật lại cache.

#### Scenario: Fanpage status caching and invalidation
- **GIVEN** thông tin trạng thái Fanpage `page-101` được lưu trong cache `cache:fanpage:page-101` với TTL 1800 giây
- **WHEN** người dùng cập nhật cài đặt Fanpage hoặc ngắt kết nối Fanpage
- **THEN** hệ thống xóa ngay khóa `cache:fanpage:page-101` để bảo đảm tính nhất quán tức thì trên toàn hệ thống.

---

### Requirement: HTTP Compression & Advanced Security Headers
Hệ thống SHALL tự động nén các phản hồi HTTP dạng văn bản/JSON có kích thước vượt ngưỡng quy định để tiết kiệm băng thông mạng và bổ sung đầy đủ các tiêu đề HTTP bảo mật nhằm bảo vệ người dùng trước các lỗ hổng bảo mật phổ biến.

#### Scenario: Gzip compression for large JSON payload
- **GIVEN** client hỗ trợ giải nén với header `Accept-Encoding: gzip, deflate`
- **WHEN** client gọi API trả về danh mục sản phẩm hoặc dữ liệu phân tích có dung lượng trên 1024 bytes
- **THEN** server trả về phản hồi kèm header `Content-Encoding: gzip`, dung lượng truyền tải giảm tối thiểu 50% so với payload gốc.

#### Scenario: Security headers enforcement via Helmet
- **WHEN** client gửi bất kỳ HTTP request nào đến Backend API
- **THEN** phản hồi từ server phải chứa đầy đủ các tiêu đề bảo mật:
  - `Strict-Transport-Security: max-age=15552000; includeSubDomains` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN` hoặc CSP `frame-ancestors`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - Không để lộ thông tin máy chủ qua header `X-Powered-By`.

---

### Requirement: Tiered Rate Limiting & Anti-Brute-Force Protection
Hệ thống SHALL thực thi cơ chế giới hạn tần suất gửi yêu cầu (Rate Limiting) theo nhiều cấp độ khác nhau để bảo vệ hệ thống khỏi tấn công từ chối dịch vụ (DDoS) và tấn công vét cạn mật khẩu (Brute-force).

#### Scenario: Exceeding global API rate limit
- **GIVEN** một địa chỉ IP gửi vượt quá 100 requests trong vòng 60 giây tới các API công khai của hệ thống
- **WHEN** request thứ 101 được gửi đến
- **THEN** server từ chối xử lý và phản hồi với mã lỗi HTTP 429 Too Many Requests, kèm header `Retry-After` và thông điệp cảnh báo rõ ràng.

#### Scenario: Strict auth rate limiting protection
- **GIVEN** một địa chỉ IP cố gắng thực hiện đăng nhập hoặc đăng ký tài khoản liên tục
- **WHEN** số lần thử vượt quá 10 lần trong vòng 15 phút
- **THEN** server khóa tạm thời IP đó đối với các endpoint xác thực trong thời gian còn lại của chu kỳ, trả về mã HTTP 429 để ngăn chặn việc dò tìm mật khẩu.

---

### Requirement: Production Docker Containers & Nginx Reverse Proxy Gateway
Hệ thống SHALL cung cấp các tệp Dockerfile nhiều tầng (Multi-stage build) tối ưu kích thước và cấu hình Nginx Reverse Proxy làm cổng kết nối duy nhất (API Gateway), điều phối lưu lượng an toàn tới các dịch vụ nội bộ.

#### Scenario: Nginx reverse proxy routing
- **GIVEN** hệ thống chạy trong cụm container qua `docker-compose.prod.yml`
- **WHEN** client gửi yêu cầu đến domain của ShopFlow
  - Nếu đường dẫn bắt đầu bằng `/api/` hoặc `/health`, Nginx chuyển tiếp tới Backend container.
  - Nếu đường dẫn bắt đầu bằng `/socket.io/`, Nginx chuyển tiếp kèm header WebSocket Upgrade (`Upgrade: websocket`, `Connection: Upgrade`).
  - Nếu đường dẫn là các trang Dashboard `/` hoặc static assets, Nginx chuyển tiếp tới Frontend Next.js standalone container.
- **THEN** toàn bộ request được xử lý thông suốt, Nginx ẩn thông tin phiên bản nội bộ và quản lý kết nối an toàn.

#### Scenario: Container security and lightweight image
- **WHEN** tiến hành build hình ảnh container cho Backend và Frontend
- **THEN** cả hai hình ảnh đều sử dụng base `node:20-alpine`, loại bỏ toàn bộ `devDependencies` trong production image, thực thi ứng dụng dưới quyền người dùng không có đặc quyền root (`USER node`), và dung lượng image Backend đạt mức tối ưu (< 200MB).

---

### Requirement: Automated OWASP Top 10 Security Verification & Load Testing
Hệ thống SHALL tích hợp bộ kiểm thử an toàn tự động theo chuẩn OWASP Top 10 và kịch bản kiểm thử tải đo lường hiệu năng thực tế.

#### Scenario: Automated OWASP security compliance test
- **WHEN** chạy bộ kiểm thử bảo mật `backend/tests/security/owasp-security.test.ts`
- **THEN** toàn bộ các bài test về SQL Injection, XSS escaping, CORS enforcement, Security Headers, và Rate Limiting đều vượt qua 100% không có ngoại lệ.

#### Scenario: Load test performance benchmark
- **WHEN** thực thi kịch bản kiểm thử tải `scripts/load-test.ts` trên endpoint danh mục sản phẩm
- **THEN** hệ thống đạt thông lượng tối thiểu ≥ 200 RPS với độ trễ p95 < 150ms khi Redis Cache được kích hoạt.
