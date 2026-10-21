# Tasks: Đăng ký tài khoản (User Registration)

## 1. Backend DTO Validation & Rate Limiting

- [x] 1.1 Hoàn thiện và thẩm định `RegisterDtoSchema` trong `backend/src/api/dtos/auth.dto.ts` để kiểm tra nghiêm ngặt `email`, độ mạnh mật khẩu (ít nhất 8 ký tự, gồm cả chữ và số), `fullName` (hỗ trợ cả camelCase và snake_case). Xác minh bằng kiểm thử tự động `backend/src/api/dtos/__tests__/auth.dto.test.ts`.
- [x] 1.2 Bổ sung Rate Limiting middleware cho endpoint `POST /api/v1/auth/register` để ngăn ngừa tấn công brute-force tạo tài khoản giả mạo hàng loạt. Xác minh bằng ca kiểm thử trả về mã lỗi HTTP 429 khi vượt quá ngưỡng yêu cầu cho phép.

## 2. Backend Domain Service & Controller

- [x] 2.1 Rà soát và hoàn thiện `AuthService.register()` trong `backend/src/core/services/auth.service.ts`: đối soát trùng lặp email (throw ConflictError 409), băm mật khẩu bằng bcrypt, tạo người dùng với vai trò mặc định `owner`, sinh cặp token và loại bỏ password hash khỏi đối tượng trả về. Xác minh bằng `backend/src/core/services/__tests__/auth.service.test.ts`.
- [x] 2.2 Hoàn thiện Controller và Endpoint `POST /api/v1/auth/register` trong `backend/src/api/routes/auth.routes.ts` tuân thủ chuẩn phong bì phản hồi `{ success: true, data: { user, tokens } }`. Xác minh bằng ca kiểm thử tích hợp `npx vitest run auth.routes.test.ts`.

## 3. Frontend Registration UI & Store

- [x] 3.1 Rà soát giao diện `src/app/(auth)/register/page.tsx`: tích hợp React Hook Form, Zod validation, kiểm tra khớp mật khẩu, nút bật/tắt hiển thị mật khẩu, checkbox cam kết điều khoản và trạng thái loading spinner. Xác minh form hiển thị thông báo lỗi khi nhập sai định dạng.
- [x] 3.2 Tích hợp và kiểm tra `useAuthStore.register()` trong `src/lib/auth.store.ts` để gọi API Backend, lưu trữ an toàn Access/Refresh Token và tự động điều hướng sang trang kết nối `/pages`. Xác minh bằng ca kiểm thử frontend `npm run test` trên gói `frontend`.

## 4. End-to-End Verification & Quality Gates

- [x] 4.1 Chạy toàn bộ bộ kiểm thử tự động của luồng xác thực `npx vitest run auth` và kiểm tra tĩnh kiểu dữ liệu `npx tsc --noEmit` trên cả Backend và Frontend để đảm bảo 0 lỗi lint/type và 100% test vượt qua.
