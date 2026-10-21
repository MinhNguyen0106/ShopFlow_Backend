# Tasks: Nghiệp Vụ Quản Lý Danh Mục Sản Phẩm & Tồn Kho (TASK-21)

## 1. Database Migration & DTOs

- [x] 1.1 Tạo tệp migration PostgreSQL `backend/src/infrastructure/database/migrations/002_products_and_inventory.sql` thiết lập bảng `products`, các chỉ mục và trigger `updated_at`. Chạy thử nghiệm cú pháp SQL và kiểm tra tương thích.
- [x] 1.2 Khai báo DTOs & types tại `backend/src/api/dtos/product.dto.ts` (`CreateProductDto`, `UpdateProductDto`, `QueryProductsDto`, `AdjustStockDto`, `ProductItemDto`) kèm Zod schema validation nghiêm ngặt. Viết unit tests kiểm thử DTOs đạt 100% pass.

## 2. Product Repository & Atomic Stock Decrement

- [x] 2.1 Xây dựng `ProductRepository` tại `backend/src/infrastructure/repositories/product.repository.ts` kế thừa `BaseRepository` với các phương thức CRUD (`create`, `findById`, `findBySku`, `findManyByPage`, `update`, `delete`).
- [x] 2.2 Xây dựng phương thức trừ tồn kho nguyên tử (`atomicDecrementStock`) sử dụng câu lệnh SQL điều kiện `stock_quantity >= $1` chống race condition và hỗ trợ trừ kho biến thể trong JSONB.
- [x] 2.3 Viết unit test cho `ProductRepository` với mock DB pool kiểm tra các truy vấn và kiểm thử tính an toàn nguyên tử khi trừ kho.

## 3. Product Service & REST API Assembly

- [x] 3.1 Xây dựng `ProductService` tại `backend/src/core/services/product.service.ts` quản lý nghiệp vụ kiểm tra SKU trùng trong cùng Fanpage, phân trang danh sách và điều chỉnh tồn kho. Viết unit test đạt 100% pass.
- [x] 3.2 Xây dựng Express Controller tại `backend/src/api/controllers/product.controller.ts` và Router tại `backend/src/api/routes/product.routes.ts` với đầy đủ 6 endpoints (`GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/stock`) kết hợp `validateRequest` và `authenticateToken`. Đăng ký vào router chính.
- [x] 3.3 Viết integration test suite tại `backend/src/api/controllers/__tests__/product.controller.test.ts` kiểm thử toàn diện các luồng API CRUD, xử lý lỗi SKU trùng và kiểm tra chống bán vượt tồn kho (concurrency check). Đảm bảo toàn bộ test pass 100% và TypeScript compile 0 lỗi.
