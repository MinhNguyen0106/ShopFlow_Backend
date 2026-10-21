# Technical Design: Bảng Điều Khiển Tổng Quan & Báo Cáo KPIs (dashboard-overview-ui)

## Context

Sau khi hoàn thành các phân hệ cốt lõi của Sprint 1, 2 và các màn hình chính của Sprint 3 (`/pages`, `/inbox`, `/posts`, `/posts/new`, `/automation`), hệ thống cần một trang chủ điều hành thống nhất tại `/(dashboard)`. Hiện tại tệp `frontend/src/app/(dashboard)/page.tsx` chỉ chuyển hướng tạm bợ sang `/pages`.

Màn hình mới sẽ thiết kế theo chuẩn **macOS Clean Utility**, sử dụng lưới Bento Box đa tầng, biểu đồ lưu lượng khung giờ vàng trực quan, đồng hồ đếm ngược Cửa sổ 24h của Meta và các lối tắt hành động nhanh.

## Goals / Non-Goals

**Goals:**
- Tái cấu trúc `frontend/src/app/(dashboard)/page.tsx` thành màn hình Dashboard hoàn chỉnh.
- Xây dựng 4 thẻ Bento KPIs điều hành phản ánh tình trạng vận hành (Hội thoại, Ẩn SĐT, Bài viết chờ đăng, Tỷ lệ tuân thủ Meta 24h).
- Triển khai biểu đồ tương tác thời gian thực bằng SVG/Tailwind thuần hiển thị mật độ tin nhắn/bình luận theo giờ (08:00 - 22:00) và đánh dấu 2 đỉnh khung giờ vàng (11:30 - 13:00 và 20:00 - 21:30).
- Triển khai widget cảnh báo đếm ngược Cửa sổ 24h Meta cho khách hàng sắp hết hạn phản hồi.
- Triển khai widget Hot Leads cần chốt đơn gấp với tính năng che số điện thoại PII (`098****123`).
- Triển khai widget 4 lối tắt thao tác nhanh (Soạn bài mới, Live Chat, Quản lý Page, Cấu hình Bot).
- Đạt 100% test pass và 0 lỗi TypeScript strict mode.

**Non-Goals:**
- Không cài đặt thêm các thư viện vẽ biểu đồ nặng nề (như Recharts hay Chart.js) gây phình to bundle size. Biểu đồ sẽ được dựng bằng SVG thuần và CSS Tailwind tối ưu hóa.

## Decisions

### 1. Dựng Biểu Đồ Bằng SVG & CSS Grid Thuần
- **Quyết định**: Xây dựng component `TrafficChart` bằng SVG path/rect kết hợp Tailwind CSS thay vì cài thư viện bên thứ ba.
- **Lý do**: Giúp Next.js production build siêu nhẹ (< 15 kB), không gặp lỗi hydration SSR, dễ dàng tùy biến tooltip và tương thích hoàn hảo cả 2 chế độ Dark/Light mode.

### 2. Tích Hợp Đa Nguồn Từ Các Store Hiện Có
- **Quyết định**: Trang Dashboard đọc dữ liệu tổng hợp từ `usePageStore`, `usePostStore`, `useInboxStore`, `useAutomationStore` kết hợp với telemetry data phòng vệ.
- **Lý do**: Đồng bộ trạng thái tức thời khi người dùng chuyển trang hoặc có cập nhật realtime mà không cần tạo thêm endpoint backend phức tạp.

### 3. Tiện Ích Che Số Điện Thoại PII (`maskPhoneNumber`)
- **Quyết định**: Xây dựng hàm `maskPhoneNumber(phone: string): string` che các ký tự ở giữa (ví dụ `0987654321` → `098****321`).
- **Lý do**: Tuân thủ tuyệt đối quy định bảo vệ thông tin cá nhân khách hàng và ngăn chặn cướp đơn tại [security.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/rules/security.md).

## Risks / Trade-offs

- **[Risk]** Chưa có Fanpage nào được kết nối khi người dùng mới đăng ký.
  - **Mitigation**: Hiển thị trạng thái khởi tạo chào đón thân thiện kèm nút CTA lớn "Kết Nối Fanpage Đầu Tiên" dẫn đến `/pages`.
- **[Risk]** Cửa sổ 24h bị tính toán lệch múi giờ.
  - **Mitigation**: Sử dụng timestamp chuẩn ISO UTC từ server và tính khoảng cách thời gian dựa trên `Date.now()`.
