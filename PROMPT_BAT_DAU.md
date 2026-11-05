# Cách dùng bộ file này với Antigravity

## Chuẩn bị (làm một lần)
1. Tạo một thư mục trống, ví dụ `tra-da-via-he`, rồi chép vào đó toàn bộ cấu trúc sau:
   ```
   tra-da-via-he/
   ├── AGENTS.md
   ├── docs/SPEC.md
   └── server/data/topics.vi.json
   ```
2. Mở thư mục này trong Antigravity (File > Open Folder).
3. (Tuỳ chọn) Tải gói KayKit Adventurers (CC0) và để vào `client/public/models/`. Nếu chưa có, AI sẽ dùng hình khối thay thế.
4. Chọn model cho agent (Claude hoặc Gemini). Nên bật chế độ cho phép agent chạy terminal và dùng trình duyệt để tự kiểm tra `localhost`.

## Prompt 1: dán vào chat agent để bắt đầu

```
Hãy đọc AGENTS.md và docs/SPEC.md ở gốc dự án, tuân thủ đúng mọi quy tắc trong đó.

Việc cần làm bây giờ:
1. Tóm tắt trong 5 dòng bạn hiểu dự án này là gì.
2. Đề xuất cấu trúc thư mục đầy đủ cho monorepo (client, server, shared).
3. Nếu có điểm mơ hồ thật sự, hỏi tôi tối đa 3 câu. Nếu không, bắt đầu luôn.
4. Làm GIAI ĐOẠN 0 trong docs/SPEC.md, và chỉ giai đoạn 0.

Khi xong giai đoạn 0, hãy dừng lại, tóm tắt những gì đã làm, hướng dẫn tôi chạy thử và liệt kê các mục kiểm tra. Đừng sang giai đoạn 1 khi tôi chưa nói "tiếp".
```

## Prompt cho các lần sau

Sau khi kiểm tra xong mỗi giai đoạn, dán:

```
Giai đoạn vừa rồi đã ổn. Tiếp tục với GIAI ĐOẠN <số> trong docs/SPEC.md.
Làm đúng phạm vi của giai đoạn đó, chạy test và lint trước khi báo xong,
rồi dừng lại để tôi kiểm tra.
```

Nếu có lỗi:

```
Khi kiểm tra giai đoạn <số> tôi gặp lỗi sau: <dán lỗi hoặc mô tả>.
Hãy tìm nguyên nhân gốc, sửa, thêm test để lỗi này không quay lại,
rồi cho tôi cách kiểm tra lại. Đừng thêm tính năng mới.
```

Nếu muốn agent tự kiểm tra bằng trình duyệt (giai đoạn 1 trở đi):

```
Hãy chạy dự án, mở trình duyệt vào localhost, tự kiểm tra các mục trong phần
"Kiểm tra" của giai đoạn hiện tại và báo kết quả kèm ảnh chụp màn hình nếu được.
Nếu có mục không đạt thì sửa rồi kiểm tra lại.
```

## Mẹo
- Giai đoạn 5 (tiền lẻ, chuỗi ngày) và giai đoạn 6 (đồng bộ YouTube) dễ lỗi nhất. Hãy yêu cầu viết test trước khi viết code.
- Mỗi giai đoạn xong nên commit git một lần để dễ quay lại.
- Muốn đổi luật chơi (tỉ lệ ngồi đủ, giới hạn tiền lẻ, độ dài chuyện), sửa hằng số trong `docs/SPEC.md` mục 2 rồi báo agent cập nhật `/shared`.
- Nếu đổi sang VS Code + Claude Code, dùng đúng các file này: Claude Code đọc `CLAUDE.md`, nên chỉ cần đổi tên `AGENTS.md` thành `CLAUDE.md` (hoặc tạo `CLAUDE.md` chứa dòng "Đọc AGENTS.md").
