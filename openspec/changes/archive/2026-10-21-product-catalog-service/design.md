# Architecture & Technical Design: Product Catalog & Inventory Service (TASK-21)

## 1. Tổng Quan Kiến Trúc (Architectural Overview)

Phân hệ Quản lý Danh mục Sản phẩm & Tồn kho (`product-catalog-service`) được thiết kế theo mô hình Clean Architecture (Controller -> Service -> Repository -> Database).

```
[REST Client / Frontend Dashboard / Order Service]
                     │
                     ▼ HTTP
[ProductController] (Thẩm định Zod DTOs, trả về JSON Envelope)
                     │
                     ▼
[ProductService] (Nghiệp vụ kiểm tra SKU trùng, phân trang, điều chỉnh tồn kho)
                     │
                     ▼
[ProductRepository] (Parameterized SQL Queries, Atomic Decrement, Transaction Support)
                     │
                     ▼ SQL / pg.Pool
[PostgreSQL Database: Table `products`]
```

---

## 2. Thiết Kế Cơ Sở Dữ Liệu (Database DDL Migration)

Tạo file migration: `backend/src/infrastructure/database/migrations/002_products_and_inventory.sql`:

```sql
-- =============================================================================
-- BẢNG PRODUCTS (DANH MỤC SẢN PHẨM & TỒN KHO)
-- =============================================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    original_price NUMERIC(12, 2),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    variants JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_page_sku UNIQUE (page_id, sku)
);

-- Indexes tối ưu hóa tìm kiếm & lọc
CREATE INDEX IF NOT EXISTS idx_products_page_id ON products(page_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(page_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(page_id, name);

-- Trigger cập nhật updated_at
CREATE TRIGGER trg_update_products
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

### Cấu Trúc Biến Thể (`variants` JSONB Schema):
```json
[
  {
    "id": "var_01",
    "sku": "VAY01-DO-M",
    "color": "đỏ",
    "size": "M",
    "price": 250000,
    "stock": 20
  },
  {
    "id": "var_02",
    "sku": "VAY01-DO-L",
    "color": "đỏ",
    "size": "L",
    "price": 250000,
    "stock": 30
  }
]
```

---

## 3. Data Transfer Objects (DTOs) & Zod Validation

Vị trí: `backend/src/api/dtos/product.dto.ts`

- `ProductVariantSchema`: `{ id: z.string().optional(), sku: z.string().optional(), color: z.string().optional(), size: z.string().optional(), price: z.number().nonnegative().optional(), stock: z.number().int().nonnegative().default(0) }`
- `CreateProductDtoSchema`:
  - `pageId`: `z.string().uuid()`
  - `sku`: `z.string().min(2).max(50).trim().toUpperCase()`
  - `name`: `z.string().min(2).max(255).trim()`
  - `description`: `z.string().optional()`
  - `price`: `z.number().positive()`
  - `originalPrice`: `z.number().positive().optional()`
  - `stockQuantity`: `z.number().int().nonnegative().default(0)`
  - `variants`: `z.array(ProductVariantSchema).default([])`
  - `imageUrls`: `z.array(z.string().url()).default([])`
  - `isActive`: `z.boolean().default(true)`
- `UpdateProductDtoSchema`: Toàn bộ các trường của `CreateProductDto` là optional (ngoại trừ `id` / `pageId` không đổi).
- `QueryProductsDtoSchema`:
  - `pageId`: `z.string().uuid()`
  - `search`: `z.string().optional()`
  - `isActive`: `z.coerce.boolean().optional()`
  - `page`: `z.coerce.number().int().positive().default(1)`
  - `limit`: `z.coerce.number().int().positive().max(100).default(20)`
- `AdjustStockDtoSchema`:
  - `quantity`: `z.number().int()` (dương để cộng kho, âm để trừ kho)
  - `variantSku`: `z.string().optional()`
  - `reason`: `z.string().optional()`

---

## 4. Chống Bán Vượt Tồn Kho (Concurrency & Atomic Decrement)

Để ngăn chặn Race Condition khi có 10+ đơn hàng cùng chốt cho sản phẩm chỉ còn 1 cái:
```sql
UPDATE products
SET stock_quantity = stock_quantity - $1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $2 AND stock_quantity >= $1
RETURNING *;
```
- Nếu câu lệnh trả về bản ghi: Trừ kho thành công.
- Nếu không có dòng nào được cập nhật (`rowCount === 0`): Tồn kho hiện tại nhỏ hơn số lượng yêu cầu (`$1`), ném `AppError('INSUFFICIENT_STOCK', 400)`.
- Không sử dụng `SELECT stock_quantity` rồi kiểm tra bằng JavaScript trước khi `UPDATE`, tránh hoàn toàn lỗ hổng race condition giữa 2 câu lệnh.

---

## 5. REST API Endpoints Specification

Tất cả các endpoints được bảo vệ bởi middleware `authenticateToken`:

- `GET /api/v1/products`: Trả về danh sách sản phẩm phân trang.
- `POST /api/v1/products`: Tạo mới sản phẩm.
- `GET /api/v1/products/:id`: Chi tiết 1 sản phẩm.
- `PUT /api/v1/products/:id`: Chỉnh sửa sản phẩm.
- `DELETE /api/v1/products/:id`: Xóa sản phẩm.
- `PATCH /api/v1/products/:id/stock`: Điều chỉnh tồn kho trực tiếp.

Chuẩn phản hồi JSON Envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Thông điệp thành công"
}
```
