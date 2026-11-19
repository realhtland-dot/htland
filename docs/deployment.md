# Hướng dẫn triển khai VPS / Cloud Server (Docker + Nginx + HTTPS)

## 1. Yêu cầu máy chủ
- Ubuntu 22.04 / 24.04 LTS (tối thiểu 2 vCPU, 4GB RAM).
- Docker Engine `>= 24` & Docker Compose v2.
- Tên miền trỏ bản ghi DNS A về IP máy chủ (bắt buộc để Meta Webhook chấp nhận HTTPS hợp lệ).

## 2. Cấu hình biến môi trường
Sao chép `.env.example` thành `.env` và điền đầy đủ thông số:
```bash
cp .env.example .env
```
Các khóa quan trọng cần thiết lập trên VPS:
- `APP_URL=https://crm.tenmiencuaban.vn`
- `GEMINI_API_KEY=...` (hoặc `AI_PROVIDER=openai` kèm `OPENAI_API_KEY=...`)
- `META_APP_ID=...`
- `META_APP_SECRET=...`
- `META_WEBHOOK_VERIFY_TOKEN=...`
- `TOKEN_ENCRYPTION_KEY=<chuỗi bí mật 32+ ký tự ngẫu nhiên>`
- `POSTGRES_PASSWORD=<mật khẩu mạnh>`

## 3. Cấp chứng chỉ SSL Let's Encrypt & Khởi chạy Docker
1. Cập nhật `server_name` và đường dẫn SSL trong `infrastructure/nginx/nginx.conf`.
2. Tạo chứng chỉ SSL bằng Certbot:
   ```bash
   sudo certbot certonly --standalone -d crm.tenmiencuaban.vn
   ```
3. Khởi động toàn bộ dịch vụ (`app`, `postgres`, `redis`, `nginx`):
   ```bash
   docker compose up -d --build
   ```
4. Áp dụng schema PostgreSQL (nếu chạy với Postgres độc lập):
   ```bash
   npx prisma migrate deploy
   ```

## 4. Kiểm tra sau triển khai
- Truy cập `https://crm.tenmiencuaban.vn/api/health` -> trả về `{"status":"ok"}`.
- Truy cập `https://crm.tenmiencuaban.vn/api/docs` -> hiển thị tài liệu OpenAPI.
- Kiểm tra logs: `docker compose logs -f app nginx`.
