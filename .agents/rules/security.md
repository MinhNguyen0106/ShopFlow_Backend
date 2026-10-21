---
description: Security protocol for ShopFlow, webhook HMAC signature validation, and secret handling.
trigger: always_on
---

# ShopFlow Security Protocol & Secret Handling

Tài liệu quy định các tiêu chuẩn bảo mật bắt buộc áp dụng cho toàn bộ mã nguồn của **ShopFlow**.

## 1. Xác Thực Chữ Ký Meta Webhook (HMAC-SHA256)

Mọi yêu cầu gửi đến webhook của Facebook (`POST /api/v1/webhook`) đều **bắt buộc** phải được xác minh chữ ký HMAC-SHA256 thông qua header `x-hub-signature-256`.

### Yêu Cầu Thực Hiện:
1. **Raw Body Retention:** Middleware phải lưu lại raw body buffer trước khi phân tích JSON (JSON.parse), vì HMAC được tính toán dựa trên chuỗi raw byte.
2. **Khóa bí mật:** Sử dụng `FACEBOOK_APP_SECRET` lấy từ biến môi trường.
3. **So sánh thời gian an toàn (Timing-Safe Comparison):** Phải sử dụng `crypto.timingSafeEqual` để ngăn chặn tấn công Timing Attack. Không được dùng toán tử so sánh chuỗi thông thường `===`.

```typescript
import crypto from 'node:crypto';

export function verifyMetaSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const signatureHash = signatureHeader.slice(7);
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const sigBuffer = Buffer.from(signatureHash, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
```

---

## 2. Quản Lý Bí Mật & Khóa Truy Cập (Secrets Management)

- **Nguyên Tắc Không Lưu Khóa Cứng (Zero Hardcoded Secrets):**
  - Tuyệt đối không commit API token, mật khẩu DB, App Secret vào kho mã nguồn (git).
  - Sử dụng tệp `.env` cục bộ cho dev và kiểm tra biến môi trường khi khởi động bằng Zod schema:
    ```typescript
    import { z } from 'zod';
    export const envSchema = z.object({
      PORT: z.coerce.number().default(3000),
      DATABASE_URL: z.string().url(),
      FACEBOOK_APP_ID: z.string().min(1),
      FACEBOOK_APP_SECRET: z.string().min(1),
      FACEBOOK_VERIFY_TOKEN: z.string().min(1),
      GEMINI_API_KEY: z.string().min(1),
    });
    ```

---

## 3. Bảo Vệ Dữ Liệu Khách Hàng (PII Protection)

- **Tuân thủ quy định bảo mật thông tin cá nhân:** Số điện thoại, họ tên, địa chỉ giao hàng của khách hàng nhận từ bình luận/tin nhắn phải được lưu trữ trong bảng an toàn với quyền truy cập giới hạn.
- **Che dấu thông tin nhạy cảm (Data Masking):** Khi hiển thị trên nhật ký log hoặc giao diện audit, số điện thoại phải được che (ví dụ: `098****123`).

---

## 4. Chống Tấn Công Replay & Spam (Rate Limiting & Queueing)

- **Idempotency Key:** Mọi sự kiện webhook từ Meta đều có `mid` hoặc `comment_id`. Hệ thống phải lưu mã ID vào cache Redis (với TTL 24 giờ) để tránh việc xử lý trùng lặp một sự kiện nhiều lần (Idempotency).
- **Queueing với BullMQ:** Tất cả yêu cầu trả lời bình luận và tin nhắn tự động phải đưa vào hàng đợi có giới hạn tần suất (Rate Limiter) để không vi phạm chính sách chống spam của Meta (Spam Policy & Graph API Rate Limits).
