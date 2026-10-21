# Proposal: Mô-đun Trích Xuất Thực Thể Đơn Hàng Bằng Google Gemini AI (TASK-20)

## Why

Trong hoạt động kinh doanh trực tuyến và livestream bán hàng trên Facebook tại Việt Nam, khách hàng thường xuyên để lại bình luận và tin nhắn đặt hàng với cú pháp phi cấu trúc, tiếng lóng, viết tắt hoặc thiếu thông tin (ví dụ: *"#SP01 2 cái đỏ size L gửi về 123 Cầu Giấy 0988xxx"*, *"cho c 1 set váy hoa nhí nhé e"*).
Hệ thống ShopFlow cần một mô-đun bóc tách tự động thông minh (`OrderParserService`) với kiến trúc Hybrid hai tầng (Regex tiếng Việt siêu tốc cho cú pháp chuẩn và Google Gemini 2.5 AI fallback cho ngôn ngữ tự nhiên phức tạp) để trích xuất tức thì 7 trường thông tin đơn hàng, giảm thiểu 95% thời gian tạo đơn thủ công và ngăn chặn sót đơn hàng.

## What Changes

- **Kiến Trúc Hybrid Entity Extraction:**
  - **Tầng 1 (Regex Fast-Path < 50ms):** Nhận diện các cú pháp đặt hàng có tiền tố hoặc từ khóa quy chuẩn (`#SP...`, `[Mã SP]`, số lượng `1c`, `2 cái`, màu sắc, size `S/M/L/XL`, số điện thoại 10 số Việt Nam).
  - **Tầng 2 (Gemini NLP Fallback < 1.5s):** Kích hoạt Google Gemini 2.5 Flash API với Structured JSON Output Mode khi Regex không tự tin hoặc bình luận dạng văn xuôi tự nhiên.
- **DTOs & Type Contracts:**
  - Định nghĩa `ExtractedOrderEntity` chứa: `productCode` (mã SKU), `productName`, `quantity`, `attributes` (màu sắc, kích thước, phân loại), `customerName`, `customerPhone` (chuẩn hóa 10 số), `shippingAddress`, `confidenceScore` (0.0 - 1.0), `rawInput`, `extractionMethod` (`regex` | `ai_gemini`).
- **Tích Hợp Cấu Hình Biến Môi Trường:**
  - Bổ sung `GEMINI_API_KEY` và `GEMINI_MODEL` (`gemini-2.5-flash`) vào `backend/src/config/env.ts` với giá trị fallback an toàn cho môi trường test/dev.
- **REST API Thử Nghiệm & Trích Xuất:**
  - Endpoint `POST /api/v1/orders/parse` phục vụ cả Webhook ingestion tự động và giao diện kiểm thử trích xuất đơn hàng trên Dashboard.
- **Bộ Dữ Liệu Kiểm Thử Toàn Diện (Golden Test Fixtures):**
  - Xây dựng 20+ mẫu bình luận/tin nhắn thực tế của các shop thời trang, mỹ phẩm, đồ gia dụng Việt Nam để kiểm thử tự động đạt độ chính xác cao.

## Capabilities

### New Capabilities
- `order-parser`: Trích xuất thực thể đơn hàng (Sản phẩm, SKU, Số lượng, Biến thể/Size/Màu, Khách hàng, SĐT, Địa chỉ) từ văn bản tiếng Việt qua kiến trúc Hybrid kết hợp Regex Tiếng Việt phòng vệ và Google Gemini 2.5 AI fallback.

### Modified Capabilities
*(Không có thay đổi về đặc tả yêu cầu của các capabilities hiện có)*

## Impact

- **Backend:**
  - Thêm service `backend/src/core/services/order-parser.service.ts` và Gemini client `backend/src/infrastructure/ai/gemini.client.ts`.
  - Thêm controller & router `backend/src/api/routes/order-parser.routes.ts` (`POST /api/v1/orders/parse`).
  - Cập nhật `backend/src/config/env.ts`.
- **Hiệu năng & Độ trễ (SLA):**
  - Bình luận có mã sản phẩm rõ ràng: Regex xử lý < 20ms, không tốn quota API Gemini.
  - Bình luận tự do phức tạp: Gemini 2.5 Flash xử lý trích xuất < 1.5 giây.
- **Bảo mật:**
  - Không hardcode API key vào mã nguồn. Mock 100% lệnh gọi ra Google Gemini trong kiểm thử tự động theo chuẩn chất lượng ShopFlow.
