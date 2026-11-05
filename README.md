# Trà Đá Vỉa Hè 🍵

Quán trà đá vỉa hè ảo, nơi người lạ vào ngồi chill cuối ngày. Không camera, không chat tự do.
Tương tác chỉ gồm ba thứ: **phản ứng nhanh** (biểu tượng có sẵn), **một dòng chuyện ngắn** (tối đa 80 chữ) cho mỗi chủ đề tuần trà, và **đãi nhau ly trà**. Giao diện hoàn toàn tiếng Việt, tái hiện không khí chiều tối Hà Nội / Sài Gòn.

---

## 1. Cấu trúc Monorepo

```
tra-da-via-he/
├── shared/             # Kiểu dữ liệu TypeScript, hàm thuần dùng chung, schema giao thức
│   ├── src/
│   │   ├── round.ts        # Thuật toán tính tuần trà (30 phút :00 & :30)
│   │   ├── time.ts         # Tính giờ Việt Nam (UTC+7, ranh giới ngày 0h)
│   │   ├── seats.ts        # Toạ độ 14 chỗ ngồi vỉa hè & bàn
│   │   ├── avatars.ts      # Danh sách nhân vật, tâm trạng
│   │   ├── topics.ts       # Thuật toán chọn chủ đề ngẫu nhiên có seed
│   │   ├── clockSync.ts    # Bù lệch giờ NTP client - server
│   │   ├── economy.ts      # Mã khôi phục, chuỗi ngày, tuần bắt đầu 4h sáng thứ Hai
│   │   ├── youtube.ts      # Regex parse URL YouTube & start timestamp
│   │   └── accessories.ts  # Tủ đồ phụ kiện mở khoá theo chuỗi ngày & lời chào bà chủ
├── server/             # Backend Node.js 20 + WebSocket + SQLite (better-sqlite3)
│   ├── src/
│   │   ├── index.ts        # HTTP server & endpoint (/health, /time, /topic)
│   │   ├── gameServer.ts   # WebSocket server (/ws), kiểm tra Origin
│   │   ├── room.ts         # Quản lý phiên, tranh chấp ghế, rate-limit, tick
│   │   ├── dbStore.ts      # SQLite: users, recovery_codes, daily_stats, streaks, stories, radio_queue
│   │   └── filter.ts       # Lọc sạch HTML, chặn link, số điện thoại, từ ngữ thô tục
│   └── data/
│       ├── topics.vi.json  # 40+ chủ đề trò chuyện nhẹ nhàng
│       └── blocklist.vi.json # Danh sách từ cấm
├── client/             # Frontend Vite + TypeScript + Three.js
│   ├── src/
│   │   ├── main.ts         # Điểm khởi động, vòng lặp Three.js, xử lý raycast
│   │   ├── scene/          # Dựng thế giới 3D vỉa hè, xe cộ instanced, ánh sáng ngày đêm, nhân vật
│   │   ├── interactionHud.ts # HUD DOM giao diện người dùng
│   │   ├── radio.ts        # Tích hợp YouTube IFrame API đồng bộ
│   │   ├── audio.ts        # Web Audio API tổng hợp âm thanh môi trường
│   │   ├── ws.ts           # WebSocket client tự động kết nối lại
│   │   └── onboarding.ts   # Màn hình chọn nhân vật, đặt tên, vào quán
└── docs/
    └── SPEC.md         # Toàn bộ đặc tả kỹ thuật chi tiết
```

---

## 2. Hướng dẫn chạy thử trên máy cục bộ (Local Development)

### Yêu cầu
- Node.js >= 20.x
- npm

### Cài đặt và khởi chạy:
```bash
# 1. Cài đặt toàn bộ dependencies cho monorepo
npm install

# 2. Chạy cả client (cổng 5173) và server (cổng 8787)
npm run dev
```

Truy cập trình duyệt tại:
- **Client**: `http://localhost:5173`
- **Server Health**: `http://localhost:8787/health`

### Chạy kiểm tra (Tests & Lint):
```bash
# Chạy toàn bộ 93 unit/integration test bằng Vitest
npm test

# Chạy kiểm tra kiểu dữ liệu TypeScript
npm run typecheck

# Chạy ESLint
npm run lint
```

---

## 3. Các tính năng cốt lõi

1. **Tuần trà 30 phút**:
   - Đổi nhịp đồng bộ đúng lúc `:00` và `:30` dựa trên server time.
   - Ly trà đá tan dần theo tiến độ (`progress`), hết tuần bà chủ quán tự động rót lại.
2. **Ánh sáng & Xe cộ theo thời gian thực (Giờ VN - UTC+7)**:
   - Sáng sớm mát mẻ, trưa nắng, chiều vàng, 18h–21h đèn đường và đèn quán lên dần, khuya vắng vẻ.
   - Xe cộ instanced chạy ngang đường với mật độ thay đổi theo giờ tan tầm.
3. **Realtime không độ trễ**:
   - Tranh chấp ghế: Người đến trước được ngồi, ghế tự giải phóng sau 45s mất mạng.
   - 6 phản ứng nhanh kèm animation cử động và bong bóng bay bổng.
   - Chuyện quán: Bong bóng thoại 30 giây trên đầu và lưu vào Bảng phấn.
   - Đãi trà đặc biệt cho bạn ngồi cạnh.
4. **Kinh tế & Khách quen**:
   - Ngồi đủ ≥ 80% tuần trà (+1 tiền lẻ, tối đa 10 xu/ngày).
   - Chuỗi ngày (Streak) tăng khi ghé quán đều đặn.
   - Bảng xếp hạng Khách quen của tuần tính từ 4h sáng thứ Hai (tối đa 16 tuần trà/ngày).
   - Mã khôi phục 10 ký tự lưu giữ danh tính và tiền lẻ trên mọi thiết bị.
5. **Loa thùng của quán**:
   - Đặt bài hát YouTube bằng tiền lẻ (1 xu/bài, tối đa 2 bài/người).
   - Mọi người cùng nghe đồng bộ tại đúng mốc thời gian của bài hát.
6. **Âm thanh & PWA**:
   - Slider âm thanh môi trường: xe cộ, ve đêm, quạt máy, mưa rào, tiếng rao hàng.
   - Hỗ trợ cài đặt màn hình chính (Add to Home Screen) trên iPhone và Android.

---

## 4. Hướng dẫn triển khai (Deployment)

### Biến môi trường (`.env`):
- `PORT`: Cổng server chạy (mặc định: `8787`).
- `CLIENT_ORIGIN`: Danh sách origin của client được phép truy cập (phân tách bởi dấu phẩy, ví dụ: `https://tra-da-via-he.pages.dev,http://localhost:5173`).
- `DB_PATH`: Đường dẫn lưu file SQLite (mặc định: `server/data/tradavia.db`).

### Triển khai Client (Cloudflare Pages hoặc Vercel):
- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Thêm biến môi trường: `VITE_API_URL=https://api.yourdomain.com`

### Triển khai Server (Fly.io hoặc Railway):
- Chạy trên container Node.js 20.
- Khởi động: `npm run start -w server`
- Cấu hình Volume lưu trữ cho file SQLite (`tradavia.db`) để dữ liệu không bị mất khi restart container.
- Sao lưu file SQLite định kỳ hằng ngày bằng lệnh sqlite backup hoặc cronjob.

---

## 5. Hướng dẫn mở rộng

- **Thêm chủ đề mới**: Chỉnh sửa file `server/data/topics.vi.json`, server sẽ tự động xáo trộn theo vòng lặp ngẫu nhiên mà không trùng lặp tuần liên tiếp.
- **Thay thế Model 3D thật (KayKit Adventurers)**: Đặt các file model glTF vào thư mục `client/public/models/`. Hệ thống được thiết kế theo module decoupled tại `client/src/scene/character.ts` để thay thế hình khối mà không phải sửa logic game.
- **Xử lý báo cáo nội dung**: Khi một câu chuyện nhận đủ 3 lượt báo cáo từ 3 người dùng khác nhau, server sẽ tự động đặt trạng thái `hidden = 1` và phát thông báo `storyHidden` ngay lập tức để ẩn câu chuyện khỏi bảng phấn của mọi người.

