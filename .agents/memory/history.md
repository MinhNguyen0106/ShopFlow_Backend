# ShopFlow Project History & Milestone Changelog

Nhật ký theo dõi các mốc phát triển, thay đổi kiến trúc và trạng thái của dự án ShopFlow.

## [2026-10-21] - Hoàn Thành TASK-19: Bảng Điều Khiển Tổng Quan & Báo Cáo KPIs (`dashboard-overview-ui`) & Kết Thúc Sprint 3
- **Tác giả:** System Architect & Full-Stack Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành toàn diện 9/9 tasks trong OpenSpec change [dashboard-overview-ui](file:///c:/Users/Dell/Desktop/ShopFlow/openspec/changes/dashboard-overview-ui/tasks.md) tương ứng **[TASK-19]** trên [Task.md](file:///c:/Users/Dell/Desktop/ShopFlow/Task.md), chính thức hoàn tất **100% Sprint 3** của dự án ShopFlow.
  - **Tầng DTO & Types (`frontend/src/types/dashboard.ts`):**
    - Khai báo các types `DashboardMetrics`, `HourlyTrafficPoint`, `MetaWindowLead`, `QuickActionItem` và `DEFAULT_DASHBOARD_METRICS`.
    - Xây dựng tiện ích che số điện thoại PII `maskPhoneNumber` bảo vệ dữ liệu nhạy cảm của khách hàng (`098****123`).
  - **Components Giao Diện Chuẩn macOS Clean Utility (`frontend/src/components/dashboard/`):**
    - `bento-metrics.tsx`: 4 thẻ Bento KPI cốt lõi (Tổng hội thoại hôm nay với badge tăng trưởng %, Tự động ẩn SĐT an toàn với SLA < 3s, Lịch đăng hôm nay trải đều giờ vàng, Tỷ lệ tuân thủ Cửa sổ Meta 24h).
    - `traffic-chart.tsx`: Biểu đồ cột mật độ tương tác SVG/Tailwind thuần tự dựng siêu nhẹ (< 15 kB) theo khung giờ 08:00 - 22:00, nhận diện và gắn nhãn 2 đỉnh khung giờ vàng (11:30 & 20:00) kèm tooltip hover mượt mà.
    - `meta-window-widget.tsx`: Bảng cảnh báo đếm ngược Cửa sổ 24h Meta với badge `Gấp` và nút CTA `Chat ngay` chuyển hướng tức thì sang `/inbox`.
    - `hot-leads-widget.tsx`: Danh sách khách hàng tiềm năng nóng cần chốt đơn gấp, tự động áp dụng che số điện thoại PII và ước tính giá trị đơn hàng.
    - `quick-actions.tsx`: Lưới 4 phím tắt chuyển nhanh (Soạn Bài Viết Mới, Hộp Thư Live Chat, Kịch Bản Tự Động & Ẩn SĐT, Quản Lý Fanpage).
  - **Trang Chính Dashboard (`frontend/src/app/(dashboard)/page.tsx`):**
    - Lắp ráp bố cục tổng thể thay thế lệnh chuyển hướng `/pages` cũ, tích hợp lời chào theo buổi cá nhân hóa, bộ chọn Fanpage đồng bộ từ `usePageStore`, nút làm mới dữ liệu và card cam kết SLA & an toàn Meta Graph API v19+.
  - **Chất lượng mã nguồn & Kiểm định:**
    - Viết 9/9 unit & integration tests tại [dashboard.test.tsx](file:///c:/Users/Dell/Desktop/ShopFlow/frontend/src/app/(dashboard)/__tests__/dashboard.test.tsx), đạt **100% test pass** (tổng số test frontend nâng lên **93/93 tests pass**).
    - Kiểm tra tĩnh kiểu dữ liệu TypeScript `npx tsc --noEmit` đạt 0 lỗi (Strict Mode).
    - Next.js 14 production build (`npm run build`) thành công, route `/` sinh trang tĩnh tối ưu 175 B / 96.2 kB.
    - **Cột mốc:** Toàn bộ Sprint 3 (Frontend UI & Automation Screens: TASK-16, TASK-17, TASK-18, TASK-19) đã hoàn thành 100%.

## [2026-10-21] - Hoàn Thành TASK-18: Màn hình Cấu hình Kịch bản Tự động & Ẩn SĐT qua OpenSpec (`automation-rules-ui`)
- **Tác giả:** System Architect & Full-Stack Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành toàn diện 9/9 tasks trong OpenSpec change [automation-rules-ui](file:///c:/Users/Dell/Desktop/ShopFlow/openspec/changes/automation-rules-ui/tasks.md) tương ứng **[TASK-18]** trên [Task.md](file:///c:/Users/Dell/Desktop/ShopFlow/Task.md).
  - **Tầng DTO & Zustand Store (`frontend/src/types/automation.ts`, `frontend/src/lib/automation.store.ts`):**
    - Khai báo DTOs đồng bộ 1-1 với backend: `AutomationRule`, `CreateAutomationRuleInput`, `UpdateAutomationRuleInput`.
    - Xây dựng hàm phòng vệ `normalizeAutomationRule` chuẩn hóa thuộc tính snake_case/camelCase chống crash.
    - Zustand store quản lý state kịch bản theo Fanpage, kết nối REST API `/api/v1/pages/:pageId/rules` (GET, POST, PUT, DELETE), tìm kiếm theo tên/từ khóa, và cập nhật lạc quan (Optimistic UI) khi gạt switch `isActive` với khả năng rollback an toàn khi mất kết nối.
  - **Components Giao Diện Chuẩn macOS Clean Utility (`frontend/src/components/automation/`):**
    - `rule-card.tsx`: Thẻ Bento hiển thị tên quy tắc, huy hiệu trạng thái, switch bật/tắt chuẩn iOS, danh sách tags từ khóa `#tag`, badge an ninh `🛡️ Tự động ẩn SĐT khách hàng (< 3s)` và xem trước mẫu phản hồi bình luận/tin nhắn riêng có highlight biến động `{{customer_name}}`, `{{page_name}}`.
    - `rule-modal.tsx`: Modal tạo mới và chỉnh sửa quy tắc với Tag Input từ khóa (hỗ trợ phím Enter/dấu phẩy), công tắc ẩn SĐT, textarea soạn mẫu phản hồi kèm các nút bấm 1-click chèn nhanh biến `+ {{customer_name}}`, `+ {{page_name}}` loại bỏ rủi ro gõ sai cú pháp.
    - `delete-rule-dialog.tsx`: Hộp thoại xác nhận cảnh báo an toàn phòng chống thao tác xóa nhầm.
  - **Trang Chính Dashboard (`frontend/src/app/(dashboard)/automation/page.tsx`):**
    - Tích hợp đồng bộ với `usePageStore`, hiển thị 4 Bento Metrics hàng đầu (Tổng kịch bản, Đang kích hoạt, Ẩn SĐT tự động, Phản hồi Inbox Meta Private Reply).
    - Thanh công cụ kết hợp dropdown chọn Fanpage, Segmented Tabs lọc (Tất cả / Đang bật / Đã tắt), ô tìm kiếm nhanh và Empty States chuyên nghiệp.
  - **Chất lượng mã nguồn & Kiểm định:**
    - Viết 13/13 unit tests tại [automation.store.test.ts](file:///c:/Users/Dell/Desktop/ShopFlow/frontend/src/lib/__tests__/automation.store.test.ts) và 12/12 integration tests tại [automation.test.tsx](file:///c:/Users/Dell/Desktop/ShopFlow/frontend/src/app/(dashboard)/automation/__tests__/automation.test.tsx), đạt **100% test pass** (tổng số test frontend nâng lên **84/84 tests pass**).
    - Kiểm tra tĩnh kiểu dữ liệu TypeScript `npx tsc --noEmit` đạt 0 lỗi (Strict Mode).
    - Next.js 14 production build (`npm run build`) thành công, route `/automation` sinh gói tĩnh 10.9 kB tối ưu.

## [2026-10-21] - Hoàn Thành TASK-17: Màn hình Soạn thảo Bài viết Mới & Preview Facebook qua OpenSpec (`post-creator-ui`)
- **Tác giả:** System Architect & Full-Stack Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành toàn diện 7/7 tasks trong OpenSpec change [post-creator-ui](file:///c:/Users/Dell/Desktop/ShopFlow/openspec/changes/post-creator-ui/tasks.md) tương ứng **[TASK-17]** trên [Task.md](file:///c:/Users/Dell/Desktop/ShopFlow/Task.md).
  - **Sub-Components Phục Vụ Soạn Thảo (`frontend/src/components/posts/`):**
    - `media-uploader.tsx`: Tải lên đa phương tiện tích hợp API Cloudinary (`POST /api/v1/media/upload`), kéo thả đa tệp ảnh (tối đa 10 ảnh) và video đơn (tối đa 100MB), thumbnail trực quan, trạng thái tải lên phần trăm và nút gỡ bỏ nhanh.
    - `schedule-picker.tsx`: Chuyển đổi linh hoạt giữa chế độ "Đăng ngay" và "Lên lịch", tích hợp bộ chọn ngày giờ `datetime-local` với quy tắc kiểm tra nghiêm ngặt (thời điểm hẹn giờ phải cách hiện tại tối thiểu 10 phút), 2 nút phím tắt 1-click chọn các khung giờ vàng tương tác cao (11:30 & 20:00).
    - `post-preview-modal.tsx`: Giả lập chân thực thẻ bài viết Facebook trên 2 chế độ xem Desktop Feed và Mobile Feed. Triển khai thuật toán hiển thị lưới ảnh linh hoạt (1 ảnh, 2 ảnh ngang/dọc, 3 ảnh có ảnh lớn, 4+ ảnh với lớp phủ `+N` chuyên nghiệp), định dạng xanh dương nổi bật cho các hashtag.
  - **Editor & Lắp Ráp Trang (`frontend/src/app/(dashboard)/posts/new/page.tsx`):**
    - `post-editor.tsx`: Bộ chọn Fanpage xuất bản có avatar, textarea tự co giãn, bộ đếm ký tự trực quan với cảnh báo vượt quá giới hạn và danh sách hashtag bán hàng thịnh hành (`#sale`, `#freeship`, `#shopflow`, v.v.).
    - `page.tsx`: Kiến trúc Split-Pane phong cách macOS Clean Utility (cột trái: form soạn thảo, upload và đặt lịch; cột phải: sticky Live Preview tức thì kèm nút mở rộng Modal xem toàn màn hình). Kết nối hoàn chỉnh API `POST /api/v1/posts` và điều hướng về `/posts`.
  - **Chất lượng mã nguồn & Kiểm định:**
    - Viết 10/10 unit & integration tests tại `frontend/src/app/(dashboard)/posts/new/__tests__/post-creator.test.tsx` đạt **100% test pass** (tổng số test frontend nâng lên **59/59 passed**).
    - Kiểm tra tĩnh kiểu dữ liệu TypeScript `npx tsc --noEmit` đạt 0 lỗi (Strict Mode).
    - Next.js 14 production build (`npm run build`) thành công, route `/posts/new` sinh gói tĩnh 11.4 kB tối ưu.

## [2026-10-21] - Hoàn Thành TASK-16: Màn hình Quản lý Danh sách Bài viết Đặt lịch & Calendar View qua OpenSpec (`posts-management-ui`)
- **Tác giả:** System Architect & Full-Stack Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành toàn diện 8/8 tasks trong OpenSpec change [posts-management-ui](file:///c:/Users/Dell/Desktop/ShopFlow/openspec/changes/posts-management-ui/tasks.md) tương ứng **[TASK-16]** trên [Task.md](file:///c:/Users/Dell/Desktop/ShopFlow/Task.md).
  - **Tầng DTO & Types (`frontend/src/types/post.ts`):**
    - Đồng bộ hợp đồng DTO từ backend: `ScheduledPostItem`, `PostStatus`, `PostMediaType`, `QueryPostsParams`, `PaginationMeta`, `PostStatusChangedPayload`.
    - Xây dựng hàm phòng vệ `normalizePostItem` hỗ trợ chuẩn hóa dữ liệu dù trả về dạng snake_case hay camelCase.
  - **Zustand Store (`frontend/src/lib/post.store.ts`):**
    - Kết nối với REST API `/api/v1/posts` (`GET /`, `POST /:postId/retry`, `DELETE /:postId`).
    - Hỗ trợ các actions phân trang, bộ lọc trạng thái, bộ lọc Fanpage, lọc theo khoảng thời gian (`dateRange`), chuyển đổi `viewMode` (`list` / `calendar`), thao tác thử lại và hủy bài viết.
    - Tích hợp hàm `handlePostStatusChanged` cập nhật trạng thái bài viết tức thì từ socket event mà không cần F5 trang.
  - **Giao diện & Components chuẩn macOS Clean Utility (`frontend/src/components/posts/`):**
    - `post-status-badge.tsx`: Huy hiệu trạng thái màu sắc tinh tế cho 5 trạng thái (`published`, `scheduled`, `pending`, `failed`, `cancelled`).
    - `posts-list-view.tsx`: Bảng danh sách bài viết chi tiết, thumbnail media, badge số lượng ảnh, phân trang, nút "Thử lại" cho bài lỗi, nút "Hủy bài" có popup xác nhận an toàn, và Empty State chuyên nghiệp.
    - `posts-calendar-view.tsx`: Lưới lịch tháng tự dựng bằng CSS Grid & Tailwind thuần (không phụ thuộc thư viện ngoài nặng nề), tự động tính ngày, highlight ngày hôm nay, gắn thẻ bài viết và đặc biệt nhận diện tự động khung giờ vàng tương tác cao (11h-13h & 19h30-21h30). Hỗ trợ Modal xem nhanh chi tiết bài viết và thao tác trực tiếp trên modal.
  - **Trang chính Dashboard (`frontend/src/app/(dashboard)/posts/page.tsx`):**
    - Header hiện đại macOS, thanh điều khiển tích hợp Segmented Switcher chuyển đổi Tab List/Calendar, dropdown chọn Fanpage, và Tab bộ lọc trạng thái.
    - Tích hợp tự động lắng nghe Socket `POST_STATUS_CHANGED` từ `useSocket()`.
  - **Chất lượng mã nguồn & Kiểm định:**
    - Viết 19 unit & integration tests tại `frontend/src/lib/__tests__/post.store.test.ts` và `frontend/src/app/(dashboard)/posts/__tests__/posts.test.tsx`, đạt **100% test pass** (tổng 49/49 tests toàn frontend pass).
    - Kiểm tra tĩnh kiểu dữ liệu `npx tsc --noEmit` đạt 0 lỗi (Strict Mode).
    - Next.js 14 production build (`npm run build`) thành công 100%, route `/posts` tạo tĩnh tối ưu.

## [2026-10-21] - Tích Hợp Toàn Diện OpenSpec & Chuẩn Hóa Kiến Trúc Task.md vs tasks.md
- **Tác giả:** System Architect & Full-Stack Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - **Hợp nhất & Chuẩn hóa Thư mục:** Di chuyển toàn bộ cấu hình từ `.agent/` vào thư mục chuẩn duy nhất [`.agents/`](file:///c:/Users/Dell/Desktop/ShopFlow/.agents). Tinh gọn subagents: giữ lại `security-auditor.md` và `devops.md`, tích hợp vai trò `planner` và `coder` vào OpenSpec workflows và rules.
  - **Phân định Ranh giới Task.md vs OpenSpec tasks.md:**
    - Tái định vị `Task.md` làm bảng lộ trình cấp cao (Sprint Roadmap). Khởi tạo danh mục Sprint 3 (Frontend UI & Automation Screens: TASK-16 đến TASK-19).
    - Phân quyền theo dõi vi mô cho OpenSpec `tasks.md` theo phương pháp Spec-Driven Development.
    - Cập nhật quy trình vận hành [task-lifecycle.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/workflows/task-lifecycle.md): Propose ➔ Apply ➔ Archive ➔ Safe Deploy.
  - **Hoàn thiện & Lưu trữ (Archive) Change `user-registration`:**
    - Bổ sung Rate Limiting middleware `rate-limiter.middleware.ts` và tích hợp `TooManyRequestsError` (HTTP 429) vào route `POST /api/v1/auth/register`.
    - Viết unit test cho DTOs tại `backend/src/api/dtos/__tests__/auth.dto.test.ts` và `rate-limiter.middleware.test.ts`.
    - 63/63 tests backend passed, 30/30 tests frontend passed, 0 lỗi TypeScript compilation.
    - Thực thi lưu trữ `openspec archive user-registration` thành công, sinh ra bộ đặc tả sống chính thức đầu tiên tại [openspec/specs/user-registration/spec.md](file:///c:/Users/Dell/Desktop/ShopFlow/openspec/specs/user-registration/spec.md).

## [2026-10-20] - Hoàn Thành TASK-15: Màn hình Hộp thư Tập trung Live Chat 4-Pane Bento (`/inbox`) - Trọng tâm Cốt lõi P0 & HOÀN THÀNH 100% SPRINT 2
- **Tác giả:** System Architect & Frontend Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành trọn vẹn 100% 5 subtasks của **[TASK-15]** trên nhánh `feature/task-15-inbox-livechat` theo quy chuẩn `task-lifecycle.md` và quy tắc `api-contract-sync.md`.
  - **Tầng Type Contracts & Zustand Store (`frontend/src/types/inbox.ts`, `frontend/src/lib/inbox.store.ts`):**
    - `inbox.ts`: Khai báo types và interfaces đồng bộ 1-1 với backend (`ConversationItem`, `MessageItem`, `CustomerProfile`, `ExtractedOrderAI`, `QuickMacro`).
    - `inbox.store.ts`: Quản lý danh sách hội thoại, tin nhắn theo thứ tự thời gian, bộ lọc đa chiều (Page, loại messenger/comment, trạng thái open/resolved/archived, tìm kiếm), defensive parsing chống crash, actions gửi tin nhắn, private reply, ẩn/hiện comment, cập nhật CRM và tích hợp realtime socket.
  - **Hộp Thư Live Chat 4-Pane Bento (`frontend/src/components/inbox/`):**
    - **Pane 1 (`column-channels.tsx`):** Bộ chọn Fanpage, bộ lọc kênh Messenger / Comment, bộ lọc trạng thái, tổng unread badge, và widget chỉ số kết nối WebSocket / SLA < 3s.
    - **Pane 2 (`column-threads.tsx`):** Danh sách hội thoại thời gian thực, đồng hồ đếm ngược **Meta 24h Messaging Window** (cảnh báo xanh/vàng/đỏ), huy hiệu an ninh `🛡️ Đã ẩn SĐT`, thẻ phân loại khách.
    - **Pane 3 (`chat-window.tsx`):** Khung chat đa kênh cuộn tự động, banner cảnh báo an ninh ShopFlow Shield chống cướp khách, nút 1-click ẩn/hiện bình luận & gửi Private Reply Messenger (hạn 7 ngày Meta), Macro chốt đơn thần tốc (`/size`, `/gia`, `/bank`, `/chot`).
    - **Pane 4 (`customer-panel.tsx`):** Hồ sơ CRM mini, SĐT tích hợp nút gọi điện & copy 1-click, form chỉnh sửa CRM tức thì, **Thẻ Trích Xuất Đơn Hàng AI (Gemini NLP fallback)** tự động bóc tách sản phẩm, số lượng, size, màu sắc, tổng tiền và nút CTA `1-Click Tạo Đơn Hàng Ngay`.
    - **Trang chính (`frontend/src/app/(dashboard)/inbox/page.tsx`):** Bố cục 4-Pane Bento hoàn chỉnh, chiều cao `h-[calc(100vh-3.5rem)]` chống tràn, tích hợp lắng nghe Socket events `NEW_INBOX_ITEM` và `INBOX_UPDATED`.
  - **Chất lượng mã nguồn & Kiểm thử:**
    - 10 file kiểm thử frontend, **30/30 tests passed 100%**.
    - Next.js 14 production build (`next build`): Thành công tối ưu hóa 100% các route.
    - Toàn bộ Sprint 2 chính thức hoàn thành 100%.

---

## [2026-10-20] - Hoàn Thành TASK-14: Khung Layout macOS Clean Utility, Màn hình Auth & Fanpage Management trên Next.js 14+
- **Tác giả:** System Architect & Frontend Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành trọn vẹn 100% 5 subtasks của **[TASK-14]** trên nhánh `feature/task-14-macos-layout-auth-fanpages` theo quy chuẩn `task-lifecycle.md`.
  - **Tầng Kết Nối API & Realtime (`frontend/src/lib`):**
    - `api-client.ts`: Axios instance với Bearer token tự động từ `localStorage`, interceptor bắt lỗi 401 tự động refresh token qua `/auth/refresh-token` và retry request gốc.
    - `auth.store.ts`: Zustand store quản lý trạng thái xác thực `user`, `accessToken`, `login`, `register`, `logout`, `checkAuth`.
    - `page.store.ts`: Zustand store quản lý danh sách `pages`, Fanpage đang chọn `selectedPage`, `fetchPages`, `togglePageActive`, `disconnectPage`.
    - `socket.ts` & `useSocket.ts`: Singleton Socket.io client kết nối với JWT auth, hook điều khiển `joinPage`, `leavePage`, `joinConversation`, `leaveConversation` và lắng nghe `NEW_INBOX_ITEM`, `INBOX_UPDATED`, `POST_STATUS_CHANGED`.
  - **Khung Layout macOS Clean Utility:**
    - `mac-traffic-lights.tsx`: 3 nút đỏ (đóng), vàng (thu nhỏ), lục (phóng to) tương tác hover và phóng to cửa sổ.
    - `command-palette.tsx`: Hộp thoại Spotlight kích hoạt nhanh bằng phím tắt `⌘K` / `Ctrl+K` tra cứu màn hình, hành động nhanh và Fanpage.
    - `topbar.tsx`: Tìm kiếm Spotlight, Page Switcher dropdown chuyển kênh làm việc, nút CTA `+ Soạn bài mới`, widget giám sát Meta API Limits (24% an toàn), Profile menu.
    - `sidebar.tsx`: Menu điều hướng bo tròn Squircle, badge số tin chưa đọc (18), Meta Rate Limit Gauge, Meta Business Partner verified badge.
    - `mac-window-shell.tsx` & `layout.tsx`: Bọc toàn bộ Dashboard bằng cửa sổ macOS trên nền blueprint grid, kèm Auth Guard bảo vệ phiên làm việc.
  - **Màn hình Đăng Nhập (`/login`) & Đăng Ký (`/register`):**
    - Giao diện Glassmorphism trong macOS window card 560px, validation nghiêm ngặt bằng React Hook Form + Zod.
    - Hỗ trợ toggle xem mật khẩu, ghi nhớ đăng nhập, error banner hiển thị lỗi chi tiết từ backend, tự động chuyển hướng khi thành công.
  - **Màn hình Quản Lý Kênh Fanpage (`/pages`):**
    - Hàng 4 thẻ Bento Metrics: Tổng số trang kết nối (1/5 Pro), Trạng thái Webhook & Token (100% hoạt động), Lưu lượng hôm nay (1,428 tương tác), Tốc độ phản hồi trung bình (1.4s SLA < 3.0s).
    - Top CTAs: "Đồng bộ lại tất cả Webhooks", "+ Thêm Fanpage Mới (Meta OAuth)" mở popup OAuth.
    - Lưới `PageCard Grid`: Avatar, Tên page, Category, Page ID monospace kèm nút copy nhanh, huy hiệu Webhook (xanh lá/vàng/xám), Switch bật/tắt tiếp nhận tin nhắn, Dropdown menu thao tác.
    - `connect-page-modal.tsx`: Hộp thoại chọn Fanpage từ Facebook Account và gọi `POST /api/v1/fb-oauth/connect-pages`.
  - **Chất lượng mã nguồn & Kiểm thử:**
    - 8 file kiểm thử frontend, **21/21 tests passed 100%**.
    - Toàn bộ monorepo: **55/55 test files passed, 414/414 tests passed 100%**.
    - TypeScript compilation: **0 lỗi** trên toàn monorepo (`tsc --noEmit`).
    - Next.js 14 production build: **Compiled and optimized successfully** (`next build`).

---

## [2026-10-20] - Hoàn Thành TASK-13: Máy Chủ WebSocket Thời Gian Thực (Socket.io) & APIs Hộp Thư Tập Trung (`/api/v1/inbox`)
- **Tác giả:** System Architect & Backend Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành trọn vẹn 100% các hạng mục của **[TASK-13]** trên nhánh `feature/task-13-websocket-centralized-inbox` theo quy chuẩn `task-lifecycle.md`.
  - **Hạ Tầng WebSocket (Socket.io Server & Room Management):**
    - Cài đặt thư viện `socket.io` và `socket.io-client`.
    - Xây dựng [socket.server.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/infrastructure/socket/socket.server.ts):
      - Middleware xác thực kết nối qua JWT Access Token (`socketAuthMiddleware`) chấp nhận qua auth payload, headers authorization hoặc query token.
      - Tự động gán socket vào phòng người dùng: `room:user_{user_id}`.
      - Lắng nghe các sự kiện quản lý phòng từ client: `join_page`, `leave_page` (`room:page_{page_id}`), `join_conversation`, `leave_conversation` (`room:conv_{conversation_id}`).
      - Tích hợp vòng đời khởi động và đóng an toàn (`initSocketServer`, `closeSocketServer`) vào [index.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/index.ts).
  - **Dịch Vụ Phát Sóng Thời Gian Thực (SocketService):**
    - Xây dựng [socket.service.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/core/services/socket.service.ts) chuẩn hóa 3 sự kiện thời gian thực theo đặc tả `04_API_AND_WEBSOCKET.md`:
      - `emitNewInboxItem(pageId, payload)`: Phát `NEW_INBOX_ITEM` tới phòng Fanpage.
      - `emitInboxUpdated(pageId, payload)`: Phát `INBOX_UPDATED` tới phòng Fanpage và phòng chi tiết hội thoại.
      - `emitPostStatusChanged(pageId, payload)`: Phát `POST_STATUS_CHANGED` tới phòng Fanpage (đã tích hợp vào worker bài viết hẹn giờ).
  - **Tầng Truy Cập Dữ Liệu (Repositories):**
    - Xây dựng [conversation.repository.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/infrastructure/repositories/conversation.repository.ts): Hỗ trợ truy vấn danh sách hội thoại có phân trang, bộ lọc đa chiều (Page, loại messenger/comment, trạng thái open/resolved/archived, tìm kiếm text/khách hàng), chi tiết kèm Customer info, cập nhật status, đánh dấu đã đọc (`markAsRead`), cập nhật tin nhắn cuối cùng.
    - Mở rộng [customer.repository.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/infrastructure/repositories/customer.repository.ts): Bổ sung `findById`, `findByIdAndUserId`, `update` thông tin CRM (tên, số điện thoại, địa chỉ, tags, ghi chú).
    - Mở rộng [message-comment.repository.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/infrastructure/repositories/message-comment.repository.ts): Bổ sung `findMessagesByConversation` với cursor pagination (`created_at < cursor`), `findById`, `findByIdWithPage`, `createPageMessage`, `updateHideStatus`.
  - **Mở rộng Meta Graph API Client:**
    - Bổ sung method `sendMessage(pageId, recipientFbId, text, pageAccessToken, mediaUrl)` trong [graph-api.client.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/infrastructure/meta/graph-api.client.ts) gửi tin nhắn trực tiếp qua Messenger API (`POST /{page-id}/messages`).
    - Nâng cấp method `hideComment(commentId, pageAccessToken, isHidden)` hỗ trợ linh hoạt cả ẩn (`true`) và hiện (`false`) bình luận.
  - **Dịch Vụ Nghiệp Vụ & REST APIs Hộp Thư Tập Trung (`/api/v1/inbox`):**
    - Xây dựng [inbox.service.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/core/services/inbox.service.ts), [inbox.controller.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/api/controllers/inbox.controller.ts), [inbox.routes.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/api/routes/inbox.routes.ts):
      - `GET /api/v1/inbox/conversations`: Danh sách hội thoại phân trang, lọc theo Page/loại/trạng thái/tìm kiếm, tính toán cờ `is_within_24h` của Meta.
      - `GET /api/v1/inbox/conversations/:conversationId`: Chi tiết hội thoại + khách hàng, tự động đánh dấu đã đọc (`unread_count = 0`) và phát socket event.
      - `GET /api/v1/inbox/conversations/:conversationId/messages`: Lấy tin nhắn theo cursor pagination (`nextCursor`).
      - `POST /api/v1/inbox/conversations/:conversationId/messages`: Nhân viên gửi tin nhắn trả lời (phân nhánh Messenger Send API hoặc Comment Reply), lưu DB và phát realtime event.
      - `POST /api/v1/inbox/messages/:messageId/private-reply`: Gửi tin nhắn riêng (Private Reply) cho comment, chặn gửi trùng vi phạm chính sách Meta.
      - `PATCH /api/v1/inbox/messages/:messageId/hide`: Ẩn/Hiện bình luận Facebook qua Graph API.
      - `PATCH /api/v1/inbox/conversations/:conversationId/status`: Đổi trạng thái hội thoại (`open`, `resolved`, `archived`).
      - `PATCH /api/v1/inbox/customers/:customerId`: Cập nhật thông tin khách hàng CRM.
  - **Chất lượng mã nguồn:** 47 file kiểm thử, **393/393 tests passed 100%**, tỷ lệ bao phủ mã nguồn tổng thể đạt **88.89% Statements, 76.20% Branches, 91.94% Functions, 88.89% Lines**, TypeScript type-check 0 lỗi.

---

## [2026-10-20] - Hoàn Thành TASK-12: Đặt Lịch Xuất Bản Bài Viết Đa Kênh & Hàng Đợi Hẹn Giờ BullMQ
- **Tác giả:** System Architect & Backend Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành trọn vẹn 100% các hạng mục của **[TASK-12]** trên nhánh `feature/task-12-scheduled-posts-publishing` theo quy chuẩn `task-lifecycle.md`.
  - **DTOs & Data Access Layer (`posts_schedule`):**
    - Định nghĩa Zod Schemas [post.dto.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/api/dtos/post.dto.ts) (`CreatePostDtoSchema`, `UpdatePostDtoSchema`, `QueryPostsDtoSchema`), kiểm tra chặt chẽ thời điểm hẹn giờ `scheduled_time` phải cách thời điểm hiện tại ít nhất 10 phút.
    - Xây dựng [post-schedule.repository.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/infrastructure/repositories/post-schedule.repository.ts) thao tác với bảng `posts_schedule` trong PostgreSQL, hỗ trợ đầy đủ `create`, `findById`, `findByIdAndUserId`, `findManyWithFilter` (phân trang, lọc theo page, trạng thái, khoảng ngày), `update`, `updateStatus` (kèm `meta_post_id`, `published_at`, `error_message`), `delete`.
    - Bổ sung phương thức `findById(id)` trong [connected-page.repository.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/infrastructure/repositories/connected-page.repository.ts) để truy xuất Fanpage theo ID.
  - **REST APIs Quản lý Bài viết Đặt lịch (`/api/v1/posts`):**
    - `GET /api/v1/posts`: Danh sách bài viết có phân trang, lọc theo `page_id`, `status` (`pending`, `scheduled`, `published`, `failed`), `from_date`, `to_date`.
    - `GET /api/v1/posts/:postId`: Xem chi tiết bài viết đặt lịch của người dùng.
    - `POST /api/v1/posts`: Tạo bài viết mới & đặt lịch xuất bản (tự động đưa Job vào hàng đợi BullMQ với độ trễ `delay = scheduled_time - now`).
    - `PUT /api/v1/posts/:postId`: Chỉnh sửa nội dung bài viết và dời lại lịch hẹn giờ khi bài viết chưa được xuất bản.
    - `DELETE /api/v1/posts/:postId`: Hủy bài viết đặt lịch và tự động gỡ bỏ Delayed Job trong BullMQ.
    - `POST /api/v1/posts/:postId/retry`: Đưa lại bài viết bị lỗi (`failed`) vào hàng đợi xuất bản ngay lập tức.
    - Xây dựng [post-schedule.service.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/core/services/post-schedule.service.ts), [post.controller.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/api/controllers/post.controller.ts), [post.routes.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/api/routes/post.routes.ts) và tích hợp vào router trung tâm.
  - **Mở rộng Meta Graph API Client Xuất Bản Đa Phương Tiện:**
    - `publishFeedPost(pageId, message, token)`: Đăng bài viết thuần văn bản lên `POST /{page_id}/feed`.
    - `publishPhotoPost(pageId, photoUrl, caption, token)`: Đăng bài viết ảnh đơn lên `POST /{page_id}/photos`.
    - `publishVideoPost(pageId, fileUrl, description, token)`: Đăng video lên `POST /{page_id}/videos`.
    - `uploadUnpublishedPhoto(pageId, photoUrl, token)`: Tải ảnh lên Meta dưới dạng draft chưa xuất bản (`published=false`) để nhận `media_fbid`.
    - `publishAlbumPost(pageId, mediaFbids, message, token)`: Đăng album/carousel đa ảnh lên `POST /{page_id}/feed` với mảng `attached_media: [{media_fbid}]`.
  - **Hàng Đợi Hẹn Giờ & Worker Xuất Bản (BullMQ Publishing Worker):**
    - Cấu hình hàng đợi `scheduled-post-queue` trong [bullmq.client.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/infrastructure/queue/bullmq.client.ts).
    - Xây dựng [scheduled-post.worker.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/infrastructure/queue/scheduled-post.worker.ts) với concurrency 5 luồng. Khi đến giờ hẹn: tự động giải mã Page Access Token qua `decryptToken` (AES-256-GCM), kiểm tra định dạng media (Text, Photo, Video, Carousel/Album) để gọi Meta API tương ứng, cập nhật `published` hoặc `failed`, phát sự kiện `POST_STATUS_CHANGED`.
  - **Chất lượng mã nguồn:** 41 file kiểm thử, **337/337 tests passed 100%**, tỷ lệ bao phủ mã nguồn tổng thể đạt **90.85% Statements, 77.96% Branches, 94.30% Functions, 90.85% Lines**, TypeScript type-check 0 lỗi.

---

## [2026-10-20] - Hoàn Thành TASK-11: Dịch Vụ Tải Lên & Lưu Trữ Phương Tiện Đa Định Dạng (Multer + Cloudinary)
- **Tác giả:** System Architect & Backend Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành trọn vẹn 100% các hạng mục của **[TASK-11]** trên nhánh `feature/task-11-media-upload-cloudinary` theo quy chuẩn `task-lifecycle.md`.
  - **Cấu hình & Tích hợp Cloudinary SDK:**
    - Cài đặt thư viện `multer`, `cloudinary` và `@types/multer`.
    - Bổ sung biến môi trường Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_URL`) vào `backend/src/config/env.ts`.
    - Xây dựng cấu hình singleton SDK tại [cloudinary.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/config/cloudinary.ts).
  - **Upload Middleware (Multer MemoryStorage):**
    - Xây dựng [upload.middleware.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/api/middlewares/upload.middleware.ts) tiếp nhận file buffer trực tiếp trong RAM (không ghi xuống đĩa cục bộ).
    - Áp dụng các giới hạn chặt chẽ theo yêu cầu Meta Graph API:
      - Ảnh (JPG, PNG, WEBP): Tối đa **4MB** (`MAX_IMAGE_SIZE_BYTES = 4MB`).
      - Video (MP4, MOV): Tối đa **100MB** (`MAX_VIDEO_SIZE_BYTES = 100MB`).
      - Tự động bắt và chuyển đổi lỗi `MulterError` thành `AppError` chuẩn hóa (`UNSUPPORTED_MEDIA_TYPE`, `FILE_TOO_LARGE`, `MISSING_FILE`).
  - **Dịch Vụ Media (Stream Uploader):**
    - Xây dựng [media.service.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/core/services/media.service.ts) sử dụng `node:stream.Readable.from(buffer).pipe(cloudinary.uploader.upload_stream)`.
    - Lưu trữ tại thư mục `shopflow/posts/`, tự động nén tối ưu hóa hình ảnh (`quality: 'auto'`, `fetch_format: 'auto'`).
    - Cung cấp Public HTTPS URL (`secure_url`) sẵn sàng cho Meta Graph API tải về xuất bản.
    - Hỗ trợ phương thức hủy/xóa tệp tin `deleteMedia(publicId, resourceType)`.
  - **REST API Endpoint (`POST /api/v1/media/upload`):**
    - Xây dựng [media.controller.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/api/controllers/media.controller.ts) và [media.routes.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/api/routes/media.routes.ts).
    - Bảo vệ bằng middleware `authenticateToken`, trả về phản hồi HTTP 201 Created chuẩn Envelope JSON.
    - Gắn kết vào router trung tâm [index.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/api/routes/index.ts) tại đường dẫn `/api/v1/media`.
  - **Chất lượng mã nguồn:** 36 file kiểm thử, **278/278 tests passed 100%**, tỷ lệ bao phủ mã nguồn tổng thể đạt **91.57% Statements, 79.37% Branches, 95.56% Functions, 91.57% Lines** (vượt toàn bộ ngưỡng quy chuẩn), TypeScript type-check 0 lỗi.

---

## [2026-10-20] - Hoàn Thành TASK-10: Động Cơ Kịch Bản Tự Động (Automation Rules Engine) & Tự Động Trả Lời Bình Luận/Tin Nhắn Riêng
- **Tác giả:** System Architect & Backend Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành trọn vẹn 100% các hạng mục của **[TASK-10]** trên nhánh `feature/task-10-automation-rules-reply` theo quy chuẩn `task-lifecycle.md`.
  - **Repositories & DTOs:**
    - Xây dựng [automation-rule.repository.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/infrastructure/repositories/automation-rule.repository.ts) thao tác với bảng `automation_rules` trong PostgreSQL, hỗ trợ đầy đủ `create`, `findAllByPageId`, `findActiveRulesByPageId`, `findByIdAndPageId`, `update`, `delete`.
    - Định nghĩa Zod schemas [automation-rule.dto.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/api/dtos/automation-rule.dto.ts) (`CreateAutomationRuleDtoSchema`, `UpdateAutomationRuleDtoSchema`).
  - **REST APIs Quản lý Quy tắc Tự động hóa (`/api/v1/pages/:pageId/rules`):**
    - `GET /api/v1/pages/:pageId/rules`: Lấy toàn bộ danh sách quy tắc tự động hóa của Fanpage.
    - `POST /api/v1/pages/:pageId/rules`: Tạo mới kịch bản (từ khóa kích hoạt, bật/tắt ẩn SĐT, mẫu bình luận, mẫu tin nhắn riêng).
    - `PUT /api/v1/pages/:pageId/rules/:ruleId`: Chỉnh sửa nội dung quy tắc tự động hóa.
    - `DELETE /api/v1/pages/:pageId/rules/:ruleId`: Xóa quy tắc tự động hóa an toàn.
  - **Keyword Matcher & Template Rendering Service:**
    - Xây dựng [keyword-matcher.service.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/core/services/keyword-matcher.service.ts) chuẩn hóa văn bản tiếng Việt, xóa dấu không phân biệt hoa thường (bóc tách đúng cả ký tự `Đ`/`đ`), quét khớp từ khóa kích hoạt, và thay thế các biến động linh hoạt `{{customer_name}}`, `{{page_name}}`.
  - **Mở rộng Meta Graph API Client:**
    - Bổ sung `replyComment(commentId, message, token)` gọi `POST /{comment-id}/comments`.
    - Bổ sung `sendPrivateReply(pageId, commentId, message, token)` gọi `POST /{page-id}/messages` với `recipient: { comment_id }` tuân thủ chính sách Meta Private Reply (chỉ 1 lần trong vòng 7 ngày).
  - **Hàng đợi & Worker Tự động Phản hồi (Automation Reply Worker):**
    - Thiết lập hàng đợi BullMQ `automation-reply-queue` với Rate Limiter 15 yêu cầu/giây chống vi phạm spam chính sách Meta.
    - Triển khai [automation-reply.worker.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/infrastructure/queue/automation-reply.worker.ts) xử lý tự động: lọc quy tắc active, đối soát từ khóa, kiểm tra idempotency `isPrivateReplySent`, tự động đăng comment trả lời và gửi Messenger private reply, ghi log CRM `messages_and_comments`.
    - Tích hợp hook tự động enqueue job trong [webhook.service.ts](file:///c:/Users/Dell/Desktop/ShopFlow/backend/src/core/services/webhook.service.ts) khi tiếp nhận comment.
  - **Chất lượng mã nguồn:** 32 file kiểm thử, **254/254 tests passed 100%**, độ bao phủ mã nguồn vượt chuẩn với **90.79% Statements, 77.86% Branches, 95.36% Functions, 90.79% Lines**, TypeScript type-check 0 lỗi.

---

## [2026-10-20] - Hoàn Thành TASK-09: Meta Facebook OAuth 2.0, AES-256-GCM Token Encryption & Quản Lý Fanpage
- **Tác giả:** System Architect & Backend Engineer (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành trọn vẹn 100% các hạng mục của **[TASK-09]** trên nhánh `feature/task-09-meta-oauth-page-management` theo quy chuẩn `task-lifecycle.md`.
  - **Mã hóa Token đối xứng:** Xây dựng tiện ích `crypto.helper.ts` sử dụng thuật toán `AES-256-GCM` với IV ngẫu nhiên 96 bits và GCM Authentication Tag 128 bits chống giả mạo, mã hóa toàn bộ User Access Token và Page Access Token trước khi lưu vào cơ sở dữ liệu (`facebook_accounts`, `connected_pages`).
  - **Meta Graph API Client:** Mở rộng `graph-api.client.ts` hỗ trợ sinh OAuth Dialog URL với các scopes quản lý Fanpage (`pages_manage_posts`, `pages_messaging`, `pages_read_engagement`, `pages_show_list`), đổi Authorization Code lấy Short-Lived token và nâng cấp sang Long-Lived Token (hạn 60 ngày), lấy profile cá nhân, lấy danh sách Fanpage từ `/me/accounts`, và đăng ký tự động Webhook qua `POST /{page-id}/subscribed_apps`.
  - **Facebook OAuth Endpoints (`/api/v1/fb-oauth`):**
    - `GET /connect-url`: Sinh URL OAuth kèm JWT CSRF State Token có hạn 15 phút.
    - `GET /callback`: Xác thực CSRF state, đổi token, mã hóa và lưu vào bảng `facebook_accounts`. Hỗ trợ redirect về Next.js frontend hoặc trả về JSON.
    - `GET /accounts`: Lấy danh sách Fanpage quản lý và đối chiếu trạng thái kết nối `is_connected`.
    - `POST /connect-pages`: Kết nối hàng loạt Fanpage, mã hóa token và đăng ký `subscribed_apps`.
  - **Quản lý Kênh Fanpage (`/api/v1/pages`):**
    - `GET /`: Lấy danh sách Fanpage của user với token đã được che giấu an toàn.
    - `GET /:pageId`: Xem chi tiết Fanpage và số liệu thống kê (tổng bài viết, tổng hội thoại).
    - `PATCH /:pageId/status`: Bật/Tắt trạng thái hoạt động `is_active`.
    - `POST /:pageId/subscribe-webhook`: Đồng bộ và đăng ký lại Webhook với Meta.
    - `DELETE /:pageId`: Hủy kết nối Fanpage an toàn.
  - **Chất lượng mã nguồn:** 26 file kiểm thử, **207/207 tests passed 100%**, tỷ lệ bao phủ mã nguồn tổng thể đạt **92.42% Statements, 78.60% Branches, 96.72% Functions, 92.42% Lines** (vượt chuẩn yêu cầu), TypeScript type-check 0 lỗi.

---

## [2026-10-20] - Hoàn Tất Toàn Diện Sprint 1: Nền Tảng Backend, Database & Webhook Engine
- **Tác giả:** System Architect & Lead AI Assistant (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Hoàn thành xuất sắc 100% (8/8 tác vụ) của Sprint 1 theo đúng quy trình `task-lifecycle.md` và `safe-deploy.md`.
  - **Hạ tầng & Cơ sở dữ liệu:** Khởi tạo Monorepo chuẩn hóa (`backend/` Express TypeScript, `frontend/` Next.js 14), `docker-compose.yml` (PostgreSQL 15-alpine + Redis 7-alpine), khởi tạo 9 bảng quan hệ, partial indexes và triggers tự động (`001_initial_schema.sql`), xây dựng Singleton `pg.Pool` (`db.client.ts`) có query profiling và transaction wrapper an toàn.
  - **Middleware & Security:** Generic request validator với Zod (`validateRequest`), phân cấp lỗi miền nghiệp vụ `AppError`, middleware xử lý lỗi tập trung (`errorHandler`), bảo mật JWT Access/Refresh tokens với Bcrypt cost factor 12.
  - **Module Xác thực:** Triển khai trọn bộ API `/api/v1/auth` (đăng ký, đăng nhập, cấp lại token qua cookie, thông tin tài khoản `/me`).
  - **Webhook Engine:** Middleware xác thực chữ ký Meta Webhook HMAC-SHA256 với `crypto.timingSafeEqual` loại trừ tấn công dò thời gian, Webhook Handshake endpoint (`GET /api/v1/webhook`), Ingestion endpoint (`POST /api/v1/webhook`) phản hồi tức thời HTTP 200 OK (< 50ms) và ghi nhận `webhook_logs` Idempotent.
  - **Hàng đợi & Ẩn SĐT khẩn cấp:** Cài đặt BullMQ & ioredis, xây dựng bộ Regex tối ưu phát hiện SĐT Việt Nam (`phone-regex.ts`, 5 đầu số 03/05/07/08/09, +84, lách chữ o/O), Meta Graph API client, worker ẩn bình luận tức thời (`is_hidden = true`) trong **< 3 giây**, tự động cập nhật CRM `customers` gắn nhãn `["Co_SDT"]`, lưu vết vào `messages_and_comments`, thiết lập Rate Limiter (20 jobs/s) và Dead Letter Queue (DLQ).
  - **Chất lượng mã nguồn:** 20 file kiểm thử, **145/145 tests passed 100%**, Code Coverage toàn diện đạt **92.05% Statements, 85.87% Branches, 94.73% Functions, 92.05% Lines**, TypeScript type-check 0 lỗi. Toàn bộ code đã merge vào `main` và đẩy lên GitHub.

---

## [2026-10-19] - Đồng Bộ Hóa Toàn Diện Bộ Nhớ Agent (Memory Re-alignment)
- **Tác giả:** System Architect & Lead AI Assistant (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Đồng bộ hóa 100% tệp bộ nhớ ngữ cảnh [project_context.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/memory/project_context.md) theo thiết kế mới: PostgreSQL 15+, `pg` (node-postgres) + Repository Pattern, Monorepo (`backend/` & `frontend/`), Cloudinary, BullMQ, Socket.io.
  - Bổ sung 5 quyết định kiến trúc mới (ADR-007 đến ADR-011) vào [decisions.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/memory/decisions.md).
  - Cập nhật kế hoạch triển khai sprint tiếp theo bám sát bộ tài liệu module hóa.

---

## [2026-10-19] - Mô-đun Hóa Bộ Tài Liệu Thiết Kế Thành 5 File Chuyên Biệt
- **Tác giả:** System Architect & Lead AI Assistant (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Giải quyết vấn đề quá tải Context Window do tệp `DESIGN.md` nguyên khối (> 1000 dòng).
  - Phân tách và cấu trúc lại hệ thống tài liệu trong thư mục `docs/`:
    - [00_INDEX.md](file:///C:/Users/Dell/Desktop/ShopFlow/docs/00_INDEX.md): Chỉ mục trung tâm, kim chỉ nam & Ma trận hướng dẫn AI Coding Agent ("Code phần nào đọc file nào").
    - [01_PRD.md](file:///C:/Users/Dell/Desktop/ShopFlow/docs/01_PRD.md): Khảo sát yêu cầu sản phẩm, Persona, phạm vi MVP & chính sách Meta.
    - [02_ARCHITECTURE_AND_FLOWS.md](file:///C:/Users/Dell/Desktop/ShopFlow/docs/02_ARCHITECTURE_AND_FLOWS.md): 3 luồng người dùng, sơ đồ kiến trúc tổng thể, chốt tech stack, cây thư mục và file `.env.example`.
    - [03_DATABASE_SCHEMA.md](file:///C:/Users/Dell/Desktop/ShopFlow/docs/03_DATABASE_SCHEMA.md): Mô hình ERD, định nghĩa 9 bảng và toàn bộ mã SQL DDL Runnable (PostgreSQL 15+).
    - [04_API_AND_WEBSOCKET.md](file:///C:/Users/Dell/Desktop/ShopFlow/docs/04_API_AND_WEBSOCKET.md): Chuẩn JSON Envelope, 24+ REST APIs, Socket.io events & Sơ đồ upload media Cloudinary 14 bước.
  - Lưu trữ tệp cũ an toàn tại `docs/archive/DESIGN_monolith_backup.md` và `docs/archive/PRD_So_Bo_Quan_Ly_Fanpage_backup.md`.

---

## [2026-10-19] - Hoàn Thiện & Ban Hành Mục IV: Đặc Tả Kỹ Thuật Chi Tiết & API Nội Bộ
- **Tác giả:** Software Architect & AI Assistant
- **Nội dung hoàn thành:**
  - Chốt dứt khoát kiến trúc Monorepo (`backend/` dùng Node.js + Express + TypeScript và `frontend/` dùng Next.js 14+ App Router + Tailwind CSS).
  - Chốt sử dụng `pg` (node-postgres) thay cho Prisma để tương thích tuyệt đối với PostgreSQL DDL, partial indexes và triggers tự động.
  - Chốt `Zod` validation middleware cho toàn bộ request body, query, params và env parsing.
  - Chốt cấu hình BullMQ Retry & Exponential Backoff cho Meta Rate Limits (`attempts: 5`, `delay: 3000ms`).
  - Thiết kế luồng upload media đám mây qua Multer MemoryStorage + Cloudinary Stream Upload cấp Public HTTPS URL cho Meta Graph API.
  - Thiết kế màn hình Live Chat tập trung (Centralized Inbox) giao diện 3 cột chuyên dụng thời gian thực qua Socket.io.

---

## [2026-10-17] - Khởi Tạo Không Gian Làm Việc AI Agent Toàn Diện
- **Tác giả:** System Architect (Antigravity Ecosystem)
- **Nội dung hoàn thành:**
  - Thiết lập cấu trúc thư mục cấu hình AI Agent hoàn chỉnh tại `.agents/`.
  - Ban hành tệp loại trừ chuẩn `.agentignore` tại thư mục gốc.
  - Cấu hình tích hợp MCP servers, sandbox và agent settings.
  - Ban hành bộ quy chuẩn kỹ thuật: `project-rules.md`, `security.md`, `testing-standards.md`.
  - Xây dựng quy trình làm việc tự động (workflows): `test.md`, `deploy.md`, `code-review.md`.
  - Phân định vai trò các Agent chuyên biệt: `planner`, `coder`, `security-auditor`, `devops`.

---

## [Giai Đoạn Trước] - Nghiên Cứu Nghiệp Vụ & Khảo Sát Thị Trường
- **Tài liệu hoàn thành:** [deep-research-report.md](file:///C:/Users/Dell/Desktop/ShopFlow/docs/deep-research-report.md)
- **Nội dung:** Khảo sát chi tiết bài toán kinh doanh của các shop thời trang/B2C tại Việt Nam trên nền tảng Facebook Fanpage, đánh giá tính khả thi của Facebook Graph API, phân tích rủi ro chính sách Meta (xóa quyền `publish_to_groups`, chống spam).

---

## [Đã Hoàn Thành] - MVP Implementation Sprint 1 (Backend & DB Infrastructure) - 100%
- [x] Khởi tạo khung thư mục Monorepo chuẩn hóa (`backend/` và `frontend/`).
- [x] Khởi tạo tệp `docker-compose.yml` cho PostgreSQL 15+ và Redis 7+.
- [x] Thực thi tệp SQL DDL từ `docs/03_DATABASE_SCHEMA.md` khởi tạo toàn bộ 9 bảng, partial indexes và triggers.
- [x] Xây dựng tầng hạ tầng kết nối cơ sở dữ liệu `backend/src/infrastructure/database/db.client.ts` (`pg.Pool` Singleton).
- [x] Xây dựng generic validation middleware `validateRequest` với Zod.
- [x] Triển khai Module Xác thực `auth` (Đăng ký, Đăng nhập, JWT Access/Refresh tokens).
- [x] Triển khai Webhook Ingestion Router & Controller kèm HMAC-SHA256 Verifier.
- [x] Triển khai BullMQ Queue & Worker quét Regex ẩn SĐT trong < 3 giây.

---

## [Đã Hoàn Thành] - Sprint 2: Core Business Logic, Realtime WebSocket & Next.js UI - 100%
- [x] **[TASK-09]** Meta Facebook OAuth 2.0, Mã Hóa Token AES-256-GCM & Quản Lý Fanpage (`/api/v1/fb-oauth`, `/api/v1/pages`).
- [x] **[TASK-10]** Động Cơ Kịch Bản Tự Động (Automation Rules Engine) & Tự Động Trả Lời Bình Luận/Tin Nhắn Riêng (Auto Comment & Private Reply).
- [x] **[TASK-11]** Dịch Vụ Tải Lên Phương Tiện Truyền Thông Đa Định Dạng (Multer + Cloudinary Stream Upload) (`/api/v1/media`).
- [x] **[TASK-12]** Đặt Lịch Xuất Bản Bài Viết Đa Kênh & Hàng Đợi Hẹn Giờ BullMQ (`/api/v1/posts`).
- [x] **[TASK-13]** Máy Chủ WebSocket Thời Gian Thực (Socket.io) & APIs Hộp Thư Tập Trung (Centralized Inbox) (`/api/v1/inbox`).
- [x] **[TASK-14]** Khung Layout macOS Clean Utility, Màn hình Auth & Quản lý Fanpage (`/pages`).
- [x] **[TASK-15]** Màn hình Hộp thư Tập trung Live Chat 4-Pane Bento (`/inbox`) - Trọng tâm Cốt lõi P0. *(HOÀN THÀNH 100% SPRINT 2)*

---

## [Đã Hoàn Thành] - Sprint 3: Frontend UI & Automation Screens - 100%
- [x] **[TASK-16]** Màn hình Quản lý Danh sách Bài viết Đặt lịch & Calendar View (`/posts`).
- [x] **[TASK-17]** Màn hình Soạn thảo Bài viết Mới & Preview Facebook (`/posts/new`).
- [x] **[TASK-18]** Màn hình Cấu hình Kịch bản Tự động & Ẩn SĐT (`/automation`).
- [x] **[TASK-19]** Bảng Điều Khiển Tổng Quan & Báo Cáo KPIs (`/(dashboard)`). *(HOÀN THÀNH 100% SPRINT 3)*

---

## [Kế Hoạch Tiếp Theo] - Đề Xuất Sprint 4: Order Management, AI Entity Extraction & Payment Integration
- **Mục tiêu Sprint 4:** Hoàn thiện mắt xích quan trọng nhất của ShopFlow: Tự động hóa chuyển đổi từ tương tác mạng xã hội (bình luận / tin nhắn) thành đơn hàng thực tế; bóc tách thực thể thông minh qua Google Gemini AI kết hợp Regex phòng vệ tiếng Việt; quản lý kho hàng, tạo đơn hàng và thanh toán VietQR động.
- **Danh mục nhiệm vụ cụ thể:**
  - [ ] **[TASK-20] Mô-đun Trích Xuất Thực Thể Đơn Hàng Bằng Google Gemini AI (`OrderParserService`):**
    - Tích hợp Google Gemini 2.5 Flash qua SDK `@google/genai` hoặc REST API với cấu hình JSON output mode.
    - Xây dựng tầng Regex Fallback xử lý cú pháp bình luận đặt hàng phổ biến (`#SP01 2 đỏ L 0988xxx`).
    - Trích xuất 7 trường thực thể: Sản phẩm, Mã SKU, Số lượng, Biến thể (Màu/Size), Tên khách hàng, SĐT, Địa chỉ nhận hàng.
  - [ ] **[TASK-21] Quản Lý Danh Mục Sản Phẩm, Biến Thể & Tồn Kho (`/api/v1/products`):**
    - Nghiệp vụ quản lý danh mục sản phẩm, biến thể (JSON attributes) và kiểm soát tồn kho (`stock_quantity`).
    - Trừ kho tự động khi tạo đơn hàng và rollback khi hủy đơn.
  - [ ] **[TASK-22] Màn Hình Giao Diện Quản Lý Đơn Hàng & Vận Đơn (`/orders`):**
    - Giao diện macOS Clean Utility: Bảng dữ liệu phân trang, lọc theo trạng thái (`pending`, `confirmed`, `shipping`, `completed`, `cancelled`).
    - Drawer/Modal chi tiết đơn hàng, lịch sử thay đổi, nhãn in vận đơn và đồng bộ socket `ORDER_STATUS_CHANGED`.
  - [ ] **[TASK-23] Tích Hợp Thanh Toán VietQR Động & Cổng Vận Chuyển:**
    - Sinh mã VietQR động theo chuẩn Napas 247 chứa đúng số tiền đơn hàng và mã nội dung chuyển khoản bảo mật.
    - Webhook xác nhận thanh toán tự động chuyển trạng thái đơn hàng sang `confirmed`.
