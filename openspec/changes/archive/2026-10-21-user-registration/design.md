# Technical Design: Đăng ký tài khoản (User Registration)

## Context

Hệ thống ShopFlow được xây dựng theo kiến trúc phân tách rõ ràng giữa Next.js 14+ Frontend (App Router, Tailwind CSS, Zustand) và Express.js Backend (Clean Architecture, TypeScript Strict, Prisma ORM, MySQL 8.x). 
Xem [proposal.md](proposal.md) để biết bối cảnh và mục tiêu nghiệp vụ; xem [spec.md](specs/user-registration/spec.md) để biết các yêu cầu hành vi chi tiết.

## Goals / Non-Goals

**Goals:**
- Thiết kế luồng đăng ký khép kín từ Frontend UI đến Backend Domain Service tuân thủ Clean Architecture và TypeScript Strict Mode.
- Thẩm định dữ liệu hai tầng (Client-side với Zod/React Hook Form, Server-side với Zod Middleware).
- Đảm bảo tính nhất quán hợp đồng dữ liệu (API Contract Sync): Backend trả về chuẩn `ApiResponse<T>`, hỗ trợ cả `fullName` (camelCase) và `full_name` thông qua Zod preprocess.
- Bảo mật thông tin xác thực: Mã hóa mật khẩu an toàn với bcrypt (salt rounds = 10), phát hành Access Token (15 phút) và Refresh Token (7 ngày).
- Tự động hóa trải nghiệm: Đăng ký thành công tự động đăng nhập và điều hướng ngay về `/pages`.

**Non-Goals:**
- Xác thực email kích hoạt tài khoản qua OTP/Email Verification (sẽ triển khai ở giai đoạn hoàn thiện sau).
- Đăng ký trực tiếp bằng tài khoản mạng xã hội (Facebook Login được xử lý riêng tại phân hệ Facebook OAuth).
- Quản lý phân quyền đa người dùng nâng cao (RBAC permissions ma trận chi tiết thuộc phạm vi module Settings/Team).

## Decisions

### Quyết định 1: Sử dụng Bcrypt cho mã hóa mật khẩu
- **Lý do**: `bcrypt` (hoặc `bcryptjs`) là tiêu chuẩn công nghiệp ổn định, hiệu năng cao và có khả năng chống lại các cuộc tấn công brute-force với salt rounds có thể điều chỉnh linh hoạt.
- **Phương án thay thế đã xem xét**: `argon2` (mạnh nhưng cần native binary dependencies phức tạp trên một số môi trường Windows); mã hóa tự chế bằng SHA-256 (tuyệt đối không an toàn, dễ bị tra cứu rainbow table).

### Quyết định 2: Hỗ trợ Zod Preprocess đồng bộ `fullName` và `full_name`
- **Lý do**: Tuân thủ quy chuẩn [.agents/rules/api-contract-sync.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/rules/api-contract-sync.md) yêu cầu 100% dữ liệu trao đổi giữa FE và BE qua JSON phải dùng `camelCase`, trong khi cấu trúc cơ sở dữ liệu MySQL sử dụng `snake_case`. Zod Schema sử dụng `preprocess` để chuẩn hóa dữ liệu đầu vào trong suốt.
- **Phương án thay thế đã xem xét**: Ép buộc một bên thay đổi cứng (dễ gây breaking change khi tích hợp).

### Quyết định 3: Gán vai trò mặc định `owner` cho người dùng đăng ký tự phục vụ
- **Lý do**: Người dùng tự đăng ký trên trang chủ ShopFlow luôn là chủ cửa hàng, cần toàn quyền thiết lập ban đầu (kết nối Fanpage, tạo cấu hình bot, quản lý sản phẩm).
- **Phương án thay thế đã xem xét**: Để trống vai trò hoặc mặc định `staff` (dẫn đến việc người dùng bị hạn chế quyền ngay khi vừa vào hệ thống).

### Quyết định 4: Quản lý trạng thái xác thực bằng Zustand & LocalStorage
- **Lý do**: Zustand cung cấp store gọn nhẹ, hỗ trợ đồng bộ SSR và Client Components trong Next.js App Router mượt mà, dễ dàng kết hợp với axios/fetch interceptors để tự động đính kèm Bearer token.
- **Phương án thay thế đã xem xét**: NextAuth.js (cồng kềnh, khó tùy biến sâu vào custom Express API và Redis session của ShopFlow).

## Risks / Trade-offs

- **[Tấn công Brute Force / Spam tạo tài khoản giả mạo]** → *Biện pháp giảm thiểu*: Tích hợp Rate Limiting middleware giới hạn số lượt request tối đa từ một địa chỉ IP (ví dụ: tối đa 5 yêu cầu đăng ký trong 15 phút).
- **[Tấn công Timing Attack đối soát dữ liệu nhạy cảm]** → *Biện pháp giảm thiểu*: Sử dụng hàm so sánh thời gian an toàn `crypto.timingSafeEqual` và bcrypt verify.
- **[Rò rỉ thông tin cá nhân (PII) trong Log]** → *Biện pháp giảm thiểu*: Ghi nhật ký structured log qua Winston/Pino không bao gồm mật khẩu thô và làm mờ/lọc trường nhạy cảm.

## Migration Plan

- Cơ sở dữ liệu: Bảng `users` trong MySQL đã sẵn sàng các trường tương ứng (`email`, `password_hash`, `full_name`, `role`, `status`). Không cần chạy migration phá vỡ cấu trúc.
- Khả năng tương thích ngược: Duy trì hỗ trợ cả camelCase và snake_case cho các client cũ hoặc script kiểm thử.
