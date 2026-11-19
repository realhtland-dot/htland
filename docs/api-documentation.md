# Tài liệu REST API & OpenAPI (Swagger)

Hệ thống cung cấp tài liệu OpenAPI 3.0 trực tiếp tại:
- JSON Schema: `GET /api/openapi.json`
- Giao diện API Docs: `GET /api/docs`

## Danh sách Endpoint chính

| Method | Đường dẫn | Xác thực | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Công khai | Kiểm tra tình trạng server, thời gian hoạt động và cấu hình AI |
| `GET` | `/api/openapi.json` | Công khai | Đặc tả OpenAPI 3.0 cho công cụ tích hợp |
| `GET` | `/api/docs` | Công khai | Giao diện xem tài liệu API trực quan |
| `GET` | `/api/facebook/config-status` | Bearer Token | Trả về URL Callback OAuth, Webhook URL và trạng thái Meta App |
| `GET` | `/api/facebook/oauth` | Bearer Token | Khởi tạo liên kết Facebook Login OAuth (`pages_show_list`, `pages_messaging`) |
| `GET` | `/auth/callback` | Meta Redirect | Đổi mã `code` lấy User Token và lấy `/me/accounts`, mã hóa Page Token |
| `POST` | `/api/facebook/pages/:pageId/subscribe` | Bearer Token | Đăng ký Webhook (`subscribed_apps`) cho Fanpage |
| `POST` | `/api/facebook/pages/:pageId/send` | Bearer Token | Gửi tin nhắn hoặc tệp qua Meta Send API (`v21.0`) |
| `DELETE` | `/api/facebook/pages/:pageId/token` | Bearer Token | Xóa Page Access Token khỏi kho mã hóa server khi ngắt kết nối |
| `GET` | `/api/webhooks/meta` | Verify Token | Xác minh `hub.verify_token` & trả về `hub.challenge` |
| `POST` | `/api/webhooks/meta` | `X-Hub-Signature-256` | Tiếp nhận tin nhắn Messenger từ Meta, trích xuất SĐT và phát qua WebSocket |
| `POST` | `/api/sandbox/simulate-webhook` | Bearer Token | Gửi sự kiện tin nhắn mẫu (khi đang kiểm thử nội bộ chưa gắn App Meta thật) |
| `POST` | `/api/phones/extract` | Bearer Token | Trích xuất & chuẩn hóa SĐT Việt Nam (`0xxxxxxxxx`) |
| `POST` | `/api/ai/analyze` | Bearer Token | Phân tích nhu cầu BĐS bằng Gemini / OpenAI và trả về JSON chuẩn hóa |
