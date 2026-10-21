---
description: Safe deployment procedure with pre-flight migration checks, healthchecks, and rollback plan.
---

# Workflow: Triển Khai Sản Phẩm An Toàn (Safe Production Deploy)

Quy trình triển khai dịch vụ ShopFlow lên môi trường Staging / Production nhằm ngăn chặn downtime và sự cố dữ liệu.

## Các Giai Đoạn Triển Khai

### Giai Đoạn 1: Tiền Kiểm Tra (Pre-flight Validation)
1. **Kiểm tra trạng thái Git:**
   ```bash
   git status --porcelain
   ```
   Đảm bảo working directory sạch, không có uncommitted changes.
2. **Kiểm tra Pipeline:** Toàn bộ test suite phải pass trước khi tiếp tục:
   ```bash
   npm run test
   ```

### Giai Đoạn 2: Thẩm Định Migration Cơ Sở Dữ Liệu
Trước khi áp dụng schema mới vào database sản phẩm:
1. Chạy script kiểm tra tương thích schema:
   ```bash
   python .agent/skills/db-migration/scripts/validate.py
   ```
2. Thực hiện sao lưu snapshot database hiện tại.
3. Chạy migration ở chế độ kiểm tra (Dry-run) hoặc áp dụng migration:
   ```
   npx prisma migrate deploy
   ```

### Giai Đoạn 3: Đóng Gói Ứng Dụng (Build & Package)
1. Biên dịch TypeScript sang JavaScript tối ưu:
   ```bash
   npm run build
   ```
2. Xây dựng Docker container image:
   ```bash
   docker build -t shopflow-api:latest .
   ```

### Giai Đoạn 4: Khởi Động & Kiểm Tra Sức Khỏe (Health Check)
1. Khởi động container hoặc cập nhật dịch vụ cloud.
2. Kiểm tra endpoint giám sát sức khỏe:
   ```bash
   curl -f http://localhost:3000/healthz
   ```
3. Kiểm tra bắt tay Webhook Meta:
   ```bash
   curl "http://localhost:3000/api/v1/webhook?hub.mode=subscribe&hub.challenge=1158201444&hub.verify_token=TEST_TOKEN"
   ```

### Giai Đoạn 5: Kế Hoạch Phục Hồi Khi Có Sự Cố (Rollback Plan)
- Nếu `/healthz` trả về mã lỗi hoặc webhook handshake thất bại sau 3 lần retry:
  1. Lập tức switch traffic về phiên bản container trước đó (`shopflow-api:previous`).
  2. Áp dụng script rollback migration tương ứng (xem kỹ năng `db-migration`).
  3. Báo cáo log chi tiết cho nhóm kỹ thuật qua Slack/Telegram alert.