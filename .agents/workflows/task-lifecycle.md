---
name: task-lifecycle
description: Quy trình thực thi task chuẩn mực: Tách nhánh riêng -> Tự động test & sửa lỗi -> Merge vào main -> Triển khai lên server theo safe-deploy.md.
trigger: task-start
---

# Workflow: Quy Trình Vận Hành Task Chuẩn Mực (Task Lifecycle Workflow)

Quy trình bắt buộc áp dụng cho mọi nhiệm vụ phát triển tính năng hoặc sửa lỗi trong dự án **ShopFlow**, đảm bảo nhánh `main` luôn ở trạng thái ổn định (Production-Ready) và mã nguồn được kiểm thử 100% trước khi triển khai.

---

## 🔄 Sơ Đồ Quy Trình Tự Động (Process Flowchart)

```mermaid
graph TD
    A["1. Đọc Task từ Task.md (Macro Milestone)"] --> B["2. Tạo nhánh riêng: git checkout -b feature/..."]
    B --> C["3. Khởi tạo OpenSpec: /opsx-propose <feature-name>"]
    C --> D["4. Lập trình & Viết Tests theo tasks.md (/opsx-apply)"]
    D --> E["5. Chạy toàn bộ Test Suite & Type-Check"]
    E -->|❌ Test Lỗi| F["6. Vòng Lặp Tự Sửa Lỗi (Self-Healing Loop)"]
    F -->|Sửa xong mã| E
    E -->|✅ Test Pass 100%| G["7. Lưu trữ OpenSpec: /opsx-archive <feature-name>"]
    G --> H["8. Chuyển về main & Merge: git merge --no-ff"]
    H --> I["9. Chạy quy trình Triển khai An toàn (safe-deploy.md)"]
    I --> J["10. Đẩy nhánh main lên GitHub: git push origin main"]
    J --> K["11. Cập nhật Task.md sang DONE & Ghi log history.md"]
```

---

## 📋 Chi Tiết Các Bước Thực Hiện

### Bước 1: Khởi Tạo Nhánh Làm Việc Riêng (Feature Branch)
> [!IMPORTANT]
> **Tuyệt đối không viết code trực tiếp trên nhánh `main`.** Mọi công việc đều phải được cô lập trên một nhánh riêng biệt.

1. Đảm bảo nhánh `main` ở trạng thái mới nhất và sạch sẽ:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Khởi tạo và chuyển sang nhánh riêng theo quy ước đặt tên:
   - Tính năng mới: `feature/<task-id>-<ten-ngan-gon>` (Ví dụ: `feature/task-16-posts-management`)
   - Sửa lỗi: `fix/<task-id>-<ten-ngan-gon>` (Ví dụ: `fix/webhook-hmac-timing-attack`)
   ```bash
   git checkout -b feature/<task-id>-<ten-task>
   ```
3. Cập nhật tệp [Task.md](file:///c:/Users/Dell/Desktop/ShopFlow/Task.md): Chuyển task sang mục `### 📋 TRẠNG THÁI: IN PROGRESS (ĐANG THỰC HIỆN)`.

---

### Bước 2: Thiết Lập Đặc Tả Kỹ Thuật Bằng OpenSpec
1. Khởi tạo bộ tài liệu đặc tả cho tính năng:
   ```bash
   /opsx-propose <feature-name>
   ```
   Lệnh này tự động sinh `proposal.md`, `specs/`, `design.md`, và `tasks.md` bên trong `openspec/changes/<feature-name>/`.
2. Kiểm tra tính hợp lệ của change trước khi code:
   ```bash
   openspec validate <feature-name>
   ```

---

### Bước 3: Phát Triển & Kiểm Thử Toàn Diện (Development & Testing)
1. Tiến hành hiện thực hóa mã nguồn bám sát `tasks.md` trong change OpenSpec (`/opsx-apply`), tuân thủ:
   - Clean Architecture (`api/`, `core/`, `infrastructure/`, `config/`, `utils/`).
   - TypeScript Strict Mode (`noImplicitAny`, strict null checks).
   - Bảo mật: Không hardcode secret, sử dụng Zod schema để kiểm tra biến môi trường.
2. Viết unit tests và integration tests tương ứng cho tính năng mới.
3. Chạy kiểm tra tĩnh và toàn bộ bài test:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm run test:unit
   ```

---

### Bước 4: Vòng Lặp Tự Động Phân Tích & Sửa Lỗi (Self-Healing Loop)
Nếu bài kiểm tra hoặc lệnh type-check báo lỗi (**Test Failed / Compilation Error**):
1. **Phân tích lỗi (Root Cause Analysis):**
   - Đọc kỹ log lỗi, stack trace và dòng mã gây ra sự cố.
   - Xác định rõ nguyên nhân (lỗi logic nghiệp vụ, sai DTO schema, thiếu mock dữ liệu, lỗi kiểu TypeScript).
2. **Tự động sửa lỗi (Auto-Fix):**
   - Điều chỉnh mã nguồn hoặc cập nhật fixture test phù hợp.
3. **Kiểm chứng lại (Re-test):**
   - Chạy lại bài test vừa thất bại để đảm bảo đã khắc phục triệt để.
4. **Giới hạn an toàn:**
   - Vòng lặp tự sửa tối đa **3 lần**. Nếu sau 3 lần vẫn chưa đạt kết quả, dừng lại, lập báo cáo phân tích và xin chỉ dẫn từ người dùng (tránh lặp vô hạn).

---

### Bước 5: Lưu Trữ Đặc Tả OpenSpec (Archive Change)
Khi toàn bộ checklist trong `openspec/changes/<feature-name>/tasks.md` đã hoàn thành `[x]` và test vượt qua 100%:
1. Chạy lệnh lưu trữ OpenSpec để đồng bộ delta specs vào tài liệu hệ thống chính thức (`openspec/specs/`):
   ```bash
   openspec archive <feature-name>
   ```
2. Thao tác này đưa bộ đặc tả sống vào kho lưu trữ vĩnh viễn và dọn dẹp thư mục change.

---

### Bước 6: Hợp Nhất Code An Toàn Vào Nhánh Main (Safe Merge to Main)
Chỉ thực hiện bước này khi **100% test suites và type-check đều vượt qua**:
1. Commit toàn bộ thay đổi trên nhánh làm việc riêng theo chuẩn Conventional Commits:
   ```bash
   git add .
   git commit -m "feat(<task-id>): <nội dung hoàn thành chi tiết>"
   ```
2. Chuyển về nhánh `main` và đồng bộ:
   ```bash
   git checkout main
   git pull origin main
   ```
3. Hợp nhất nhánh feature vào `main` với flag `--no-ff` (để bảo toàn lịch sử commit theo nhánh):
   ```bash
   git merge feature/<task-id>-<ten-task> --no-ff -m "merge(<task-id>): hoàn thành và hợp nhất feature/<task-id>-<ten-task> vào main"
   ```
4. Xóa nhánh feature cục bộ đã hợp nhất để giữ kho mã nguồn gọn gàng:
   ```bash
   git branch -d feature/<task-id>-<ten-task>
   ```

---

### Bước 7: Triển Khai Lên Server Theo `safe-deploy.md`
Thực hiện nghiêm ngặt theo cấu hình của [.agents/workflows/safe-deploy.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/workflows/safe-deploy.md):
1. **Pre-flight Check:**
   ```bash
   git status --porcelain
   npm run lint
   npx tsc --noEmit
   ```
2. **Thẩm định cơ sở dữ liệu:** Chạy `python .agents/skills/db-migration/scripts/validate.py` để đảm bảo schema toàn vẹn.
3. **Đóng gói ứng dụng (Build):**
   ```bash
   npm run build:backend
   ```
4. **Đẩy mã nguồn nhánh main lên GitHub:**
   ```bash
   git push origin main
   ```
5. **Kiểm tra sức khỏe dịch vụ (Health Check):**
   - Kiểm tra `http://localhost:5000/health` phản hồi HTTP 200 OK.
6. **Nghiệm thu & Lưu trữ trạng thái:**
   - Cập nhật tệp [Task.md](file:///c:/Users/Dell/Desktop/ShopFlow/Task.md): Đánh dấu `[x]` TASK tương ứng, chuyển task sang `### ✅ TRẠNG THÁI: DONE (ĐÃ HOÀN THÀNH)`, và ghi dòng nhật ký mới vào bảng Progress Log.
   - Cập nhật tệp [.agents/memory/history.md](file:///c:/Users/Dell/Desktop/ShopFlow/.agents/memory/history.md) để lưu vết lịch sử phiên bản.
   - Cập nhật tệp `walkthrough.md` tổng kết các thay đổi.
   - Kết thúc lượt tương tác để kích hoạt hook âm thanh "ting".
