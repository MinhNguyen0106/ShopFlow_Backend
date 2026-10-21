# Spec Delta

## Purpose

Cung cấp khả năng quản lý danh mục sản phẩm, biến thể (màu sắc, kích thước, SKU phụ) và tồn kho an toàn cho các chủ shop bán hàng trên Fanpage Facebook, hỗ trợ kiểm tra tồn kho và trừ kho nguyên tử (atomic decrement) khi chốt đơn hàng.

## ADDED Requirements

### Requirement: Product creation and SKU uniqueness
Hệ thống SHALL cho phép người dùng tạo sản phẩm mới gắn với một Fanpage cụ thể, với mã SKU duy nhất trong phạm vi từng Fanpage và các trường thông tin cơ bản: tên, giá bán, giá niêm yết, tồn kho và danh sách biến thể.

#### Scenario: Create product with valid attributes and SKU successfully
- **WHEN** Người dùng gửi yêu cầu `POST /api/v1/products` với mã SKU `VAY01`, tên `Váy hoa nhí`, giá bán `250000`, số lượng tồn kho `50`, danh sách biến thể gồm 2 size `M`, `L`
- **THEN** Hệ thống lưu sản phẩm vào cơ sở dữ liệu và trả về HTTP 201 Created cùng dữ liệu chi tiết của sản phẩm

#### Scenario: Reject product creation when SKU already exists in the same page
- **WHEN** Người dùng tạo sản phẩm mới với mã SKU trùng với một sản phẩm đã có của cùng Fanpage đó
- **THEN** Hệ thống từ chối yêu cầu và trả về lỗi HTTP 409 Conflict với thông báo mã SKU đã tồn tại

### Requirement: Product catalog retrieval and search
Hệ thống SHALL cho phép người dùng tra cứu danh sách sản phẩm theo từng Fanpage, hỗ trợ phân trang (`page`, `limit`), lọc theo trạng thái (`is_active`) và tìm kiếm theo tên hoặc mã SKU.

#### Scenario: Retrieve paginated product list with search keyword
- **WHEN** Người dùng gửi yêu cầu `GET /api/v1/products?pageId=page_123&search=hoa&page=1&limit=10`
- **THEN** Hệ thống trả về HTTP 200 OK kèm danh sách các sản phẩm có tên hoặc mã SKU chứa từ khóa "hoa" cùng metadata phân trang

### Requirement: Product details update and soft deletion
Hệ thống SHALL cho phép người dùng cập nhật thông tin sản phẩm (tên, giá, hình ảnh, biến thể) hoặc ngừng kinh doanh sản phẩm (`is_active = false`) hoặc xóa sản phẩm.

#### Scenario: Update product price and variants
- **WHEN** Người dùng gửi yêu cầu `PUT /api/v1/products/:id` cập nhật giá mới `220000` và bổ sung màu sắc cho biến thể
- **THEN** Hệ thống cập nhật bản ghi trong cơ sở dữ liệu, tự động cập nhật mốc thời gian `updated_at` và trả về HTTP 200 OK

#### Scenario: Soft delete product
- **WHEN** Người dùng gửi yêu cầu `DELETE /api/v1/products/:id`
- **THEN** Hệ thống đánh dấu sản phẩm `is_active = false` hoặc xóa khỏi hệ thống và trả về HTTP 200 OK

### Requirement: Atomic stock decrement and race-condition prevention
Hệ thống SHALL cung cấp cơ chế trừ tồn kho nguyên tử (Atomic Stock Decrement) bằng câu lệnh SQL điều kiện `stock_quantity >= quantity` bên trong giao dịch (Transaction) nhằm ngăn ngừa tình trạng bán vượt tồn kho (overselling) khi có nhiều yêu cầu trừ kho đồng thời.

#### Scenario: Decrement stock successfully when sufficient quantity available
- **WHEN** Hệ thống thực hiện trừ `2` sản phẩm cho đơn hàng và tồn kho hiện tại là `10`
- **THEN** Tồn kho được giảm xuống còn `8` và trả về trạng thái thành công

#### Scenario: Reject stock decrement when requested quantity exceeds available stock
- **WHEN** Hệ thống yêu cầu trừ `5` sản phẩm nhưng tồn kho hiện tại chỉ còn `3`
- **THEN** Hệ thống từ chối thao tác, ném lỗi `INSUFFICIENT_STOCK` (HTTP 400 hoặc 422) và giữ nguyên tồn kho là `3`
