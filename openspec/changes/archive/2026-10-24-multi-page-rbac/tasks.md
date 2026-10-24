# Tasks: Mở Rộng Quản Lý Đa Fanpage & Phân Quyền Nhân Viên (RBAC) (TASK-25)

## 1. Database Migration & Data Layer (25.1)

- [x] 1.1 Tạo tệp migration `004_page_members_and_rbac.sql` tại `backend/src/infrastructure/database/migrations/` định nghĩa bảng `page_members`, ràng buộc vai trò (`owner`, `manager`, `staff`), trạng thái (`active`, `pending`, `revoked`), unique constraint `(page_id, user_id)` và indexes.
- [x] 1.2 Viết script data backfill tự động chuyển đổi toàn bộ `user_id` hiện hữu trong `connected_pages` sang `page_members` với `role = 'owner'` và `status = 'active'`.
- [x] 1.3 Tạo `PageMemberRepository` tại `backend/src/infrastructure/repositories/page-member.repository.ts` với các phương thức: `findByPageAndUser`, `listByPageId`, `createMember`, `updateRole`, `removeMember`, `countOwnersByPage`.
- [x] 1.4 Viết unit test cho `PageMemberRepository` tại `backend/src/infrastructure/repositories/__tests__/page-member.repository.test.ts`.

## 2. Backend Middleware, Authorization & Member APIs (25.2)

- [x] 2.1 Khai báo DTOs và Zod schemas tại `backend/src/api/dtos/page-member.dto.ts` (`inviteMemberSchema`, `updateMemberRoleSchema`).
- [x] 2.2 Xây dựng middleware `requirePageRole` trong `backend/src/api/middlewares/auth.middleware.ts` xác thực quyền hạn theo vai trò đối với Fanpage cụ thể và mở rộng `Express.Request` với `pageMember`.
- [x] 2.3 Xây dựng `PageMemberService` tại `backend/src/core/services/page-member.service.ts` xử lý logic mời thành viên theo email, kiểm tra tồn tại người dùng, chặn xóa `owner` duy nhất và cập nhật vai trò.
- [x] 2.4 Xây dựng `PageMemberController` tại `backend/src/api/controllers/page-member.controller.ts` xử lý các yêu cầu HTTP và trả về chuẩn `ApiResponse<T>`.
- [x] 2.5 Thiết lập các routes quản lý thành viên trong `backend/src/api/routes/page.routes.ts` (`GET /:pageId/members`, `POST /:pageId/members/invite`, `PATCH /:pageId/members/:memberId/role`, `DELETE /:pageId/members/:memberId`).
- [x] 2.6 Áp dụng middleware `requirePageRole('owner', 'manager')` vào các routes cấu hình nhạy cảm (ngắt kết nối page, cập nhật automation rules).

## 3. PII Phone Number Masking & Security Interceptors (25.2 & 25.4)

- [x] 3.1 Xây dựng helper che dấu dữ liệu nhạy cảm `sanitizeOrderForRole` / `sanitizeCustomerForRole` tận dụng tiện ích `maskPhoneNumber` từ `backend/src/utils/phone-regex.ts`.
- [x] 3.2 Tích hợp bộ lọc PII masking vào service/controller đơn hàng (`backend/src/api/controllers/order.controller.ts`) khi người gọi mang vai trò `staff`.
- [x] 3.3 Tích hợp bộ lọc PII masking vào danh bạ khách hàng CRM / live chat khi người gọi mang vai trò `staff`.
- [x] 3.4 Viết unit test cho bộ lọc PII masking tại `backend/src/core/services/__tests__/pii-masking.test.ts`.

## 4. Frontend Member Management UI & Role Guards (25.3)

- [x] 4.1 Khai báo TypeScript types tại `frontend/src/types/page-member.ts` (`PageMember`, `PageRole`, `InviteMemberPayload`).
- [x] 4.2 Xây dựng Zustand store `page-member.store.ts` tại `frontend/src/lib/page-member.store.ts` quản lý state danh sách thành viên, vai trò người dùng hiện tại và các hành động mời/sửa/xóa thành viên.
- [x] 4.3 Xây dựng Component `MemberRoleBadge` tại `frontend/src/components/pages/member-role-badge.tsx` hiển thị badge vai trò với màu sắc chuẩn macOS Clean Utility.
- [x] 4.4 Xây dựng Component `PageMembersModal` tại `frontend/src/components/pages/page-members-modal.tsx` hiển thị danh sách thành viên, avatar, email, vai trò và dropdown hành động.
- [x] 4.5 Xây dựng Component `InviteMemberModal` tại `frontend/src/components/pages/invite-member-modal.tsx` với form nhập email và radio cards chọn vai trò.
- [x] 4.6 Tích hợp nút "Thành viên" vào thẻ Fanpage trong `frontend/src/app/(dashboard)/pages/page.tsx` và áp dụng điều kiện ẩn/hiện nút hành động nhạy cảm đối với vai trò `staff`.

## 5. Integration Tests, E2E Verification & Quality Gates (25.4)

- [x] 5.1 Viết integration test cho Backend Page Members APIs tại `backend/src/api/routes/__tests__/page-member.routes.test.ts`.
- [x] 5.2 Viết unit/integration test cho Frontend Store và Components tại `frontend/src/components/pages/__tests__/page-members.test.tsx`.
- [x] 5.3 Chạy toàn diện kiểm thử type-check (`tsc --noEmit`) và test suites trên cả Frontend và Backend, bảo đảm 100% tests pass và không có lỗi TypeScript.
