# Tasks: Màn hình Cấu hình Kịch bản Tự động & Ẩn SĐT (TASK-18)

## 1. DTOs & Zustand Store

- [x] 1.1 Định nghĩa kiểu dữ liệu và interfaces tại `frontend/src/types/automation.ts` đồng bộ 100% với backend DTOs (`AutomationRule`, `CreateAutomationRuleInput`, `UpdateAutomationRuleInput`). Xác minh types compile không lỗi.
- [x] 1.2 Xây dựng Zustand store `frontend/src/lib/automation.store.ts` kết nối với các REST API `/api/v1/pages/:pageId/rules` (`fetchRules`, `createRule`, `updateRule`, `toggleRuleActive`, `deleteRule`), hỗ trợ defensive parsing chống crash và cập nhật lạc quan (optimistic UI) cho toggle trạng thái. Xác minh store dispatch các actions thành công.
- [x] 1.3 Viết và chạy unit tests cho Zustand store tại `frontend/src/lib/__tests__/automation.store.test.ts`, kiểm thử đầy đủ các actions fetch, create, update, optimistic toggle và delete với mocked API client, đạt 100% test pass.

## 2. Automation Components & Modals

- [x] 2.1 Xây dựng Component `RuleCard` tại `frontend/src/components/automation/rule-card.tsx` dạng thẻ Bento chuẩn phong cách macOS Clean Utility: hiển thị tên quy tắc, danh sách chip từ khóa, huy hiệu an ninh `🛡️ Ẩn SĐT`, xem trước mẫu tin nhắn, switch gạt bật/tắt nhanh và menu thao tác chỉnh sửa/xóa. Xác minh render và tương tác switch.
- [x] 2.2 Xây dựng Component `RuleModal` tại `frontend/src/components/automation/rule-modal.tsx` phục vụ tạo mới và chỉnh sửa quy tắc: input thêm/xóa tag từ khóa bằng phím Enter, switch kích hoạt ẩn SĐT, textarea soạn mẫu phản hồi kèm các nút chèn nhanh biến `{{customer_name}}` và `{{page_name}}`. Xác minh validate form và gọi submit handler.
- [x] 2.3 Xây dựng Component `DeleteRuleDialog` tại `frontend/src/components/automation/delete-rule-dialog.tsx` với hộp thoại xác nhận cảnh báo an toàn trước khi xóa kịch bản. Xác minh render và xử lý callback xác nhận/hủy bỏ.

## 3. Page Assembly & Quality Gates

- [x] 3.1 Lắp ráp trang chính `frontend/src/app/(dashboard)/automation/page.tsx` chuẩn phong cách macOS Clean Utility: thanh công cụ gồm bộ chọn Fanpage, thanh tìm kiếm kịch bản theo tên/từ khóa, nút "+ Thêm kịch bản mới", lưới Bento cards tự co giãn và Empty State khi chưa có kịch bản. Xác minh kết nối đồng bộ giữa store và UI.
- [x] 3.2 Viết và chạy integration tests cho toàn bộ phân hệ automation tại `frontend/src/app/(dashboard)/automation/__tests__/automation.test.tsx`, kiểm thử các luồng hiển thị danh sách, bật/tắt rule, mở modal tạo mới/chỉnh sửa và xóa rule, đạt 100% test pass.
- [x] 3.3 Chạy kiểm tra tĩnh kiểu dữ liệu `npx tsc --noEmit` và build thử nghiệm `npm run build` trên gói `frontend`, đảm bảo 0 lỗi lint/type.
