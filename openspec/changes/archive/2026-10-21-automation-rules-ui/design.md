# Technical Design: Màn hình Cấu hình Kịch bản Tự động & Ẩn SĐT (automation-rules-ui)

## Context

Động cơ kịch bản tự động hóa (`Automation Rules Engine`) đã được triển khai hoàn chỉnh ở tầng backend trong `TASK-10`, cung cấp 4 endpoint REST API tại `/api/v1/pages/:pageId/rules` (xem chi tiết trong `proposal.md - Why`). Cơ sở dữ liệu lưu trữ các trường:
- `rule_name`: Tên quy tắc (chuỗi 1-100 ký tự).
- `trigger_keywords`: Mảng các từ khóa (jsonb/array of strings).
- `hide_phone_enabled`: Boolean (bật/tắt quét ẩn số điện thoại tự động).
- `auto_comment_template`: Mẫu phản hồi bình luận công khai (hỗ trợ biến `{{customer_name}}`, `{{page_name}}`).
- `auto_private_reply_template`: Mẫu tin nhắn riêng Messenger (hỗ trợ biến `{{customer_name}}`, `{{page_name}}`).
- `is_active`: Trạng thái hoạt động (boolean).

Frontend hiện cần xây dựng module giao diện tại `/(dashboard)/automation` với phong cách thiết kế **macOS Clean Utility**, áp dụng Bento Grid cards và các phím tắt nhanh.

## Goals / Non-Goals

**Goals:**
- Xây dựng tầng trạng thái Zustand `automation.store.ts` với đầy đủ action CRUD, kiểm soát lỗi và cập nhật lạc quan (Optimistic UI) khi đổi trạng thái quy tắc.
- Xây dựng Component `RuleCard` dạng thẻ Bento hiển thị thông tin rõ ràng: tên, số lượng từ khóa dạng chips, badge bảo vệ `🛡️ Ẩn SĐT`, xem trước mẫu tin nhắn, và công tắc chuyển trạng thái.
- Xây dựng Component `RuleModal` hỗ trợ cả tạo mới và chỉnh sửa: nhập từ khóa dạng thẻ (Tag Input hỗ trợ Enter/dấu phẩy), bộ nút chèn nhanh biến động `{{customer_name}}`, `{{page_name}}`.
- Xây dựng Component `DeleteRuleDialog` xác nhận xóa an toàn.
- Đảm bảo 100% kiểm thử tự động (Unit & Integration tests) và 0 lỗi TypeScript strict mode.

**Non-Goals:**
- Không sửa đổi mã nguồn hoặc bảng schema backend (tận dụng nguyên vẹn API hiện có).
- Không xây dựng engine xử lý NLP phức tạp trên frontend (việc matching từ khóa đã do backend đảm nhiệm).

## Decisions

### 1. Tag Input cho Từ Khóa Kích Hoạt (Keyword Tag Input)
- **Quyết định**: Xây dựng UI nhập từ khóa dạng các chip/tag động (ấn `Enter` hoặc gõ dấu phẩy `,` để tạo chip, click nút `×` để gỡ).
- **Lý do**: Tránh lỗi cú pháp của người dùng nếu nhập chuỗi văn bản tự do, đảm bảo mảng `trigger_keywords` luôn sạch và chuẩn hóa trước khi gửi lên API.
- **Giải pháp thay thế**: Textarea phân tách bằng dấu phẩy thông thường (dễ gây lỗi thiếu/thừa khoảng trắng hoặc trùng lặp).

### 2. Cập Nhật Lạc Quan (Optimistic UI) cho Switch Trạng Thái
- **Quyết định**: Khi người dùng gạt switch `is_active`, store lập tức đảo cờ trong giao diện người dùng và gọi `PUT /api/v1/pages/:pageId/rules/:ruleId` chạy nền. Nếu API trả về lỗi, rollback lại trạng thái cũ và hiển thị thông báo lỗi.
- **Lý do**: Mang lại cảm giác mượt mà tức thì chuẩn macOS native desktop application.

### 3. Phím Tắt 1-Click Chèn Biến Động Mẫu Tin Nhắn
- **Quyết định**: Đặt các nút bấm nhanh `+ Tên khách hàng` (`{{customer_name}}`) và `+ Tên Fanpage` (`{{page_name}}`) ngay trên thanh công cụ của textarea soạn thảo mẫu phản hồi.
- **Lý do**: Giúp người dùng không phải gõ dấu ngoặc nhọn thủ công, loại bỏ 100% rủi ro gõ sai tên biến.

## Risks / Trade-offs

- **[Risk]** Người dùng xóa hết từ khóa trong modal và cố lưu quy tắc.
  - **Mitigation**: Zod & client-side validation kiểm tra mảng từ khóa phải có ít nhất 1 phần tử hợp lệ; vô hiệu hóa nút submit kèm cảnh báo đỏ trực quan.
- **[Risk]** Chưa chọn Fanpage nào mà truy cập `/automation`.
  - **Mitigation**: Store tự động nhận diện `selectedPage` từ `page.store.ts`; nếu chưa chọn hoặc chưa có page, hiển thị banner cảnh báo nhắc người dùng kết nối hoặc chọn Fanpage trên Topbar.
