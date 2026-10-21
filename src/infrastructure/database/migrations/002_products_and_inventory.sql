-- =============================================================================
-- ShopFlow - Database DDL Script (PostgreSQL 15+)
-- Migration: 002_products_and_inventory.sql
-- Mục đích: Khởi tạo bảng products quản lý danh mục sản phẩm, biến thể và tồn kho
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- =============================================================================
-- BẢNG 10: products
-- Mục đích: Quản lý danh mục sản phẩm, biến thể (màu/size) và tồn kho theo Fanpage
-- =============================================================================
CREATE TABLE IF NOT EXISTS products (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id         UUID            NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    sku             VARCHAR(50)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    price           NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (price >= 0),
    original_price  NUMERIC(12, 2)  CHECK (original_price IS NULL OR original_price >= 0),
    stock_quantity  INT             NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    variants        JSONB           NOT NULL DEFAULT '[]'::jsonb,
    image_urls      JSONB           NOT NULL DEFAULT '[]'::jsonb,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_page_sku UNIQUE (page_id, sku)
);

COMMENT ON TABLE products IS
    'Quản lý danh mục sản phẩm, biến thể (màu sắc/size/giá riêng) và số lượng tồn kho theo từng Fanpage';
COMMENT ON COLUMN products.sku IS 'Mã sản phẩm định danh duy nhất trong phạm vi từng Fanpage (viết hoa, không dấu)';
COMMENT ON COLUMN products.variants IS 'Danh sách biến thể dạng JSONB (màu sắc, size, sku phụ, giá riêng, tồn kho riêng)';
COMMENT ON COLUMN products.stock_quantity IS 'Số lượng tồn kho tổng thể của sản phẩm (chống bán vượt qua atomic decrement)';

-- =============================================================================
-- INDEXES TỐI ƯU TRUY VẤN
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_products_page_id ON products(page_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(page_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(page_id, name);

-- =============================================================================
-- TRIGGER TỰ ĐỘNG CẬP NHẬT UPDATED_AT
-- =============================================================================
CREATE TRIGGER trg_update_products
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMIT;
