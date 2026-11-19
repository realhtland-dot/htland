# REALTY MESSENGER CRM

**Hệ thống quản lý tin nhắn Facebook Messenger đa Fanpage và CRM khách hàng Bất động sản**

## Tính năng cốt lõi
- **Hộp thư Messenger 3 cột thời gian thực**: Danh sách hội thoại đa Fanpage có bộ lọc nhanh (theo Page, nhân viên, trạng thái, có/không SĐT) -> Luồng tin nhắn đính kèm ảnh/tài liệu -> Hồ sơ CRM khách hàng chi tiết, thẻ phân loại, ghi chú và phân công Sale.
- **Kết nối nhiều Fanpage Facebook (Meta Graph API v21.0)**: Đăng nhập Facebook OAuth, chọn nhiều Fanpage cùng lúc, mã hóa Page Access Token AES-256-GCM ở server, đăng ký Webhook (`messages`, `messaging_postbacks`, `message_deliveries`, `message_reads`) và xác thực chữ ký `X-Hub-Signature-256`.
- **Trích xuất & Chuẩn hóa số điện thoại Việt Nam tự động**: Hỗ trợ `0987654321`, `0987 654 321`, `0987.654.321`, `+84987654321`, `84987654321`, chuẩn hóa về `0xxxxxxxxx`, chống trùng lặp số và không suy đoán nhầm giá bán / diện tích.
- **AI Phân tích nhu cầu Bất động sản**: Phân loại 10 ý định mua/bán/thuê/đầu tư, trích xuất khu vực (tỉnh/quận), khoảng ngân sách, diện tích, yêu cầu pháp lý, chấm điểm Lead (`0 - 100`) và gợi ý hành động tiếp theo. Cho phép chuyển đổi nhà cung cấp AI (`gemini` / `openai`) qua biến môi trường.
- **CRM Bất động sản toàn diện (24 màn hình)**: Dashboard 10 KPI & 7 biểu đồ theo ngày/tuần/tháng/năm, quản lý khách hàng (trùng lặp, gộp hồ sơ, nhập/xuất Excel), 12 trạng thái chăm sóc chuẩn Việt Nam, nhắc việc, lịch hẹn xem BĐS, kho sản phẩm BĐS, phân quyền RBAC 4 cấp (`Super Admin`, `Admin`, `Trưởng nhóm`, `Sale`), báo cáo nhân viên, nhật ký kiểm toán và Light/Dark Mode.

## Khởi chạy phát triển cục bộ
```bash
npm install
npm run dev
```
Ứng dụng chạy tại `http://localhost:3000`.

## Chạy kiểm thử tự động & Kiểm tra build
```bash
npm test
npm run lint
npm run build
```

## Tài liệu chi tiết
- [Kiến trúc hệ thống](docs/architecture.md)
- [Thiết kế Database & ERD (40 bảng)](docs/database-erd.md)
- [Tài liệu REST API & Swagger](docs/api-documentation.md)
- [Hướng dẫn kết nối Meta Developer & Webhook](docs/meta-integration.md)
- [Hướng dẫn triển khai VPS / Docker / HTTPS](docs/deployment.md)
