# SPEC: Trà Đá Vỉa Hè

## 1. Tech stack
- Monorepo npm workspaces: `/client` (Vite + TypeScript + three.js), `/server` (Node.js 20 + `ws` + `better-sqlite3`), `/shared` (kiểu dữ liệu, hằng số, hàm thuần dùng chung như `getRound`).
- Âm thanh: Howler.js. Nhạc trên loa: YouTube IFrame API (chỉ nhúng chính thức, không tách audio).
- Nhân vật: KayKit Adventurers (CC0, glTF). Đồ vật (ghế nhựa, bàn thấp, ly, ấm trà, xe máy, biển hiệu, loa thùng) tự dựng bằng hình khối three.js. Khi có model thật trong `/client/public/models` thì thay được mà không đổi logic.
- Test: Vitest. Lint: ESLint + Prettier.
- Không đăng nhập. Danh tính là `userId` ẩn danh.

## 2. Ý tưởng game

### Không gian
Vỉa hè quán trà đá: ghế nhựa thấp (đỏ/xanh), bàn nhỏ, ấm trà, ly thuỷ tinh, đĩa hạt dưa và kẹo lạc, xe máy đỗ, biển hiệu viết tay, bà chủ quán (NPC) ngồi pha trà, loa thùng cũ. 14 chỗ ngồi quanh vài bàn và dọc vỉa hè.

### Tuần trà
Cả quán dùng chung một nhịp **30 phút** (đổi lúc :00 và :30). `roundIndex = floor(serverNowMs / 1_800_000)`. Mỗi tuần trà có một chủ đề do server chọn xác định theo `roundIndex`, nên ai cũng thấy cùng chủ đề. Ly trà của mỗi người có đá tan dần theo `progress` của tuần trà; hết tuần thì bà chủ rót lại. Không có pomodoro.

### Ngày đêm theo giờ thực (Asia/Ho_Chi_Minh)
Sáng sớm vắng và mát, trưa nắng, chiều nắng vàng, 18h đến 21h đèn đường và đèn quán lên dần, khuya vắng xe. Thỉnh thoảng có mưa rào (ngẫu nhiên có seed theo `roundIndex`, để mọi người cùng thấy mưa).

### Ba tương tác
- **Phản ứng nhanh** (không gõ chữ): `haha`, `thuong`, `hong`, `cangly`, `om`, `unhi`. Nhân vật mục tiêu chạy animation và có biểu tượng bay lên. Giới hạn 1 phản ứng mỗi 2 giây.
- **Chuyện của tôi**: mỗi người đăng 1 dòng tối đa 80 ký tự cho mỗi chủ đề. Hiện thành bong bóng trên đầu nhân vật 30 giây, sau đó vào "bảng phấn" của quán. Có lọc ở server và nút báo cáo.
- **Đãi trà**: tốn 1 tiền lẻ, tặng một ly trà đặc biệt cho người ngồi cạnh. Người nhận thấy ly mới và thông báo nhẹ "Ai đó đãi bạn ly trà" (không lộ tên người tặng trừ khi người tặng đồng ý).

### Kinh tế và tiến trình
- **Tuần trà "ngồi đủ"**: người dùng ngồi ít nhất 80% thời gian của tuần trà đó (≥ 1440 giây). Server cộng dồn `seatedSeconds` theo từng người và từng `roundIndex`, chốt khi tuần trà kết thúc.
- **Tiền lẻ**: +1 cho mỗi tuần trà ngồi đủ, tối đa 10 mỗi ngày (theo giờ VN). Dùng để đãi trà (1) và đặt bài lên loa (1).
- **Khách quen**: chuỗi ngày tăng 1 nếu trong ngày có ít nhất một tuần trà ngồi đủ, về 0 nếu bỏ một ngày. Mốc 3, 7, 30 ngày mở khoá phụ kiện và lời chào riêng của bà chủ.
- **Khách quen của tuần**: bảng phấn top 10 theo số tuần trà ngồi đủ, tuần bắt đầu 4h sáng thứ Hai giờ VN, mỗi ngày tính tối đa 16 tuần trà (8 giờ).
- **Mã khôi phục**: 10 ký tự dễ đọc (bỏ 0/O/1/I/L), dùng để lấy lại tên, nhân vật, tiền lẻ, chuỗi ngày trên máy khác.

## 3. Giao thức realtime (đặt trong `/shared`)

```ts
type Reaction = 'haha' | 'thuong' | 'hong' | 'cangly' | 'om' | 'unhi';

type ClientMessage =
  | { t: 'join'; userId: string; name: string; avatar: string; mood: string }
  | { t: 'sit'; seatId: string }
  | { t: 'stand' }
  | { t: 'react'; kind: Reaction; targetSeatId?: string }
  | { t: 'story'; text: string }
  | { t: 'treat'; targetSeatId: string }
  | { t: 'reportStory'; storyId: string }
  | { t: 'queueSong'; url: string }
  | { t: 'ping' };

type ServerMessage =
  | { t: 'welcome'; serverTime: number; you: PublicUser; seats: SeatState[];
      online: number; round: RoundInfo; stories: Story[]; coins: number; streak: number }
  | { t: 'seatChanged'; seat: SeatState }
  | { t: 'reaction'; fromSeatId: string; toSeatId?: string; kind: Reaction }
  | { t: 'storyPosted'; story: Story }
  | { t: 'storyHidden'; storyId: string }
  | { t: 'treatReceived'; toSeatId: string }
  | { t: 'roundChanged'; round: RoundInfo }
  | { t: 'coinsUpdated'; coins: number; streak: number }
  | { t: 'radio'; current: RadioItem | null; queue: RadioItem[] }
  | { t: 'error'; code: ErrorCode; message: string };
```

Mọi message đều được server kiểm tra schema (dùng zod hoặc tự viết), sai thì bỏ qua và trả `error`.

## 4. Schema SQLite

```
users(id, name, avatar, coins, created_at, last_seen_at)
recovery_codes(code, user_id)
round_presence(user_id, round_index, seated_seconds, awarded)
daily_stats(user_id, day, full_rounds, coins_earned)
streaks(user_id, current, best, last_day)
stories(id, user_id, round_index, text, hidden, created_at)
reports(story_id, reporter_id, created_at)
radio_queue(id, user_id, video_id, start_sec, status, created_at)
```

Index theo `(round_index)`, `(day)`, `(user_id)`. Dùng transaction cho các thao tác trừ và cộng tiền lẻ.

## 5. Các giai đoạn

### Giai đoạn 0: Khung dự án
Monorepo, tsconfig strict, ESLint + Prettier, script `dev` chạy cả client và server. `/shared` xuất kiểu, hằng số (`ROUND_MS=1_800_000`, `FULL_ROUND_RATIO=0.8`, `STORY_MAX=80`, `DAILY_COIN_CAP=10`, `QUEUE_PER_USER=2`) và hàm thuần `getRound(nowMs)` có unit test (Vitest).
**Kiểm tra:** `npm run dev` mở được trang trống và server trả `/health`.

### Giai đoạn 1: Cảnh 3D tĩnh
Dựng vỉa hè theo mô tả. Camera nghiêng góc isometric, FOV nhỏ, kéo/pan/zoom có giới hạn, hỗ trợ cảm ứng. Danh sách chỗ ngồi là mảng `SEATS` trong `/shared`. Ghế trống có vòng sáng nhấp nháy, hover/tap thì sáng hơn. Ánh sáng và bầu trời đổi theo giờ VN. Xe máy chạy ngang bằng instancing. Tối ưu 60fps trên điện thoại: `pixelRatio ≤ 2`, bỏ shadow nặng trên mobile, dùng `InstancedMesh` khi lặp.
**Kiểm tra:** mở trên iPhone Safari mượt, đổi giờ máy thì ánh sáng đổi.

### Giai đoạn 2: Tuần trà và nhân vật ngồi
Client đo độ lệch giờ với server khi kết nối rồi dùng `getRound(Date.now() + offset)`. Hiện chủ đề và thanh tiến độ tuần trà ở góc màn hình. Ly trà đá có đá thu nhỏ theo `progress`. Bấm ghế trống để ngồi, nhân vật ngồi và chạy animation idle, thỉnh thoảng quạt tay hoặc uống trà. Onboarding: tên (≤ 20 ký tự), chọn nhân vật, chọn tâm trạng hôm nay, chỗ ngồi ưa thích, nút "Vào quán 🍵".
**Kiểm tra:** hai tab hiện cùng `roundIndex` và cùng giây dù đổi giờ máy.

### Giai đoạn 3: Realtime và tương tác
Server WebSocket, mỗi quán là một room (bắt đầu với 1 quán, code sẵn để mở rộng). Xử lý tranh chấp ghế (người đến trước thắng). Heartbeat 20 giây, quá 45 giây không có tín hiệu thì giải phóng ghế, client tự reconnect với exponential backoff. Làm đủ ba tương tác (phản ứng, chuyện, đãi trà) với rate limit: phản ứng 1 mỗi 2 giây, chuyện 1 mỗi chủ đề, đãi trà 1 mỗi 10 giây.
Lọc "chuyện" ở server: bỏ HTML, chặn link, số điện thoại, email, từ tục (danh sách cấu hình được). Báo cáo: đủ 3 người khác nhau báo thì ẩn.
**Kiểm tra:** hai tab thấy nhau ngồi, phản ứng và đãi trà hiển thị đúng, chuyện có link bị chặn.

### Giai đoạn 4: Chủ đề và bảng phấn
Dùng file `server/data/topics.vi.json` (đã có 40 chủ đề nhẹ nhàng). Chọn xác định theo `roundIndex`, không lặp lại hai tuần liên tiếp. Tránh chủ đề chính trị, tôn giáo, y tế, chuyện riêng tư nặng. Bảng phấn hiện chuyện (đã lọc, ẩn danh) của tuần trà trước. Thêm dòng nhắc nhỏ: "Đây là quán để ngồi cho nhẹ lòng, không thay thế người thân hay chuyên gia."

### Giai đoạn 5: Danh tính, tiền lẻ, khách quen
`userId` (UUID) lưu localStorage. Tạo mã khôi phục lúc đầu, panel "Giữ chỗ khi đổi máy" cho đổi tên, xem mã, nhập mã. Server cộng `seatedSeconds`, chốt tuần trà, cấp tiền lẻ, cập nhật chuỗi ngày và bảng xếp hạng đúng quy tắc ở mục 2. Phiếu ngồi hiển thị: tuần trà hôm nay, chuỗi ngày, tổng số tuần trà, tiền lẻ.
**Kiểm tra:** ngồi trọn 1 tuần trà thì +1 tiền lẻ; ngồi 70% thì không; tải lại trang không mất dữ liệu; nhập mã khôi phục trên trình duyệt khác lấy lại đủ.

### Giai đoạn 6: Loa của quán
Bấm loa thùng để mở khung nghe nhạc YouTube (IFrame API). Hàng chờ do server quản lý: lưu video hiện tại và `startedAt`, client `seekTo(now - startedAt)` để cả quán nghe cùng đoạn. Đặt bài bằng link YouTube (hỗ trợ `?t=` và `&start=`), xác thực bằng regex, tốn 1 tiền lẻ, mỗi người tối đa 2 bài. Khi hàng chờ trống thì phát playlist mặc định (cấu hình được).

### Giai đoạn 7: Âm thanh và hoàn thiện
Panel âm thanh với slider riêng: xe cộ, ve/côn trùng, quạt, mưa rào, tiếng rao xa xa. Chỉ phát sau khi người dùng bấm "Bật âm thanh". Tiếng rót nước và đá lanh canh khi đổi tuần trà (tắt được). Tủ đồ: nón lá, nón cối, dép tông, áo mưa, quạt giấy mở khoá theo chuỗi ngày. PWA manifest, OG image, theme-color, tốt khi "Add to Home Screen" trên iOS. Màn loading "Đang pha trà…", báo lỗi mất mạng "Quán mất sóng, đang kết nối lại…". Hỗ trợ `prefers-reduced-motion`.

### Giai đoạn 8: Triển khai
Client lên Cloudflare Pages hoặc Vercel, server lên Fly.io hoặc Railway. Biến môi trường, CORS, giới hạn kết nối WebSocket theo IP, backup SQLite hằng ngày. README tiếng Việt: chạy local, cấu trúc dự án, thêm chủ đề, thêm quán, thay model 3D, xử lý báo cáo.
