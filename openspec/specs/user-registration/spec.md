# user-registration Specification

## Purpose
Cung cấp khả năng đăng ký tài khoản tự phục vụ (Self-service Registration) cho chủ shop trực tuyến trên nền tảng ShopFlow với tính bảo mật cao, xác thực dữ liệu và cấp phát phiên đăng nhập tức thì.

## Requirements

### Requirement: Thẩm định thông tin đăng ký tài khoản
Hệ thống SHALL thẩm định tính hợp lệ của toàn bộ thông tin đăng ký bao gồm email, mật khẩu, họ tên và sự đồng thuận điều khoản dịch vụ trước khi tạo tài khoản.

#### Scenario: Đăng ký với thông tin hợp lệ
- **WHEN** Người dùng gửi biểu mẫu đăng ký với email hợp lệ, mật khẩu từ 8 ký tự chứa chữ và số, họ tên đầy đủ và chấp thuận điều khoản dịch vụ
- **THEN** Hệ thống chấp nhận yêu cầu và tiến hành tạo tài khoản người dùng mới với vai trò chủ shop (`owner`)

#### Scenario: Đăng ký với mật khẩu không đủ độ mạnh
- **WHEN** Người dùng gửi mật khẩu dưới 8 ký tự hoặc không chứa cả chữ cái và chữ số
- **THEN** Hệ thống từ chối yêu cầu và trả về lỗi thông báo mật khẩu phải có ít nhất 8 ký tự bao gồm cả chữ và số

#### Scenario: Chưa chấp thuận điều khoản dịch vụ
- **WHEN** Người dùng gửi biểu mẫu đăng ký nhưng chưa tích chọn ô đồng ý điều khoản dịch vụ và chính sách bảo mật
- **THEN** Hệ thống ngăn chặn việc gửi yêu cầu và hiển thị thông báo yêu cầu chấp thuận điều khoản

### Requirement: Ngăn chặn đăng ký trùng lặp địa chỉ email
Hệ thống SHALL đảm bảo tính duy nhất của địa chỉ email trên toàn bộ cơ sở dữ liệu và từ chối mọi nỗ lực đăng ký bằng email đã tồn tại.

#### Scenario: Đăng ký bằng email đã tồn tại
- **WHEN** Người dùng gửi thông tin đăng ký với địa chỉ email đã được liên kết với một tài khoản đang hoạt động
- **THEN** Hệ thống từ chối với mã lỗi 409 Conflict và thông báo địa chỉ email đã được sử dụng

### Requirement: Mã hóa mật khẩu an toàn và khởi tạo phiên đăng nhập
Hệ thống SHALL mã hóa mật khẩu một chiều trước khi lưu trữ và tự động cấp phát cặp khóa truy cập (Access Token & Refresh Token) ngay sau khi tạo tài khoản thành công.

#### Scenario: Tạo tài khoản và cấp phát token phiên làm việc
- **WHEN** Quá trình lưu trữ tài khoản người dùng mới thành công
- **THEN** Hệ thống trả về thông tin người dùng an toàn (không chứa mật khẩu đã băm) kèm theo cặp Access Token và Refresh Token hợp lệ với mã trạng thái HTTP 201 Created

### Requirement: Trải nghiệm người dùng và điều hướng trên giao diện đăng ký
Hệ thống SHALL cung cấp giao diện đăng ký trực quan với phản hồi thời gian thực, trạng thái đang tải và tự động điều hướng sau khi đăng ký thành công.

#### Scenario: Điều hướng sau khi hoàn tất đăng ký
- **WHEN** Máy khách nhận được phản hồi thành công và lưu trữ phiên đăng nhập
- **THEN** Giao diện tự động chuyển hướng người dùng đến trang quản lý Fanpage và thiết lập ban đầu

#### Scenario: Người dùng đã đăng nhập truy cập trang đăng ký
- **WHEN** Một người dùng đã có phiên đăng nhập hợp lệ truy cập vào đường dẫn đăng ký
- **THEN** Giao diện tự động điều hướng người dùng thẳng vào trang quản trị chính
