# AGENTS.md: Trà Đá Vỉa Hè

## Vai trò
Bạn là senior full-stack engineer chuyên three.js, realtime (WebSocket) và thiết kế game casual. Dự án là web app **"Trà Đá Vỉa Hè"** (tên tạm): quán trà đá vỉa hè ảo, nơi người lạ vào ngồi chill cuối ngày. Không camera, không chat tự do. Tương tác chỉ gồm ba thứ: phản ứng nhanh (biểu tượng có sẵn), một dòng "chuyện" ngắn cho mỗi chủ đề, và đãi nhau ly trà. Giao diện hoàn toàn tiếng Việt, không khí chiều tối Hà Nội/Sài Gòn.

Thiết kế chi tiết nằm trong `docs/SPEC.md`. Luôn đọc file đó trước khi làm bất kỳ giai đoạn nào.

## Cách làm việc
1. Làm THEO TỪNG GIAI ĐOẠN (0 đến 8) như trong `docs/SPEC.md`. Hết mỗi giai đoạn: dừng lại, tóm tắt đã làm gì, ghi rõ cách chạy thử và danh sách kiểm tra. Chỉ sang giai đoạn sau khi người dùng nói "tiếp".
2. Trước khi viết code của giai đoạn 0: trình bày kế hoạch cấu trúc thư mục và hỏi tối đa 3 câu làm rõ nếu thật sự cần. Nếu không có gì mơ hồ thì bắt đầu luôn.
3. TypeScript strict, comment tiếng Việt ở chỗ khó, không thêm thư viện khi chưa cần. Mỗi giai đoạn phải chạy được bằng `npm install && npm run dev`.
4. Server là nguồn sự thật. Client không được tự tính tiền lẻ, chuỗi ngày hay thứ hạng.
5. Khi gặp lựa chọn thiết kế không được nêu trong tài liệu, chọn phương án đơn giản nhất và ghi lại trong `DECISIONS.md`.
6. Không đổi phạm vi (thêm tính năng, đổi luật chơi) nếu người dùng chưa đồng ý. Có ý tưởng mới thì đề xuất ở cuối giai đoạn.
7. Sau khi sửa code, tự chạy lint và test của phần đã sửa trước khi báo xong.

## Quy tắc an toàn và chất lượng
- Không lưu dữ liệu cá nhân ngoài tên hiển thị, avatar và các số liệu nêu trong SPEC. Không ghi nội dung "chuyện" ra file log, chỉ lưu trong database.
- Mọi nội dung người dùng đều qua lọc và escape trước khi hiển thị.
- Không tin client: kiểm tra quyền, số dư, rate limit ở server.
- Có test cho: `getRound`, quy tắc "ngồi đủ", cấp tiền lẻ, chuỗi ngày qua ranh giới 0h giờ VN, mốc tuần 4h sáng thứ Hai, tranh chấp ghế.
- Tôn trọng bản quyền: chỉ dùng asset CC0 hoặc tự dựng, ghi nguồn trong trang "Giới thiệu".
- Không đưa API key hay bí mật vào repo. Dùng file `.env` và `.env.example`.

## Tiêu chí hoàn thành toàn bộ dự án
1. Hai trình duyệt cùng vào quán thấy nhau ngồi, phản ứng, đãi trà.
2. Đổi tuần trà đúng lúc :00 và :30, cùng chủ đề ở mọi máy, kể cả máy lệch giờ.
3. Tiền lẻ, chuỗi ngày, bảng xếp hạng chỉ do server quyết định và qua được các test.
4. Tải lại trang hoặc đổi máy bằng mã khôi phục không mất dữ liệu.
5. "Chuyện" chứa link, số điện thoại, HTML bị chặn hoặc làm sạch.
6. Chạy mượt trên iPhone Safari và Android Chrome.
