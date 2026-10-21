-- =============================================================================
-- ShopFlow - Database DDL Script (PostgreSQL 15+)
-- Migration: 003_orders_and_fulfillment.sql
-- Mục đích: Khởi tạo bảng orders, order_items, payments và shipments
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- =============================================================================
-- BẢNG 11: orders
-- Mục đích: Quản lý thông tin đơn hàng chốt từ Fanpage (Comment/Messenger/Manual)
-- =============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id             UUID            NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    customer_id         UUID            NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_code          VARCHAR(50)     NOT NULL, -- Mã định danh duy nhất (VD: ORD-2026-001)
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'confirmed', 'shipping', 'completed', 'cancelled')),
    payment_status      VARCHAR(20)     NOT NULL DEFAULT 'unpaid'
                            CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'refunded')),
    payment_method      VARCHAR(20)     NOT NULL DEFAULT 'cod'
                            CHECK (payment_method IN ('cod', 'vietqr', 'bank_transfer')),
    source              VARCHAR(30)     NOT NULL DEFAULT 'facebook_comment'
                            CHECK (source IN ('facebook_comment', 'facebook_inbox', 'manual')),
    source_meta_id      VARCHAR(100),   -- Comment ID hoặc Message ID gốc từ Facebook
    total_amount        NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    shipping_fee        NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
    discount_amount     NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    final_amount        NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (final_amount >= 0),
    customer_name       VARCHAR(255)    NOT NULL,
    customer_phone      VARCHAR(20),    -- Lưu raw số điện thoại (chỉ mask trên UI)
    shipping_address    TEXT,
    notes               TEXT,
    timeline            JSONB           NOT NULL DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_page_order_code UNIQUE (page_id, order_code)
);

COMMENT ON TABLE orders IS 'Đơn hàng bán lẻ từ Fanpage Facebook chốt qua bình luận hoặc Messenger';
COMMENT ON COLUMN orders.order_code IS 'Mã đơn hàng hiển thị với khách và dùng trong nội dung chuyển khoản VietQR';
COMMENT ON COLUMN orders.timeline IS 'JSONB mảng các sự kiện thay đổi trạng thái kèm timestamp và ghi chú';

-- =============================================================================
-- BẢNG 12: order_items
-- Mục đích: Chi tiết các mặt hàng / sản phẩm và biến thể trong từng đơn hàng
-- =============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id          UUID            REFERENCES products(id) ON DELETE SET NULL,
    sku                 VARCHAR(50)     NOT NULL,
    product_name        VARCHAR(255)    NOT NULL,
    quantity            INT             NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price               NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (price >= 0),
    variant             JSONB           NOT NULL DEFAULT '{}'::jsonb, -- Màu sắc, size, options
    image_url           TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE order_items IS 'Chi tiết các mặt hàng trong đơn hàng';

-- =============================================================================
-- BẢNG 13: payments
-- Mục đích: Lưu trữ lịch sử giao dịch chuyển khoản ngân hàng qua VietQR / Webhook
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    transaction_id      VARCHAR(100)    NOT NULL, -- Mã giao dịch từ cổng thanh toán / ngân hàng
    gateway             VARCHAR(50)     NOT NULL DEFAULT 'vietqr', -- vietqr, sepay, casso, bank_transfer
    amount              NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (amount >= 0),
    transfer_content    TEXT,           -- Nội dung chuyển khoản thực tế khách nhập
    bank_account        VARCHAR(50),    -- Số tài khoản nhận tiền của shop
    bank_code           VARCHAR(20),    -- Mã ngân hàng (VD: VCB, MB, TCB)
    status              VARCHAR(20)     NOT NULL DEFAULT 'success'
                            CHECK (status IN ('success', 'partially_paid', 'refunded', 'failed')),
    paid_at             TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    raw_payload         JSONB           NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payments_txn_gateway UNIQUE (transaction_id, gateway)
);

COMMENT ON TABLE payments IS 'Lịch sử giao dịch thanh toán chuyển khoản ngân hàng VietQR';
COMMENT ON COLUMN payments.transaction_id IS 'Mã giao dịch ngân hàng phục vụ đối soát và chống tấn công phát lại';

-- =============================================================================
-- BẢNG 14: shipments
-- Mục đích: Thông tin vận đơn kết nối với các đối tác giao hàng (GHN / GHTK)
-- =============================================================================
CREATE TABLE IF NOT EXISTS shipments (
    id                      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id                UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    carrier                 VARCHAR(50)     NOT NULL, -- ghn, ghtk, mock
    tracking_code           VARCHAR(100)    NOT NULL UNIQUE, -- Mã vận đơn từ nhà vận chuyển
    cod_amount              NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (cod_amount >= 0),
    shipping_fee            NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
    weight_gram             INT             NOT NULL DEFAULT 500 CHECK (weight_gram > 0),
    status                  VARCHAR(30)     NOT NULL DEFAULT 'ready_to_pick'
                                CHECK (status IN ('ready_to_pick', 'picking', 'delivering', 'delivered', 'returned', 'cancelled')),
    label_url               TEXT,           -- URL phiếu in vận đơn A5/A6 từ nhà vận chuyển
    estimated_delivery_at   TIMESTAMPTZ,    -- Dự kiến thời gian giao hàng
    raw_response            JSONB           NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE shipments IS 'Thông tin vận đơn và hành trình giao hàng từ đối tác vận chuyển';

-- =============================================================================
-- INDEXES TỐI ƯU TRUY VẤN
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_page_id ON orders(page_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_page_status ON orders(page_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_code ON shipments(tracking_code);

-- =============================================================================
-- TRIGGERS TỰ ĐỘNG CẬP NHẬT UPDATED_AT
-- =============================================================================
CREATE TRIGGER trg_update_orders
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_update_shipments
BEFORE UPDATE ON shipments
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMIT;
