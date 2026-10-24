# Design: Màn Hình Báo Cáo Phân Tích Doanh Thu & Hiệu Quả Bán Hàng (sales-analytics)

## 1. Kiến Trúc Phân Hệ & Luồng Dữ Liệu

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database                             │
│       (orders, order_items, payments, connected_pages, customers)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQL Aggregations & Grouping
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│           Backend API Layer (Express.js Clean Architecture)           │
│  - AnalyticsRepository: Query tối ưu theo DATE_TRUNC, EXTRACT, SUM     │
│  - AnalyticsService: Tính toán KPIs, Period-over-Period growth rate    │
│  - AnalyticsController: Validate query params (Zod) & ApiResponse<T>   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API: /api/v1/analytics/*
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Frontend State Management (Zustand Store)                │
│  - analytics.store.ts: Filter state (timeRange, pageId), Fetching      │
│  - Defensive Parsing & Normalizer: Chuyển đổi snake_case sang camelCase│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ React State & Props
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              macOS Clean Utility Bento Grid Analytics UI               │
│  - AnalyticsHeader: Page selector, Date range tabs, Export CSV button  │
│  - AnalyticsMetrics: 4 thẻ Bento KPIs (Revenue, Orders, CR, AOV)       │
│  - RevenueTrendChart: Biểu đồ SVG tương tác doanh thu & đơn hàng      │
│  - ChannelBreakdownChart: Tỷ lệ chốt đơn Facebook Comment vs Inbox     │
│  - TopProductsTable: Bảng xếp hạng 10 sản phẩm bán chạy nhất           │
│  - GoldenHourHeatmap: Ma trận nhiệt 24h x 7 ngày đánh dấu giờ vàng     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Thiết Kế Backend API & Cơ Sở Dữ Liệu

### 2.1 Schema DTO & Validation (`backend/src/api/dtos/analytics.dto.ts`)
```typescript
import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  pageId: z.string().uuid().optional(),
  timeRange: z.enum(['7d', '30d', '90d', 'custom']).default('7d'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
```

### 2.2 Endpoints API RESTful (`backend/src/api/routes/analytics.routes.ts`)
- `GET /api/v1/analytics/summary`: Trả về 4 chỉ số KPIs cốt lõi kèm tỷ lệ tăng trưởng so với chu kỳ trước:
  - `totalRevenue`: Tổng doanh thu từ các đơn hàng hợp lệ (`confirmed`, `shipping`, `completed`).
  - `revenueGrowthRate`: Tỷ lệ % tăng trưởng doanh thu so với chu kỳ trước.
  - `totalOrders`: Tổng số đơn hàng phát sinh trong kỳ.
  - `ordersGrowthRate`: Tỷ lệ % tăng trưởng số đơn hàng.
  - `averageOrderValue`: Doanh thu trung bình trên mỗi đơn (AOV).
  - `conversionRate`: Tỷ lệ chốt đơn thành công trên tổng số khách tương tác có SĐT.
- `GET /api/v1/analytics/revenue-series`: Chuỗi thời gian phân bổ theo ngày:
  - `date`: YYYY-MM-DD
  - `revenue`: Doanh thu thực nhận trong ngày.
  - `ordersCount`: Số đơn hàng trong ngày.
  - `vietqrRevenue`: Doanh thu từ thanh toán VietQR.
  - `codRevenue`: Doanh thu từ thanh toán COD.
- `GET /api/v1/analytics/channel-breakdown`: Phân tích hiệu quả theo kênh bán hàng:
  - `channel`: `'facebook_comment' | 'facebook_inbox' | 'manual'`
  - `ordersCount`: Số đơn hàng.
  - `revenue`: Doanh thu mang lại.
  - `successRate`: Tỷ lệ chốt đơn thành công.
  - `cancelRate`: Tỷ lệ đơn bị hủy.
- `GET /api/v1/analytics/top-products`: Top 10 sản phẩm bán chạy:
  - `productId`, `sku`, `productName`, `imageUrl`, `totalQuantitySold`, `totalRevenue`, `revenuePercentage`.
- `GET /api/v1/analytics/sales-heatmap`: Ma trận nhiệt chốt đơn:
  - Mảng 7 ngày (Thứ 2 đến Chủ Nhật) x 24 giờ (0 đến 23) chứa:
    - `dayOfWeek`: 0 (CN) đến 6 (T7)
    - `hour`: 0 đến 23
    - `orderCount`: Số lượng đơn chốt
    - `totalAmount`: Tổng tiền chốt
    - `isGoldenHour`: Boolean (đánh dấu 11:30-13:00 và 20:00-21:30)

### 2.3 Chiến Lược Tối Ưu Truy Vấn PostgreSQL (`AnalyticsRepository`)
- Sử dụng hàm thời gian tích hợp của PostgreSQL theo múi giờ Việt Nam (`AT TIME ZONE 'Asia/Ho_Chi_Minh'`):
  - `DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')` để gom nhóm ngày.
  - `EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')` để gom nhóm thứ trong tuần.
  - `EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')` để gom nhóm giờ.
- Truy vấn chu kỳ trước (Previous Period Comparison):
  - Tự động xác định khoảng thời gian so sánh có độ dài tương đương: nếu chu kỳ hiện tại là $N$ ngày từ $[T_{start}, T_{end}]$, thì chu kỳ trước là $[T_{start} - N \text{ ngày}, T_{start}]$.
  - Phòng vệ chia cho 0: `growthRate = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100`.

---

## 3. Thiết Kế Frontend Zustand Store & Data Normalization

### 3.1 Cấu Trúc Store (`frontend/src/lib/analytics.store.ts`)
```typescript
interface AnalyticsState {
  timeRange: '7d' | '30d' | '90d' | 'custom';
  customDateRange: { startDate: string; endDate: string };
  selectedPageId: string | null;
  summary: AnalyticsSummary | null;
  revenueSeries: RevenueDataPoint[];
  channelBreakdown: ChannelMetric[];
  topProducts: TopProductItem[];
  heatmap: HeatmapCell[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setTimeRange: (range: '7d' | '30d' | '90d' | 'custom') => void;
  setCustomDateRange: (range: { startDate: string; endDate: string }) => void;
  setSelectedPageId: (pageId: string | null) => void;
  fetchAnalytics: () => Promise<void>;
  exportCsv: () => void;
}
```

### 3.2 Defensive Parsing (`frontend/src/types/analytics.ts`)
- Mọi trường số tiền được parse bằng `Number(val || 0)`.
- Các danh sách trả về từ API luôn được fallback `Array.isArray(data) ? data : []`.
- Hàm `exportCsv`: Chèn mã BOM UTF-8 `\uFEFF` ở đầu file để Excel mở trực tiếp file tiếng Việt mà không bị lỗi font ký tự.

---

## 4. Thiết Kế Giao Diện macOS Clean Utility & SVG Charts

### 4.1 Bố Cục Bento Grid (`frontend/src/app/(dashboard)/analytics/page.tsx`)
```
┌───────────────────────────────────────────────────────────────────────────┐
│ AnalyticsHeader: Title, Page Dropdown, Time Range Segmented, Export Button│
├───────────────────────────────────────────────────────────────────────────┤
│ Executive Bento Metrics (4 Columns Grid):                                │
│ [ 💰 Doanh Thu Thuần ] [ 📦 Tổng Đơn Hàng ] [ 🎯 Tỷ Lệ Chốt ] [ 🏷️ AOV ] │
├─────────────────────────────────────┬─────────────────────────────────────┤
│ RevenueTrendChart (Interactive SVG) │ ChannelBreakdownChart (Donut & Bars)│
│ Biểu đồ diện tích Gradient + Đường   │ So sánh doanh thu & tỷ lệ thành công│
│ đường cong mượt mà, hover tooltip   │ giữa Comment vs Messenger vs Manual │
├─────────────────────────────────────┼─────────────────────────────────────┤
│ TopProductsTable (Leaderboard)      │ GoldenHourHeatmap (Matrix 24h x 7d) │
│ Bảng xếp hạng Top 10 sản phẩm        │ Lưới 168 ô nhiệt độ chốt đơn,       │
│ bán chạy, thanh tiến độ doanh thu   │ highlight 2 đỉnh giờ vàng tương tác │
└─────────────────────────────────────┴─────────────────────────────────────┘
```

### 4.2 Thiết Kế Biểu Đồ SVG Thuần (Pure Interactive SVG Charts)
- **Không phụ thuộc thư viện bên ngoài nặng nề:** Tận dụng SVG thuần với toán học nội suy Bézier curve cho đường cong biểu đồ doanh thu mượt mà.
- **Tương tác mượt mà:**
  - Điểm neo (dots) và đường trục thẳng đứng theo dõi con trỏ chuột (`onMouseMove`).
  - Tooltip động hiển thị ngày, tổng doanh thu (VND format chuẩn `12.500.000 đ`) và phân tách cơ cấu thanh toán.
  - Hiệu ứng gradient mờ phong cách Apple macOS Utility.

---

## 5. Quy Chuẩn Kiểm Thử & Quality Gates

1. **Backend Tests:**
   - Unit test `analytics.service.test.ts`: Kiểm tra chính xác công thức tính tăng trưởng, xử lý chia cho 0, xử lý mốc thời gian tùy chỉnh.
   - Integration test `analytics.routes.test.ts`: Gọi các endpoint `/api/v1/analytics/*`, xác thực cấu trúc `ApiResponse<T>`, kiểm tra xác thực quyền truy cập token.
2. **Frontend Tests:**
   - Unit test `analytics.store.test.ts`: Mock apiClient, kiểm tra cập nhật filter, normalizer và hàm xuất CSV.
   - Integration test `analytics.test.tsx`: Render trang `/analytics`, kiểm tra hiển thị 4 thẻ KPI, click chuyển tab thời gian, render biểu đồ SVG và bảng xếp hạng.
