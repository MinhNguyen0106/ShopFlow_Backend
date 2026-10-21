# Proposal: Màn hình Cấu hình Kịch bản Tự động & Ẩn SĐT (automation-rules-ui)

## Why

Chủ shop online cần một giao diện trực quan, tinh gọn để quản lý và cấu hình các kịch bản phản hồi tự động (từ khóa kích hoạt, mẫu bình luận công khai, mẫu tin nhắn riêng Messenger Private Reply) và tính năng tự động ẩn số điện thoại khách hàng nhằm ngăn chặn hành vi cướp đơn. Hiện tại backend đã hoàn thiện module Automation Rules Engine (`TASK-10`), nhưng frontend chưa có màn hình quản trị trực quan tại `/(dashboard)/automation`.

## What Changes

- **Automation Types & DTO Sync (`frontend/src/types/automation.ts`)**: Định nghĩa các kiểu dữ liệu `AutomationRule`, `CreateAutomationRuleInput`, `UpdateAutomationRuleInput` đồng bộ chuẩn 100% với backend DTOs.
- **Automation Zustand Store (`frontend/src/lib/automation.store.ts`)**: Quản lý state danh sách kịch bản theo Fanpage, gọi các REST API `/api/v1/pages/:pageId/rules` (GET, POST, PUT, DELETE), hỗ trợ bóc tách dữ liệu phòng vệ (defensive parsing) và chuyển đổi trạng thái `is_active` tức thì.
- **Giao diện Danh sách Kịch bản Thẻ Bento (`frontend/src/app/(dashboard)/automation/page.tsx`)**: Bố cục chuẩn macOS Clean Utility hiển thị danh sách kịch bản dạng lưới Bento cards, trạng thái hoạt động, danh sách từ khóa tags, mẫu phản hồi, switch bật/tắt nhanh, và thanh công cụ tìm kiếm / chọn Fanpage.
- **Modal Tạo & Chỉnh sửa Kịch bản (`frontend/src/components/automation/rule-modal.tsx`)**: Form cấu hình kịch bản tự động hóa linh hoạt: nhập tên quy tắc, gắn thẻ từ khóa (keywords tag input), công tắc ẩn SĐT (`hide_phone_enabled`), mẫu bình luận tự động và mẫu tin nhắn riêng hỗ trợ biến động (`{{customer_name}}`, `{{page_name}}`).
- **Modal Xác nhận Xóa an toàn (`frontend/src/components/automation/delete-rule-dialog.tsx`)**: Hộp thoại cảnh báo và xác nhận xóa kịch bản để tránh thao tác nhầm.
- **Kiểm định Chất lượng (Test Suites)**: Viết 100% unit & integration test suites cho Zustand store, components và trang `/automation`.

## Capabilities

### New Capabilities

- `automation-rules`: Cung cấp khả năng cấu hình và quản trị các kịch bản tự động phản hồi bình luận, gửi tin nhắn riêng Messenger theo từ khóa, và bật/tắt tính năng ẩn số điện thoại tự động cho từng Fanpage được kết nối.

### Modified Capabilities

*(Không có)*

## Impact

- **Frontend Codebase**:
  - Tạo mới `frontend/src/types/automation.ts`
  - Tạo mới `frontend/src/lib/automation.store.ts`
  - Tạo mới các components tại `frontend/src/components/automation/` (`rule-card.tsx`, `rule-modal.tsx`, `delete-rule-dialog.tsx`)
  - Xây dựng trang `frontend/src/app/(dashboard)/automation/page.tsx`
  - Bổ sung unit tests tại `frontend/src/lib/__tests__/automation.store.test.ts` và `frontend/src/app/(dashboard)/automation/__tests__/automation.test.tsx`
- **APIs**: Sử dụng các endpoint sẵn có của Backend: `GET/POST /api/v1/pages/:pageId/rules`, `PUT/DELETE /api/v1/pages/:pageId/rules/:ruleId`.
- **Phụ thuộc**: Không cần cài thêm thư viện bên ngoài; tái sử dụng Lucide React, Tailwind CSS, và Zustand hiện có.
