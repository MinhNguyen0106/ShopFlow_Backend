# TÀI LIỆU ĐẶC TẢ DANH MỤC MÀN HÌNH & THÀNH PHẦN GIAO DIỆN SHOPFLOW
## (SCREEN INVENTORY & UI INFORMATION ARCHITECTURE)

Tài liệu này định nghĩa danh mục toàn bộ các màn hình (Screens), khung nhìn con (Views/Tabs), thành phần nổi (Modals/Overlays) và kiến trúc điều hướng (Site Map) cho nền tảng **ShopFlow** (Next.js 14+ App Router, Tailwind CSS, TypeScript), phân loại chi tiết theo mức độ ưu tiên từ **P0** (MVP Cốt lõi) đến **P2** (Roadmap Mở rộng).

---

### I. SƠ ĐỒ ĐIỀU HƯỚNG TỔNG THỂ (APPLICATION SITE MAP)

```
[ShopFlow Application Root: /]
│
├── [Auth Group: (auth)]
│   ├── /login ─────────────────────────── [P0] Màn hình Đăng nhập
│   └── /register ──────────────────────── [P0] Màn hình Đăng ký
│
└── [Dashboard Group: (dashboard)] (Bảo vệ bởi JWT Middleware & SocketProvider)
    ├── / ──────────────────────────────── [P1] Bảng điều khiển Tổng quan (Dashboard Overview)
    │
    ├── /pages ─────────────────────────── [P0] Quản lý Kênh Fanpage
    │   └── [Modal: ConnectPageModal] ──── [P1] Hộp thoại tích chọn Page sau OAuth
    │
    ├── /inbox ─────────────────────────── [P0] Hộp thư Tập trung (Live Chat 3 Cột)
    │   └── [Drawer: CustomerPanel] ────── [P0] Bảng thông tin khách hàng, SĐT & Ghi chú
    │
    ├── /posts ─────────────────────────── [P0] Quản lý Danh sách Bài viết Đặt lịch
    │   ├── Tab: List/Table View ───────── [P0] Khung nhìn dạng bảng trạng thái
    │   └── Tab: Calendar View ─────────── [P1] Khung nhìn dạng lịch biểu theo tháng/tuần
    │
    ├── /posts/new ─────────────────────── [P0] Soạn thảo Bài viết & Lên lịch Đăng bài
    │   └── [Modal: PostPreviewModal] ──── [P1] Hộp thoại xem trước giao diện Facebook thật
    │
    ├── /automation ────────────────────── [P0] Cấu hình Kịch bản Tự động & Ẩn SĐT
    │   └── [Modal: CreateRuleModal] ───── [P0] Hộp thoại tạo kịch bản từ khóa mới
    │
    ├── [Global Modal: CommandPalette] ─── [P1] Bảng lệnh thao tác nhanh Spotlight (⌘K)
    │
    ├── /customers ─────────────────────── [P2] Quản lý Khách hàng & Leads tập trung
    └── /settings ──────────────────────── [P2] Cài đặt Tài khoản, Hồ sơ & Giám sát API Limits
```

---

### II. BẢNG TỔNG HỢP DANH MỤC MÀN HÌNH THEO MỨC ĐỘ ƯU TIÊN

| STT | Tên màn hình / Khung nhìn | Tuyến đường (Route) | Mức Ưu Tiên | Phân hệ Nghiệp vụ | Trạng thái Dự án |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **01** | Màn hình Đăng nhập | `/(auth)/login` | **P0** | Xác thực & Bảo mật | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/01_LOGIN_SCREEN.html) |
| **02** | Màn hình Đăng ký | `/(auth)/register` | **P0** | Xác thực & Bảo mật | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/02_REGISTER_SCREEN.html) |
| **03** | Quản lý Kênh Fanpage | `/(dashboard)/pages` | **P0** | Meta OAuth 2.0 & Webhooks | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/04_FANPAGE_MANAGEMENT.html) |
| **04** | Hộp thư Tập trung (Live Chat) | `/(dashboard)/inbox` | **P0** | Hộp thư Đa kênh & Socket.io | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/05_LIVE_CHAT_INBOX.html) *(Trọng tâm cốt lõi)* |
| **05** | Soạn bài & Đặt lịch Hẹn giờ | `/(dashboard)/posts/new` | **P0** | Đặt lịch Đăng bài & Media | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/06_POST_CREATOR_SCHEDULE.html) |
| **06** | Quản lý Danh sách Đặt lịch (List) | `/(dashboard)/posts` *(List)* | **P0** | Đặt lịch Đăng bài & Media | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/07_POSTS_SCHEDULE_LIST.html) |
| **07** | Cấu hình Kịch bản & Ẩn SĐT | `/(dashboard)/automation` | **P0** | Tự động hóa & Chống cướp đơn | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/08_AUTOMATION_RULES.html) |
| **08** | Bảng điều khiển Tổng quan | `/(dashboard)` | **P1** | Thống kê & Báo cáo KPIs | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/03_DASHBOARD_OVERVIEW.html) |
| **09** | Lịch biểu Đăng bài (Calendar View) | `/(dashboard)/posts` *(Cal)* | **P1** | Đặt lịch Đăng bài & Media | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/09_POSTS_CALENDAR_VIEW.html) |
| **10** | Xem trước Bài đăng Facebook | *PostPreviewModal* | **P1** | Đặt lịch Đăng bài & Media | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/10_POST_PREVIEW_MODAL.html) |
| **11** | Hộp thoại Chọn Fanpage sau OAuth | *ConnectPageModal* | **P1** | Meta OAuth 2.0 & Webhooks | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/11_CONNECT_PAGE_MODAL.html) |
| **12** | Bảng lệnh Nhanh Spotlight (`⌘K`) | *CommandPalette* | **P1** | Nâng cao Trải nghiệm (UX) | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/12_COMMAND_PALETTE.html) |
| **13** | Quản lý Khách hàng & Leads | `/(dashboard)/customers` | **P2** | CRM Bán hàng Mở rộng | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/13_CUSTOMERS_CRM.html) |
| **14** | Cài đặt Hệ thống & Hồ sơ | `/(dashboard)/settings` | **P2** | Quản trị Hệ thống | [Đã tạo Mockup HTML](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/14_SETTINGS_PROFILE.html) |

---

### III. ĐẶC TẢ CHI TIẾT CÁC MÀN HÌNH NHÓM P0 (BẮT BUỘC MVP)

#### 1. Màn hình Đăng nhập (`/login`) & Đăng ký (`/register`)
- **Tuyến đường:** `src/app/(auth)/login/page.tsx` & `src/app/(auth)/register/page.tsx`
- **Mục tiêu:** Cấp phát và quản lý JSON Web Token (JWT) trong `localStorage` hoặc HttpOnly Cookie, bảo vệ toàn bộ các tuyến đường bên trong nhóm `(dashboard)`.
- **Thành phần giao diện chính:**
  - Card trung tâm bo góc mềm `rounded-2xl`, bóng đổ `shadow-mac-window`, đường viền siêu mỏng `border-slate-200/80`.
  - Logo thương hiệu ShopFlow tối giản với điểm nhấn `color-primary-600` (`#2563EB`).
  - Ô nhập Email (`type="email"`) và Mật khẩu (`type="password"`) có nút toggle hiện/ẩn mật khẩu.
  - Checkbox "Ghi nhớ đăng nhập" (`rounded-xs`).
  - Nút bấm chính dạng Pill: **"Đăng Nhập Vào Hệ Thống"** (`rounded-full bg-blue-600 hover:bg-blue-700 text-white`).
  - Liên kết điều hướng qua lại giữa Đăng nhập và Đăng ký.

---

#### 2. Màn hình Quản lý Kênh Fanpage (`/pages`)
- **Tuyến đường:** `src/app/(dashboard)/pages/page.tsx`
- **Tệp Mockup Thiết Kế (Stitch MCP):** [04_FANPAGE_MANAGEMENT.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/04_FANPAGE_MANAGEMENT.html) *(Screen ID: `01a5cb12b0c041538a1197d1241db0a0`)*
- **Mục tiêu:** Khởi động luồng Meta OAuth 2.0 để đổi lấy Long-Lived Page Access Tokens (mã hóa AES-256), tự động đăng ký `subscribed_apps` (Webhooks `feed` & `messages`), và cho phép người dùng bật/tắt tiếp nhận dữ liệu từng trang.
- **Thành phần giao diện chính:**
  - **macOS Window Topbar & Sidebar:** Topbar với thanh tìm kiếm nhanh, chuyển đổi nhanh Fanpage đang chọn, nút `+ Tạo chiến dịch`, và Widget theo dõi Rate Limit Meta Graph API v19.0 (mức an toàn 24%). Sidebar với tab `Kết nối Fanpage` active.
  - **Header hành động:** Breadcrumbs rõ ràng, Tiêu đề "Quản lý Fanpage & Kênh bán hàng", nút phụ "Đồng bộ lại tất cả Webhooks", và nút CTA chính dạng Pill: **"+ Thêm Fanpage Mới (Meta OAuth)"** (Mở URL OAuth với các scope: `pages_manage_posts`, `pages_messaging`, `pages_read_engagement`).
  - **Hàng 4 Thẻ Bento Metrics:**
    1. *Tổng số trang kết nối:* `3 / 5` trang (Gói Pro, thanh tiến độ 60%).
    2. *Trạng thái Webhook & Token:* `100% Hoạt động` (Token Meta Long-Lived hợp lệ 58 ngày nữa).
    3. *Lưu lượng hôm nay:* `1,428` tương tác (+14.2%, tự động hóa xử lý 88%).
    4. *Tốc độ phản hồi trung bình:* `1.4s` (đạt chuẩn SLA < 3.0s).
  - **Lưới danh sách Fanpage (`PageCard Grid`):**
    - Avatar Fanpage, Tên Fanpage in đậm, Category ngành hàng, Page ID hiển thị dạng Monospace kèm nút copy nhanh.
    - Huy hiệu trạng thái Webhook: Xanh lá (`Đang đồng bộ Webhook`), Vàng (`Cần cấp lại Token`), Xám (`Đã tạm dừng`).
    - Nút Switch gạt nhanh: Bật/Tắt tiếp nhận tin nhắn và bình luận cho từng Page.
    - Menu thao tác: "Vào Hộp Thư", "Cấu hình Bot", "Đồng bộ lại Token", "Kiểm tra kết nối Webhook", "Ngắt kết nối".
  - **Khung Bảo Mật & Tuân Thủ Meta:** Huy hiệu Meta Business Partner Verified, chứng nhận bảo mật mã hóa AES-256 GCM cho Access Tokens.

---

#### 3. Màn hình Hộp thư Tập trung Live Chat (`/inbox`) - *TRỌNG TÂM CỐT LÕI*
- **Tuyến đường:** `src/app/(dashboard)/inbox/page.tsx`
- **Tệp Mockup Thiết Kế (Stitch MCP):** [05_LIVE_CHAT_INBOX.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/05_LIVE_CHAT_INBOX.html) *(Screen ID: `3e2ea098ad4d431ab9032d5640153385`)*
- **Mục tiêu:** Giải quyết triệt để vấn đề phản hồi chậm và nạn cướp đơn (Comment Hijacking). Gom toàn bộ bình luận bài viết và tin nhắn Messenger từ các Fanpage kết nối về một giao diện 4-Pane Bento chuyên dụng thời gian thực qua WebSocket (Socket.io).
- **Cấu trúc 4-Pane Chi Tiết:**
  - **CỘT 1: Bộ Lọc & Kênh Kết Nối (`w-[260px]` - `column-channels.tsx`):**
    - Bộ chọn Fanpage (Dropdown chuyển đổi giữa "Tất cả kênh (3 Fanpage)" hoặc chọn riêng `Tiệm Mỹ Phẩm Sài Gòn`, `Hùng Sport`, `Phụ Kiện GenZ`).
    - Bộ lọc trạng thái thông minh: `Tất cả hội thoại` (18), `Chưa đọc` (5), `Có số điện thoại (Lead)` (8), `Sắp hết hạn 24h Meta` (3 - cảnh báo hổ phách nhấp nháy), `Đã chốt đơn` (12).
    - Bộ lọc thẻ Tags & Kênh: `VIP`, `Cần tư vấn gấp`, `Đã ẩn SĐT`, `FB Messenger`, `Bình luận bài viết`.
    - Thanh thông số kết nối: Webhooks Đồng Bộ 100% (1.2ms latency).
  - **CỘT 2: Danh Sách Hội Thoại (`w-[330px]` - `column-threads.tsx`):**
    - Header tra cứu nhanh, nút sắp xếp "Mới nhất" và thao tác hàng loạt.
    - Luồng hội thoại đang chọn (`Trần Thu Thảo`):
      - Avatar kèm badge icon nguồn (Bình luận bài viết #Post108).
      - Đồng hồ đếm ngược Cửa sổ 24h Meta: `còn 42m` (amber badge cảnh báo).
      - Huy hiệu an ninh: `🔒 Đã tự động ẩn SĐT 0988***123` & nhãn `Lead nóng`.
    - Các luồng hội thoại khác: `Đặng Văn Hùng` (Messenger, còn 1h 15m), `Đỗ Quỳnh Anh` (Instagram Direct), `Vũ Đức Anh` (Đã xử lý).
  - **CỘT 3: Khung Trò Chuyện Trực Tiếp (`flex-1` - `chat-window.tsx`):**
    - Header: Khách hàng `Trần Thu Thảo` kèm tích xanh, link xem bài viết gốc `#SK2024`, đồng hồ đếm ngược chính sách Meta SLA (`Còn 42 phút 15 giây`).
    - Lịch sử trò chuyện:
      - Sự kiện khách để lại comment đặt 2 đôi Sneaker Classic trắng size 38 kèm SĐT `0988654123`.
      - **Banner Cảnh Báo An Ninh ShopFlow Shield:** `🛡️ Tự động bảo vệ: Đã phát hiện và ẨN BÌNH LUẬN chứa SĐT 0988***123 trong 0.3s để chống cướp đơn.`
      - Tin nhắn Bot tự động phản hồi riêng (Private Reply) và tin nhắn phản hồi của nhân viên CSKH `Trần Thu Hà`.
    - Thanh soạn thảo tin nhắn: Macro mẫu chốt đơn nhanh (`/size`, `/gia`, `/bank`, `/ship`), đính kèm ảnh, emoji, gợi ý câu trả lời AI, nút gửi Pill Blue `Gửi (Enter)`.
  - **CỘT 4: Bảng CRM & Trích Xuất Đơn Hàng AI (`w-[320px]` - `customer-panel.tsx`):**
    - Hồ sơ khách hàng: Họ tên, nhãn `Khách VIP - Tiềm năng cao`, tổng chi tiêu `3.450.000 đ (3 đơn)`.
    - Thông tin liên hệ: SĐT `0988654123` (nút gọi & sao chép 1-click), Địa chỉ giao hàng đầy đủ tại Quận 1, TP.HCM.
    - **Thẻ Trích Xuất Đơn Hàng Thông Minh (Gemini AI NLP):**
      - Tự động nhận diện sản phẩm: `Sneaker ShopFlow Classic Trắng (Size 38)`, Số lượng: `2 đôi`, Đơn giá: `550.000 đ`, Tổng tiền: `1.100.000 đ` (Freeship).
      - Nút CTA chính: **`+ Tạo đơn hàng ngay (1.100.000 đ)`** (Pill xanh ngọc bích nổi bật).
    - Lịch sử đơn hàng cũ và khung ghi chú nội bộ cho ca trực sau.

---

#### 4. Màn hình Soạn Bài & Đặt Lịch Hẹn Giờ (`/posts/new`)
- **Tuyến đường:** `src/app/(dashboard)/posts/new/page.tsx`
- **Tệp Mockup Thiết Kế (Stitch MCP):** [06_POST_CREATOR_SCHEDULE.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/06_POST_CREATOR_SCHEDULE.html) *(Screen ID: `3b516c3abc1944ba9ce3ec2d2315fae0`)*
- **Mục tiêu:** Cung cấp công cụ xuất bản nội dung tự động tuân thủ 100% các ràng buộc kỹ thuật của Meta Graph API (thời gian hẹn giờ từ 10 phút đến 30 ngày đối với Feed/Photo; đến 6 tháng đối với Video; nén ảnh chuẩn Meta HD).
- **Bố cục Chia Đôi Màn Hình (Split View):**
  - **Cột Trái (Khu vực Soạn thảo & Cấu hình - 7 Cols):**
    - **1. Chọn Fanpage Đăng Tải (Cross-posting):** Hỗ trợ tích chọn đồng thời nhiều Page (`Bella Store`, `Sneaker VNXK`, `Phụ Kiện GenZ`) kèm chỉ báo trạng thái `Token v19 Live`.
    - **2. Nội Dung Bài Viết (Caption) & Trợ Lý Gemini AI:**
      - Nút nổi bật: **"✨ Viết lại caption bằng Gemini AI"** tạo nội dung bán hàng cuốn hút chuẩn CTA.
      - Toolbar định dạng bài viết: In đậm, In nghiêng, Chèn Emoji, Gợi ý hashtag nhanh (`#ShopFlowVN`, `#FlashSale`, `#SneakerChinhHang`), bộ đếm ký tự (`284 / 2,000`).
      - Huy hiệu tuân thủ Meta CTA & Thông báo từ khóa kích hoạt chatbot tự động: `[SIZE + SĐT, INBOX, TƯ VẤN]`.
    - **3. Tải Lên Hình Ảnh & Video Sản Phẩm:**
      - Vùng kéo thả file với thanh tiến độ hoàn tất `4/4 ảnh (100% - Đã tối ưu nén ảnh Meta HD)`.
      - Lưới xem trước 4 ảnh sản phẩm với nhãn đánh dấu ảnh bìa.
    - **4. Hẹn Giờ Xuất Bản (Publishing Scheduler):**
      - Tùy chọn: *Đăng ngay*, *Lên lịch tự động*, *Lưu vào kho bài nháp*.
      - Bộ chọn ngày và giờ chính xác.
      - Nút bấm gợi ý Khung Giờ Vàng tương tác cao: `⚡ 11:30 (Ăn trưa - 86 tương tác/h)` và `🔥 20:00 (Buổi tối - 114 tương tác/h)`.
      - Khóa an toàn Meta Graph API v19 ngăn đặt giờ ngoài phạm vi cho phép.
    - **5. Nút Hành Động:** Nút chính dạng Pill: **`+ Lên Lịch Đăng Bài (2 Fanpage)`** (`bg-blue-600`), nút "Lưu bản nháp" và "Hủy bỏ".
  - **Cột Phải (Trình Xem Trước Giao Diện Facebook - Live Preview - 5 Cols):**
    - Bộ chuyển đổi chế độ xem: `[Desktop Feed]` vs `[Mobile App]`.
    - Mô phỏng chính xác giao diện Facebook News Feed thật: Avatar Fanpage có tích xanh, trạng thái lên lịch `11:30 - Hôm nay 🌐`, nội dung caption kèm emoji, bố cục ghép lưới 4 ảnh Facebook sắc nét.
    - Thẻ đính kèm Messenger ShopFlow tự động kèm nút **`Gửi tin nhắn`**.
    - Đầy đủ thanh tương tác Facebook: Thích (142), Bình luận (48), Chia sẻ (12).
    - Hộp dự báo tương tác: Dự báo tiếp cận `14,200 - 28,500 (+38%)`, Điểm kiểm định Meta HD `100/100`, và Cảnh báo kích hoạt bảo vệ chống cướp khách ShopFlow Shield (tự động ẩn SĐT sau 0.3s).

---

#### 5. Màn hình Quản Lý Danh Sách Đặt Lịch (`/posts` - List View)
- **Tuyến đường:** `src/app/(dashboard)/posts/page.tsx` *(Chế độ hiển thị mặc định)*
- **Tệp Mockup Thiết Kế (Stitch MCP):** [07_POSTS_SCHEDULE_LIST.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/07_POSTS_SCHEDULE_LIST.html) *(Screen ID: `e345c3d63d914e77a03e8b8de2d6863d`)*
- **Mục tiêu:** Quản lý vòng đời toàn bộ các bài viết đã lên lịch hoặc đã xuất bản, theo dõi trạng thái đồng bộ Meta Graph API v19, kiểm soát tiến trình đa Fanpage, và xử lý nhanh hàng loạt (Bulk actions).
- **Thành phần giao diện chi tiết:**
  - **1. Header & Cụm Hành Động Nhanh:**
    - Breadcrumbs: `Dashboard > Lịch Đăng Bài`.
    - Tiêu đề màn hình: **"Quản Lý Bài Viết & Lên Lịch Đăng"** kèm mô tả nghiệp vụ.
    - Nhóm nút thao tác: Nút "Lọc nhanh", Nút "Xuất Excel" (`.xlsx` báo cáo tương tác), và Nút CTA chính dạng Pill: **`+ Soạn bài viết mới`** (`bg-blue-600 hover:bg-blue-700`).
  - **2. Lưới 4 Thẻ Bento KPIs:**
    - **Tổng bài tháng này:** `48` bài (+18% so với tháng trước).
    - **Chờ xuất bản:** `06` bài (Kế tiếp 11:30 SA - còn 45m kèm ping animation xanh dương).
    - **Đã đăng thành công:** `39` bài (Tỷ lệ thành công 97.5% - Reach ước tính ~142.5K).
    - **Xuất bản thất bại:** `03` bài (Cảnh báo đỏ "Cần kiểm tra token" kèm nút "Thử lại tất cả").
  - **3. Thanh Công Cụ Lọc & Bộ Điều Khiển Chế Độ Xem (Toolbar):**
    - Chuyển đổi giao diện: Tabs Segmented Control giữa `[Bảng danh sách (Table)]` và `[Lịch biểu (Calendar)]`.
    - Bộ lọc trạng thái bài viết: `Tất cả (48)`, `Chờ đăng (6)`, `Đã đăng (39)`, `Thất bại (3)`, `Bản nháp (4)`.
    - Lọc theo Fanpage đích: Dropdown chọn đa Fanpage (`Bella Store`, `Sneaker VNXK`, `Phụ Kiện GenZ`).
    - Ô tìm kiếm tức thì theo từ khóa, hashtag hoặc ID bài viết.
  - **4. Bảng Dữ Liệu Chi Tiết (Data Table - 7 Cột Chuẩn Mực):**
    - **Checkbox:** Lựa chọn từng dòng hoặc chọn toàn bộ để kích hoạt Floating Bulk Action Bar.
    - **Bài viết & Media:** Hình ảnh thu nhỏ (Thumbnail 48x48 bo tròn), trích đoạn nội dung caption (2 dòng đầu kèm emoji), gắn thẻ hashtag (`#Sale50`, `#SneakerVNXK`), và nhãn số lượng media (`[4 photos]` hoặc `[1 video]`).
    - **Fanpage đích:** Avatar trang + Tên Fanpage đích kèm huy hiệu `Meta v19 Live`.
    - **Giờ đăng / Lên lịch:** Định dạng thời gian Space Mono (`20/10/2026 20:00`), gắn nhãn nổi bật nếu rơi vào **Khung Giờ Vàng** (`🔥 20:00 (Tối)` hoặc `⚡ 11:30 (Trưa)`).
    - **Trạng thái xuất bản (`StatusBadge`):**
      - `SCHEDULED`: Huy hiệu xanh dương kèm biểu tượng đồng hồ đếm ngược.
      - `PUBLISHED`: Huy hiệu xanh ngọc bích kèm liên kết ngoài `Mở trên Facebook`.
      - `FAILED`: Huy hiệu đỏ viền cảnh báo kèm Tooltip giải thích chi tiết lỗi Meta Graph API (ví dụ: `Page token expired`, `Video encoding timeout`).
      - `DRAFT`: Huy hiệu xám tối giản.
    - **Tương tác & Reach:** Hiển thị thống kê Thích, Bình luận, Chia sẻ đối với bài đã đăng; Hiển thị Reach dự báo đối với bài chờ xuất bản.
    - **Thao tác nhanh (Row Actions):** Nút xem trước mô phỏng Facebook (`visibility`), Nút chỉnh sửa (`edit`), Nút xuất bản ngay lập tức (`send`), Nút hủy lịch / xóa (`delete`).
  - **5. Thanh Tác Vụ Nổi Hàng Loạt (Floating Bulk Action Bar):**
    - Tự động trượt lên ở đáy màn hình khi tích chọn ≥ 1 bài viết: "Đã chọn N bài viết".
    - Các nút hành động nhanh: *Đổi giờ đăng hàng loạt*, *Đăng ngay lập tức*, *Hủy lịch đã chọn*, *Xóa bỏ*.
  - **6. Phân Trang & Điều Hướng (Pagination Bar):**
    - Hiển thị số dòng hiện tại (`1 - 10 trên 48 bài viết`), bộ chọn số lượng hiển thị (`10`, `25`, `50`), và nút chuyển trang số học.

---

#### 6. Màn hình Cấu Hình Kịch Bản Tự Động & Ẩn SĐT (`/automation`)
- **Tuyến đường:** `src/app/(dashboard)/automation/page.tsx`
- **Tệp Mockup Thiết Kế (Stitch MCP):** [08_AUTOMATION_RULES.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/08_AUTOMATION_RULES.html) *(Screen ID: `679f8c5f281a4eda83b4da4700e34208`)*
- **Mục tiêu:** Thiết lập các quy tắc phản hồi tự động đa kênh tức thì và kích hoạt khiên bảo vệ thông tin khách hàng (ẩn số điện thoại thời gian thực trong < 0.28s) nhằm chặn đứng hành vi cướp đơn từ đối thủ cạnh tranh trên Fanpage.
- **Thành phần giao diện chi tiết:**
  - **1. Header & Điều Hướng:**
    - Breadcrumbs: `Dashboard > Tự Động Hóa & Chống Cướp Đơn`.
    - Huy hiệu phiên bản: `v2.4 Live Guard` kèm icon khiên xanh ngọc bích.
    - Cụm nút công cụ: *Lịch sử thực thi (Audit Log)*, *Kiểm tra Webhook (Ping Meta Graph API)*, và Nút CTA chính dạng Pill: **`+ Thêm kịch bản mới`** (`bg-blue-600 hover:bg-blue-700`).
  - **2. Khiên Bảo Vệ Dữ Liệu Chống Cướp Đơn (Anti-Theft Shield Hero Banner):**
    - Khung macOS Container cao cấp viền `border-blue-200/80` tích hợp 3 nút điều khiển Traffic Lights và mã module: `SHIELD_SECURITY_CORE :: MODULE_VN_PHONE_GUARD`.
    - Chỉ báo trạng thái thời gian thực: `ĐANG BẢO VỆ 24/7 (ACTIVE)` với hiệu ứng pulse xanh ngọc bích.
    - Công tắc chuyển mạch tổng (Master Toggle Switch) kích hoạt toàn bộ 3 Fanpage đang kết nối.
    - Thẻ thông số kỹ thuật (Security Specs Badges):
      - `⚡ Độ trễ: < 0.28s Instant Hide` (Xử lý ngay khi webhook gửi về, trước khi đối thủ kịp đọc).
      - `Regex VN Telecoms`: Nhận diện toàn diện đầu số 10-11 số của mọi nhà mạng Việt Nam (`03x`, `05x`, `07x`, `08x`, `09x`, hỗ trợ ký tự phân cách như dấu chấm, gạch ngang, khoảng trắng, viết chữ).
      - `Meta Token: Live & Encrypted AES-256`.
    - Lưới 3 công tắc kích hoạt mở rộng (Sub-toggles):
      - [x] *Gửi tin nhắn Messenger tự động khi ẩn SĐT* (Private reply thông báo cho khách biết shop đã bảo vệ đơn).
      - [x] *Gắn thẻ `#Lead_Nóng` & đẩy trực tiếp vào CRM*.
      - [x] *Gửi cảnh báo Telegram tức thì cho nhân viên CSKH*.
  - **3. Lưới 4 Thẻ Bento KPIs Tự Động Hóa:**
    - **Kịch bản hoạt động:** `12` kịch bản đang chạy (100% tỷ lệ sẵn sàng).
    - **SĐT đã ẩn bảo vệ:** `1,842` số điện thoại đã được ẩn tự động, chặn 100% đối thủ cướp khách.
    - **Auto-replies đã gửi:** `14,890` lượt gửi thành công (Tỷ lệ phản hồi 99.8%).
    - **Tốc độ phản hồi trung bình:** `0.28s` (Nhanh hơn 98% đối thủ cùng ngành).
  - **4. Thanh Công Cụ Lọc & Tìm Kiếm Kịch Bản:**
    - Bộ lọc Fanpage đích (`Tất cả`, `Bella Store`, `Sneaker VNXK`, `Phụ Kiện GenZ`).
    - Ô tìm kiếm kịch bản theo tên, từ khóa hoặc tag.
    - Bộ lọc trạng thái: `Đang bật (12)`, `Tạm dừng (2)`.
  - **5. Lưới Danh Sách Kịch Bản Phản Hồi (`RuleCard` Grid):**
    - **Kịch bản 1: "Tư vấn báo giá sản phẩm"**
      - Thẻ từ khóa (Tags): `#giá`, `#bao nhiêu`, `#inbox giá`, `#price`.
      - Cơ chế trả lời bình luận: Spintax xoay tua 3 mẫu câu tránh trùng lặp nội dung của Meta.
      - Hành động mở rộng: Tự động gửi tin nhắn riêng Messenger kèm nút bấm CTA xem bảng giá.
      - Công tắc Bật/Tắt (Toggle: ON).
    - **Kịch bản 2: "Tư vấn Size & Form đồ qua Gemini AI"**
      - Thẻ từ khóa (Tags): `#size`, `#form`, `#cân nặng`, `#chiều cao`.
      - Tích hợp: Trợ lý Gemini AI tự động tính toán số đo và đề xuất size phù hợp cho khách.
      - Công tắc Bật/Tắt (Toggle: ON).
    - **Kịch bản 3: "Chính sách Đổi trả & Ship COD"**
      - Thẻ từ khóa: `#đổi trả`, `#bảo hành`, `#ship cod`.
      - Nội dung: Cam kết 1 đổi 1 trong 30 ngày và freeship đơn từ 500k.
      - Công tắc Bật/Tắt (Toggle: ON).
    - **Kịch bản 4: "Chế độ trực đêm (Night Mode 23h - 7h)"**
      - Điều kiện kích hoạt: Bình luận hoặc tin nhắn phát sinh ngoài giờ làm việc.
      - Hành động: Phản hồi xin phép hỗ trợ vào 7h30 sáng hôm sau và giữ ưu đãi.
      - Công tắc Bật/Tắt (Toggle: ON).
  - **6. Nhật Ký Bảo Vệ Thực Thi Trực Tiếp (Live Audit Log):**
    - Khung bảng nhật ký hiển thị thời gian thực các sự kiện ẩn bình luận chứa số điện thoại.
    - Tuân thủ quy định bảo mật PII: Số điện thoại được che ký tự tự động (ví dụ: `098****123`).
    - Hiển thị đầy đủ Fanpage đích, độ trễ phản hồi (mili-giây), và mã Webhook ID.

---

### IV. ĐẶC TẢ CHI TIẾT CÁC MÀN HÌNH NHÓM P1 (NÂNG CAO TRẢI NGHIỆM)

#### 7. Bảng Điều Khiển Tổng Quan (`/` - Dashboard Overview)
- **Tuyến đường:** `src/app/(dashboard)/page.tsx`
- **Tệp Mockup Thiết Kế (Stitch MCP):** [03_DASHBOARD_OVERVIEW.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/03_DASHBOARD_OVERVIEW.html) *(Screen ID: `72d76d2945ce44e48cdedc7c19339a10`)*
- **Mục tiêu:** Cung cấp cái nhìn toàn cảnh về tình hình kinh doanh trong ngày ngay khi chủ shop mở máy tính.
- **Thành phần giao diện chính:**
  - Header & Topbar phong cách macOS Clean Utility: Traffic lights (đỏ, vàng, xanh), Page Switcher dropdown (3 Fanpages kết nối), Ô tìm kiếm Spotlight (`⌘K`), Trạng thái Webhook Ingestion (`3/3 Pages Online`).
  - Left Sidebar điều hướng: Mục "Tổng quan" active, Live Chat (badge 12 tin chưa đọc), Lịch bài viết (5 bài), Automation, Connected Pages, và Widget cảnh báo Rate Limit Meta Graph API v19.0 (mức an toàn 24%).
  - Lời chào cá nhân hóa: "Chào buổi sáng, Nguyễn Minh Tuấn! 👋" kèm nút CTA "+ Soạn Bài Viết Mới".
  - Hàng 4 thẻ KPIs tổng quan:
    1. Tổng số cuộc hội thoại mới hôm nay: `142` (+18.4% so với hôm qua).
    2. Số bình luận chứa SĐT đã được ẩn tự động: `38` (tốc độ ẩn trung bình `1.8s`, bảo vệ chống cướp đơn 100%).
    3. Số bài viết đã lên lịch sẵn sàng xuất bản trong ngày: `5 bài` (trải đều các khung giờ vàng).
    4. Tỷ lệ phản hồi trong Cửa sổ 24h Meta: `98.6%` (tuân thủ chính sách Messenger).
  - Biểu đồ SVG mật độ tương tác khung giờ vàng (08:00 - 22:00, 2 đỉnh lưu lượng: 11:30 - 13:00 và 20:00 - 21:30) kèm chỉ số so sánh tuần trước.
  - Widget cảnh báo Cửa sổ 24h Meta (24-Hour Messaging Window): Đếm ngược thời gian phản hồi cho 3 khách hàng sắp hết hạn (32 phút, 1 giờ 15 phút, 2 giờ 40 phút).
  - Khối Hot Leads cần chốt đơn gấp (bảo vệ PII với SĐT che `0988***123`, `0912***456`) & Danh sách bài viết chờ xuất bản hôm nay.

---

#### 8. Lịch Biểu Đăng Bài Trực Quan (`/posts` - Calendar View)
- **Tuyến đường:** `src/app/(dashboard)/posts/page.tsx` *(Chế độ hiển thị dạng Lịch - Tab Calendar)*
- **Tệp Mockup Thiết Kế (Stitch MCP):** [09_POSTS_CALENDAR_VIEW.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/09_POSTS_CALENDAR_VIEW.html) *(Screen ID: `8fa5297610c24b6f8d3c3ced212411d8`)*
- **Mục tiêu:** Trực quan hóa mật độ phủ sóng nội dung trên đa Fanpage theo tháng/tuần/ngày, tối ưu hóa các khung giờ vàng tương tác cao và hỗ trợ kéo thả điều chỉnh lịch xuất bản linh hoạt.
- **Thành phần giao diện chi tiết:**
  - **1. Header & Điều Khiển Lịch (Calendar Controls Toolbar):**
    - Bộ chọn tháng: `Tháng 10, 2026` với các nút mũi tên chuyển tiếp và nút chuyển nhanh về `Hôm nay`.
    - Bộ chuyển đổi chế độ xem (View Switcher Segmented Control): Tabs chuyển đổi mượt mà giữa `[Danh sách (Table)]` và `[Lịch biểu (Calendar)]` (đang chọn Lịch biểu).
    - Bộ lọc phạm vi thời gian: `Tháng` (Active), `Tuần`, `Ngày`.
    - Dropdown lọc Fanpage: `Tiệm Mỹ Phẩm Sài Gòn`, `Review Skincare VN`, hoặc `Tất cả Fanpage (3)`.
    - Nút CTA chính dạng Pill: **`+ Soạn bài mới`** (`bg-blue-600 hover:bg-blue-700`).
  - **2. Lưới Lịch 7 Cột Tương Tác (Interactive Monthly Calendar Grid):**
    - Phân chia 7 cột chuẩn mực từ Thứ Hai đến Chủ Nhật với viền hairline mỏng nhẹ `border-outline-variant/30`.
    - **Ô ngày tương tác (Day Cell):**
      - Hiển thị số ngày định dạng Space Mono.
      - Nút **`+`** xuất hiện nhanh khi rê chuột (hover) để mở trình soạn thảo bài viết mới với ngày đã chọn sẵn.
      - Đánh dấu nổi bật ngày hiện tại: Viền xanh dương 2px, nền dịu, nhãn **"Hôm nay"**.
    - **Thẻ Bài Viết Đặt Lịch (Post Chips):**
      - Hiển thị mốc giờ xuất bản định dạng Space Mono (ví dụ: `11:30 SA`, `20:00 CH`).
      - Huy hiệu ngọn lửa màu hổ phách dành riêng cho **Khung Giờ Vàng** (`🔥`).
      - Phân loại màu sắc trạng thái rõ ràng:
        - `SCHEDULED`: Nền xanh dương dịu, nhãn "Đã lên lịch" kèm đếm ngược thời gian.
        - `PUBLISHED`: Nền xanh ngọc bích, nhãn "Đã đăng" kèm biểu tượng checkmark.
        - `FAILED`: Nền đỏ cảnh báo, nhãn "Lỗi API" (Token hết hạn / Media timeout).
      - Hỗ trợ thao tác Kéo - Thả (Drag & Drop) trực quan để dời ngày đăng sang ô khác.
  - **3. Ngăn Kéo Thanh Tra Bên Phải (Inspector Slide-over Drawer):**
    - Tự động mở khi nhấp chọn một thẻ bài viết bất kỳ trong lưới lịch:
    - **Banner trạng thái:** Hiển thị trạng thái đồng bộ Meta Graph API v19 (`Đã lên lịch tự động - 06/10/2026`).
    - **Thông số xuất bản:** Giờ đăng dự kiến `20:00 CH`, Fanpage đích `Tiệm Mỹ Phẩm Sài Gòn`, Dự báo reach tiềm năng `24,500 khách hàng`.
    - **Xem trước nội dung (Content Preview):** Hiển thị đầy đủ caption bài viết, biểu tượng emoji và các thẻ hashtag thương hiệu.
    - **Thư viện ảnh sản phẩm (Media Gallery):** Lưới ảnh sản phẩm chất lượng cao với nút phóng to xem chi tiết (`visibility`) và nút thêm ảnh nhanh.
    - **Cụm nút hành động nhanh:** Nút *Đổi giờ đăng*, Nút *Đăng ngay lập tức*, và Nút *Chỉnh sửa nội dung*.

---

#### 9. Hộp Thoại Bảng Lệnh Đa Năng (`Command Palette` - `⌘K`)
- **Phạm vi:** Toàn bộ ứng dụng (Kích hoạt tức thì bằng tổ hợp phím `⌘K` trên macOS hoặc `Ctrl+K` trên Windows, hoạt động toàn cục).
- **Tệp Mockup Thiết Kế (Stitch MCP):** [12_COMMAND_PALETTE.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/12_COMMAND_PALETTE.html) *(Screen ID: `14fcd8b52fac4eb7999c310e010eaed7`)*
- **Mục tiêu:** Cung cấp trải nghiệm điều hướng và thực thi tác vụ siêu tốc không cần dùng chuột (Keyboard-First UX) lấy cảm hứng từ Linear và Raycast. Cho phép chủ shop và nhân viên trực fanpage nhảy nhanh đến bất kỳ cuộc hội thoại, bài viết, khách hàng hoặc kích hoạt các kịch bản tự động hóa trong vòng chưa tới 1 giây.
- **Thành phần giao diện chi tiết:**
  - **1. Khung Spotlight macOS & Thanh Tìm Kiếm Trực Quan (Search Bar):**
    - Hộp thoại nổi chính giữa màn hình bo góc `rounded-2xl`, hiệu ứng kính mờ Backdrop Blur cao cấp (`bg-inverse-surface/40 backdrop-blur-md`).
    - Nút Traffic Lights 3 màu chuẩn phong cách macOS (`#FF5F56`, `#FFBD2E`, `#27C93F`).
    - Ô tìm kiếm cỡ lớn không viền với biểu tượng kính lúp màu tím `search` và văn bản placeholder: *"Gõ lệnh hoặc tìm kiếm khách hàng, bài viết, fanpage..."*.
    - Phím tắt gợi ý trực quan dạng Kbd Badge: `ESC để đóng`.
  - **2. Nhóm Lệnh Thực Thi Nhanh (Quick Actions - 4 Lệnh Cốt Lõi):**
    - **Soạn bài viết mới:** Biểu tượng `edit_square` (Màu xanh dương) - Phím tắt `⌘N` (Mở ngay trình soạn thảo bài đăng).
    - **Bật khiên ẩn SĐT tự động (Shield Active):** Biểu tượng `shield` (Màu xanh ngọc bích) - Phím tắt `⌘S` (Kích hoạt bộ lọc regex quét ẩn số điện thoại trong 0.28s).
    - **Kết nối Fanpage mới (Meta OAuth v19):** Biểu tượng `add_link` (Màu tím) - Phím tắt `⌘P` (Bật hộp thoại cấp quyền Fanpage Facebook).
    - **Đồng bộ dữ liệu thời gian thực:** Biểu tượng `sync` (Màu xám) - Phím tắt `⌘R` (Kéo mới tin nhắn, bình luận và trạng thái webhook).
  - **3. Nhóm Khách Hàng & Leads Gần Đây (Recent Customers & Inquiries):**
    - **Nguyễn Thị Mai:** Đang hỏi về *"Serum Vitamin C 20ml"* (Fanpage Tiệm Mỹ Phẩm Sài Gòn) - Huy hiệu `Khách VIP` màu xanh ngọc bích - Nhảy thẳng vào Live Chat.
    - **Trần Hoài Nam:** Đang hỏi về *"Sneaker Jordan Retro Size 42"* (Fanpage Sneaker VNXK) - Huy hiệu `Đơn mới` màu xanh dương - Mở giao diện chốt đơn.
    - **Lê Hoàng Yến:** Đang thắc mắc về *"Phí vận chuyển Hỏa Tốc Hà Nội"* - Huy hiệu `Chờ trả lời` màu hổ phách - Mở luồng tư vấn Messenger.
  - **4. Nhóm Điều Hướng Trang Thường Dùng (Navigation Shortcuts):**
    - **Hộp thư tập trung (Live Chat):** Đường dẫn nhanh `/inbox` kèm số badge tin nhắn chưa đọc `(12 tin mới)`.
    - **Quản lý lịch đăng bài:** Đường dẫn nhanh `/posts` (Xem danh sách bài hẹn giờ hoặc chế độ xem lịch).
    - **Cấu hình kịch bản tự động:** Đường dẫn nhanh `/automation` (Quản lý bot AI và từ khóa nhạy cảm).
  - **5. Thanh Chỉ Dẫn Bàn Phím Dưới Chân Hộp Thoại (Keyboard Navigation Footer):**
    - Chỉ báo tương tác phím: `↑↓ Điều hướng` | `↵ Chọn lệnh` | `ESC Đóng bảng lệnh`.
    - Huy hiệu nhận diện hệ thống: `ShopFlow Spotlight v1.0 • Lightning Fast`.

---

#### 10. Hộp Thoại Xem Trước Bài Đăng Facebook (`PostPreviewModal`)
- **Phạm vi:** Popup / Modal nổi (Overlay Modal) trên nền mờ của màn hình `/posts/new` hoặc `/posts`.
- **Tệp Mockup Thiết Kế (Stitch MCP):** [10_POST_PREVIEW_MODAL.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/10_POST_PREVIEW_MODAL.html) *(Screen ID: `ef48b42b67444133a86e42b0a99236fc`)*
- **Mục tiêu:** Giúp chủ shop và nhà tiếp thị kiểm định chất lượng hiển thị thực tế của bài đăng trên thuật toán Facebook, phát hiện lỗi cắt cúp hình ảnh/video, kiểm tra mật độ chữ và kiểm soát tương tác trước khi chính thức bấm lên lịch qua Meta Graph API v19.
- **Thành phần giao diện chi tiết:**
  - **1. Khung Modal macOS & Bộ Chuyển Đổi Thiết Bị (Device Switcher):**
    - Cửa sổ nổi trung tâm bo góc mềm `rounded-2xl`, bóng đổ `macos-window-shadow`, viền hairline mỏng nhẹ.
    - Thanh tiêu đề tích hợp 3 nút Traffic Lights macOS (`Đỏ`, `Vàng`, `Xanh`) và nút đóng `X`.
    - **Bộ chuyển đổi kích thước hiển thị (Viewport Switcher):**
      - `Desktop News Feed (680px)`: Mô phỏng trình duyệt máy tính.
      - `Mobile App Feed (414px)` (Active): Mô phỏng ứng dụng Facebook trên iPhone/Android.
      - `Dark Mode`: Kiểm tra độ tương phản hình ảnh trong chế độ nền tối của Facebook.
  - **2. Khung Mô Phỏng Facebook Feed Chuẩn Meta 100% (Left Column - 7 Cols):**
    - **Header bài viết:** Avatar Fanpage `Tiệm Mỹ Phẩm Sài Gòn`, Tích xanh xác minh (`Verified Badge`), Trạng thái xuất bản `20:00 Hôm nay • 🌐 Công khai`, nút tùy chọn 3 chấm (`...`).
    - **Nội dung Caption:** Hiển thị văn bản định dạng chuẩn, biểu tượng emoji phong phú, các hashtag thương hiệu (`#ShopFlowVN #FlashSale #Skincare`), và nút bấm thu gọn/mở rộng "Xem thêm".
    - **Bố cục Lưới Đa Ảnh Facebook (4-Photo Layout):** Hiển thị 4 ảnh sản phẩm với nhãn đánh dấu **"HD"** xác nhận chất lượng cao, không bị thuật toán Facebook nén vỡ hình.
    - **Thẻ Hành Động Đính Kèm Messenger (Call-to-Action Card):** Biểu tượng Messenger, tiêu đề "Nhận tư vấn trực tiếp qua Messenger - Phản hồi tự động trong giây lát", và nút bấm nổi bật **`Gửi tin nhắn`**.
    - **Thanh Tương Tác & Cảm Xúc Thật:** Hàng icon cảm xúc (❤️, 👍, 😆) hiển thị `1,420 lượt thích`, `186 bình luận`, `42 lượt chia sẻ`, cùng 3 nút tương tác: *Thích*, *Bình luận*, *Chia sẻ*.
  - **3. Bảng Kiểm Tra & Chẩn Đoán Trước Xuất Bản (Right Inspector - 5 Cols):**
    - **Dự báo tiếp cận thuật toán (Algorithm Reach Forecast):** Ước tính `18,500 - 32,000 tài khoản` (Đánh giá mức: Tối ưu cao nhờ đăng đúng khung giờ vàng 20:00).
    - **Điểm chất lượng hình ảnh Meta HD:** Thanh đo đạt điểm tuyệt đối `100/100` (Hình ảnh đạt chuẩn 1080p).
    - **Kiểm tra tỷ lệ chữ trên ảnh (Text-on-image Compliance):** Đạt chuẩn chính sách Meta (Mật độ chữ phát hiện `12%` < ngưỡng tối đa 20%).
    - **Lá chắn ShopFlow Shield:** Xác nhận trạng thái `Active (< 0.28s)` – Hệ thống sẵn sàng tự động ẩn số điện thoại trong bình luận ngay khi bài viết lên sóng.
  - **4. Thanh Thao Tác Chân Modal (Modal Footer):**
    - Chỉ báo thời gian hẹn xuất bản: `Lịch hẹn tự động phát hành: 20:00 - Hôm nay`.
    - Nút phụ: "Chỉnh sửa lại" (`rounded-full bg-surface-container`).
    - Nút CTA chính: **`+ Xác Nhận & Lên Lịch Đăng Bài`** (`rounded-full bg-blue-600 hover:bg-blue-700 text-white`).

---

#### 11. Hộp Thoại Chọn Fanpage Sau OAuth (`ConnectPageModal`)
- **Phạm vi:** Popup / Modal nổi (Overlay Modal) xuất hiện ngay sau khi Meta OAuth 2.0 chuyển hướng (redirect) thành công về màn hình `/(dashboard)/pages`.
- **Tệp Mockup Thiết Kế (Stitch MCP):** [11_CONNECT_PAGE_MODAL.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/11_CONNECT_PAGE_MODAL.html) *(Screen ID: `66729da56c904b78a6a42b4f035d1c4d`)*
- **Mục tiêu:** Liệt kê toàn bộ danh sách các Fanpage mà tài khoản Facebook của chủ shop đang quản trị, cho phép lựa chọn linh hoạt từng trang để import token, đồng bộ webhook và kích hoạt hệ thống tự động hóa mà không bắt buộc phải nạp toàn bộ các trang không kinh doanh.
- **Thành phần giao diện chi tiết:**
  - **1. Header Modal macOS & Chứng Nhận Meta v19:**
    - Cửa sổ nổi bo góc `rounded-2xl` trên nền mờ Backdrop blur (`bg-inverse-surface/30 backdrop-blur-sm`).
    - Nút Traffic Lights 3 màu chuẩn macOS (`#FF5F56`, `#FFBD2E`, `#27C93F`).
    - Tiêu đề: **"Kết Nối Fanpage Facebook - Meta OAuth v19"** kèm huy hiệu `Verified Meta Business Integration` tích xanh.
    - Nút đóng `X` bo tròn tiện dụng.
  - **2. Khung Thông Tin Tài Khoản Facebook & Quyền Hạn (Sub-header):**
    - Avatar chân dung và tên tài khoản Facebook: **Nguyễn Minh Tuấn**.
    - Danh sách các Scope quyền hạn Meta đã cấp phát thành công (hiển thị Space Mono):
      - `pages_messaging`: Nhận và phản hồi tin nhắn Messenger tự động.
      - `pages_manage_posts`: Đặt lịch và đăng tải bài viết Facebook.
      - `pages_read_engagement`: Đọc bình luận và số điện thoại khách hàng.
  - **3. Thanh Tìm Kiếm Nhanh Fanpage (Search & Filter Bar):**
    - Ô tìm kiếm tức thì theo tên Fanpage giúp chủ shop sở hữu nhiều trang dễ dàng lọc nhanh.
  - **4. Danh Sách Fanpage Phát Hiện Từ Meta API (Interactive Page Cards):**
    - **Trang 1: Tiệm Mỹ Phẩm Sài Gòn** (68,400 followers, Beauty): Checkbox đã chọn, viền xanh dương, huy hiệu `Live webhook ready` xanh ngọc bích có đèn tín hiệu pulse.
    - **Trang 2: Sneaker VNXK Chính Hãng** (124,000 followers, Fashion): Checkbox đã chọn, huy hiệu `Selected`.
    - **Trang 3: Phụ Kiện GenZ Store** (35,200 followers, Gadgets): Đã kết nối từ trước, checkbox bị vô hiệu hóa mờ, nhãn `Already connected`.
    - **Trang 4: Review Quán Ăn Hà Nội** (12,000 followers, Food): Checkbox chưa chọn, nhãn `Available` (sẵn sàng kết nối khi cần).
  - **5. Dải Tùy Chọn Cấu Hình Tự Động (Automation Settings Strip):**
    - Checkbox: **Auto-subscribe Webhooks** (Tự động đăng ký các trường sự kiện `messages`, `feed`, `messaging_postbacks`).
    - Checkbox: **Auto-import Lead contacts** (Tự động quét danh bạ khách hàng cũ vào CRM).
    - Nhãn chỉ báo: `Meta API v19.0 Token Verified`.
  - **6. Thanh Thao Tác Chân Modal (Modal Footer):**
    - Bộ đếm số lượng: **`Đã chọn 2 / 4 Fanpage`**.
    - Nút phụ: "Hủy bỏ" (`rounded-full bg-surface-container-highest`).
    - Nút CTA chính: **`+ Đồng Bộ & Kích Hoạt Fanpage`** (`rounded-full bg-blue-600 hover:bg-blue-700 text-white` kèm icon sấm sét `bolt`).

---

### V. ĐẶC TẢ CHI TIẾT CÁC MÀN HÌNH NHÓM P2 (ROADMAP MỞ RỘNG)

#### 12. Màn Hình Quản Lý Khách Hàng & Leads CRM (`/(dashboard)/customers`)
- **Tuyến đường:** `src/app/(dashboard)/customers/page.tsx`
- **Tệp Mockup Thiết Kế (Stitch MCP):** [13_CUSTOMERS_CRM.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/13_CUSTOMERS_CRM.html) *(Screen ID: `7048300ff85a48b69d6da44716756062`)*
- **Mục tiêu:** Hệ thống CRM thu nhỏ chuyên biệt cho Social Commerce, tự động thu thập và lưu trữ danh bạ khách hàng từ bình luận và tin nhắn Fanpage Facebook qua Webhooks thời gian thực. Hỗ trợ phân khúc thông minh (Khách VIP, Leads mới, Chờ chốt đơn, Nguy cơ bom hàng), bảo vệ dữ liệu nhạy cảm PII và tối ưu tỷ lệ chốt đơn đa kênh.
- **Thành phần giao diện chi tiết:**
  - **1. Header & Thanh Điều Khiển Tác Vụ (Action Bar):**
    - Cửa sổ macOS tích hợp đèn giao thông 3 màu (`#FF5F56`, `#FFBD2E`, `#27C93F`), Breadcrumbs: `ShopFlow > CRM > Khách hàng & Leads`.
    - Tiêu đề màn hình: **"Quản lý Khách hàng & Leads"** kèm phụ đề giải thích luồng webhook tự động.
    - Dải tab phân khúc nhanh (Quick Segment Tabs): *Tất cả (14,850)*, *Khách VIP (820)*, *Leads mới để lại SĐT (2,340)*, *Chờ chốt đơn (415)*, *Nguy cơ bom (28)*.
    - Bộ công cụ hành động: Nút *Bộ lọc nâng cao*, Nút *Xuất Excel / CSV*, và Nút CTA chính **`+ Thêm Khách Hàng`** (dạng Pill màu xanh dương).
  - **2. Bốn Thẻ Thống Kê Chỉ Số Cốt Lõi (CRM Metric Cards):**
    - **Tổng Khách Hàng CRM:** `14,850` (+12.4% so với tháng trước) — Icon người dùng xanh dương.
    - **Leads Mới Có SĐT:** `2,340` (Tỷ lệ chuyển đổi: `34.8%`) — Icon điện thoại xanh ngọc bích.
    - **Doanh Thu Khách VIP:** `1.42 Tỷ VNĐ` (Đóng góp `48.2%` tổng GMV cửa hàng) — Icon vương miện VIP.
    - **Bảo Vệ SĐT (ShopFlow Shield):** `100% Hoạt Động` (Đã tự động che và mã hóa `4,120` SĐT công khai chống cướp đơn) — Icon khiên bảo mật xanh lá.
  - **3. Bảng Danh Sách Khách Hàng Chuẩn Linear (Customer Data Table - 65% Chiều Rộng):**
    - Thanh tìm kiếm tức thời theo tên, số điện thoại, UID Facebook, bộ lọc Fanpage và bộ lọc thẻ Tags.
    - Các cột dữ liệu: *Checkbox đa chọn*, *Khách hàng (Avatar + Tên FB + Link Profile)*, *Số điện thoại (Định dạng che mờ bảo mật `0983 ••• 892` kèm nút mắt bật/tắt hiển thị)*, *Kênh nguồn Fanpage*, *Thẻ phân loại (Tags)*, *Tổng chi tiêu LTV*, *Số đơn hàng*, *Lần tương tác cuối*, *Thao tác nhanh (Chat / Call)*.
    - Các mẫu dữ liệu thực tế:
      - **Nguyễn Thị Mai** (Row Active/Selected): Tag `Khách VIP` xanh ngọc bích, SĐT `0983 ••• 892`, LTV `4,850,000 đ` (6 đơn), tương tác 10 phút trước.
      - **Trần Hoài Nam:** Tag `Đơn mới` xanh dương, SĐT `0912 ••• 445`, LTV `1,950,000 đ` (1 đơn), tương tác 25 phút trước.
      - **Lê Hoàng Yến:** Tag `Chờ tư vấn` màu hổ phách, SĐT `0977 ••• 112`, LTV `0 đ` (0 đơn), tương tác 1 giờ trước.
      - **Vũ Minh Khôi:** Tag `Nguy cơ bom hàng` màu đỏ cảnh báo, SĐT `0905 ••• 678`, LTV `350,000 đ` (1 đơn hoàn), tương tác 3 giờ trước.
      - **Phạm Thu Trang:** Tag `Thân thiết` màu tím, SĐT `0944 ••• 998`, LTV `2,400,000 đ` (3 đơn), tương tác 1 ngày trước.
    - Phân trang chuẩn: `Hiển thị 1 - 5 trong 14,850 khách hàng`, cụm nút chuyển trang `[1] [2] [3] ... [148]`.
  - **4. Ngăn Kéo Thanh Tra Hồ Sơ Khách Hàng (Customer Profile Inspector - 35% Chiều Rộng):**
    - **Header hồ sơ:** Avatar lớn, Họ tên **Nguyễn Thị Mai**, Huy hiệu VIP màu xanh ngọc bích, Ngày gia nhập: `15/04/2026`.
    - **Thông tin liên lạc & Địa chỉ:**
      - Số điện thoại: `0983 456 892` (Đã xác minh OTP/Zalo).
      - Địa chỉ nhận hàng: `128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh`.
      - Kênh tương tác: Fanpage `Tiệm Mỹ Phẩm Sài Gòn` (PSID: `8829104812`).
    - **Dòng thời gian hoạt động (Activity Timeline):**
      - `10 phút trước`: Nhắn tin Messenger hỏi giá sản phẩm *Serum B5*.
      - `2 ngày trước`: Đã nhận đơn hàng `#ORD-8821` thành công (`850,000 đ`).
      - `1 tuần trước`: Bình luận bài đăng Facebook *"Flash Sale Cuối Tuần"*.
    - **Ghi chú nội bộ dành cho nhân viên (Staff Notes):** *"Khách chuộng sản phẩm dưỡng ẩm da dầu, thường phản hồi nhanh sau 19h tối."*
    - **Cụm nút hành động nhanh:**
      - Nút CTA chính: **`Mở Hộp Thư Chat (/inbox)`** (Nền xanh dương, chữ trắng).
      - Nút phụ: **`+ Tạo Đơn Hàng Nhanh`** (Nút viền bo góc).

#### 13. Màn Hình Cài Đặt Hệ Thống & Hồ Sơ (`/(dashboard)/settings`)
- **Tuyến đường:** `src/app/(dashboard)/settings/page.tsx`
- **Tệp Mockup Thiết Kế (Stitch MCP):** [14_SETTINGS_PROFILE.html](file:///c:/Users/Dell/Desktop/ShopFlow/docs/mockups/14_SETTINGS_PROFILE.html) *(Screen ID: `d6f15ea486bc46bda88fd133faf94e09`)*
- **Mục tiêu:** Cung cấp trung tâm quản trị toàn diện cho chủ cửa hàng và quản trị viên: quản lý hồ sơ tài khoản cá nhân, thông tin thương hiệu cửa hàng, phân quyền vai trò nhân viên (RBAC), kích hoạt bảo mật xác thực 2 bước (2FA), và bảng giám sát chuyên sâu hạn ngạch Meta Graph API nhằm ngăn ngừa lỗi Error 613 (Calls to this API have exceeded the rate limit).
- **Thành phần giao diện chi tiết:**
  - **1. Header Cửa Sổ macOS & Thanh Tabs Phân Hệ Cài Đặt (Segmented Tabs):**
    - Đèn giao thông 3 màu macOS (`#FF5F56`, `#FFBD2E`, `#27C93F`), Breadcrumbs: `ShopFlow > Cài Đặt Hệ Thống > Hồ sơ & Giám sát API`.
    - Dải Tab chuyển đổi phân hệ phong cách Linear:
      - `Hồ sơ & Tài khoản` *(Đang chọn / Active)* kèm huy hiệu `Verified`.
      - `Thành viên & Phân quyền` *(3 nhân sự)*.
      - `Giám sát Meta Graph API & Webhooks` *(Chấm xanh live)*.
      - `Bảo mật 2FA & Phiên đăng nhập`.
  - **2. Cột Trái: Hồ Sơ Tài Khoản & Phân Quyền Nhân Viên (Left Column - 58% Chiều Rộng):**
    - **Card 1 - Hồ Sơ Cá Nhân Chủ Shop:**
      - Avatar chủ shop tích hợp nút đổi ảnh, Họ tên **Nguyễn Minh Tuấn**, huy hiệu vai trò `Owner (Chủ sở hữu)` màu tím.
      - Lưới form 2 cột tinh tế: Email `tuan.nguyen@shopflow.vn` (Tích xanh Đã xác thực), Số điện thoại `0983 456 892` (OTP Verified), Tên thương hiệu `Shop Mỹ Phẩm Sài Gòn & Sneaker Store`, Múi giờ hệ thống `(GMT+07:00) Bangkok, Hanoi, Jakarta`.
      - Cụm nút: Nút CTA chính **`Lưu thay đổi`** (Pill màu xanh dương) và nút phụ `Hủy bỏ`.
    - **Card 2 - Đội Ngũ Nhân Viên & Phân Quyền (RBAC):**
      - Bảng phân quyền 3 nhân sự:
        - **Nguyễn Minh Tuấn:** Email `tuan.nguyen@shopflow.vn` — Vai trò `Owner (Toàn quyền)` (Huy hiệu tím) — Trạng thái `Hoạt động`.
        - **Lê Thảo My:** Email `my.le@shopflow.vn` — Vai trò `Biên tập viên (Posts Manager)` (Huy hiệu xanh dương) — Trạng thái `Đang trực`.
        - **Trần Quốc Bảo:** Email `bao.tran@shopflow.vn` — Vai trò `Nhân viên CSKH (Chat & Orders)` (Huy hiệu xanh lá) — Trạng thái `Vừa hoạt động`.
      - Nút hành động: **`+ Mời thành viên mới`** (Nút viền bo tròn).
  - **3. Cột Phải: Giám Sát Kỹ Thuật Meta Graph API & Bảo Mật (Right Column - 42% Chiều Rộng):**
    - **Card 3 - Giám Sát Hạn Ngạch Meta Graph API (Chống Lỗi Error 613):**
      - Thanh đo hạn ngạch tức thời: **`38% / 100%`** (`1,824 / 4,800 requests/giờ`) — Trạng thái: `An toàn (Safe Pace)`.
      - Tốc độ gọi API thời gian thực: `28 calls/phút` (Ngưỡng an toàn tối đa: 80 calls/phút).
      - Phiên bản Meta Graph API: `v19.0` (Token dài hạn hợp lệ: `58 ngày còn lại`).
      - Cơ chế điều tiết hàng đợi BullMQ: `Delay an toàn 5.0s giữa các hành động gửi tin` (Ngăn chặn thuật toán Meta chặn Fanpage do spam).
    - **Card 4 - Hệ Thống Webhook & Bộ Đệm Cache Redis:**
      - Endpoint Webhook công khai: `https://api.shopflow.vn/api/v1/webhook` (Kèm nút sao chép nhanh).
      - Xác thực chữ ký số HMAC-SHA256: `Active (x-hub-signature-256)` sử dụng thuật toán timing-safe.
      - Khóa chống trùng lặp sự kiện (Redis Idempotency Key): `TTL 24 Giờ`.
      - Độ trễ xử lý sự kiện trung bình: `42ms` (Siêu tốc).
    - **Card 5 - Bảo Mật 2FA & Quản Lý Phiên Thiết Bị:**
      - Xác thực 2 bước (2FA Google Authenticator): `Đã kích hoạt (Active)`.
      - Thiết bị chính hiện tại: `MacBook Pro M3 Max - TP. Hồ Chí Minh` (Chấm xanh Active now).
      - Thiết bị phụ: `iPhone 15 Pro Max - Hà Nội` (Hoạt động 2 giờ trước).
      - Nút cảnh báo bảo mật: **`Đăng xuất khỏi tất cả thiết bị khác`** (Nút đỏ cảnh báo).
