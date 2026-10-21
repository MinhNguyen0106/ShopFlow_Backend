---
description: ShopFlow testing standards, coverage thresholds, and mocking guidelines for Next.js, Express.js, and MySQL.
trigger: always_on
---

# ShopFlow Testing Standards & Quality Gates

Tài liệu quy định chiến lược kiểm thử tự động, ngưỡng bao phủ mã nguồn (code coverage) và kỹ thuật mock đối với các dịch vụ bên ngoài trong **ShopFlow** (Next.js + Express.js + MySQL).

## 1. Phân Tầng Kiểm Thử (Testing Pyramid)

```
        / \
       /   \     E2E Tests (5%) - Webhook Handshake & End-to-End Next.js UI Flow
      /-----\
     /       \   Integration Tests (25%) - Express APIs, MySQL Transactions & Repository Queries
    /---------\
   /           \ Unit Tests (70%) - OrderParser, HMAC Verifier, DTO Validation, React Hooks
  /-------------\
```

---

## 2. Ngưỡng Bao Phủ Bắt Buộc (Coverage Thresholds)

Khi chạy `npm run test:coverage`, các tiêu chí phải đạt mức tối thiểu sau:
- **Statements:** ≥ 80%
- **Branches:** ≥ 75%
- **Functions:** ≥ 85%
- **Lines:** ≥ 80%
- **Các module cốt lõi** (`WebhookVerifier`, `OrderParser`, `FacebookGraphClient`, `MySQLRepository`): Yêu cầu ≥ 90% branch coverage.

---

## 3. Quy Tắc Mock Dịch Vụ Bên Ngoài (External Service Mocking)

- **Tuyệt đối không gọi thật ra Internet trong Test:** Mọi lệnh gọi tới Meta Graph API (`https://graph.facebook.com`) hoặc Gemini API (`generativelanguage.googleapis.com`) phải được mock bằng `msw` (Mock Service Worker) hoặc Vitest/Jest mocks.
- **Fixture Dữ Liệu:** Đặt các payload webhook mẫu trong thư mục `tests/fixtures/`:
  - `comment-order-valid.json` (bình luận chuẩn: `#SP001 2 cái đỏ M`)
  - `comment-order-incomplete.json` (bình luận thiếu số lượng/size)
  - `message-inbox-inquiry.json` (tin nhắn hỏi giá/tư vấn)
  - `webhook-challenge.json` (yêu cầu GET xác thực webhook từ Meta)

---

## 4. Kiểm Thử Cơ Sở Dữ Liệu (MySQL Integration Testing)

- **Test Database Cô Lập:** Sử dụng **MySQL 8.x** chạy trong container Docker chuyên dụng cho môi trường test (`shopflow_test`).
- **Transaction Rollback:** Mỗi ca kiểm thử tích hợp (integration test) phải chạy bên trong một database transaction và rollback ngay khi kết thúc để tránh gây ô nhiễm dữ liệu giữa các ca test:
  ```typescript
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('START TRANSACTION;');
  });
  afterEach(async () => {
    await prisma.$executeRawUnsafe('ROLLBACK;');
  });
  ```
