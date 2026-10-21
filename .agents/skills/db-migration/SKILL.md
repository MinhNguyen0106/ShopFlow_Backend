---
name: db-migration
description: >-
  Automates database schema migrations, validates SQL and Prisma MySQL schemas,
  checks for breaking changes, and safely executes rollback scripts for ShopFlow MySQL database.
---

# Skill: Cơ Sở Dữ Liệu & Quy Trình Migration (MySQL Migration Manager)

Kỹ năng chuyên biệt hướng dẫn AI Agent thực hiện kiểm tra, thẩm định và chạy migration cho cơ sở dữ liệu **MySQL 8.x** (InnoDB) của ShopFlow một cách an toàn.

## Mục Đích
Ngăn chặn các lỗi nghiêm trọng về dữ liệu như: mất dữ liệu bảng do drop column bất cẩn, khóa bảng toàn phần (full table lock) khi alter table trong MySQL, hoặc lỗi không tương thích giữa Prisma schema (`provider = "mysql"`) và schema thực tế.

---

## 1. Bản Tham Chiếu Schema Chuẩn
Trước khi sửa đổi hoặc sinh code liên quan đến cấu trúc bảng, AI Agent bắt buộc đọc tệp mô tả schema chuẩn tại:
`[.agent/skills/db-migration/references/schema.json](file:///C:/Users/Dell/Desktop/ShopFlow/.agent/skills/db-migration/references/schema.json)`

Bao gồm 7 thực thể cốt lõi:
- `users`: Thông tin tài khoản chủ shop.
- `fanpages`: Trang Facebook kết nối, Page Access Token, trạng thái webhook.
- `products`: Danh mục sản phẩm, mã SKU, giá bán, tồn kho, phân loại (màu, size trong cột `json`).
- `posts`: Bài viết đăng lên Fanpage (nội dung, ảnh, lịch đăng, Facebook Post ID).
- `orders`: Đơn hàng trích xuất từ bình luận/tin nhắn, trạng thái xử lý, SĐT, địa chỉ.
- `order_items`: Chi tiết các mặt hàng trong đơn.
- `interactions`: Nhật ký sự kiện webhook, bình luận và phản hồi tự động.

---

## 2. Quy Trình Thẩm Định Trước Khi Tạo Migration

Mỗi khi người dùng yêu cầu thay đổi cấu trúc MySQL DB, AI Agent phải thực hiện theo 4 bước:

### Bước 1: Kiểm Tra Breaking Changes & MySQL Locks
- **Không bao giờ xóa cột trực tiếp (`DROP COLUMN`)**: Nếu cần bỏ một cột, đánh dấu `@deprecated` trong code trước, tạo migration mới để set nullable, sau 1-2 phiên bản mới thực hiện xóa.
- **Thêm cột mới bắt buộc (`NOT NULL`)**: Phải luôn có giá trị mặc định (`DEFAULT`) hoặc cho phép `NULL` trước khi backfill dữ liệu.
- **Tận dụng Instant DDL (MySQL 8.0+)**: Thêm cột nullable ở cuối bảng để MySQL thực thi tức thì mà không khóa ghi bảng (`ALGORITHM=INSTANT`).

### Bước 2: Chạy Script Thẩm Định Tự Động
Thực thi script kiểm tra tính hợp lệ của schema:
```bash
python .agent/skills/db-migration/scripts/validate.py
```
Script sẽ kiểm tra:
1. Đặt tên cột theo chuẩn `snake_case`.
2. Khóa chính `id` (`char(36)` / `varchar(36)` hoặc `bigint`).
3. Các cột thường xuyên query (`fanpage_id`, `status`, `created_at`) phải có Index.
4. Ràng buộc toàn vẹn khóa ngoại (Foreign Key Constraints - InnoDB).

### Bước 3: Tạo Tệp Migration với Prisma MySQL
Sử dụng công cụ migration chính thức:
```bash
npx prisma migrate dev --name <ten_thay_doi_ngan_gon>
```

### Bước 4: Soạn Kế Hoạch Rollback
Mỗi migration phải đi kèm tệp SQL rollback tương ứng trong `prisma/migrations/<migration_name>/down.sql`.
