# Design: Mở Rộng Quản Lý Đa Fanpage & Phân Quyền Nhân Viên (RBAC) (TASK-25)

## 1. Kiến Trúc Phân Hệ & Luồng Dữ Liệu (Architecture & Data Flow)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database                             │
│       (users, connected_pages, page_members, orders, customers)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Backend Middleware & Authorization Layer                 │
│  - authenticateToken: Xác thực JWT & gán req.user                      │
│  - requirePageRole('owner', 'manager', 'staff'):                       │
│      + Kiểm tra quyền trên req.params.pageId / req.body.pageId         │
│      + Gán req.pageMember: { role, pageId, userId }                    │
│  - piiMaskingInterceptor: Tự động che SĐT nếu role === 'staff'         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
┌───────────────────────────────────┐ ┌──────────────────────────────────┐
│     Page Members Management       │ │       PII Data Masking Guard     │
│  - PageMemberRepository           │ │  - Orders: maskPhoneNumber(phone)│
│  - PageMemberService (Invite, Role│ │  - Customers: maskPhoneNumber    │
│  - PageMemberController           │ │  - CRM Inbox: mask comment phone │
└─────────────────┬─────────────────┘ └──────────────────┬───────────────┘
                  │                                      │
                  └─────────────────┬────────────────────┘
                                    │ REST API (/api/v1/pages/:pageId/members)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Frontend State Management (Zustand Store)                │
│  - page.store.ts / page-member.store.ts:                              │
│      + members: PageMember[]                                           │
│      + currentRole: 'owner' | 'manager' | 'staff'                      │
│      + inviteMember(), updateMemberRole(), removeMember()              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│         macOS Clean Utility Team Management Bento UI Components        │
│  - PageMembersDrawer: Danh sách thành viên, Avatar, Badge vai trò      │
│  - InviteMemberModal: Form mời qua Email, chọn vai trò & Validation   │
│  - MemberRoleBadge: Huy hiệu vai trò Apple-inspired                    │
│  - RoleGuardedAction: Bọc các nút nhạy cảm (ẩn nếu không đủ quyền)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Ma Trận Phân Quyền Phân Hệ (RBAC Permission Matrix)

| Chức năng / Hành động | Vai trò `owner` | Vai trò `manager` | Vai trò `staff` | Ghi chú an toàn |
| :--- | :---: | :---: | :---: | :--- |
| **Quản trị Fanpage:** Kết nối / Ngắt kết nối Fanpage |  Có | ❌ Không | ❌ Không | Chỉ chủ sở hữu được hủy kết nối |
| **Quản lý Webhook:** Đồng bộ & Đăng ký Webhook |  Có |  Có | ❌ Không | Tránh nhân viên ngắt luồng nhận lead |
| **Kịch bản tự động:** Tạo, sửa, xóa `automation_rules` |  Có |  Có | ❌ Không | Nhân viên chỉ xem các kịch bản đang chạy |
| **Quản lý Thành viên:** Mời nhân viên (`staff`) |  Có |  Có | ❌ Không | Quản lý có thể mời thêm nhân viên trực |
| **Quản lý Thành viên:** Mời / Nâng quyền `manager` |  Có | ❌ Không | ❌ Không | Chỉ chủ shop quyết định cấp quản lý |
| **Quản lý Thành viên:** Xóa thành viên / Thu hồi quyền |  Có | Chỉ xóa `staff` | ❌ Không | Không được xóa `owner` |
| **Vận hành Inbox & Live Chat:** Trả lời tin nhắn/comment |  Có |  Có |  Có | Toàn bộ nhân sự trực chat đều được tương tác |
| **Quản lý Đơn hàng:** Tạo mới / Chuyển trạng thái đơn |  Có |  Có |  Có | Hỗ trợ chốt đơn trực tiếp trong chat |
| **Xem Số Điện Thoại Khách Hàng (PII Protection):** | **Đầy đủ** | **Đầy đủ** | **Che mờ** (`098****567`) | Ngăn chặn rò rỉ dữ liệu khách hàng |
| **Xem Báo Cáo Phân Tích Doanh Thu (`/analytics`):** |  Có |  Có | ❌ Không | Bảo mật số liệu doanh số kinh doanh |

---

## 3. Thiết Kế Cơ Sở Dữ Liệu (Database Migration DDL)

Tệp migration: `backend/src/infrastructure/database/migrations/004_page_members_and_rbac.sql`

```sql
-- =============================================================================
-- BẢNG: page_members
-- Mục đích: Quản lý mối quan hệ người dùng và Fanpage kèm vai trò RBAC
-- =============================================================================
CREATE TABLE IF NOT EXISTS page_members (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id     UUID            NOT NULL REFERENCES connected_pages(id) ON DELETE CASCADE,
    user_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20)     NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
    invited_by  UUID            REFERENCES users(id) ON DELETE SET NULL,
    status      VARCHAR(20)     NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'revoked')),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_page_member   UNIQUE (page_id, user_id)
);

-- Chỉ mục tối ưu hóa kiểm tra quyền truy cập và liệt kê thành viên
CREATE INDEX IF NOT EXISTS idx_page_members_page_user ON page_members(page_id, user_id);
CREATE INDEX IF NOT EXISTS idx_page_members_user_id ON page_members(user_id);
CREATE INDEX IF NOT EXISTS idx_page_members_page_role ON page_members(page_id, role);

-- =============================================================================
-- DATA BACKFILL: Tự động chuyển toàn bộ chủ sở hữu hiện có sang page_members
-- =============================================================================
INSERT INTO page_members (page_id, user_id, role, status)
SELECT id AS page_id, user_id, 'owner' AS role, 'active' AS status
FROM connected_pages
ON CONFLICT (page_id, user_id) DO NOTHING;
```

---

## 4. Thiết Kế Backend API Layer & Middleware

### 4.1 Middleware Phân Quyền `requirePageRole` (`backend/src/api/middlewares/auth.middleware.ts`)

```typescript
export interface PageMemberContext {
  id: string;
  pageId: string;
  userId: string;
  role: 'owner' | 'manager' | 'staff';
}

declare global {
  namespace Express {
    interface Request {
      pageMember?: PageMemberContext;
    }
  }
}

export function requirePageRole(...allowedRoles: Array<'owner' | 'manager' | 'staff'>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Người dùng chưa được xác thực.');
    }

    // Trích xuất pageId từ params, query hoặc body
    const rawPageId = req.params.pageId || req.query.pageId || req.body.pageId;
    if (!rawPageId) {
      throw new BadRequestError('Không tìm thấy tham số pageId trong yêu cầu.');
    }

    // Truy vấn quyền từ database hoặc cache
    const member = await pageMemberRepository.findByPageAndUser(rawPageId, req.user.userId);
    if (!member || member.status !== 'active') {
      throw new ForbiddenError('Bạn không có quyền truy cập hoặc không phải thành viên của Fanpage này.');
    }

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenError(`Bạn không có quyền thực hiện thao tác này. Yêu cầu quyền: ${allowedRoles.join(', ')}.`);
    }

    req.pageMember = {
      id: member.id,
      pageId: member.page_id,
      userId: member.user_id,
      role: member.role,
    };

    next();
  };
}
```

### 4.2 Middleware Bảo Vệ Dữ Liệu PII (`piiMaskingInterceptor`)

Khi request được gắn `req.pageMember` có `role === 'staff'`:
- Trong service/controller trả về danh sách đơn hàng hoặc chi tiết đơn hàng:
  ```typescript
  export function sanitizeOrderForRole<T extends { customerPhone?: string | null; shippingPhone?: string | null }>(
    order: T,
    role?: 'owner' | 'manager' | 'staff'
  ): T {
    if (role === 'staff') {
      return {
        ...order,
        customerPhone: order.customerPhone ? maskPhoneNumber(order.customerPhone) : order.customerPhone,
        shippingPhone: order.shippingPhone ? maskPhoneNumber(order.shippingPhone) : order.shippingPhone,
      };
    }
    return order;
  }
  ```

### 4.3 DTOs & Validation Schemas (`backend/src/api/dtos/page-member.dto.ts`)

```typescript
import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email('Địa chỉ email không hợp lệ').toLowerCase().trim(),
  role: z.enum(['manager', 'staff'], {
    errorMap: () => ({ message: 'Vai trò chỉ có thể là manager hoặc staff' }),
  }),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'manager', 'staff'], {
    errorMap: () => ({ message: 'Vai trò không hợp lệ' }),
  }),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
```

### 4.4 Endpoints Quản Lý Thành Viên (`/api/v1/pages/:pageId/members`)

- `GET /api/v1/pages/:pageId/members`: Yêu cầu quyền `owner`, `manager` hoặc `staff` (thành viên đều được xem danh sách đồng nghiệp).
- `POST /api/v1/pages/:pageId/members/invite`: Yêu cầu quyền `owner` hoặc `manager`.
- `PATCH /api/v1/pages/:pageId/members/:memberId/role`: Yêu cầu quyền `owner`.
- `DELETE /api/v1/pages/:pageId/members/:memberId`: Yêu cầu quyền `owner` (hoặc `manager` nếu xóa `staff`).

---

## 5. Thiết Kế Giao Diện Frontend (macOS Clean Utility)

### 5.1 Zustand Store `page-member.store.ts`

- State:
  - `membersByPage: Record<string, PageMember[]>`
  - `currentRoleByPage: Record<string, 'owner' | 'manager' | 'staff'>`
  - `isLoading: boolean`
  - `error: string | null`
- Actions:
  - `fetchMembers(pageId: string): Promise<void>`
  - `inviteMember(pageId: string, email: string, role: 'manager' | 'staff'): Promise<void>`
  - `updateRole(pageId: string, memberId: string, role: string): Promise<void>`
  - `removeMember(pageId: string, memberId: string): Promise<void>`

### 5.2 Cụm Giao Diện Thành Viên & Phân Quyền

1. **`PageMembersModal` / `PageMembersDrawer` (`frontend/src/components/pages/page-members-modal.tsx`):**
   - Header: Tiêu đề "Đội ngũ & Phân quyền", tên Fanpage, nút "Mời thành viên mới".
   - Danh sách thẻ thành viên:
     - Avatar tròn có initials chữ hoa hoặc ảnh đại diện.
     - Tên hiển thị & Email.
     - Badge vai trò phong cách Apple macOS (`Owner`: màu tím pastel `bg-purple-500/10 text-purple-400 border-purple-500/20`, `Manager`: màu xanh dương pastel, `Staff`: màu ngọc bích pastel).
     - Dropdown chọn đổi vai trò (`Select`) và nút icon Thùng rác xóa thành viên (với xác nhận an toàn).
2. **`InviteMemberModal` (`frontend/src/components/pages/invite-member-modal.tsx`):**
   - Input nhập Email nhân viên.
   - Radio cards chọn vai trò trực quan kèm mô tả chi tiết quyền hạn:
     - **Quản lý (Manager):** Toàn quyền vận hành nội dung, đơn hàng, tự động hóa và mời nhân viên.
     - **Nhân viên (Staff):** Trực chat, chốt đơn, che số điện thoại khách hàng, không can thiệp cấu hình.
   - Nút "Gửi lời mời" kèm animation loading.
3. **Role-Based Guards trên các màn hình:**
   - Ẩn nút "Ngắt kết nối Fanpage" nếu người dùng không phải `owner`.
   - Ẩn nút "Thêm quy tắc mới" trên màn hình `/automation` nếu người dùng là `staff`.
   - Đánh dấu icon khiên che SĐT trên bảng đơn hàng `/orders` khi tài khoản đang ở vai trò `staff`.
