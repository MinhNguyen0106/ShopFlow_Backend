# Change: product-catalog-service

## Why

Trong hệ thống ShopFlow, sau khi trích xuất thực thể đơn hàng (mã SKU, tên sản phẩm, biến thể màu/size, số lượng) từ bình luận và tin nhắn Facebook (ở TASK-20), hệ thống cần một phân hệ quản lý danh mục sản phẩm và tồn kho chính xác để:
1. Đối soát mã SKU trích xuất được với dữ liệu kho hàng thực tế của Shop.
2. Kiểm tra tồn kho của sản phẩm/biến thể và trừ kho an toàn (ACID transaction) nhằm ngăn chặn tình trạng bán vượt tồn kho (overselling) khi có nhiều khách hàng cùng chốt đơn đồng thời.
3. Cung cấp API quản lý sản phẩm (CRUD, cập nhật giá, thêm biến thể màu sắc/kích thước, cập nhật hình ảnh) cho trang quản trị Dashboard.

## What Changes

1. **Database Migration (`002_products_and_inventory.sql`):**
   - Tạo bảng `products` liên kết với `connected_pages` (`page_id`), hỗ trợ mã SKU duy nhất trên mỗi page, tên sản phẩm, đơn giá, giá gốc, số lượng tồn kho `stock_quantity`, cột kiểu `JSONB` cho biến thể (`variants`: color, size, sku, stock, price) và mảng hình ảnh `image_urls`.
   - Index tìm kiếm theo SKU, index lọc sản phẩm đang bán `is_active`, trigger tự động cập nhật `updated_at`.
2. **Data Transfer Objects (DTOs) & Zod Validation:**
   - `CreateProductDto`, `UpdateProductDto`, `QueryProductsDto`, `AdjustStockDto`, `ProductItemDto`, `ProductVariantDto`.
3. **Product Repository (`src/infrastructure/repositories/product.repository.ts`):**
   - Thao tác cơ sở dữ liệu PostgreSQL sử dụng `pg.Pool`, query parameterized phòng chống 100% SQL Injection.
   - Hàm trừ tồn kho nguyên tử (`atomic decrement`): `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1`.
4. **Product Domain Service (`src/core/services/product.service.ts`):**
   - Nghiệp vụ tạo mới sản phẩm (kiểm tra trùng SKU theo page).
   - Truy vấn danh sách phân trang, tìm kiếm theo tên hoặc SKU.
   - Cập nhật thông tin sản phẩm và biến thể.
   - Điều chỉnh tồn kho an toàn với kiểm tra giới hạn.
5. **REST API Controller & Router (`/api/v1/products`):**
   - `GET /api/v1/products`: Danh sách sản phẩm của page có phân trang & tìm kiếm.
   - `POST /api/v1/products`: Tạo mới sản phẩm.
   - `GET /api/v1/products/:id`: Chi tiết sản phẩm kèm biến thể.
   - `PUT /api/v1/products/:id`: Cập nhật thông tin sản phẩm.
   - `DELETE /api/v1/products/:id`: Xóa mềm hoặc xóa sản phẩm.
   - `PATCH /api/v1/products/:id/stock`: Điều chỉnh số lượng tồn kho.
6. **Kiểm thử tự động (Quality Gates):**
   - Unit tests cho DTOs, Repository và ProductService.
   - Integration tests cho các endpoints REST API `/api/v1/products`.
   - Test kiểm thử đồng thời (concurrency check) để đảm bảo không bị overselling khi trừ kho song song.

## Impact

- **Backend:** Bổ sung module `products` mới, đăng ký router vào `/api/v1/products`.
- **Database:** Thêm bảng `products` mới mà không làm gián đoạn các bảng hiện hữu.
- **Frontend / Integration:** Sẵn sàng cung cấp dữ liệu sản phẩm cho Màn hình quản lý đơn hàng (TASK-22) và giao diện giỏ hàng/thanh toán (TASK-23).
