-- =============================================================================
-- ShopFlow - Database DDL Script (PostgreSQL 15+)
-- Migration: 004_page_members_and_rbac.sql
-- Mục đích: Khởi tạo bảng page_members quản lý phân quyền thành viên Fanpage (RBAC)
--          và tự động backfill chủ sở hữu hiện tại từ connected_pages
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- =============================================================================
-- BẢNG 15: page_members
-- Mục đích: Quản lý mối quan hệ nhiều-nhiều giữa connected_pages và users kèm vai trò
-- =============================================================================
CREATE TABLE IF NOT EXISTS page_members (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id     UUID            NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    user_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20)     NOT NULL DEFAULT 'staff'
                                CHECK (role IN ('owner', 'manager', 'staff')),
    invited_by  UUID            REFERENCES users(id) ON DELETE SET NULL,
    status      VARCHAR(20)     NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'pending', 'revoked')),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_page_member   UNIQUE (page_id, user_id)
);

COMMENT ON TABLE page_members IS 'Danh sách thành viên và phân quyền vai trò (RBAC) trên từng Fanpage';
COMMENT ON COLUMN page_members.role IS 'Vai trò thành viên: owner (chủ sở hữu), manager (quản lý), staff (nhân viên trực chat)';
COMMENT ON COLUMN page_members.status IS 'Trạng thái quyền: active (đang hoạt động), pending (chờ chấp nhận), revoked (đã thu hồi)';

-- =============================================================================
-- CHỈ MỤC (INDEXES) TỐI ƯU HÓA TRUY VẤN
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_page_members_page_user ON page_members(page_id, user_id);
CREATE INDEX IF NOT EXISTS idx_page_members_user_id ON page_members(user_id);
CREATE INDEX IF NOT EXISTS idx_page_members_page_role ON page_members(page_id, role);

-- Trigger tự động cập nhật updated_at
DROP TRIGGER IF EXISTS trg_page_members_updated_at ON page_members;
CREATE TRIGGER trg_page_members_updated_at
    BEFORE UPDATE ON page_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- DATA BACKFILL: Tự động chuyển toàn bộ chủ sở hữu hiện có sang page_members
-- =============================================================================
INSERT INTO page_members (page_id, user_id, role, status)
SELECT id AS page_id, user_id, 'owner' AS role, 'active' AS status
FROM connected_pages
ON CONFLICT (page_id, user_id) DO NOTHING;

COMMIT;
