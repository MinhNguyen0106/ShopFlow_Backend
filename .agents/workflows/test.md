---
name: test-pipeline
description: Comprehensive test workflow covering linting, type-checking, unit tests, and integration suites for Next.js, Express, and MySQL.
trigger: manual
---

# Workflow: Toàn Bộ Quy Trình Kiểm Thử Tự Động (Test Pipeline)

Quy trình chuẩn để xác minh tính ổn định của mã nguồn trước khi tích hợp hoặc triển khai.

## Các Bước Thực Hiện

### Bước 1: Kiểm Tra Cú Pháp & Định Dạng (Static Analysis & Linting)
Chạy ESLint và Prettier để đảm bảo chuẩn code cho cả Next.js và Express:
```bash
npm run lint
```
*Tiêu chí thành công:* Không có lỗi (0 errors). Mọi warning phải được đánh giá trước khi bỏ qua.

### Bước 2: Kiểm Tra Kiểu Dữ Liệu Tĩnh (TypeScript Type Check)
Biên dịch kiểm tra kiểu không sinh file output:
```bash
npx tsc --noEmit
```
*Tiêu chí thành công:* Exit code 0, không có lỗi type mismatch hoặc biến `any` không hợp lệ.

### Bước 3: Chạy Kiểm Thử Đơn Vị (Unit Tests)
Thực thi toàn bộ unit test với Vitest / Jest:
```bash
npm run test:unit
```
*Nhiệm vụ kiểm tra:*
1. Parser đơn hàng tách đúng SKU, số lượng, màu sắc, size.
2. Webhook HMAC verifier từ chối các request sai chữ ký và chấp thuận request hợp lệ.
3. Service sinh nội dung định dạng đúng cấu trúc bài viết bán hàng.
4. UI component React render đúng trạng thái đơn hàng.

### Bước 4: Chạy Kiểm Thử Tích Hợp (Integration Tests)
Xác minh tầng Database MySQL và luồng Webhook Express:
```bash
npm run test:int
```
*Nhiệm vụ kiểm tra:*
1. Lưu trữ bản ghi `Order` và `OrderItem` thành công vào **MySQL**.
2. Cơ chế Idempotency trên Redis ngăn chặn ghi đè sự kiện trùng lặp.

### Bước 5: Kiểm Tra Ngưỡng Bao Phủ (Coverage Check)
```bash
npm run test:coverage
```
*Tiêu chí đạt:* Coverage ≥ 80% đối với lines và statements.
