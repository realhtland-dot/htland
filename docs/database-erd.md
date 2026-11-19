# Thiết kế cơ sở dữ liệu & ERD (40 Bảng PostgreSQL / Firestore Blueprint)

Tệp `prisma/schema.prisma` định nghĩa đầy đủ 40 thực thể nghiệp vụ CRM Bất động sản và Facebook Messenger, hỗ trợ khóa ngoại, chỉ mục tìm kiếm nhanh (`primaryPhone`, `pageId`, `lastMessageAt`), xóa mềm (`deletedAt`) và dấu thời gian UTC.

## Nhóm 1: Tài khoản, Phân quyền & Đội nhóm
1. `users` — Hồ sơ nhân viên & trạng thái hoạt động
2. `roles` — 4 vai trò chuẩn (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `SALE`)
3. `permissions` — Danh mục quyền chi tiết theo module
4. `user_roles` — Gán vai trò cho nhân viên
5. `teams` — Nhóm kinh doanh theo khu vực
6. `team_members` — Thành viên thuộc nhóm
7. `refresh_tokens` — Quản lý phiên đăng nhập & thu hồi token

## Nhóm 2: Facebook Fanpage & Webhook
8. `facebook_accounts` — Tài khoản Facebook quản trị viên đã OAuth
9. `facebook_pages` — Fanpage kết nối, trạng thái token & webhook
10. `facebook_page_permissions` — Phân quyền nhân viên phụ trách từng Fanpage
11. `webhook_events` — Nhật ký raw event từ Meta & chống trùng lặp (`eventKey`)
12. `webhook_subscriptions` — Theo dõi field đã đăng ký (`messages`, `messaging_postbacks`, `message_deliveries`, `message_reads`)

## Nhóm 3: Khách hàng & Hội thoại Messenger
13. `customers` — Hồ sơ khách hàng tổng hợp (tên, SĐT chính, trạng thái 12 bước, điểm AI)
14. `customer_phones` — Danh sách nhiều số điện thoại chuẩn hóa (`0xxxxxxxxx`)
15. `customer_social_accounts` — Định danh PSID Facebook theo từng Fanpage
16. `customer_sources` — Nguồn khách hàng (Messenger, Chạy Ads, Giới thiệu, Web)
17. `conversations` — Hội thoại hợp nhất theo `(facebookPageId, psid)`
18. `conversation_assignments` — Lịch sử & nhân viên phụ trách hội thoại
19. `messages` — Tin nhắn khách hàng / nhân viên kèm `extractedPhones`
20. `message_attachments` — Tệp đính kèm ảnh, PDF, tài liệu mặt bằng
21. `message_statuses` — Trạng thái gửi (`QUEUED`, `SENT`, `DELIVERED`, `READ`, `FAILED`)

## Nhóm 4: Chăm sóc, Bất động sản & Phân loại
22. `tags` — Danh mục thẻ phân loại dùng chung
23. `customer_tags` — Thẻ gắn nhanh trên hồ sơ khách hàng
24. `customer_tag_relations` — Quan hệ nhiều-nhiều khách hàng & thẻ
25. `customer_notes` — Ghi chú nội bộ của nhân viên Sale
26. `customer_activities` — Dòng thời gian tương tác, gọi điện, đổi trạng thái
27. `customer_assignments` — Phân công nhân viên chăm sóc khách hàng
28. `property_interests` — Nhu cầu BĐS chi tiết (loại, tỉnh/quận, ngân sách, diện tích, pháp lý)
29. `properties` — Kho sản phẩm bất động sản (mã BĐS, giá, diện tích, pháp lý, hình ảnh)
30. `appointments` — Lịch hẹn xem đất / xem nhà thực tế
31. `tasks` — Nhắc việc chăm sóc (Gọi điện, Nhắn tin, Gửi tài liệu)

## Nhóm 5: AI, Thông báo & Quản trị hệ thống
32. `lead_scores` — Lịch sử chấm điểm tiềm năng (`0 - 100`)
33. `ai_analyses` — Kết quả JSON phân tích nhu cầu BĐS từ Gemini/OpenAI
34. `ai_prompts` — Cấu hình mẫu prompt AI linh hoạt
35. `notification_settings` — Tùy chọn nhận thông báo theo nhân viên
36. `notifications` — Thông báo nội bộ (tin nhắn mới, có SĐT, phân công, lịch hẹn)
37. `audit_logs` — Nhật ký kiểm toán hành động toàn hệ thống
38. `system_settings` — Cấu hình phân công tự động, lưu trữ dữ liệu, nhà cung cấp AI
39. `api_integrations` — Quản lý tích hợp Meta Graph API, Gemini, OpenAI, Webhooks
40. `automation_rules` — Quy tắc tự động hóa gán nhãn và phân công nhân viên

Chi tiết cấu trúc dữ liệu Firestore đang chạy trực tiếp được mô tả tại `/firebase-blueprint.json` và bảo vệ bởi `/firestore.rules`.
