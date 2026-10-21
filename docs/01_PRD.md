# BÁO CÁO KHẢO SÁT YÊU CẦU & Ý TƯỞNG SẢN PHẨM (PRD SƠ BỘ)
## DỰ ÁN QUẢN LÝ FANPAGE FACEBOOK & TỰ ĐỘNG HÓA BÁN HÀNG

**Người lập:** Senior Product Analyst & Software Strategy Consultant  
**Dự án:** Personal Project - Công cụ Quản lý Fanpage Facebook & Tự động hóa Bán hàng Online  
**Bối cảnh công nghệ:** Hệ sinh thái Meta Graph API (v19.0 - v26.0) & Thị trường Social Commerce Việt Nam  

---

### I. TỔNG QUAN DỰ ÁN & BỐI CẢNH (Project Overview & Context)

#### 1. Lý do hình thành ý tưởng (Market Trends & Data)
* **Sự bùng nổ của Thương mại qua mạng xã hội (Social Commerce):** Tại Việt Nam, hoạt động kinh doanh trực tuyến qua các kênh mạng xã hội như Facebook Messenger, Instagram, Zalo OA và TikTok đã trở thành trụ cột doanh thu cốt lõi của các cửa hàng bán lẻ và cá nhân kinh doanh [8]. 
* **Quy mô tệp người dùng tiềm năng khổng lồ:** Tính đến đầu năm 2025, Việt Nam có khoảng 70 triệu người dùng Facebook thường xuyên, chiếm tới gần 70% dân số [239]. Facebook Fanpage không chỉ là kênh truyền thông mà đã trở thành điểm chạm tư vấn và chốt đơn trực tiếp.
* **Thách thức khi vận hành thủ công:** Khi triển khai các chiến dịch quảng cáo (Facebook Ads) hoặc các buổi phát trực tiếp (Livestream/Reels), lượng tương tác (bình luận, tin nhắn) bùng nổ vượt quá khả năng xử lý của đội ngũ nhân sự trực chat, dẫn đến việc quá tải, đứt gãy luồng tư vấn và thất thoát doanh thu [8, 240].

#### 2. Nỗi đau (Pain Points) lớn nhất của người dùng mục tiêu
* **Trễ hạn phản hồi khiến mất khách hàng tiềm năng:** Khách hàng comment hỏi giá hoặc tư vấn thường mong muốn phản hồi ngay lập tức. Nếu phản hồi chậm từ vài phút đến vài giờ, khách hàng sẽ dễ dàng chuyển sang Fanpage đối thủ [364, 365].
* **Nạn "Cướp đơn" (Comment Hijacking):** Đối thủ cạnh tranh quét các bình luận công khai chứa số điện thoại hoặc địa chỉ của khách hàng để chủ động liên hệ giao hàng giả, hàng kém chất lượng hoặc chốt đơn trước, gây tổn thất tài chính và suy giảm uy tín thương hiệu [16, 193, 365].
* **Ứng dụng di động đơ lag & gián đoạn vận hành:** Phản hồi từ cộng đồng người bán cho thấy các phần mềm di động hiện có trên thị trường thường xuất hiện lỗi chậm thông báo, đơ lag khi hội thoại lớn, hoặc bắt chuyển hướng sang trình duyệt web gây gián đoạn [15, 17].
* **Chi phí duy trì đắt đỏ khi mở rộng quy mô:** Các nền tảng thương mại hiện nay (như Pancake, Harasocial) tính phí theo số lượng Fanpage kết nối (~550.000 đến 2.180.000 VNĐ/6 tháng) hoặc bắt buộc phải mua trọn bộ hệ sinh thái Omnichannel gây gánh nặng chi phí cho các shop nhỏ hoặc hệ thống trang vệ tinh [10, 11, 14].
* **Rủi ro vi phạm chính sách Meta:** Nhiều chủ shop lạm dụng các công cụ lách luật (auto-share Group, spam tin nhắn hàng loạt) dẫn đến việc Fanpage bị khóa tính năng, bị Meta đánh lỗi rác hoặc nhận lỗi Permission Error (#2022) do vi phạm cửa sổ tin nhắn 24 giờ [48, 57].

#### 3. Mục tiêu cốt lõi của phiên bản MVP
* **Tập trung hội thoại (All-in-One Inbox):** Hợp nhất toàn bộ bình luận và tin nhắn từ các Fanpage kết nối về một bảng điều khiển duy nhất.
* **Tự động hóa phản hồi & Chống cướp đơn tức thì:** Tự động ẩn bình luận chứa số điện thoại/từ khóa nhạy cảm và kích hoạt phản hồi tự động trong dưới 30 giây [14, 34, 193].
* **Lên lịch đăng bài chuẩn API:** Cung cấp công cụ soạn thảo và dán lịch xuất bản bài viết/hình ảnh/video lên Facebook Page hoàn toàn tự động via Graph API chính thức [34, 35].
* **Tuân thủ tuyệt đối quy định Meta:** Đảm bảo an toàn 100% cho tài sản số (Page & App ID) bằng cách loại bỏ các hành vi bị Meta cấm (như auto-share Group qua API) [34, 42, 53].

---

### II. CHÂN DUNG NGƯỜI DÙNG MỤC TIÊU (Target Audience Personas)

#### 1. Nhóm Người dùng Cơ bản (Casual User - Chủ shop cá nhân / Cửa hàng online nhỏ)
* **Đặc điểm hành vi:**
  * Kinh doanh cá nhân hoặc quy mô gia đình (thời trang, mỹ phẩm, đồ ăn online), tự sản xuất nội dung và tự trực chat [18, 30].
  * Quản lý từ 1 - 2 Fanpage, ngân sách duy trì phần mềm thấp, không thạo công nghệ phức tạp [28, 299].
* **Nhu cầu tối thiểu:**
  * Gom tin nhắn và comment của các Page về một ứng dụng đơn giản trên điện thoại hoặc máy tính [18, 193].
  * Tự động ẩn comment chứa số điện thoại để không bị mất đơn [16, 193].
  * Thiết lập mẫu tin nhắn/bình luận tự động trả lời khi khách hỏi giá, tư vấn size ngoài giờ làm việc [14, 38, 347].
  * Soạn thảo và đặt lịch đăng bài hẹn giờ tự động cho cả tuần [34, 35].

#### 2. Nhóm Người dùng Nâng cao / Chuyên sâu (Power User / Marketer / Đội ngũ trực chat lớn)
* **Đặc điểm hành vi:**
  * Quản lý mạng lưới nhiều Fanpage vệ tinh, chạy quảng cáo Facebook Ads ngân sách lớn, tổ chức các phiên Livestream bán hàng thường xuyên [9, 10, 240].
  * Có đội ngũ từ 3 - 10+ nhân viên trực chat, cần quy trình vận hành chuẩn hóa [10, 284].
* **Nhu cầu khắt khe:**
  * Tự động phân chia cuộc trò chuyện cho từng nhân viên, theo dõi KPI và lịch sử chăm sóc khách [11, 23, 298].
  * Quét và bóc tách bình luận chốt đơn Livestream/Reels theo đúng cú pháp (Mã hàng + SĐT), tự động gửi giỏ hàng/link thanh toán qua Messenger [10, 24, 44].
  * Kiểm tra tồn kho thời gian thực, lên đơn cấp tốc trong khung chat và đồng bộ trực tiếp với các đơn vị vận chuyển (GHN, GHTK, Viettel Post) [10, 26, 285].
  * Đẩy dữ liệu chuyển đổi qua Facebook Conversion API (CAPI) để tối ưu hóa chiến dịch quảng cáo [10, 23, 29].

---

### III. PHẠM VI TÍNH NĂNG SẢN PHẨM (Product Scope & Features)

#### 1. Giai đoạn 1 - MVP (Minimum Viable Product - Tính năng cốt lõi bắt buộc)

| STT | Tính năng | Mô tả chi tiết cách thức hoạt động | Quyền API & Endpoint Meta liên quan |
| :--- | :--- | :--- | :--- |
| **1** | **Xác thực & Kết nối Fanpage** | Đăng nhập bằng Facebook Login for Business, liệt kê danh sách Page quản lý và cấp quyền truy cập lâu dài [34, 74]. | `pages_manage_posts`, `pages_messaging`, `pages_read_engagement`, `GET /me/accounts` [34, 39, 74]. |
| **2** | **Quản lý Hộp thư tập trung (Centralized Inbox)** | Gom toàn bộ tin nhắn inbox Messenger và comment từ bài đăng của các Page về một màn hình duy nhất theo thời gian thực [10, 38]. | Webhooks (`feed`, `messages`), `GET /{page_id}/conversations` [34, 175]. |
| **3** | **Tự động Ẩn bình luận chứa SĐT** | Khi có comment mới, hệ thống áp dụng Regex quét chuỗi chữ số. Nếu phát hiện SĐT, gọi API ẩn comment lập tức để tránh lộ data [16, 34, 44]. | Webhook `feed` + `POST /{comment_id}` (`is_hidden=true`) [34, 44]. |
| **4** | **Auto Comment Reply & Private Reply** | Tự động reply comment công khai và gửi tin nhắn inbox riêng kèm link trích dẫn comment khi khách hỏi giá/sản phẩm [34, 38, 45]. | `POST /{comment_id}/comments` & `POST /{comment_id}/private_replies` [38, 41, 169]. |
| **5** | **Đặt lịch đăng bài hẹn giờ (Page Scheduler)** | Cho phép người dùng soạn văn bản, tải ảnh/video, chọn thời gian đăng (từ 10 phút đến 30 ngày cho bài viết/ảnh; đến 6 tháng cho video) [34, 35]. | `POST /{page_id}/feed`, `photos`, `videos` với `published=false` & `scheduled_publish_time` [34, 35]. |
| **6** | **Gắn nhãn (Tagging) & Lưu thông tin khách** | Gắn tag phân loại cuộc trò chuyện (Có SĐT, Khách VIP, Đã báo giá) và lưu ghi chú thông tin khách hàng trong khung chat [11, 23]. | Dữ liệu nội bộ ứng dụng (Internal DB). |

#### 2. Giai đoạn 2 - Roadmap Tương lai (Tính năng mở rộng - Nice-to-have)
* **Trợ lý AI viết Caption & Chỉnh ảnh:** Tích hợp LLM (OpenAI/Anthropic) hỗ trợ sinh mô tả bài viết chuẩn SEO/Marketing và tự động tối ưu hóa kích thước ảnh phẩm cấp cao trước khi xuất bản [34, 36].
* **Chốt đơn tự động trên Livestream & Reels:** Quét hàng nghìn bình luận theo thời gian thực, tự động gộp đơn, tạo giỏ hàng và gửi hóa đơn xác nhận qua Messenger [24, 44, 45].
* **Chatbot AI tư vấn ngữ cảnh (NLP):** Đọc hiểu ý định mua hàng, trả lời linh hoạt các câu hỏi về giá, chất liệu, kiểm tra tồn kho theo kịch bản thông minh [12, 31].
* **Đồng bộ tồn kho & Kết nối Nhà vận chuyển:** Tạo đơn hàng hoàn chỉnh ngay trong khung chat, đẩy vận đơn tự động sang GHN, GHTK, Viettel Post và cập nhật trạng thái đơn [26, 210, 328].
* **Mở rộng đa kênh (Instagram, Zalo OA, TikTok Shop):** Quản lý hội thoại đa kênh trên một giao diện thống nhất [9, 11, 145].
* **Notification Workflow cho Facebook Group:** Do Meta đã khai tử hoàn toàn Groups API (`publish_to_groups`) từ ngày 22/04/2024, phần mềm **không triển khai** auto-share Group chui (tránh rủi ro khóa nick), mà xây dựng tính năng phát thông báo đẩy (Push Notification) nhắc nhở người dùng tự đăng/share thủ công vào Group [34, 42, 58].

---

### IV. QUY TRÌNH NGHIỆP VỤ & LUỒNG DỮ LIỆU CHÍNH (Business Logic & Core User Flows)

#### 1. Luồng xử lý nghiệp vụ chính (Core User Flows)

```
[Luồng 1: Đăng nhập & Kết nối Fanpage]
Người dùng ──> Bấm "Kết nối Facebook" ──> Mở OAuth Dialog ──> Cấp quyền Pages & Messenger
     │
     └──> Server nhận User Access Token ──> Gọi GET /me/accounts ──> Lưu Page Access Tokens lâu dài (Encrypted)

[Luồng 2: Xử lý Bình luận & Auto Inbox từ Webhook]
Khách comment trên Bài viết ──> Meta gửi Webhook (event: feed) ──> Server ứng dụng nhận dữ liệu
     │
     ├──> [Bước A] Quét Regex SĐT ──> Nếu tìm thấy SĐT ──> Gọi POST /{comment_id} (is_hidden=true)
     │
     └──> [Bước B] Kiểm tra từ khóa ──> Gọi POST /{comment_id}/comments (Reply công khai)
                                      └──> Gọi POST /{comment_id}/private_replies (Gửi DM vào Messenger)
                                                  │
                                                  └──> Khách phản hồi DM ──> Cửa sổ 24h mở ra ──> Bot tư vấn tiếp

[Luồng 3: Đặt lịch đăng bài xuất bản tự động]
Soạn nội dung & Tải media ──> Chọn Fanpage & Chọn thời gian ──> Kiểm tra khung thời gian (10m - 30d)
     │
     └──> Server gọi API Meta: POST /{page_id}/feed (published=false, scheduled_publish_time=timestamp)
     │
     └──> Meta trả về Post ID đính lịch ──> Cập nhật trạng thái "Scheduled" trên giao diện
```

#### 2. Các Thực thể Dữ liệu Chính (Core Data Entities)
* **`Users` (Tài khoản người dùng ứng dụng):** `user_id`, `email`, `password_hash`, `role`, `created_at`.
* **`Connected_Pages` (Trang Facebook kết nối):** `page_id`, `user_id`, `page_name`, `page_access_token` (Mã hóa), `status`, `webhook_connected`.
* **`Posts_Schedule` (Bài viết đặt lịch):** `post_id`, `page_id`, `content_text`, `media_urls`, `scheduled_time`, `published_status` (`Pending`, `Published`, `Failed`), `meta_post_id`, `error_message`.
* **`Conversations_Comments` (Bình luận & Hội thoại):** `interaction_id`, `page_id`, `customer_fb_id`, `customer_name`, `content`, `is_hidden`, `private_reply_sent`, `created_time`.
* **`Automation_Rules` (Cấu hình Kịch bản Tự động):** `rule_id`, `page_id`, `trigger_keywords`, `auto_comment_template`, `auto_private_reply_template`, `hide_phone_enabled` (Boolean).
* **`Leads_Draft` (Khách hàng tiềm năng & Đơn nháp):** `lead_id`, `page_id`, `customer_fb_id`, `phone_number`, `address`, `notes`, `tags`.

---

### V. RÀNG BUỘC KỸ THUẬT & TIÊU CHÍ ĐÁNH GIÁ THÀNH CÔNG (Technical Constraints & Success Metrics)

#### 1. Ràng buộc Kỹ thuật & Tuân thủ Chính sách Meta (Technical Constraints & Compliance)
* **Chính sách Cửa sổ Tin nhắn 24 giờ (Standard Messaging Window):** Chỉ được gửi tin nhắn tự động/tiếp thị trong vòng 24 giờ kể từ mốc tương tác cuối cùng của khách [40, 48]. Ngoài 24 giờ, bắt buộc dùng thẻ `Human Agent` (mở rộng 7 ngày) hoặc Message Tags phi quảng cáo. Vi phạm sẽ bị dính lỗi Permission Error (#2022) và tước quyền tin nhắn [40, 48].
* **Giới hạn API Private Replies:** Chỉ được gửi tin nhắn riêng **1 lần duy nhất** cho mỗi bình luận và phải thực hiện trong vòng **7 ngày** kể từ khi bình luận xuất hiện [41, 169].
* **Tốc độ phản hồi Bot Chat:** Chính sách Meta bắt buộc các hệ thống tự động phải phản hồi tin nhắn của người dùng trong thời gian tối đa **30 giây** [14, 41].
* **Quản trị Giới hạn Tần suất gọi API (Rate Limits):** Pages API áp dụng giới hạn `4,800 x (số người dùng tương tác)/24h` [76]. Khi chiến dịch bùng nổ tương tác, API sẽ trả về lỗi 613 hoặc 80001 [49, 76]. Hạ tầng bắt buộc phải sử dụng hàng đợi **Message Queue (RabbitMQ/Redis)** kết hợp thuật toán **Exponential Backoff** để gửi lại request, tránh mất dữ liệu [49, 76].
* **Tuyệt đối KHÔNG sử dụng Groups API:** Meta đã loại bỏ hoàn toàn quyền `publish_to_groups` từ ngày 22/04/2024 [34, 42, 53]. Việc lách luật bằng Web Scraping hoặc tiện ích trình duyệt (Extension) bị Meta cấm nghiêm ngặt, dẫn đến rủi ro khóa vĩnh viễn Page và App ID [47, 56, 57].
* **Yêu cầu App Review & Business Verification:** Trước khi đưa sản phẩm ra môi trường thực tế, nhà phát triển bắt buộc phải hoàn tất Xác minh Doanh nghiệp (Business Verification) và nộp kịch bản App Review cho các quyền `pages_manage_posts`, `pages_messaging`, `pages_read_engagement` [34, 39].

#### 2. Tiêu chí Đánh giá Thành công phiên bản MVP (Success Metrics)
* **Tốc độ xử lý Phản hồi (Response SLA):** Thời gian từ lúc khách comment đến khi phần mềm ẩn SĐT và gửi tin nhắn tự động đạt dưới **3 giây** (vượt trội so với quy định tối đa 30s của Meta) [14, 41].
* **Độ chính xác Đặt lịch Bài viết (Publishing Accuracy):** Tỷ lệ bài viết đặt lịch được xuất bản thành công đúng khung giờ đã cấu hình đạt **100%**, không xảy ra lỗi Token hết hạn [34, 35].
* **Tỷ lệ An toàn & Tuân thủ Chính sách (Policy Compliance Rate):** **0%** sự cố bị Meta chặn quyền nhắn tin (#2022) hoặc khóa tài khoản do vi phạm Spam/Rate Limit [48, 49].
* **Hiệu năng Giao diện Di động (Mobile Performance):** Giao diện web/mobile responsive tải mượt mà, thời gian hiển thị khung chat tập trung dưới **1.5 giây**, khắc phục hoàn toàn tình trạng đơ/văng ứng dụng của các công cụ hiện hữu [15, 17].

---
*Ghi chú cho Lập trình viên:* Bản PRD này được xây dựng hoàn toàn dựa trên dữ liệu thực tế từ 72 tài liệu nguồn về Meta Graph API (v19.0 - v26.0) và báo cáo phân tích các nền tảng quản lý Fanpage tại Việt Nam. Khi triển khai codebase, hãy ưu tiên xây dựng hạ tầng Webhook receiver và Message Queue trước khi viết các tính năng giao diện.
