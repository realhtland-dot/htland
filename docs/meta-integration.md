# Hướng dẫn cấu hình Meta Developer & Kết nối nhiều Fanpage

## 1. Tạo ứng dụng trên Meta for Developers
1. Truy cập `https://developers.facebook.com/apps` và chọn **Tạo ứng dụng (Create App)**.
2. Chọn loại ứng dụng **Business** hoặc **Other -> Business**, đặt tên ứng dụng (ví dụ: `Realty Messenger CRM`).
3. Thêm 2 sản phẩm chính:
   - **Facebook Login for Business**
   - **Messenger**

## 2. Cấu hình Facebook Login OAuth
Trong mục **Facebook Login for Business -> Settings**, thêm các **Valid OAuth Redirect URIs**:
- Môi trường Phát triển (Dev):
  `https://ais-dev-qt6rte46xizqrobsgw23xz-893402446786.asia-northeast1.run.app/auth/callback`
- Môi trường Chia sẻ (Production / Preview):
  `https://ais-pre-qt6rte46xizqrobsgw23xz-893402446786.asia-northeast1.run.app/auth/callback`
- Nếu triển khai trên tên miền riêng (VPS):
  `https://<ten-mien-cua-ban>/auth/callback`

## 3. Quyền Facebook cần cấp (Permissions)
- `pages_show_list`: Lấy danh sách Fanpage quản trị viên sở hữu.
- `pages_messaging`: Nhận và gửi tin nhắn Messenger thay mặt Fanpage.
- `pages_manage_metadata`: Đăng ký ứng dụng nhận Webhook cho Fanpage (`/{page-id}/subscribed_apps`).
- `pages_read_engagement`: Đọc thông tin cơ bản của Fanpage.

## 4. Cấu hình Meta Webhooks
1. Trong mục **Messenger -> Messenger API Settings -> Webhooks**, nhấn **Configure**.
2. Điền **Callback URL**:
   - Dev: `https://ais-dev-qt6rte46xizqrobsgw23xz-893402446786.asia-northeast1.run.app/api/webhooks/meta`
   - Shared / Prod: `https://ais-pre-qt6rte46xizqrobsgw23xz-893402446786.asia-northeast1.run.app/api/webhooks/meta`
3. Điền **Verify Token** khớp với biến môi trường `META_WEBHOOK_VERIFY_TOKEN`.
4. Nhấn **Verify and Save**, sau đó chọn đăng ký (Subscribe) các trường:
   - `messages`
   - `messaging_postbacks`
   - `message_deliveries`
   - `message_reads`

## 5. Bảo mật chữ ký & Token
- Biến `META_APP_SECRET` dùng để xác thực header `X-Hub-Signature-256` trên mọi request `POST /api/webhooks/meta`.
- Biến `TOKEN_ENCRYPTION_KEY` dùng để mã hóa `Page Access Token` bằng AES-256-GCM trước khi lưu trữ.
