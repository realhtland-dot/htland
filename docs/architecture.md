# Kiến trúc hệ thống — REALTY MESSENGER CRM

## 1. Tổng quan kiến trúc

**Realty Messenger CRM** được thiết kế theo mô hình Full-Stack tách lớp, đảm bảo khả năng vận hành thời gian thực trên Cloud Preview và mở rộng triển khai trên VPS / Cloud Server với Docker, Nginx, PostgreSQL và Redis:

- **Frontend (React + TypeScript + Vite + Tailwind CSS v4 + TanStack Query + Zustand)**:
  - Giao diện quản trị SaaS 24 phân hệ chức năng, hỗ trợ Light Mode / Dark Mode và Responsive đa thiết bị.
  - Hộp thư Messenger 3 cột đồng bộ thời gian thực qua WebSocket (`/ws`) và Firestore Realtime Snapshot (`onSnapshot`).
- **Backend Gateway (Node.js + Express + WebSocket + TypeScript)**:
  - Xác thực Firebase ID Token (`firebase-admin/auth`).
  - Meta OAuth Callback (`/auth/callback`), Meta Graph API v21.0 Client & Send API với Exponential Backoff Retry.
  - Meta Webhook Receiver (`/api/webhooks/meta`) hỗ trợ xác minh Hub Challenge và kiểm tra chữ ký `X-Hub-Signature-256` bằng `crypto.timingSafeEqual`.
  - Kho lưu trữ Page Access Token mã hóa đối xứng **AES-256-GCM** ở server (`TOKEN_ENCRYPTION_KEY`), không bao giờ gửi Page Token về trình duyệt.
  - AI Service độc lập hỗ trợ chuyển đổi nhà cung cấp qua biến `AI_PROVIDER` (`gemini` hoặc `openai`), kết hợp bộ trích xuất & chuẩn hóa số điện thoại Việt Nam xác định (Deterministic Regex + Prefix Validation).
- **Lớp lưu trữ dữ liệu & Bảo mật**:
  - **Cloud Firestore + Firebase Security Rules (8 Pillars RBAC)**: Lưu trữ đa khách hàng, hội thoại, tin nhắn, phân công, lịch hẹn, tác vụ, sản phẩm BĐS, phân tích AI và nhật ký hoạt động theo thời gian thực.
  - **PostgreSQL Prisma Blueprint (`prisma/schema.prisma`)**: Bản thiết kế 40 bảng quan hệ đầy đủ cho môi trường VPS độc lập sử dụng Docker Compose + Redis + BullMQ.
