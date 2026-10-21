# Proposal: Đăng ký tài khoản (User Registration)

## Why

ShopFlow cần một quy trình đăng ký tài khoản doanh nghiệp an toàn, mượt mà và trực quan dành cho các chủ shop và nhà bán hàng trực tuyến tại Việt Nam. Việc cung cấp tính năng đăng ký tài khoản tự phục vụ (Self-service Registration) cho phép chủ shop thiết lập tài khoản quản trị (`owner`), tạo lập môi trường làm việc cá nhân hóa trước khi kết nối Fanpage Facebook, lên lịch đăng bài và tự động hóa xử lý đơn hàng.

## What Changes

- **Cung cấp API đăng ký tài khoản (`POST /api/v1/auth/register`)**:
  - Nhận và thẩm định nghiêm ngặt dữ liệu đầu vào: Họ và tên (`fullName` / `full_name`), địa chỉ email hợp lệ, mật khẩu (tối thiểu 8 ký tự bao gồm chữ và số), vai trò mặc định (`owner`).
  - Kiểm tra tính duy nhất của email; trả về lỗi HTTP 409 Conflict với thông báo song ngữ/tiếng Việt rõ ràng nếu email đã tồn tại.
  - Mã hóa mật khẩu bảo mật một chiều trước khi lưu trữ vào cơ sở dữ liệu MySQL.
  - Cấp phát cặp JWT Tokens (Access Token và Refresh Token) ngay sau khi đăng ký để người dùng đăng nhập ngay mà không cần thao tác lại.
  - Áp dụng chuẩn bảo mật, ghi nhật ký kiểm toán (Audit log không chứa mật khẩu/thông tin nhạy cảm).
- **Giao diện trang đăng ký chuyên nghiệp (`/register`)**:
  - Biểu mẫu trực quan với các trường: Họ tên, Email, Mật khẩu, Xác nhận mật khẩu, và Hộp kiểm đồng ý Điều khoản dịch vụ & Chính sách bảo mật dữ liệu Meta.
  - Validate thời gian thực phía máy khách bằng React Hook Form và Zod resolver.
  - Chức năng ẩn/hiện mật khẩu, hiển thị trạng thái đang xử lý (loading spinner), thông báo lỗi rõ ràng.
  - Tích hợp Zustand `useAuthStore` để lưu trữ token an toàn và điều hướng tự động sang trang quản lý Fanpage (`/pages`).

## Capabilities

### New Capabilities
- `user-registration`: Toàn bộ quy trình đăng ký tài khoản người dùng và chủ shop bao gồm thẩm định dữ liệu đầu vào, kiểm tra trùng lặp email, băm mật khẩu bảo mật, tạo tài khoản trong MySQL, cấp phát JWT tokens và giao diện đăng ký phía Frontend.

### Modified Capabilities
<!-- Không có capability hiện hữu nào bị thay đổi yêu cầu -->

## Impact

- **Backend API**:
  - `POST /api/v1/auth/register` phục vụ luồng tạo tài khoản.
  - `auth.service.ts`, `user.repository.ts`, `auth.dto.ts`.
  - Bảng cơ sở dữ liệu `users` trong MySQL (thông qua Prisma ORM).
- **Frontend Dashboard**:
  - Tuyến đường `/register` (`src/app/(auth)/register/page.tsx`).
  - Quản lý trạng thái xác thực `src/lib/auth.store.ts`.
- **Bảo mật & Tuân thủ**:
  - Đảm bảo mã hóa an toàn mật khẩu (bcrypt), ngăn chặn Timing Attack, không để lộ thông tin nhạy cảm trong log hệ thống theo quy chuẩn bảo mật dự án.
