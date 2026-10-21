# TÀI LIỆU QUY CHUẨN THIẾT KẾ GIAO DIỆN HỆ THỐNG SHOPFLOW (DESIGN SYSTEM SPECIFICATION)
## PHONG CÁCH: MODERN MACOS CLEAN UTILITY & LINEAR MINIMALIST

Tài liệu này định nghĩa toàn diện ngôn ngữ thiết kế thị giác, hệ thống Design Tokens, cấu hình Tailwind CSS, và quy chuẩn các thành phần giao diện (UI Components) cho nền tảng **ShopFlow** (Next.js 14+ App Router, Tailwind CSS, TypeScript).

---

### I. TRIẾT LÝ THIẾT KẾ CỐT LÕI (CORE DESIGN PHILOSOPHY)

Giao diện của ShopFlow được xây dựng dựa trên cảm hứng từ các ứng dụng macOS hiện đại và chuẩn mực công thái học tối giản (như Linear, Raycast, Windsurf, Apple Human Interface Guidelines):

1. **Productivity-First (Tối ưu Hiệu suất):** Giao diện tập trung tối đa vào nội dung công việc (quản lý tin nhắn, bài viết, đơn hàng), giảm thiểu các chi tiết thừa thãi gây phân tâm.
2. **Mac-Native Aesthetic (Cảm giác Ứng dụng Bản địa):** Cấu trúc cửa sổ với cụm điều khiển Traffic Lights kinh điển (Đỏ, Vàng, Xanh lá), thanh Header/Toolbar thanh thoát, các góc bo cong Squircle mềm mại.
3. **Subtle Depth & Layering (Chiều sâu & Phân lớp Tinh tế):** Sử dụng các đường viền hairline 1px siêu mỏng kết hợp cùng bóng đổ khuếch tán đa tầng (multi-layered soft diffusion shadows) thay vì viền thô đậm.
4. **Purposeful Color Accents (Màu sắc Có Chủ đích):** Nền tảng trung tính sáng (Canvas trắng/xám cực nhẹ) làm tôn lên điểm nhấn sắc nét: Xanh dương Hoàng gia (Electric/Sapphire Blue) cho các hành động quan trọng, và các mã màu trạng thái trực quan.

---

### II. BẢNG MÀU CHUẨN HÓA (COLOR PALETTE & TOKENS)

```
+-----------------------------------------------------------------------------------------------------------------+
| PHÂN LOẠI MÀU     | TOKEN NAME          | HEX CODE     | HSL                 | ỨNG DỤNG NGHIỆP VỤ SHOPFLOW       |
+===================+=====================+==============+=====================+===================================+
| Primary (Chính)   | color-primary-50    | #EFF6FF      | hsl(214, 100%, 97%) | Nền active item, badge xanh nhạt  |
|                   | color-primary-100   | #DBEAFE      | hsl(214, 95%, 93%)  | Hover background trên menu        |
|                   | color-primary-500   | #3B82F6      | hsl(217, 91%, 60%)  | Trạng thái focus ring, icon nhẹ   |
|                   | color-primary-600   | #2563EB      | hsl(221, 83%, 53%)  | BRAND PRIMARY: Nút CTA chính      |
|                   | color-primary-700   | #1D4ED8      | hsl(224, 76%, 48%)  | Trạng thái hover/active của CTA   |
+-------------------+---------------------+--------------+---------------------+-----------------------------------+
| Backgrounds (Nền) | color-bg-canvas     | #F8FAFC      | hsl(210, 40%, 98%)  | Nền tổng thể trang Dashboard      |
|                   | color-bg-surface    | #FFFFFF      | hsl(0, 0%, 100%)    | Nền Card, Modal, Command Palette  |
|                   | color-bg-subtle     | #F1F5F9      | hsl(210, 40%, 96%)  | Nền Sidebar, Toolbar, Header bảng |
|                   | color-bg-muted      | #E2E8F0      | hsl(214, 32%, 91%)  | Nền phím tắt Hotkey, input hover  |
+-------------------+---------------------+--------------+---------------------+-----------------------------------+
| Text & Typography | color-text-primary  | #0F172A      | hsl(222, 47%, 11%)  | Tiêu đề H1/H2, tên Fanpage, giá   |
|                   | color-text-secondary| #475569      | hsl(215, 25%, 35%)  | Nội dung bài viết, tin nhắn chat  |
|                   | color-text-muted    | #94A3B8      | hsl(215, 20%, 65%)  | Timestamps, placeholder, hints    |
|                   | color-text-inverse  | #FFFFFF      | hsl(0, 0%, 100%)    | Chữ trắng trên nền nút Primary    |
+-------------------+---------------------+--------------+---------------------+-----------------------------------+
| Borders & Dividers| color-border-subtle | #E2E8F0      | hsl(214, 32%, 91%)  | Viền chia cột, hairline dividers  |
|                   | color-border-strong | #CBD5E1      | hsl(214, 32%, 81%)  | Viền ô Input, Card preview border |
|                   | color-border-focus  | #2563EB      | hsl(221, 83%, 53%)  | Viền khi focus vào ô form/search  |
+-------------------+---------------------+--------------+---------------------+-----------------------------------+
| Status & Accents  | color-success       | #10B981      | hsl(158, 64%, 42%)  | Đã đăng bài, Đơn hàng thành công  |
|                   | color-success-bg    | #ECFDF5      | hsl(152, 76%, 96%)  | Nền badge thành công              |
|                   | color-warning       | #F59E0B      | hsl(38, 92%, 50%)   | Cảnh báo hết hạn cửa sổ 24h Meta  |
|                   | color-warning-bg    | #FFFBEB      | hsl(48, 100%, 96%)  | Nền badge cảnh báo                |
|                   | color-danger        | #EF4444      | hsl(0, 84%, 60%)    | Lỗi Webhook, Hủy đơn, Nút đóng đỏ |
|                   | color-danger-bg     | #FEF2F2      | hsl(0, 86%, 97%)    | Nền badge lỗi                     |
|                   | color-accent-cyan   | #06B6D4      | hsl(189, 94%, 43%)  | Điểm nhấn kỹ thuật, line graphs   |
+-------------------+---------------------+--------------+---------------------+-----------------------------------+
| macOS Controls    | color-mac-close     | #FF5F56      | -                   | Nút đỏ đóng cửa sổ macOS          |
|                   | color-mac-minimize  | #FFBD2E      | -                   | Nút vàng thu nhỏ cửa sổ macOS     |
|                   | color-mac-maximize  | #27C93F      | -                   | Nút xanh phóng to cửa sổ macOS    |
+-----------------------------------------------------------------------------------------------------------------+
```

---

### III. HỆ THỐNG TYPOGRAPHY (TYPOGRAPHIC HIERARCHY)

#### 1. Bộ Phông Chữ (Font Stacks)
- **Primary UI Font (Sans-serif):** `Inter`, `Geist Sans`, hoặc `Plus Jakarta Sans`
  - Fallback: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Code & Numbers Font (Monospace):** `JetBrains Mono`, `Geist Mono`, hoặc `Fira Code`
  - Dùng cho: Mã đơn hàng (`#DH-9921`), mã sản phẩm (`#SP001`), phím tắt (`⌘K`), ID Fanpage, thời gian đăng ISO.

#### 2. Thang Kích Thước & Thông Số Cụ Thể

| Cấp bậc | Size (px / rem) | Line-height | Weight | Letter-spacing | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero / Display** | 44px / 2.75rem | 1.15 (50px) | 700 (Bold) | `-0.025em` | Tiêu đề chính trang Landing / Giới thiệu |
| **Heading 1 (H1)** | 30px / 1.875rem | 1.25 (38px) | 700 (Bold) | `-0.02em` | Tiêu đề các phân hệ Dashboard (Live Chat, Bài viết) |
| **Heading 2 (H2)** | 22px / 1.375rem | 1.30 (28px) | 600 (Semibold) | `-0.015em` | Tiêu đề Card lớn, Modal header, Bảng lệnh |
| **Heading 3 (H3)** | 18px / 1.125rem | 1.40 (25px) | 600 (Semibold) | `-0.01em` | Nhóm chức năng, Tên khách hàng trong Inbox |
| **Body (Base)** | 14px / 0.875rem | 1.55 (22px) | 400 (Regular) | `0em` | Nội dung văn bản bình luận, tin nhắn tư vấn |
| **Body Medium** | 14px / 0.875rem | 1.55 (22px) | 500 (Medium) | `0em` | Nhãn form, Tiêu đề cột dữ liệu, Tabs điều hướng |
| **Caption / Small**| 12px / 0.75rem | 1.40 (17px) | 500 (Medium) | `+0.01em` | Timestamps, metadata trạng thái, ghi chú đơn |
| **Micro / Hotkey** | 11px / 0.6875rem | 1.20 (14px) | 600 (Semibold)| `+0.05em` | Nhãn phím tắt bàn phím (`⌘K`, `ESC`, `⇧P`) |

---

### IV. ĐỘ BO GÓC (BORDER-RADIUS & SQUIRCLE TOKENS)

Phong cách giao diện macOS hiện đại sử dụng độ cong chuẩn Squircle để mang lại cảm giác mượt mà tối đa:

```
+---------------+------------+---------------------------------------------------------------------------------+
| TOKEN         | GIÁ TRỊ    | PHẠM VI SỬ DỤNG TRÊN GIAO DIỆN SHOPFLOW                                         |
+===============+============+=================================================================================+
| radius-xs     | 4px        | Checkbox, thanh trượt scrollbar, badge siêu nhỏ                                 |
| radius-sm     | 6px        | Keyboard shortcut badges (⌘K), nhãn Tag phụ trợ                                 |
| radius-md     | 8px        | Dropdown menu items, action buttons trong table cell, tooltip                   |
| radius-lg     | 12px       | Ô tìm kiếm (Search bar), input fields, inner cards, banner thông báo            |
| radius-xl     | 16px       | Bảng lệnh Command Palette (Raycast-style), Modal popup xác nhận                 |
| radius-2xl    | 24px       | Khung cửa sổ macOS App Preview, Container Card chính, Widget tổng quan          |
| radius-full   | 9999px     | PILL BUTTONS: Nút "Tải xuống", "Tạo bài viết", "Quick Commit", Avatar khách hàng |
+---------------+------------+---------------------------------------------------------------------------------+
```

---

### V. ĐỔ BÓNG & CHIỀU SÂU (SHADOWS & ELEVATION TOKENS)

Sử dụng kỹ thuật đổ bóng phân tán mềm (Soft Diffusion) kết hợp với đường viền mờ 1px (`hairline ring`) để tạo cảm giác sang trọng:

```css
/* 1. Hairline Border Ring (Thay thế cho border thô) */
--shadow-hairline: 0 0 0 1px rgba(15, 23, 42, 0.08);

/* 2. Thẻ Card Phẳng (Subtle elevation) */
--shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.04), 
               0 1px 2px -1px rgba(0, 0, 0, 0.03), 
               0 0 0 1px rgba(15, 23, 42, 0.06);

/* 3. Popover, Dropdown Menu & Tooltip */
--shadow-popover: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 
                 0 8px 10px -6px rgba(15, 23, 42, 0.03), 
                 0 0 0 1px rgba(15, 23, 42, 0.08);

/* 4. Command Palette (Spotlight Modal) & Floating Dialog */
--shadow-command: 0 20px 40px -15px rgba(15, 23, 42, 0.12), 
                 0 0 0 1px rgba(15, 23, 42, 0.08);

/* 5. Cửa Sổ macOS Window Mockup (Tâm điểm giao diện) */
--shadow-mac-window: 0 25px 60px -15px rgba(15, 23, 42, 0.18), 
                     0 10px 20px -8px rgba(15, 23, 42, 0.08), 
                     0 0 0 1px rgba(15, 23, 42, 0.08);

/* 6. Primary Action Glow (Hiệu ứng phát sáng khi hover nút CTA) */
--shadow-glow-blue: 0 0 20px -3px rgba(37, 99, 235, 0.35);
```

---

### VI. KHOẢNG CÁCH & BỐ CỤC LƯỚI (SPACING & LAYOUT GRID)

#### 1. Hệ Số Thước Đo (8pt Grid with 4pt Micro-steps)
- `space-1`: 4px (Khoảng cách giữa icon và text nhỏ)
- `space-2`: 8px (Khoảng cách giữa các chip, badge)
- `space-3`: 12px (Padding trong của ô input, table cell compact)
- `space-4`: 16px (Padding chuẩn của Card, khoảng cách giữa các phần tử form)
- `space-5`: 20px (Padding lớn của modal body)
- `space-6`: 24px (Padding chuẩn của Container, Section header)
- `space-8`: 32px (Khoảng cách giữa các widget trên Dashboard)
- `space-12`: 48px (Khoảng cách giữa các khối chức năng lớn)
- `space-16`: 64px - 96px (Khoảng cách dọc giữa các section trang chủ)

#### 2. Kích Thước Bố Cục Chuẩn (Standard Layout Shell)
- **Top Header:** Chiều cao cố định `h-14` (56px), nền trong suốt phủ mờ `backdrop-blur-md bg-white/80 border-b border-slate-200/80`.
- **Sidebar Điều Hướng:** Chiều rộng chuẩn `w-64` (256px) hoặc `w-72` (288px), nền `bg-slate-50/50`.
- **Bố Cục 3 Cột (Live Chat Centralized Inbox):**
  - Cột 1 (Danh sách hội thoại): `w-80` (320px), cố định viền phải.
  - Cột 2 (Khung chat chính): `flex-1` co giãn linh hoạt.
  - Cột 3 (Thông tin khách hàng & Giỏ hàng trích xuất): `w-88` (352px), viền trái.

---

### VII. CẤU HÌNH TAILWIND CSS THỰC THI (TAILWIND.CONFIG.TS EXTENSION)

Đoạn mã sau được sẵn sàng để tích hợp trực tiếp vào tệp cấu hình `apps/web/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        subtle: '#F1F5F9',
        border: {
          subtle: '#E2E8F0',
          strong: '#CBD5E1',
          focus: '#2563EB',
        },
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB', // Brand Primary
          700: '#1D4ED8',
          foreground: '#FFFFFF',
        },
        mac: {
          close: '#FF5F56',
          minimize: '#FFBD2E',
          maximize: '#27C93F',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'monospace',
        ],
      },
      borderRadius: {
        '2xl': '1.25rem', // 20px
        '3xl': '1.5rem',  // 24px
      },
      boxShadow: {
        'hairline': '0 0 0 1px rgba(15, 23, 42, 0.08)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(15, 23, 42, 0.06)',
        'popover': '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.03), 0 0 0 1px rgba(15, 23, 42, 0.08)',
        'command': '0 20px 40px -15px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.08)',
        'mac-window': '0 25px 60px -15px rgba(15, 23, 42, 0.18), 0 10px 20px -8px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.08)',
        'glow-blue': '0 0 20px -3px rgba(37, 99, 235, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### VIII. QUY CHUẨN CÁC THÀNH PHẦN GIAO DIỆN ĐIỂN HÌNH (COMPONENT SPECIFICATIONS)

#### 1. Khung Cửa Sổ macOS Window Frame & Nút Traffic Lights
Mô phỏng chân thực cửa sổ ứng dụng trên máy Mac như trong ảnh tham khảo:

```tsx
export function MacWindowFrame({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="rounded-2xl bg-white shadow-mac-window overflow-hidden border border-slate-200/80">
      {/* macOS Topbar */}
      <div className="h-10 px-4 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between select-none">
        {/* Traffic Lights */}
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/50 inline-block shadow-sm" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50 inline-block shadow-sm" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/50 inline-block shadow-sm" />
        </div>
        
        {/* Window Title or Search Bar */}
        {title && (
          <div className="text-xs font-medium text-slate-500 tracking-tight">
            {title}
          </div>
        )}
        
        <div className="w-12" /> {/* Cân bằng khoảng trống bên phải */}
      </div>

      {/* Main Content Body */}
      <div className="p-6 bg-white">
        {children}
      </div>
    </div>
  );
}
```

#### 2. Nút Bấm & Action Pills (Pill-shaped CTA Buttons)
Nút bấm hành động có 2 dạng chính:

- **Primary Action Pill (Nút chính bo tròn hoàn toàn):**
  - Cú pháp CSS: `rounded-full bg-blue-600 text-white font-medium px-5 py-2.5 text-sm hover:bg-blue-700 active:bg-blue-800 shadow-sm hover:shadow-glow-blue transition-all duration-200 flex items-center gap-2`
  - Áp dụng: Nút "Tải xuống", "Lên lịch đăng", "Tạo bài viết AI", "Quick Commit".
- **Secondary Ghost / Outline Button:**
  - Cú pháp CSS: `rounded-full bg-white text-slate-700 font-medium px-5 py-2.5 text-sm border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150`
  - Áp dụng: Nút "Xem tài liệu", "Hủy bỏ", "Xuất Excel".

#### 3. Bảng Lệnh Đa Năng (Command Palette / Spotlight Modal)
Cụm điều khiển lệnh trung tâm (tương tự mục "Toàn bộ quy trình làm việc trong một bảng lệnh duy nhất" trong ảnh):

- Khung modal nổi giữa màn hình, chiều rộng `max-w-2xl`, bo góc `rounded-xl`, bóng `shadow-command`.
- Phía trên là ô input tìm kiếm lớn không viền thô (`border-none text-base placeholder:text-slate-400 focus:ring-0`).
- Mỗi hàng tác vụ có icon monoline bên trái, tiêu đề lệnh rõ ràng, và **Keyboard Badge** bên phải (`kbd` tag bo góc `rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-500`).

#### 4. Khung Ô Tìm Kiếm Kèm Phím Tắt (Search Bar with Hotkey)
- Cú pháp: `relative flex items-center w-full max-w-md bg-slate-100/80 border border-slate-200/80 rounded-lg px-3 py-1.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all`
- Kèm icon kính lúp màu `text-slate-400` và phím tắt `⌘K` ở góc phải.

#### 5. Thẻ Thống Kê & Bảng Dữ Liệu Đơn Hàng (Data Card & Tables)
- Bảng dữ liệu quản lý đơn hàng sử dụng kiểu sọc nhẹ (subtle zebra) hoặc viền hairline:
  - Header: `bg-slate-50/75 text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4 border-b border-slate-200`
  - Cell: `py-3.5 px-4 text-sm text-slate-700 border-b border-slate-100 font-normal`
  - Status Tag: Bo góc `rounded-full px-2.5 py-0.5 text-xs font-medium` kèm màu nền nhẹ (ví dụ `bg-emerald-50 text-emerald-700` cho đơn thành công, `bg-amber-50 text-amber-700` cho đơn chờ xử lý).

---

### IX. NGUYÊN TẮC KHẢ NĂNG TIẾP CẬN & HIỆU NĂNG (A11Y & PERFORMANCE)

1. **Độ Tương Phản Màu Sắc (WCAG 2.1 AA):**
   - Màu chữ chính `color-text-primary` (`#0F172A`) trên nền trắng đạt tỷ lệ tương phản **16.1:1** (vượt xa chuẩn 4.5:1).
   - Màu nút Primary `color-primary-600` (`#2563EB`) với chữ trắng đạt tỷ lệ **4.6:1** (đạt chuẩn AA cho text kích cỡ thông thường).
2. **Focus Visibility:**
   - Mọi phần tử tương tác (button, input, tab) phải có vòng viền focus rõ ràng: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`.
3. **Chuyển Động Vi Mô Tinh Tế (Micro-animations):**
   - Mọi hiệu ứng hover và active chỉ sử dụng thời lượng chuyển tiếp nhanh: `duration-150` hoặc `duration-200` với hàm làm mượt `ease-out`, tránh làm chậm trễ cảm giác thao tác của người dùng.
