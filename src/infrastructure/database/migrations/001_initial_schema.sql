-- =============================================================================
-- ShopFlow - Database DDL Script (PostgreSQL 15+)
-- Migration: 001_initial_schema.sql
-- Khởi tạo toàn bộ schema, indexes, triggers cho hệ thống ShopFlow
-- =============================================================================
--
-- HƯỚNG DẪN THỰC THI:
--   Cách 1 (psql CLI):
--     psql -U shopflow_user -d shopflow_db -f 001_initial_schema.sql
--   Cách 2 (Docker):
--     docker exec -i shopflow_postgres psql -U shopflow_user -d shopflow_db \
--       < backend/src/infrastructure/database/migrations/001_initial_schema.sql
--   Cách 3 (Migration Runner):
--     npm run db:migrate   (tự động qua migrate.ts)
--
-- LƯU Ý BẢO MẬT:
--   - page_access_token và user_access_token phải được mã hóa AES-256-GCM
--     trước khi INSERT/UPDATE. Xem: backend/src/utils/crypto.ts
--   - Số điện thoại khách hàng KHÔNG được log ở môi trường Production.
-- =============================================================================

-- Đảm bảo script dừng ngay khi có lỗi (tương đương --on-error-stop trong psql)
\set ON_ERROR_STOP on

BEGIN;

-- =============================================================================
-- BƯỚC 0: Kích hoạt Extension
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- BƯỚC 1: Hàm Trigger tự động cập nhật `updated_at`
-- (Khai báo trước để các bảng bên dưới có thể tham chiếu)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- =============================================================================
-- BẢNG 1: users
-- Mục đích: Quản lý tài khoản đăng nhập hệ thống ứng dụng (chủ shop & nhân viên).
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(100)    NOT NULL,
    role            VARCHAR(20)     NOT NULL DEFAULT 'owner'
                        CHECK (role IN ('owner', 'admin', 'staff')),
    status          VARCHAR(20)     NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  users IS 'Tài khoản đăng nhập hệ thống ShopFlow (chủ shop & nhân viên)';
COMMENT ON COLUMN users.role IS 'Phân quyền: owner=chủ shop, admin=quản trị, staff=nhân viên';
COMMENT ON COLUMN users.status IS 'Trạng thái tài khoản: active, inactive, suspended';

-- =============================================================================
-- BẢNG 2: facebook_accounts
-- Mục đích: Lưu trữ tài khoản Facebook cá nhân kết nối ứng dụng (User Access Token).
-- =============================================================================
CREATE TABLE IF NOT EXISTS facebook_accounts (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fb_user_id          VARCHAR(100)    NOT NULL UNIQUE,
    fb_name             VARCHAR(255),
    user_access_token   TEXT            NOT NULL,   -- Bắt buộc mã hóa AES-256-GCM trước khi lưu
    token_expires_at    TIMESTAMPTZ,                -- NULL = Long-Lived Token không hết hạn
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  facebook_accounts IS 'Tài khoản Facebook cá nhân kết nối ứng dụng';
COMMENT ON COLUMN facebook_accounts.user_access_token IS 'PHẢI mã hóa AES-256-GCM trước khi INSERT/UPDATE';
COMMENT ON COLUMN facebook_accounts.fb_user_id IS 'Facebook User ID (App-Scoped ID)';

-- =============================================================================
-- BẢNG 3: connected_pages
-- Mục đích: Fanpage đã kết nối, Page Access Token dài hạn, trạng thái Webhook.
-- =============================================================================
CREATE TABLE IF NOT EXISTS connected_pages (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fb_account_id       UUID            REFERENCES facebook_accounts(id) ON DELETE SET NULL,
    page_id             VARCHAR(100)    NOT NULL UNIQUE, -- Meta Fanpage ID (stable identifier)
    page_name           VARCHAR(255)    NOT NULL,
    avatar_url          TEXT,
    page_access_token   TEXT            NOT NULL,   -- Bắt buộc mã hóa AES-256-GCM trước khi lưu
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    webhook_subscribed  BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  connected_pages IS 'Fanpage Facebook đã kết nối với hệ thống ShopFlow';
COMMENT ON COLUMN connected_pages.page_id IS 'Meta Fanpage ID - stable identifier từ Facebook';
COMMENT ON COLUMN connected_pages.page_access_token IS 'Long-Lived Page Access Token - PHẢI mã hóa AES-256-GCM';
COMMENT ON COLUMN connected_pages.webhook_subscribed IS 'TRUE nếu Webhook đã đăng ký thành công với Meta';

-- =============================================================================
-- BẢNG 4: automation_rules
-- Mục đích: Quy tắc tự động trả lời bình luận, gửi tin nhắn riêng, ẩn SĐT.
-- =============================================================================
CREATE TABLE IF NOT EXISTS automation_rules (
    id                          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id                     UUID            NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    rule_name                   VARCHAR(100)    NOT NULL DEFAULT 'Mặc định',
    hide_phone_enabled          BOOLEAN         NOT NULL DEFAULT TRUE,
    trigger_keywords            JSONB           DEFAULT '["giá", "tư vấn", "pm", "inbox", "bao nhiêu"]'::jsonb,
    auto_comment_template       TEXT,           -- Template bình luận tự động (NULL = không bật)
    auto_private_reply_template TEXT,           -- Template tin nhắn riêng tự động
    is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  automation_rules IS 'Quy tắc tự động hóa: ẩn SĐT, trả lời bình luận, gửi tin riêng';
COMMENT ON COLUMN automation_rules.trigger_keywords IS 'Mảng JSONB các từ khóa kích hoạt quy tắc. VD: ["giá","pm"]';
COMMENT ON COLUMN automation_rules.hide_phone_enabled IS 'TRUE = tự động ẩn bình luận chứa số điện thoại';

-- =============================================================================
-- BẢNG 5: posts_schedule
-- Mục đích: Bài viết đặt lịch đăng tải lên Fanpage.
-- =============================================================================
CREATE TABLE IF NOT EXISTS posts_schedule (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id         UUID            NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_text    TEXT            NOT NULL,
    media_type      VARCHAR(20)     NOT NULL DEFAULT 'none'
                        CHECK (media_type IN ('none', 'photo', 'video')),
    media_urls      JSONB           DEFAULT '[]'::jsonb,
    scheduled_time  TIMESTAMPTZ     NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'scheduled', 'published', 'failed', 'cancelled')),
    meta_post_id    VARCHAR(100),   -- Facebook Post ID sau khi đăng thành công
    error_message   TEXT,           -- Ghi nhận lỗi khi status = 'failed'
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  posts_schedule IS 'Bài viết đặt lịch xuất bản lên Fanpage';
COMMENT ON COLUMN posts_schedule.media_urls IS 'Mảng JSONB URL media. VD: ["https://cdn.../img.jpg"]';
COMMENT ON COLUMN posts_schedule.meta_post_id IS 'Facebook Post ID trả về sau khi đăng bài thành công';
COMMENT ON COLUMN posts_schedule.status IS 'pending→scheduled→published hoặc failed/cancelled';

-- =============================================================================
-- BẢNG 6: customers
-- Mục đích: CRM khách hàng tương tác qua Messenger hoặc Comment.
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id             UUID            NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    customer_fb_id      VARCHAR(100)    NOT NULL,   -- PSID hoặc ASID từ Meta
    customer_name       VARCHAR(255),
    phone_number        VARCHAR(20),                -- Lưu raw (không che giấu), chỉ log masked
    address             TEXT,
    tags                JSONB           DEFAULT '[]'::jsonb, -- VD: ["Co_SDT", "Khach_VIP"]
    notes               TEXT,
    last_interaction_at TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_page_customer UNIQUE (page_id, customer_fb_id)
);

COMMENT ON TABLE  customers IS 'CRM khách hàng tương tác qua Messenger hoặc bình luận Fanpage';
COMMENT ON COLUMN customers.customer_fb_id IS 'PSID (Page-Scoped ID) hoặc ASID từ Meta Platform';
COMMENT ON COLUMN customers.phone_number IS 'Số điện thoại. KHÔNG log plain-text ở Production (mask: 09x***x123)';
COMMENT ON COLUMN customers.tags IS 'Nhãn phân loại khách hàng. VD: ["Co_SDT", "Khach_VIP", "Bom_hang"]';

-- =============================================================================
-- BẢNG 7: conversations
-- Mục đích: Hội thoại hợp nhất (Inbox Messenger & Thread Comment bài viết).
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id                      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id                 UUID            NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    customer_id             UUID            NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type                    VARCHAR(20)     NOT NULL
                                CHECK (type IN ('messenger', 'comment_thread')),
    meta_thread_id          VARCHAR(100)    NOT NULL UNIQUE,  -- Thread ID hoặc Post ID từ Meta
    last_message_text       TEXT,
    last_message_at         TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    window_24h_expires_at   TIMESTAMPTZ,                      -- Hạn cửa sổ 24h nhắn tin Meta Messenger
    unread_count            INT             NOT NULL DEFAULT 0,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'resolved', 'archived')),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  conversations IS 'Hội thoại hợp nhất (Messenger Inbox & Comment Thread)';
COMMENT ON COLUMN conversations.meta_thread_id IS 'Thread ID hoặc Post ID từ Meta - unique identifier';
COMMENT ON COLUMN conversations.window_24h_expires_at IS 'Hạn hết cửa sổ 24h theo chính sách Meta Messenger';
COMMENT ON COLUMN conversations.status IS 'open=đang xử lý, resolved=đã giải quyết, archived=lưu trữ';

-- =============================================================================
-- BẢNG 8: messages_and_comments
-- Mục đích: Lưu chi tiết từng tin nhắn hoặc bình luận.
-- =============================================================================
CREATE TABLE IF NOT EXISTS messages_and_comments (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id     UUID            NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    page_id             UUID            NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    meta_id             VARCHAR(100)    NOT NULL UNIQUE,  -- Facebook Comment ID hoặc Message ID
    sender_type         VARCHAR(20)     NOT NULL
                            CHECK (sender_type IN ('customer', 'page', 'system')),
    sender_fb_id        VARCHAR(100)    NOT NULL,
    content             TEXT,
    is_hidden           BOOLEAN         NOT NULL DEFAULT FALSE,  -- TRUE nếu đã ẩn bình luận qua API
    private_reply_sent  BOOLEAN         NOT NULL DEFAULT FALSE,  -- TRUE nếu đã gửi tin nhắn riêng
    media_payload       JSONB           DEFAULT '{}'::jsonb,     -- Attachments, stickers, v.v.
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  messages_and_comments IS 'Chi tiết từng tin nhắn Messenger hoặc bình luận Facebook';
COMMENT ON COLUMN messages_and_comments.meta_id IS 'Facebook Comment ID hoặc Message ID - Idempotency key';
COMMENT ON COLUMN messages_and_comments.is_hidden IS 'TRUE = bình luận đã được ẩn qua Meta Graph API';
COMMENT ON COLUMN messages_and_comments.media_payload IS 'JSONB chứa attachments, stickers, hình ảnh đính kèm';

-- =============================================================================
-- BẢNG 9: webhook_logs
-- Mục đích: Ghi log sự kiện Webhook từ Meta phục vụ Audit, Debug và Idempotency.
-- =============================================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id    VARCHAR(100)    NOT NULL UNIQUE,  -- Payload Hash, mid hoặc comment_id
    page_id     VARCHAR(100),                     -- Meta Fanpage ID (không phải FK - có thể null)
    event_type  VARCHAR(50)     NOT NULL,         -- VD: 'comment', 'message', 'feed', 'reaction'
    payload     JSONB           NOT NULL,
    status      VARCHAR(20)     NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processed', 'failed')),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  webhook_logs IS 'Nhật ký sự kiện Webhook từ Meta - phục vụ Idempotency & Debug';
COMMENT ON COLUMN webhook_logs.event_id IS 'Unique ID (mid/comment_id/hash) - Idempotency key 24h TTL ở Redis';
COMMENT ON COLUMN webhook_logs.status IS 'pending=chờ xử lý, processed=đã xử lý, failed=lỗi';

-- =============================================================================
-- INDEXES - Tối ưu hóa hiệu năng truy vấn
-- =============================================================================

-- Index cho connected_pages: tìm nhanh theo user_id
CREATE INDEX IF NOT EXISTS idx_connected_pages_user_id
    ON connected_pages(user_id);

-- Partial Index: chỉ đánh index các page đang hoạt động (is_active=TRUE)
-- Dùng cho query: "Lấy danh sách Fanpage active của user"
CREATE INDEX IF NOT EXISTS idx_pages_active
    ON connected_pages(user_id)
    WHERE is_active = TRUE;

-- Index composite cho posts_schedule: lọc theo page + status
CREATE INDEX IF NOT EXISTS idx_posts_schedule_page_status
    ON posts_schedule(page_id, status);

-- Partial Index: chỉ đánh index bài viết PENDING cần lên lịch
-- Dùng cho job scheduler tìm các bài sắp đến giờ đăng
CREATE INDEX IF NOT EXISTS idx_posts_schedule_scheduled_time
    ON posts_schedule(scheduled_time)
    WHERE status = 'pending';

-- Partial Index: chỉ đánh index khách hàng CÓ số điện thoại
-- Dùng cho tra cứu khách hàng theo SĐT
CREATE INDEX IF NOT EXISTS idx_customers_phone
    ON customers(phone_number)
    WHERE phone_number IS NOT NULL;

-- GIN Index: tìm kiếm full-text trong JSONB tags của customers
CREATE INDEX IF NOT EXISTS idx_customers_tags_gin
    ON customers USING GIN (tags);

-- Index cho conversations: sắp xếp theo tin nhắn mới nhất theo page
CREATE INDEX IF NOT EXISTS idx_conversations_page_last_msg
    ON conversations(page_id, last_message_at DESC);

-- Partial Index: chỉ đánh index các hội thoại ĐANG MỞ (status='open')
-- Dùng cho Inbox view - chỉ hiển thị open conversations
CREATE INDEX IF NOT EXISTS idx_conversations_open
    ON conversations(page_id, last_message_at DESC)
    WHERE status = 'open';

-- Index cho messages_and_comments: lấy lịch sử tin nhắn của conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
    ON messages_and_comments(conversation_id, created_at ASC);

-- Index cho automation_rules: tìm nhanh rule theo page
CREATE INDEX IF NOT EXISTS idx_automation_rules_page_id
    ON automation_rules(page_id)
    WHERE is_active = TRUE;

-- Index cho webhook_logs: tìm nhanh theo event_id (đã có UNIQUE, thêm partial cho pending)
CREATE INDEX IF NOT EXISTS idx_webhook_logs_pending
    ON webhook_logs(created_at DESC)
    WHERE status = 'pending';

-- GIN Index: tìm kiếm trong payload JSONB của webhook_logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payload_gin
    ON webhook_logs USING GIN (payload);

-- =============================================================================
-- TRIGGERS - Tự động cập nhật `updated_at`
-- =============================================================================

-- Trigger cho bảng users
CREATE TRIGGER trg_update_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger cho bảng connected_pages
CREATE TRIGGER trg_update_pages
    BEFORE UPDATE ON connected_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger cho bảng posts_schedule
CREATE TRIGGER trg_update_posts
    BEFORE UPDATE ON posts_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger cho bảng automation_rules
CREATE TRIGGER trg_update_rules
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMIT TRANSACTION
-- =============================================================================
COMMIT;

-- Xác nhận hoàn thành
DO $$
DECLARE
    table_count INT;
    index_count INT;
    trigger_count INT;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN (
        'users','facebook_accounts','connected_pages',
        'automation_rules','posts_schedule','customers',
        'conversations','messages_and_comments','webhook_logs'
      );

    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%';

    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';

    RAISE NOTICE '=== ShopFlow Schema Initialization Complete ===';
    RAISE NOTICE 'Tables created  : %/9', table_count;
    RAISE NOTICE 'Custom indexes  : %', index_count;
    RAISE NOTICE 'Triggers active : %', trigger_count;
    RAISE NOTICE '===============================================';
END $$;
