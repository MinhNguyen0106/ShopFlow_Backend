# ShopFlow API Contract & Data Synchronization Rules

Tài liệu quy chuẩn bắt buộc nhằm đảm bảo tính đồng bộ 100% giữa **Backend (Express.js)** và **Frontend (Next.js)**, loại bỏ triệt để các lỗi runtime do sai lệch cấu trúc dữ liệu (`TypeError: x.filter is not a function`, `undefined tokens`, lệch `camelCase` / `snake_case`, nested payload mismatch).

---

## 1. Chuẩn Hóa Cấu Trúc Phản Hồi API (API Response Envelope)

Mọi endpoint HTTP trả về từ Express.js Backend **BẮT BUỘC** đóng gói theo cấu trúc Envelope chuẩn `ApiResponse<T>`:

```typescript
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Quy tắc đóng gói thuộc tính bên trong `data`:

1. **Danh sách thực thể (Lists / Collections):**
   - Luôn bọc trong một thuộc tính có tên số nhiều rõ ràng:
     ```json
     {
       "success": true,
       "data": {
         "pages": [ /* Page objects */ ]
       }
     }
     ```
   - Hoặc danh sách phân trang:
     ```json
     {
       "success": true,
       "data": {
         "items": [ /* Page objects */ ],
         "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
       }
     }
     ```
   - **Cấm:** Backend một endpoint trả thẳng array `data: [...]`, endpoint khác lại trả object `data: { pages: [...] }` mà không ghi chú.

2. **Thực thể đơn lẻ (Single Entity):**
   - Đóng gói theo tên danh từ số ít tương ứng hoặc đối tượng dữ liệu cụ thể:
     ```json
     {
       "success": true,
       "data": {
         "page": { "id": "...", "name": "...", "isActive": true }
       }
     }
     ```

3. **Dữ liệu phức hợp (Auth / Multiple Objects):**
   - Phân tách theo domain con rõ ràng, không gom phẳng gây nhầm lẫn:
     ```json
     {
       "success": true,
       "data": {
         "user": { "id": "...", "email": "...", "fullName": "..." },
         "tokens": {
           "accessToken": "ey...",
           "refreshToken": "ey..."
         }
       }
     }
     ```

---

## 2. Quy Chuẩn Đặt Tên Trường (Field Naming & Case Conventions)

1. **Chuẩn JSON Payload là `camelCase`:**
   - Tất cả request body, query params và response data gửi qua mạng giữa Backend và Frontend **bắt buộc dùng `camelCase`**:
     - ✅ Đúng: `pageId`, `isActive`, `accessToken`, `fbPageId`, `createdAt`.
     - ❌ Sai: `page_id`, `is_active`, `access_token`, `fb_page_id`.
2. **Database to DTO Mapping:**
   - Dù cơ sở dữ liệu có chứa cột dạng snake_case (nếu có), khi chuyển giao qua Service/DTO ra Controller thì **phải được map sang `camelCase`**. (Prisma ORM trong ShopFlow đã mặc định map quan hệ và thuộc tính sang camelCase).

---

## 3. Định Nghĩa Kiểu Dữ Liệu Đồng Bộ (Type Synchronization & DTOs)

1. **Khớp nối 1-1 giữa DTO Backend và Interface Frontend:**
   - Mọi DTO tại Backend (`backend/src/api/dtos/*.dto.ts`) phải có Interface hoặc Type tương ứng tại Frontend (`frontend/src/types/*.ts` hoặc `frontend/src/lib/*.store.ts`).
   - Ví dụ đồng bộ `ConnectedPage`:
     - **Backend:** `PageResponseDto`
     - **Frontend:** `ConnectedPage`
     - Cả hai **phải giống hệt nhau** về danh sách trường và kiểu dữ liệu (`id`, `fbPageId`, `name`, `category`, `isActive`, `createdAt`, `updatedAt`).

2. **Không tự suy đoán kiểu (Zero Assumption):**
   - Khi viết Frontend gọi API, Dev/Agent **phải mở trực tiếp file Controller của Backend** để kiểm tra chính xác response structure của endpoint đó trước khi viết code parse dữ liệu.

---

## 4. Kỹ Thuật Bóc Tách Dữ Liệu Phòng Vệ ở Frontend (Defensive Data Parsing)

Để tránh hoàn toàn lỗi sập giao diện như `TypeError: x.filter is not a function` hoặc `undefined is not iterable`:

1. **Bảo vệ kiểu mảng (Array Guarding):**
   - Khi gán dữ liệu vào state yêu cầu Array, **luôn kiểm tra tính hợp lệ** trước khi gán:
   ```typescript
   // ✅ Đúng: Luôn unwrap an toàn và đảm bảo fallback về []
   const responseData = response.data?.data || {};
   const pages: ConnectedPage[] = Array.isArray(responseData)
     ? responseData
     : Array.isArray(responseData.pages)
       ? responseData.pages
       : [];
   set({ pages, isLoading: false });

   // ❌ Sai: Tin tưởng mù quáng vào data.data
   const pages = response.data?.data || []; // Nếu backend trả { pages: [] } thì pages sẽ là object!
   ```

2. **Bảo vệ dữ liệu lồng sâu (Nested Access):**
   - Luôn dùng optional chaining (`?.`) khi truy cập sâu vào token hoặc đối tượng lồng nhau:
   ```typescript
   // ✅ Đúng
   const accessToken = response.data?.data?.tokens?.accessToken;
   
   // ❌ Sai: Gây ReferenceError hoặc gán undefined
   const accessToken = response.data.data.accessToken;
   ```

---

## 5. Quy Trình Đồng Bộ Khi Thay Đổi API (Change Workflow)

Mỗi khi thay đổi, thêm trường hoặc chỉnh sửa endpoint ở Backend:

1. **Bước 1 (Ghi nhận thay đổi):** Sửa DTO / Controller Backend.
2. **Bước 2 (Tìm kiếm người dùng API ở Frontend):** Chạy `grep_search` để tìm toàn bộ store, component, hook đang gọi endpoint đó.
3. **Bước 3 (Cập nhật Frontend):** Sửa interface, store action và component tương ứng để khớp 100%.
4. **Bước 4 (Type-Check kép):**
   - Chạy type-check Backend: `npm run type-check --workspace=backend`
   - Chạy type-check Frontend: `npm run type-check --workspace=frontend`
5. **Bước 5 (Kiểm thử thực tế):** Viết hoặc cập nhật Unit Test / Integration Test với mock payload chuẩn của cả hai phía.

---

## 6. Bảng Tra Cứu Nhanh Các Endpoint Cốt Lõi ShopFlow

| Method & Route | Backend Data Envelope | Frontend Store/Field Cần Bóc | Lưu Ý |
|---|---|---|---|
| `POST /api/v1/auth/register` | `{ user, tokens: { accessToken, refreshToken } }` | `data.tokens.accessToken` | Lưu token vào LocalStorage/Cookie |
| `POST /api/v1/auth/login` | `{ user, tokens: { accessToken, refreshToken } }` | `data.tokens.accessToken` | Cùng cấu trúc với register |
| `GET /api/v1/auth/me` | `{ user }` | `data.user` | Thông tin người dùng hiện tại |
| `GET /api/v1/pages` | `{ pages: ConnectedPage[] }` | `data.pages` | Danh sách Fanpage của user |
| `GET /api/v1/pages/:pageId` | `{ page: ConnectedPage, stats: PageStats }` | `data.page`, `data.stats` | Chi tiết và thống kê |
| `POST /api/v1/pages/connect` | `{ page: ConnectedPage }` | `data.page` | Kết nối Fanpage mới |
| `PATCH /api/v1/pages/:pageId/status` | `{ page: ConnectedPage }` | `data.page` | Bật/tắt trạng thái tự động |
| `DELETE /api/v1/pages/:pageId` | `{ success: true, message: string }` | `data.success` | Ngắt kết nối Fanpage |
| `GET /api/v1/products` | `{ items: Product[], pagination }` | `data.items`, `data.pagination` | Danh sách sản phẩm |
| `GET /api/v1/orders` | `{ items: Order[], pagination }` | `data.items`, `data.pagination` | Danh sách đơn hàng |
