# Spec Delta: multi-page-rbac

## Purpose

Cung cấp khả năng quản lý cộng tác đa người dùng trên từng Fanpage Facebook, phân tầng quyền hạn chặt chẽ theo mô hình RBAC 3 cấp (`owner`, `manager`, `staff`), kiểm soát quyền thực thi các tác vụ quản trị thông qua middleware xác thực động, và thực thi chính sách bảo vệ dữ liệu cá nhân (PII Protection) tự động che mờ số điện thoại khách hàng cho vai trò nhân viên.

---

## ADDED Requirements

### Requirement: Page Members Database Schema & Hierarchy
Hệ thống SHALL thiết lập cấu trúc bảng `page_members` lưu trữ thông tin thành viên liên kết với từng Fanpage cụ thể, hỗ trợ 3 cấp bậc vai trò phân định rõ ràng: `owner` (Chủ sở hữu), `manager` (Quản lý) và `staff` (Nhân viên), đồng thời tự động đồng bộ hóa các chủ sở hữu Fanpage hiện có vào bảng với vai trò `owner`.

#### Scenario: Existing page owner backfill
- **WHEN** hệ thống thực thi migration cơ sở dữ liệu `004_page_members_and_rbac.sql`
- **THEN** tất cả các bản ghi hiện có trong bảng `connected_pages` đều được tự động tạo một bản ghi tương ứng trong `page_members` với `role = 'owner'` và `status = 'active'`, bảo đảm không làm gián đoạn quyền truy cập của người dùng cũ.

#### Scenario: Unique member constraint per fanpage
- **WHEN** cố gắng thêm một người dùng đã là thành viên của Fanpage vào lại bảng `page_members`
- **THEN** cơ sở dữ liệu từ chối với lỗi ràng buộc duy nhất (Unique Constraint Violation trên cặp `(page_id, user_id)`).

---

### Requirement: Dynamic Page Role Authorization Middleware
Hệ thống SHALL cung cấp middleware `requirePageRole(...allowedRoles)` để kiểm tra quyền truy cập của người dùng đối với Fanpage được chỉ định trong request (`req.params.pageId`, `req.body.pageId` hoặc `req.query.pageId`).

#### Scenario: Authorized role accessing protected route
- **GIVEN** người dùng đã đăng nhập với JWT hợp lệ và có vai trò `owner` hoặc `manager` trên Fanpage `page-123`
- **WHEN** người dùng gửi request cập nhật kịch bản trả lời tự động hoặc cập nhật trạng thái Fanpage
- **THEN** middleware xác minh người dùng có đủ quyền, gán thông tin `req.pageMember` vào context và cho phép chuyển sang controller xử lý tiếp theo.

#### Scenario: Unauthorized role attempting restricted administrative action
- **GIVEN** người dùng có vai trò `staff` trên Fanpage `page-123`
- **WHEN** người dùng cố gắng gửi request xóa Fanpage (`DELETE /api/v1/pages/:pageId`) hoặc sửa kịch bản tự động (`PUT /api/v1/pages/:pageId/rules/:ruleId`)
- **THEN** middleware phát hiện vai trò `staff` không nằm trong danh sách được phép và trả về mã lỗi HTTP 403 Forbidden kèm thông điệp giải thích rõ ràng.

#### Scenario: User not a member of the requested page
- **GIVEN** người dùng đã đăng nhập nhưng không phải là thành viên trong bảng `page_members` của Fanpage `page-123`
- **WHEN** người dùng cố gắng gọi bất kỳ endpoint nào liên quan đến Fanpage đó
- **THEN** middleware trả về mã lỗi HTTP 403 Forbidden ("Bạn không phải là thành viên của Fanpage này").

---

### Requirement: PII Phone Number Masking Policy for Staff Role
Hệ thống SHALL thực thi chính sách bảo vệ dữ liệu cá nhân nhạy cảm: khi người dùng có vai trò `staff` trên Fanpage xem danh sách đơn hàng, chi tiết đơn hàng hoặc danh bạ khách hàng CRM, tất cả các số điện thoại khách hàng phải tự động được che mờ theo định dạng `098****567` trước khi trả về qua API.

#### Scenario: Staff viewing orders list
- **GIVEN** người dùng đăng nhập có vai trò `staff` trên Fanpage hiện tại
- **WHEN** người dùng gọi API lấy danh sách đơn hàng `GET /api/v1/orders` hoặc chi tiết đơn hàng
- **THEN** trường `customerPhone` hoặc `phone` của tất cả các đơn hàng trả về đều được che dạng `098****567`, ngăn chặn hành vi sao chép dữ liệu khách hàng.

#### Scenario: Owner or Manager viewing orders list
- **GIVEN** người dùng đăng nhập có vai trò `owner` hoặc `manager` trên Fanpage
- **WHEN** người dùng gọi API lấy danh sách đơn hàng hoặc chi tiết đơn hàng
- **THEN** số điện thoại khách hàng được giữ nguyên đầy đủ để phục vụ gọi điện xác nhận và giao nhận hàng hóa.

---

### Requirement: Page Member Invitation and Management APIs
Hệ thống SHALL cung cấp đầy đủ các endpoints RESTful để quản lý vòng đời thành viên của Fanpage: lấy danh sách thành viên, mời thành viên mới theo địa chỉ email, cập nhật vai trò, và thu hồi quyền truy cập.

#### Scenario: Inviting a registered user by email
- **GIVEN** người thực hiện có vai trò `owner` hoặc `manager` trên Fanpage
- **WHEN** gửi yêu cầu `POST /api/v1/pages/:pageId/members/invite` với email người dùng hợp lệ trong hệ thống và vai trò `staff`
- **THEN** hệ thống tạo bản ghi mới trong `page_members` với `role = 'staff'`, `status = 'active'`, ghi nhận `invited_by` và trả về thông tin thành viên kèm HTTP 201 Created.

#### Scenario: Inviting a non-existent email
- **WHEN** gửi yêu cầu mời thành viên với email không tồn tại trong bảng `users`
- **THEN** hệ thống trả về mã lỗi HTTP 404 Not Found kèm thông điệp "Không tìm thấy người dùng với địa chỉ email này trong hệ thống ShopFlow".

#### Scenario: Owner modifying member role
- **GIVEN** người thực hiện là `owner` của Fanpage
- **WHEN** gửi yêu cầu `PATCH /api/v1/pages/:pageId/members/:memberId/role` để nâng vai trò của thành viên từ `staff` lên `manager`
- **THEN** hệ thống cập nhật vai trò trong cơ sở dữ liệu và trả về bản ghi thành viên đã cập nhật.

#### Scenario: Preventing removal of the last page owner
- **WHEN** người dùng cố gắng xóa hoặc hạ quyền của `owner` duy nhất còn lại trên Fanpage
- **THEN** hệ thống chặn hành động này và trả về mã lỗi HTTP 400 Bad Request ("Không thể xóa hoặc thay đổi vai trò của Chủ sở hữu duy nhất của Fanpage").

---

### Requirement: Fanpage Team Management UI (macOS Clean Utility)
Hệ thống SHALL cung cấp giao diện quản trị thành viên trực quan chuẩn macOS Clean Utility tại màn hình `/pages`, hiển thị danh sách thành viên, form mời nhân sự qua email, huy hiệu vai trò phong cách Apple, và ẩn/hiện các nút thao tác tương ứng theo vai trò của người dùng hiện tại.

#### Scenario: Opening page members drawer from page card
- **WHEN** người dùng bấm nút "Thành viên & Phân quyền" trên thẻ Fanpage tại màn hình `/pages`
- **THEN** hệ thống mở Drawer/Modal hiển thị danh sách thành viên đang hoạt động với đầy đủ Avatar, Tên, Email, Badge vai trò và ngày tham gia.

#### Scenario: Role-based dynamic button rendering in UI
- **GIVEN** người dùng hiện tại đang truy cập Fanpage với vai trò `staff`
- **WHEN** xem giao diện quản lý Fanpage và kịch bản tự động
- **THEN** giao diện tự động ẩn các nút hành động nhạy cảm (như "Ngắt kết nối Fanpage", "Thêm quy tắc mới", "Chỉnh sửa quy tắc", "Xóa thành viên"), hiển thị nhãn "Chỉ xem" và badge vai trò `Nhân viên`.
