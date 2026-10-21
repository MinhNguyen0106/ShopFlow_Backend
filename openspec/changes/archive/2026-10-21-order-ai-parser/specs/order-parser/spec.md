# Spec Delta

## Purpose

Cung cấp khả năng tự động nhận diện và trích xuất thực thể đơn hàng từ tin nhắn và bình luận tiếng Việt phi cấu trúc qua cơ chế Hybrid kết hợp Regex và Google Gemini AI.

## ADDED Requirements

### Requirement: Vietnamese regex pattern order parsing
Hệ thống SHALL phân tích chuỗi văn bản đầu vào bằng các biểu thức chính quy (Regex) tối ưu cho cú pháp tiếng Việt nhằm trích xuất nhanh mã sản phẩm, số lượng, màu sắc, kích thước và số điện thoại liên lạc.

#### Scenario: Parse formatted order comment successfully via regex
- **WHEN** Khách hàng bình luận cú pháp chuẩn `#SP001 2 cái đỏ size L 0988654321`
- **THEN** Hệ thống trích xuất mã SKU là SP001, số lượng là 2, màu đỏ, size L, SĐT là 0988654321 với phương thức trích xuất là `regex` và thời gian phản hồi dưới 50ms

#### Scenario: Fallback to AI when regex yields insufficient confidence
- **WHEN** Khách hàng để lại câu bình luận tự do *"em ơi lấy cho chị set đầm xòe hoa nhí màu vàng nhé"* không chứa mã SKU chuẩn
- **THEN** Hệ thống đánh dấu kết quả Regex không đủ tin cậy và chuyển tiếp sang tầng phân tích Gemini AI

### Requirement: Google Gemini AI fallback NLP extraction
Hệ thống SHALL sử dụng mô hình Google Gemini 2.5 Flash thông qua API để phân tích ngữ nghĩa ngôn ngữ tự nhiên tiếng Việt phức tạp và trả về cấu trúc thực thể JSON khi phương pháp Regex không đạt yêu cầu.

#### Scenario: Natural language extraction with Gemini AI
- **WHEN** Đầu vào là tin nhắn văn xuôi kèm địa chỉ *"Ship cho mình một hộp kem dưỡng ẩm về 45 Lê Lợi, P. Bến Nghé, Q.1, HCM, gọi số 0912345678 nha"*
- **THEN** Hệ thống gọi Gemini API và trích xuất đúng tên sản phẩm, số lượng 1, địa chỉ nhận hàng và số điện thoại với độ tin cậy trên 0.85

#### Scenario: Handle Gemini API quota or network failure gracefully
- **WHEN** Lệnh gọi Google Gemini API gặp sự cố mạng hoặc lỗi hạn mức (quota)
- **THEN** Hệ thống trả về kết quả tốt nhất từ tầng Regex phòng vệ và ghi log cảnh báo an toàn mà không làm sập tiến trình ứng dụng

### Requirement: Standardized order entity normalization
Hệ thống SHALL chuẩn hóa toàn bộ dữ liệu đơn hàng trích xuất thành đối tượng thực thể nhất quán, bao gồm mã SKU, tên sản phẩm, số lượng, thuộc tính biến thể, thông tin khách hàng, số điện thoại chuẩn 10 chữ số và địa chỉ giao hàng.

#### Scenario: Phone number and quantity normalization
- **WHEN** Chuỗi đầu vào chứa số điện thoại dạng `+84 988.654.321` và số lượng dạng chữ `"hai chiếc"`
- **THEN** Hệ thống chuẩn hóa số điện thoại thành định dạng chuỗi 10 số `0988654321` và số lượng thành số nguyên `2`

### Requirement: Synchronous parsing REST API endpoint
Hệ thống SHALL cung cấp endpoint HTTP `POST /api/v1/orders/parse` nhận nội dung văn bản thô kèm context Fanpage và trả về phản hồi JSON Envelope chứa thực thể đơn hàng đã trích xuất.

#### Scenario: Parse endpoint returns validated extracted entity
- **WHEN** Client gửi HTTP POST đến `/api/v1/orders/parse` kèm payload `{ "text": "#AO02 1 đen M", "pageId": "page_123" }`
- **THEN** API trả về HTTP 200 OK với cấu trúc `{ "success": true, "data": { "productCode": "AO02", "quantity": 1, ... } }`
