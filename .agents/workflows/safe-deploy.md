---
name: safe-deploy
description: Quy trình triển khai sản phẩm an toàn (Safe Production Deployment) với pre-flight checks, DB migration, build, healthcheck và rollback plan cho ShopFlow.
trigger: manual
---

# Workflow: Triển Khai Sản Phẩm An Toàn (Safe Deploy)

Quy trình triển khai dịch vụ **ShopFlow** lên GitHub và môi trường Production/Staging nhằm ngăn chặn hoàn toàn rủi ro downtime, lỗi cú pháp và sự cố dữ liệu.

---

## Các Giai Đoạn Triển Khai

### Giai Đoạn 1: Tiền Kiểm Tra (Pre-flight Validation)
1. **Kiểm tra trạng thái Git:**
   ```bash
   git status --porcelain
   ```
   *Yêu cầu:* Working directory phải sạch, không có uncommitted changes ngoài ý muốn. Nhánh hiện tại phải là `main`.
2. **Kiểm tra toàn bộ kiểm thử & kiểu dữ liệu:**
   ```bash
   npm run type-check --workspaces
   npm test --workspaces --if-present
   ```
   *Yêu cầu:* 100% tests và type-check phải đạt kết quả thành công trước khi đóng gói.

---

### Giai Đoạn 2: Thẩm Định Cơ Sở Dữ Liệu & Migrations (PostgreSQL 15+)
1. Kiểm tra xem task có phát sinh thay đổi schema trong `docs/03_DATABASE_SCHEMA.md` hoặc migration scripts hay không.
2. Nếu có schema mới:
   - Thực thi migration trên môi trường database chuẩn bị.
   - Kiểm tra tính tương thích ngược (Backward Compatibility) của các cột và chỉ mục (Indexes).
3. Đảm bảo Idempotency key trên Redis hoạt động để không làm gián đoạn webhook.

---

### Giai Đoạn 3: Đóng Gói Ứng Dụng (Build & Package)
1. **Biên dịch Backend (Express TypeScript):**
   ```bash
   npm run build:backend
   ```
2. **Đóng gói Frontend (Next.js 14):**
   ```bash
   npm run build:frontend
   ```

---

### Giai Đoạn 4: Đẩy Nhánh Main Lên Server Remote & Kiểm Tra Sức Khỏe
1. **Đẩy mã nguồn nhánh main lên GitHub remote:**
   ```bash
   git push origin main
   ```
2. **Kiểm tra endpoint giám sát sức khỏe (Healthcheck):**
   ```bash
   curl -f http://localhost:5000/health
   curl -f http://localhost:5000/api/v1/health
   ```
   *Kỳ vọng:* Trả về HTTP `200 OK` kèm `status: "healthy"`.
3. **Kiểm tra bắt tay Webhook Meta (Webhook Handshake):**
   ```bash
   curl -f "http://localhost:5000/api/v1/webhook?hub.mode=subscribe&hub.challenge=1158201444&hub.verify_token=shopflow_webhook_verify_token_dev"
   ```

---

### Giai Đoạn 5: Kế Hoạch Phục Hồi Khi Có Sự Cố (Rollback Plan)
Nếu có bất kỳ bước nào trong Giai đoạn 4 thất bại:
1. Revert commit gần nhất trên `main` hoặc switch traffic về commit ổn định trước đó:
   ```bash
   git revert HEAD --no-edit
   git push origin main
   ```
2. Nếu có migration lỗi: Thực thi script rollback DDL tương ứng.
3. Ghi nhận sự cố vào nhật ký `Task.md` và `.agent/memory/history.md`.
