# Proposal: Mở Rộng Quản Lý Đa Fanpage & Phân Quyền Nhân Viên (RBAC) (TASK-25)

## Why

Sau khi hoàn thiện phân hệ phân tích kinh doanh chuyên sâu (`TASK-24`), các chủ shop kinh doanh online trên ShopFlow bước vào giai đoạn mở rộng quy mô vận hành với nhiều Fanpage bán hàng và đội ngũ nhân sự gồm nhiều bộ phận (chăm sóc khách hàng, chốt đơn, marketing, quản lý kho).

Hiện tại, kiến trúc quản trị Fanpage của ShopFlow đang gặp những giới hạn và rủi ro nghiêm trọng:
1. **Ràng buộc độc quyền 1-1 giữa Fanpage và User:** Bảng `connected_pages` hiện chỉ liên kết với duy nhất một `user_id` tạo trang. Chưa có cơ chế chia sẻ quyền vận hành Fanpage cho các thành viên khác trong cùng shop.
2. **Thiếu cơ chế phân quyền theo vai trò (Role-Based Access Control - RBAC):** Không có sự phân định giữa các vai trò khác nhau (`owner`, `manager`, `staff`). Mọi thao tác cấu hình nhạy cảm (thay đổi kịch bản bot tự động, ngắt kết nối Fanpage, đổi trạng thái trang) hiện không được kiểm soát theo cấp bậc.
3. **Nguy cơ rò rỉ dữ liệu cá nhân khách hàng (PII - Personally Identifiable Information):** Nhân viên trực chat (`staff`) khi xem đơn hàng hoặc danh bạ CRM có thể thấy toàn bộ số điện thoại thật của khách hàng, tạo lỗ hổng để nhân viên tuồn dữ liệu khách hàng ra ngoài hoặc mang sang đối thủ cạnh tranh.
4. **Trải nghiệm quản lý thành viên nghèo nàn:** Thiếu giao diện trực quan chuẩn macOS Clean Utility để chủ shop mời nhân viên qua email, gán vai trò, quản lý danh sách thành viên và thu hồi quyền ngay khi nhân sự thay đổi.

Việc triển khai **TASK-25: Mở Rộng Quản Lý Đa Fanpage & Phân Quyền Nhân Viên (RBAC)** nhằm giải quyết dứt điểm các bài toán trên: cung cấp bảng phân quyền `page_members`, middleware kiểm soát vai trò `requirePageRole`, cơ chế tự động che dấu số điện thoại (PII Data Masking) cho vai trò nhân viên (`staff`), và giao diện quản trị thành viên tinh tế, hiện đại.

---

## What Changes

- **Cơ Sở Dữ Liệu PostgreSQL (Migration DDL):**
  - Tạo bảng mới `page_members` lưu trữ mối quan hệ nhiều-nhiều giữa `connected_pages` và `users`:
    - Các trường: `id`, `page_id`, `user_id`, `role` (`owner`, `manager`, `staff`), `invited_by`, `status` (`active`, `pending`, `revoked`), `created_at`, `updated_at`.
    - Ràng buộc duy nhất `UNIQUE (page_id, user_id)` và các chỉ mục phục vụ truy vấn phân quyền nhanh.
  - Tự động di chuyển dữ liệu (Data Backfill): Chuyển đổi toàn bộ `user_id` hiện có trong `connected_pages` thành bản ghi có vai trò `owner` trong `page_members`.
- **Backend Authorization Middleware & PII Protection:**
  - Xây dựng middleware `requirePageRole(...allowedRoles)`:
    - Bóc tách `pageId` từ `params`, `body` hoặc `query`.
    - Kiểm tra xem người dùng hiện tại có vai trò hợp lệ trong bảng `page_members` của page tương ứng hay không.
    - Gán `req.pageMember` chứa thông tin vai trò hiện tại vào context của request.
  - Cơ chế bảo vệ dữ liệu PII (Data Masking Interceptor / Helper):
    - Khi vai trò của người gọi là `staff`, số điện thoại khách hàng trong kết quả trả về của các API đơn hàng (`/api/v1/orders`), chi tiết đơn hàng, và danh bạ khách hàng (`/api/v1/inbox/customers`) tự động được che mờ theo chuẩn định dạng `098****567` thông qua tiện ích `maskPhoneNumber`.
    - Vai trò `owner` và `manager` được xem số điện thoại nguyên bản để liên hệ trực tiếp và xử lý giao vận.
  - Ngăn chặn nhân viên (`staff`) chỉnh sửa hoặc xóa quy tắc tự động hóa (`automation_rules`) hoặc ngắt kết nối Fanpage.
- **Backend Member Management APIs (`/api/v1/pages/:pageId/members`):**
  - `GET /api/v1/pages/:pageId/members`: Lấy danh sách thành viên đang tham gia quản lý Fanpage kèm thông tin tài khoản (Tên, Email, Avatar, Vai trò, Ngày tham gia).
  - `POST /api/v1/pages/:pageId/members/invite`: Mời nhân viên vào Fanpage theo địa chỉ email và gán vai trò (`manager` hoặc `staff`). Chỉ `owner` và `manager` có quyền mời.
  - `PATCH /api/v1/pages/:pageId/members/:memberId/role`: Thay đổi vai trò của thành viên. Chỉ `owner` có quyền thực hiện.
  - `DELETE /api/v1/pages/:pageId/members/:memberId`: Thu hồi quyền truy cập / Xóa thành viên khỏi Fanpage. Không cho phép xóa `owner` duy nhất.
- **Frontend State & Components (macOS Clean Utility):**
  - Mở rộng `usePageStore` hoặc xây dựng `usePageMemberStore` để quản lý danh sách thành viên và lưu trữ vai trò của người dùng hiện tại (`currentRole`) trên từng Fanpage đang chọn.
  - Xây dựng `PageMembersDrawer` / `PageMembersModal` tại màn hình `/pages`:
    - Danh sách thành viên hiển thị đẹp mắt với Avatar, Tên người dùng, Email, Badge vai trò màu sắc tinh tế phong cách Apple (Owner: tím nhạt, Manager: xanh dương, Staff: xanh ngọc).
    - Dropdown chuyển đổi vai trò nhanh và nút xóa thành viên (chỉ hiển thị với người có quyền).
    - Form mời thành viên mới: Nhập email, chọn vai trò (`Quản lý` / `Nhân viên`), kèm nút gửi lời mời với hiệu ứng loading và toast thông báo.
  - Phân quyền hiển thị giao diện (Role-based UI Guards):
    - Ẩn nút "Ngắt kết nối Fanpage", "Đăng ký Webhook", "Thêm/Sửa quy tắc tự động" đối với nhân viên (`staff`).
    - Hiển thị badge vai trò của người dùng hiện tại bên cạnh tên Fanpage trên Topbar / Page Header.

---

## Capabilities

### New Capabilities
- `multi-page-rbac`: Quản lý danh sách thành viên Fanpage, phân quyền theo 3 cấp độ (`owner`, `manager`, `staff`), kiểm soát quyền thực thi API qua middleware `requirePageRole`, và chính sách tự động che mờ số điện thoại khách hàng (PII Data Masking) cho vai trò nhân viên.

### Modified Capabilities
- `pages-management`: Mở rộng màn hình quản lý Fanpage `/pages` với modal danh sách thành viên, form mời nhân sự qua email và hiển thị vai trò của người dùng trên trang.
- `orders-management`: Tích hợp bộ lọc che số điện thoại PII tự động cho vai trò `staff` khi xem danh sách đơn hàng và chi tiết đơn hàng.
- `automation-rules`: Áp dụng middleware giới hạn quyền sửa/xóa kịch bản tự động, chỉ cho phép `owner` và `manager`.

---

## Impact

- **Cơ Sở Dữ Liệu:**
  - Thêm tệp migration `004_page_members_and_rbac.sql` tạo bảng `page_members`.
  - Không phá vỡ (non-breaking) các dữ liệu cũ nhờ script tự động backfill chủ sở hữu hiện tại từ `connected_pages.user_id` sang `page_members`.
- **Mã Nguồn Backend:**
  - Tạo mới `backend/src/infrastructure/repositories/page-member.repository.ts`.
  - Tạo mới `backend/src/core/services/page-member.service.ts`.
  - Tạo mới `backend/src/api/controllers/page-member.controller.ts`.
  - Tạo mới `backend/src/api/dtos/page-member.dto.ts`.
  - Mở rộng `backend/src/api/middlewares/auth.middleware.ts` với middleware `requirePageRole` và mở rộng `Express.Request` với `pageMember`.
  - Bổ sung routes `/api/v1/pages/:pageId/members` vào `backend/src/api/routes/page.routes.ts`.
  - Bổ sung middleware che số điện thoại PII trong controller đơn hàng `order.controller.ts` hoặc service đơn hàng.
- **Mã Nguồn Frontend:**
  - Bổ sung `frontend/src/types/page-member.ts`.
  - Mở rộng Zustand store hoặc tạo `frontend/src/lib/page-member.store.ts`.
  - Tạo cụm giao diện thành viên tại `frontend/src/components/pages/`:
    - `page-members-modal.tsx`: Modal danh sách thành viên và phân quyền.
    - `invite-member-modal.tsx`: Form mời nhân viên qua email.
    - `member-role-badge.tsx`: Huy hiệu vai trò phong cách macOS.
