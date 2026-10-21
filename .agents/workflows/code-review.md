---
name: automated-code-review
description: Comprehensive code review checklist for Pull Requests covering Clean Code, Security, and Meta API policy compliance.
trigger: manual
---

# Workflow: Rà Soát Mã Nguồn Tự Động (Code Review Checklist)

Quy trình đánh giá chất lượng mã nguồn tự động dành cho AI Agent khi phân tích Pull Request hoặc thay đổi tệp tin.

## Checklist Rà Soát (Từng Hạng Mục)

### 1. Kiến Trúc & Thiết Kế Phần Mềm
- [ ] Tuân thủ nguyên tắc Single Responsibility: Mỗi service/class chỉ xử lý một nhiệm vụ duy nhất.
- [ ] Luồng điều hướng dữ liệu rõ ràng: Controller -> Service -> Repository.
- [ ] Không có circular dependencies (phụ thuộc vòng tròn).

### 2. An Toàn Bảo Mật (Security Inspection)
- [ ] **Bảo mật Webhook:** Endpoint tiếp nhận webhook từ Facebook có middleware kiểm tra HMAC-SHA256 hợp lệ không?
- [ ] **Không lộ Secret:** Không có token, password hoặc private key nào bị hardcode.
- [ ] **Timing Attack:** Hàm so sánh chữ ký có dùng `crypto.timingSafeEqual` không?
- [ ] **Sanitization:** Dữ liệu đầu vào từ bình luận của người dùng có được kiểm tra độ dài và làm sạch trước khi đưa vào parser/database không?

### 3. Chính Sách Nền Tảng Meta & Hiệu Năng
- [ ] **Spam Policy:** Có cơ chế throttle/queue cho các hành động đăng bài hoặc trả lời tự động không? (Khoảng cách giữa các hành động >= 5 giây).
- [ ] **Idempotency:** Đã lưu `event_id` hoặc `comment_id` vào Redis để chống lặp hành động khi Facebook gửi webhook trùng chưa?
- [ ] **Scheduled Posts:** Đăng bài hẹn giờ có truyền đúng `published=false` và `scheduled_publish_time` trong khoảng từ 10 phút đến 75 ngày theo chuẩn Meta API không?

### 4. Kiểm Thử & Xử Lý Lỗi
- [ ] Code mới có kèm theo unit test hoặc integration test tương ứng không?
- [ ] Khối `try-catch` có ghi log có ý nghĩa và mã lỗi domain chuẩn (`AppError`) không?
- [ ] Có bắt hết các trạng thái bất đồng bộ (`Promise.all`, `await`) không sót `unhandledRejection` không?

## Mẫu Phản Hồi Kết Quả Review
```markdown
### 📋 Kết Quả Rà Soát Mã Nguồn: [Tên Module/PR]

- **Trạng thái:** [APPROVED / CHANGES_REQUESTED]
- **Độ tin cậy:** [Cao / Trung bình / Cần bổ sung test]

#### 🔍 Điểm Cần Chú Ý (Findings)
1. **[BẢO MẬT] [CRITICAL / WARNING]:** [Mô tả chi tiết và gợi ý đoạn code sửa đổi]
2. **[HIỆU NĂNG / CHÍNH SÁCH META]:** [Mô tả rủi ro spam hoặc rate-limit]
3. **[CLEAN CODE]:** [Gợi ý tái cấu trúc]
```
