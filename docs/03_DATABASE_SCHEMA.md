# THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA & SQL STATEMENTS)
## DỰ ÁN QUẢN LÝ FANPAGE FACEBOOK & TỰ ĐỘNG HÓA BÁN HÀNG

**Hệ quản trị CSDL:** PostgreSQL 15+ (Hỗ trợ JSONB, GIN Index, Triggers, Extension `uuid-ossp`)  
**Mục đích:** Quản lý giao dịch ACID, phân quyền người dùng, lưu trữ Fanpage, lịch đăng bài, quy tắc tự động và lịch sử hội thoại tập trung.  

---

### I. SƠ ĐỒ THỰC THỂ QUAN HỆ (Entity-Relationship Overview)

* **`users`** `(1)` ─── `(N)` **`facebook_accounts`** `(1)` ─── `(N)` **`connected_pages`**
* **`connected_pages`** `(1)` ─── `(N)` **`automation_rules`**
* **`connected_pages`** `(1)` ─── `(N)` **`posts_schedule`**
* **`connected_pages`** `(1)` ─── `(N)` **`customers`**
* **`connected_pages`** `(1)` ─── `(N)` **`conversations`** `(1)` ─── `(N)` **`messages_and_comments`**
* **`customers`** `(1)` ─── `(N)` **`conversations`**

---

### II. ĐỊNH NGHĨA CHI TIẾT CÁC BẢNG DỮ LIỆU (Tables Specification)

#### Bảng 1: `users`
*Mục đích:* Quản lý tài khoản đăng nhập hệ thống ứng dụng.
* **Cấu trúc:** `id` (UUID, PK), `email` (VARCHAR, UNIQUE), `password_hash` (VARCHAR), `full_name` (VARCHAR), `role` (VARCHAR), `status` (VARCHAR), `created_at`, `updated_at`.

#### Bảng 2: `facebook_accounts`
*Mục đích:* Lưu trữ thông tin tài khoản Facebook cá nhân kết nối ứng dụng (dùng lấy User Access Token).
* **Cấu trúc:** `id` (UUID, PK), `user_id` (UUID, FK `users.id`), `fb_user_id` (VARCHAR, UNIQUE), `fb_name` (VARCHAR), `user_access_token` (TEXT - Encrypted), `token_expires_at` (TIMESTAMPTZ), `created_at`.

#### Bảng 3: `connected_pages`
*Mục đích:* Lưu trữ danh sách Fanpage đã kết nối, Token dài hạn và trạng thái Webhook.
* **Cấu trúc:** `id` (UUID, PK), `user_id` (UUID, FK `users.id`), `fb_account_id` (UUID, FK `facebook_accounts.id`), `page_id` (VARCHAR, UNIQUE - Meta Page ID), `page_name` (VARCHAR), `avatar_url` (TEXT), `page_access_token` (TEXT - Encrypted AES-256), `is_active` (BOOLEAN), `webhook_subscribed` (BOOLEAN), `created_at`, `updated_at`.

#### Bảng 4: `automation_rules`
*Mục đích:* Quản lý các quy tắc tự động trả lời bình luận, gửi tin nhắn riêng và cấu hình ẩn SĐT.
* **Cấu trúc:** `id` (UUID, PK), `page_id` (UUID, FK `connected_pages.id`), `rule_name` (VARCHAR), `hide_phone_enabled` (BOOLEAN), `trigger_keywords` (JSONB - Mảng chứa từ khóa), `auto_comment_template` (TEXT), `auto_private_reply_template` (TEXT), `is_active` (BOOLEAN), `created_at`, `updated_at`.

#### Bảng 5: `posts_schedule`
*Mục đích:* Lưu trữ thông tin bài viết đặt lịch đăng tải lên Fanpage.
* **Cấu trúc:** `id` (UUID, PK), `page_id` (UUID, FK `connected_pages.id`), `user_id` (UUID, FK `users.id`), `content_text` (TEXT), `media_type` (VARCHAR: `none`, `photo`, `video`), `media_urls` (JSONB), `scheduled_time` (TIMESTAMPTZ), `status` (VARCHAR: `pending`, `scheduled`, `published`, `failed`, `cancelled`), `meta_post_id` (VARCHAR), `error_message` (TEXT), `created_at`, `updated_at`.

#### Bảng 6: `customers`
*Mục đích:* Quản lý thông tin khách hàng tương tác qua Messenger hoặc Comment.
* **Cấu trúc:** `id` (UUID, PK), `page_id` (UUID, FK `connected_pages.id`), `customer_fb_id` (VARCHAR - PSID/ASID), `customer_name` (VARCHAR), `phone_number` (VARCHAR), `address` (TEXT), `tags` (JSONB - Mảng nhãn: `["Co_SDT", "Khach_VIP"]`), `notes` (TEXT), `last_interaction_at` (TIMESTAMPTZ), `created_at`. UNIQUE constraint `(page_id, customer_fb_id)`.

#### Bảng 7: `conversations`
*Mục đích:* Bảng hội thoại hợp nhất (Inbox Messenger & Thread Comment bài viết).
* **Cấu trúc:** `id` (UUID, PK), `page_id` (UUID, FK `connected_pages.id`), `customer_id` (UUID, FK `customers.id`), `type` (VARCHAR: `messenger`, `comment_thread`), `meta_thread_id` (VARCHAR, UNIQUE), `last_message_text` (TEXT), `last_message_at` (TIMESTAMPTZ), `window_24h_expires_at` (TIMESTAMPTZ - Cửa sổ 24h Meta), `unread_count` (INT), `status` (VARCHAR: `open`, `resolved`), `created_at`.

#### Bảng 8: `messages_and_comments`
*Mục đích:* Lưu trữ chi tiết từng tin nhắn hoặc bình luận trong hệ thống.
* **Cấu trúc:** `id` (UUID, PK), `conversation_id` (UUID, FK `conversations.id`), `page_id` (UUID, FK `connected_pages.id`), `meta_id` (VARCHAR, UNIQUE - Comment ID hoặc Message ID), `sender_type` (VARCHAR: `customer`, `page`, `system`), `sender_fb_id` (VARCHAR), `content` (TEXT), `is_hidden` (BOOLEAN), `private_reply_sent` (BOOLEAN), `media_payload` (JSONB), `created_at`.

#### Bảng 9: `webhook_logs`
*Mục đích:* Ghi log sự kiện Webhook từ Meta phục vụ Audit, Debug và chống xử lý trùng lặp (Idempotency).
* **Cấu trúc:** `id` (UUID, PK), `event_id` (VARCHAR, UNIQUE), `page_id` (VARCHAR), `event_type` (VARCHAR), `payload` (JSONB), `status` (VARCHAR: `pending`, `processed`, `failed`), `created_at`.

---

### III. ĐOẠN MÃ SQL DDL HOÀN CHỈNH (PostgreSQL Runnable Script)

```sql
-- =============================================================================
-- DỰ ÁN QUẢN LÝ FANPAGE FACEBOOK - DATABASE DDL SCRIPT (POSTGRESQL)
-- =============================================================================

-- Kích hoạt extension hỗ trợ sinh UUID ngẫu nhiên
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. BẢNG USERS
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. BẢNG FACEBOOK_ACCOUNTS
-- -----------------------------------------------------------------------------
CREATE TABLE facebook_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fb_user_id VARCHAR(100) NOT NULL UNIQUE,
    fb_name VARCHAR(255),
    user_access_token TEXT NOT NULL, -- Đã mã hóa AES-256
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. BẢNG CONNECTED_PAGES
-- -----------------------------------------------------------------------------
CREATE TABLE connected_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fb_account_id UUID REFERENCES facebook_accounts(id) ON DELETE SET NULL,
    page_id VARCHAR(100) NOT NULL UNIQUE, -- Meta Fanpage ID
    page_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    page_access_token TEXT NOT NULL, -- Mã hóa AES-256 Long-Lived Token
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    webhook_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. BẢNG AUTOMATION_RULES
-- -----------------------------------------------------------------------------
CREATE TABLE automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL DEFAULT 'Mặc định',
    hide_phone_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    trigger_keywords JSONB DEFAULT '["giá", "tư vấn", "pm", "inbox", "bao nhiêu"]'::jsonb,
    auto_comment_template TEXT,
    auto_private_reply_template TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. BẢNG POSTS_SCHEDULE
-- -----------------------------------------------------------------------------
CREATE TABLE posts_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_text TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (media_type IN ('none', 'photo', 'video')),
    media_urls JSONB DEFAULT '[]'::jsonb,
    scheduled_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'published', 'failed', 'cancelled')),
    meta_post_id VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6. BẢNG CUSTOMERS
-- -----------------------------------------------------------------------------
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    customer_fb_id VARCHAR(100) NOT NULL, -- PSID hoặc ASID
    customer_name VARCHAR(255),
    phone_number VARCHAR(20),
    address TEXT,
    tags JSONB DEFAULT '[]'::jsonb, -- e.g. ["Co_SDT", "Khach_VIP"]
    notes TEXT,
    last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_page_customer UNIQUE (page_id, customer_fb_id)
);

-- -----------------------------------------------------------------------------
-- 7. BẢNG CONVERSATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('messenger', 'comment_thread')),
    meta_thread_id VARCHAR(100) NOT NULL UNIQUE,
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    window_24h_expires_at TIMESTAMPTZ, -- Hạn cửa sổ 24h nhắn tin Meta
    unread_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 8. BẢNG MESSAGES_AND_COMMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE messages_and_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    meta_id VARCHAR(100) NOT NULL UNIQUE, -- Comment ID hoặc Message ID
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'page', 'system')),
    sender_fb_id VARCHAR(100) NOT NULL,
    content TEXT,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    private_reply_sent BOOLEAN NOT NULL DEFAULT FALSE,
    media_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 9. BẢNG WEBHOOK_LOGS (Idempotency & Audit)
-- -----------------------------------------------------------------------------
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(100) NOT NULL UNIQUE, -- Payload Hash hoặc Mid
    page_id VARCHAR(100),
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES TỐI ƯU HÓA HIỆU NĂNG TRUY VẤN
-- =============================================================================
CREATE INDEX idx_connected_pages_user_id ON connected_pages(user_id);
CREATE INDEX idx_posts_schedule_page_status ON posts_schedule(page_id, status);
CREATE INDEX idx_posts_schedule_scheduled_time ON posts_schedule(scheduled_time) WHERE status = 'pending';
CREATE INDEX idx_customers_phone ON customers(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_conversations_page_last_msg ON conversations(page_id, last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages_and_comments(conversation_id, created_at ASC);
CREATE INDEX idx_automation_rules_page_id ON automation_rules(page_id) WHERE is_active = TRUE;

-- =============================================================================
-- TRIGGER TỰ ĐỘNG CẬP NHẬT UPDATED_AT
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_update_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_update_pages BEFORE UPDATE ON connected_pages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_update_posts BEFORE UPDATE ON posts_schedule FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_update_rules BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

---

### IV. HƯỚNG DẪN THỰC THI & QUY TẮC BẢO MẬT DỮ LIỆU

1. **Khởi tạo Database ban đầu:**
   Lập trình viên hoặc AI Coding Agent có thể copy toàn bộ tập lệnh SQL DDL ở **Mục III** chạy trực tiếp vào PostgreSQL (phiên bản 15 trở lên) để khởi tạo toàn bộ schema và index.

2. **Xử lý An toàn Token (Token Encryption):**
   Mọi mã `page_access_token` và `user_access_token` lưu trong cơ sở dữ liệu bắt buộc phải đi qua hàm mã hóa AES-256-GCM (`backend/src/common/utils/crypto.ts`) trước khi thực hiện câu lệnh `INSERT`/`UPDATE`, và giải mã khi thực hiện cuộc gọi API sang Meta Graph API.

3. **Bảo vệ Dữ liệu Khách hàng (PII Protection):**
   Số điện thoại (`customers.phone_number`), họ tên và nội dung tin nhắn không bao giờ được in ra console log ở dạng plain text tại môi trường Production.
