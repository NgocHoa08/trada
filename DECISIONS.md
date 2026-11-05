# DECISIONS

Các lựa chọn thiết kế không nêu trong `docs/SPEC.md`.

## Giai đoạn 0
- `SPEC.md` và `topics.vi.json` ban đầu nằm ở thư mục gốc; đã chuyển vào `docs/SPEC.md` và `server/data/topics.vi.json` đúng như `AGENTS.md` và `PROMPT_BAT_DAU.md` mô tả.
- `/shared` được import trực tiếp từ mã TS (`main: src/index.ts`), không cần bước build riêng. Vite và tsx đều xử lý được.
- Server giai đoạn 0 dùng `node:http` thuần, chạy bằng `tsx watch`. Chưa thêm `ws`, `better-sqlite3` (để giai đoạn 3 và 5) theo nguyên tắc không thêm thư viện khi chưa cần.
- Client giai đoạn 0 chưa cài `three` (để giai đoạn 1). Vite proxy `/health` sang server để kiểm tra kết nối.
- Cổng: client 5173, server 8787.
- Dùng ESLint flat config + `typescript-eslint` + Prettier ở gốc, một cấu hình cho cả ba package.


## Giai đoạn 1
- Thêm 	hree (+ @types/three) cho client, import addons qua 	hree/addons/*.
- Dùng MapControls có sẵn của three (cảm ứng: 1 ngón pan, 2 ngón zoom), tắt xoay để giữ góc isometric; giới hạn pan bằng clamp mục tiêu camera.
- Vật liệu MeshLambertMaterial (rẻ hơn Standard trên điện thoại). Shadow chỉ bật khi (pointer: coarse) là false.
- Bố cục: 3 bàn x 4 ghế + 2 ghế dọc mép vỉa hè = 14 chỗ; toạ độ trong shared/src/seats.ts.
- getVnHour đặt trong /shared vì giai đoạn 5 cũng cần (ranh giới 0h VN). Có ?hour=19.5 trên URL để xem thử ánh sáng.
- Chưa làm mưa rào (SPEC mục Không gian) vì liên quan âm thanh và oundIndex; dự kiến làm ở giai đoạn 2 hoặc 7, chờ bạn quyết.
- Ghế chưa có ly trà (giai đoạn 2, vì ly gắn với tiến độ tuần trà).

## Giai đoạn 2
- Server thêm GET /time (đo offset) và GET /topic?round=N (chỉ nhận tuần hiện tại ± 2). Dùng HTTP vì WebSocket để giai đoạn 3.
- Chọn chủ đề: pickTopicIndex trong shared/src/topics.ts (xáo trộn có seed theo vòng, đi hết danh sách rồi mới lặp, không trùng liên tiếp). Giai đoạn 4 chỉ cần bổ sung bảng phấn và lọc chủ đề.
- Offset: 5 mẫu, lấy mẫu RTT nhỏ nhất, đo lại mỗi 5 phút và khi tab hiện lại. Lỗi mạng thì thử lại với backoff 2s, 4s, … tối đa 30s. Thêm ?skew=<ms> để giả lập máy lệch giờ khi kiểm tra.
- Nhân vật dựng bằng hình khối (6 kiểu), chưa dùng KayKit vì chưa có model trong client/public/models. Tâm trạng hiện dạng emoji trong bảng tên trên đầu.
- 'Chỗ ngồi ưa thích' chọn theo khu vực (3 bàn hoặc mép vỉa hè), không chọn từng ghế.
- Hồ sơ (tên, nhân vật, tâm trạng, khu vực) lưu localStorage để điền sẵn lần sau; userId và mã khôi phục để giai đoạn 5.
- Ngồi/đứng giai đoạn này chỉ ở máy local; giai đoạn 3 chuyển sang server quyết định (tranh chấp ghế).

## Giai đoạn 3
- WebSocket server sử dụng thư viện ws gắn tại /ws chung cổng HTTP 8787.
- Quản lý trạng thái realtime tập trung trong Room (server là nguồn sự thật): giải quyết tranh chấp ghế (first-come first-served), kiểm tra rate-limit (phản ứng 2s, đãi trà 10s, chuyện 1 lần/tuần trà), tự động giải phóng ghế sau 45s không có tín hiệu.
- Lưu trữ 'chuyện' và báo cáo ẩn danh vào SQLite (bằng etter-sqlite3) qua StoryStore, 3 lượt báo cáo khác nhau sẽ ẩn chuyện.
- Lọc nội dung tại server (ContentFilter): chặn HTML, URL, email, số điện thoại và danh sách từ cấm (locklist.vi.json).
- Client kết nối WS qua GameClient, tự reconnect với exponential backoff, có thanh phản ứng nhanh, khung gửi chuyện và modal Bảng phấn để đọc/báo cáo các chuyện trong tuần.

## Giai đoạn 4
- Danh sách 40+ chủ đề (	opics.vi.json) đảm bảo tính nhẹ nhàng, không đề cập chính trị/tôn giáo/y tế nặng.
- Bảng phấn quán cập nhật câu chuyện của tuần trước và tuần hiện tại, hiển thị thông điệp nhẹ lòng 'Đây là quán để ngồi cho nhẹ lòng, không thay thế người thân hay chuyên gia.'
- Tự động đồng bộ câu chuyện mới và ẩn câu chuyện vi phạm khi đủ lượt báo cáo.

## Giai đoạn 5
- Quản lý danh tính và kinh tế hoàn toàn do Server quyết định (nguồn sự thật).
- Tạo bảng SQLite users, ecovery_codes, ound_presence, daily_stats, streaks.
- Mã khôi phục gồm 10 ký tự dễ đọc (loại bỏ 0, O, 1, I, L) để chuyển đổi và lấy lại dữ liệu trên trình duyệt/máy khác.
- Quy tắc ngồi đủ (>= 80% thời gian = 1440 giây/tuần trà) được chốt tại server: +1 tiền lẻ (giới hạn tối đa 10 tiền lẻ/ngày theo giờ VN), chuỗi ngày nối tiếp nếu ngày kế tiếp có tuần trà đạt chuẩn, đứt chuỗi về 0 nếu bỏ ngày.
- Thêm modal 'Phiếu ngồi' hiển thị số liệu thống kê (tiền lẻ, chuỗi ngày, tuần hôm nay, tổng tuần), cho phép đổi tên và khôi phục tài khoản.
- Thêm modal 'Khách quen của tuần' (Leaderboard Top 10) tính từ 4h sáng thứ Hai (giới hạn tối đa 16 tuần trà/ngày).

## Giai đoạn 6
- Tích hợp YouTube IFrame API chính thức tại client (RadioPlayer), đồng bộ thời gian phát chung seekTo(serverNow - startedAt) để mọi người cùng nghe một đoạn.
- Bấm vào loa thùng 3D sẽ mở modal Loa của quán.
- Đặt bài hát bằng link YouTube (parse bằng regex parseYouTubeUrl, hỗ trợ 	= và start=), trừ 1 tiền lẻ, giới hạn tối đa 2 bài/người.
- Tự động phát playlist/video mặc định khi hàng chờ rỗng.

## Giai đoạn 7
- Bộ tạo âm thanh vỉa hè (AudioManager) sử dụng Web Audio API tổng hợp âm trực tiếp: xe cộ (brown noise), ve sầu/côn trùng đêm (high-pass noise modulation), quạt máy (pink noise), mưa rào (white noise), tiếng rao xa xa (frequency modulated oscillator), và tiếng rót nước/đá lanh canh khi đổi tuần trà.
- Thêm modal 'Âm thanh' với từng slider điều chỉnh âm lượng độc lập, chỉ phát sau khi người dùng chủ động bấm 'Bật âm thanh'.
- Tủ đồ phụ kiện quán tặng (Nón lá, Nón cối, Dép tông, Áo mưa, Quạt giấy) mở khoá theo chuỗi ngày, kèm lời chào riêng của bà chủ quán.
- Cấu hình PWA hoàn chỉnh: manifest.json, icon SVG, Open Graph meta tags, viewport-fit cover và theme-color tốt cho trải nghiệm Add to Home Screen trên iOS/Android.
- Hỗ trợ CSS prefers-reduced-motion.

## Giai đoạn 8
- Hướng dẫn triển khai hoàn tất: Client trên Cloudflare Pages/Vercel, Server trên Fly.io/Railway với SQLite Volume persistence.
- Tạo tài liệu README.md bằng tiếng Việt chi tiết: hướng dẫn chạy local, kiến trúc monorepo, quy tắc kinh tế, kiểm duyệt nội dung, cách mở rộng và cấu hình biến môi trường.

## Nâng cấp Trải nghiệm Vỉa Hè (Ghế nhựa không tựa, Bỏ bàn, Animation đi lại)
- **Ghế nhựa không tựa lưng**: Thay toàn bộ ghế có lưng tựa thành ghế đẩu nhựa lùn vỉa hè Việt Nam (chuẩn kích thước ~0.32m x 0.32m x 0.26m) có 4 gờ viền mép rủ xuống, 4 chân gia cường thanh giằng ngang và 2 gờ lỗ xách tay đặc trưng ở giữa mặt ghế. Ghế bà chủ quán cũng đổi sang ghế đẩu không tựa màu đỏ.
- **Bỏ bàn thay bằng ghế đẩu**: Bỏ hoàn toàn bàn tròn cao chân sắt `tableGeometry()`. Thay vào đó, tại mỗi cụm chỗ ngồi (`TABLES`), đặt một chiếc ghế đẩu nhựa lùn không tựa đóng vai trò là "bàn" đặt ấm trà nhôm/gốm và đĩa hạt dưa/kẹo lạc ở cao độ chuẩn `y ≈ 0.28m`.
- **Vị trí ly trà đá**: Đặt ly trà đá dưới mặt đất vỉa hè (`y = 0`) ngay cạnh bên phải của ghế ngồi của từng khách.
- **Animation đi lại và hệ thống khớp nhân vật**:
  - Tách hệ thống chân thành khớp háng (`hipPivot`), đùi (`thigh`), khớp gối (`kneePivot`), cẳng chân (`shin`) và bàn chân (`foot`).
  - Hỗ trợ 3 trạng thái: `'sitting'` (mông hạ xuống mặt ghế đẩu, đùi vuông góc gối thõng xuống đất), `'standing'` (chân duỗi thẳng, mông nâng lên 0.48m chạm đất tại y=0), và `'walking'` (chân vung nhịp nhàng, gối gập tự nhiên, tay đánh nhịp ngược chân, thân nhún nhảy nhịp bước chân).
  - Khi vào quán hoặc đổi ghế: nhân vật đi bộ từ vị trí xuất phát đến ghế đích rồi mới ngồi xuống.
  - Khi bấm "Đứng dậy": nhân vật đứng dậy khỏi ghế, người chơi có thể click bất kỳ đâu trên vỉa hè để nhân vật đi bộ dạo mát tới điểm đó.
  - Thêm 2 NPC người dân đi bộ dạo mát vãng lai trên vỉa hè (bác tập thể dục mũ cối và cô gái dạo phố nón lá) để tăng không khí sống động của vỉa hè Hà Nội / Sài Gòn.
- **Khắc phục lỗi nhân bản nhân vật khi đổi ghế**:
  - *Nguyên nhân*: Khi đổi ghế, server phát `seatChanged` cho ghế cũ (`occupant: null`) trước, rồi mới phát `seatChanged` cho ghế mới. Trước đây, khi nhận `occupant: null`, client xóa người chơi khỏi danh sách `seated` và bỏ rơi model nhân vật (khiến nhân vật cũ dừng `update()` và bị đông cứng vĩnh viễn trên vỉa hè). Khi tin nhắn ghế mới tới ngay sau đó, client không tìm thấy nhân vật cũ nên tạo ra một clone nhân vật mới.
  - *Giải pháp*: Tái cấu trúc bộ nhớ sang quản lý tập trung theo tên định danh người chơi (`Map<string, Person>`). Đảm bảo một người chơi duy nhất chỉ có đúng 1 thực thể `Character` trong toàn bộ thế giới 3D. Mọi nhân vật đều được update liên tục; khi đổi ghế, chính nhân vật hiện tại sẽ tự động đứng dậy và đi bộ sang ghế mới thay vì sinh mới. Thêm cơ chế hoãn dọn dẹp 300ms chống chớp tin nhắn khi chuyển chỗ. Đã bổ sung unit test `world.test.ts` đảm bảo số lượng nhân vật không bao giờ vượt quá 1.

## Mở rộng Trò chuyện / Chat liên tục
- **Vấn đề**: Trước đây theo SPEC gốc, mỗi tuần trà (30 phút) người dùng chỉ được gửi 1 "câu chuyện". Khi người chơi gửi câu thứ 2, server trả lỗi `already_posted`, đồng thời SQLite database có ràng buộc `UNIQUE INDEX stories_user_round` nên chặn đứng mọi tin nhắn tiếp theo; kết hợp ô input không được giữ focus sau khi gửi làm người dùng cảm thấy bị đơ/đứng chat.
- **Giải pháp**:
  - Cho phép người chơi chat liên tục, tự do chia sẻ nhiều câu chuyện/tin nhắn với nhau trong quán.
  - Bỏ index độc nhất `UNIQUE INDEX stories_user_round` trong SQLite database (`stories` table).
  - Áp dụng rate limit chống spam `CHAT_COOLDOWN_MS = 1500` (mỗi tin cách nhau 1.5 giây).
  - Thời gian hiển thị bong bóng chat trên đầu nhân vật rút gọn xuống `STORY_BUBBLE_MS = 15000` (15s) để các câu thoại nối tiếp nhau tự nhiên.
  - Sau khi submit gửi tin nhắn, ô chat tự động giữ focus (`storyInput.focus()`) và reset trống để người dùng gõ tin nhắn tiếp theo ngay lập tức.
  - Đổi placeholder thành `'Trò chuyện / Góp chuyện (tối đa 80 chữ)…'`.
  - Nâng cấp test `room.test.ts` để kiểm tra độ trễ gửi liên tiếp và ghi nhận số lượng tin nhắn tăng dần.

\n## Cơ chế Đổi Thời Tiết & Màn Hình TV YouTube Chiếu Phim / Nghe Nhạc
- **Hệ thống thời tiết vỉa hè (`WeatherType`)**:
  - Cung cấp 3 trạng thái thời tiết: `sunny` (Nắng ráo), `rainy` (Mưa rào), `cloudy` (Âm u), cùng chế độ `auto` (đồng bộ tự động theo tuần trà của quán).
  - `getWeatherForRound(roundIndex)`: thuật toán PRNG băm xác định theo `roundIndex` để tất cả người ngồi trong quán đều trải nghiệm cùng một trạng thái thời tiết.
  - Hiệu ứng 3D Three.js:
    - Hệ thống hạt mưa 3D (1400 hạt rơi nghiêng theo gió, lặp tuần hoàn khi chạm đất).
    - Khi trời mưa (`rainy`): bầu trời và sương mù chuyển màu xám lạnh ẩm ướt, ánh nắng dịu xuống, mặt đường và vỉa hè sẫm màu như ướt nước, đèn đường hắt sáng rõ hơn.
    - Khi trời âm u (`cloudy`): ánh sáng khuếch tán dịu nhẹ, sương mù xám nhạt.
    - Tích hợp âm thanh: tự động kích hoạt kênh tiếng mưa rào trong `AudioManager` khi trời mưa và tắt khi tạnh.
  - Widget HUD: Nút hiển thị thời tiết trên topbar cho phép người dùng click đổi nhanh không khí yêu thích hoặc chọn chế độ tự động theo quán.
- **Màn hình TV YouTube Chiếu Phim / Nghe Nhạc**:
  - **Mô hình 3D TV treo tường**: Dựng chiếc TV màn hình lớn treo trên tường đối diện khu bàn ghế vỉa hè, có khung viền siêu mỏng, đèn LED trạng thái và màn hình CanvasTexture "TRÀ ĐÁ TV 📺 - Chiếu Phim & Ca Nhạc Vỉa Hè".
  - **Tương tác click 3D**: Click trực tiếp vào màn hình TV 3D trên vỉa hè hoặc click vào Loa thùng để mở giao diện chiếu phim & nghe nhạc.
  - **Khung TV nổi Picture-in-Picture & Rạp chiếu (Cinema Mode)**:
    - Giữ cố định iframe YouTube trong dock (`#tv-screen-dock`) tránh bị tải lại/ngắt quãng khi thao tác UI.
    - Hỗ trợ chế độ Mini TV ở góc màn hình: cho phép người dùng vừa ngồi uống trà đá ngắm cảnh 3D vừa theo dõi phim, MV ca nhạc liên tục.
    - Hỗ trợ chế độ Rạp chiếu (Cinema Mode): phóng to khung hình ở giữa màn hình để cùng chill xem phim với bạn bè.
    - Bổ sung các gợi ý nhanh (presets) cho phim hoạt hình ngắn, phim hài vỉa hè, nhạc acoustic, lofi chill, kèm ô dán mọi link YouTube tùy thích (1 xu/bài).

## Tái hiện Không gian Đường phố Hà Nội & Phương tiện Giao thông Chuẩn Việt Nam
- **Đường phố & Kiến trúc Phố Cổ Hà Nội**:
  - **Biển tên phố Hà Nội đặc trưng**: Dựng cột biển tên phố chữ nhật màu xanh dương đậm bo viền trắng kép, chữ in hoa màu trắng nổi bật (`PHỐ TRÀNG TIỀN - QUẬN HOÀN KIẾM`) kèm biển phụ chỉ hướng cắt ngang (`PHỐ ĐINH TIÊN HOÀNG`) đặt tại góc vỉa hè.
  - **Cột điện bê tông ly tâm & mạng nhện dây điện**: Thân cột bê tông xám có hộp công tơ điện, 2 tầng thanh xà thép đỡ sứ cách điện, loa truyền thanh phường hình phễu kim loại chõ về phía đường phố, cuộn cáp viễn thông đen bó tròn, và các đường dây điện chùng bắc qua nóc các dãy nhà phố cổ.
  - **Cây sấu / cây bàng cổ thụ Hà Nội**: Hai cây cổ thụ hai bên quán trà đá, thân nâu sần sùi tỏa bóng mát, bồn cây xây gạch nung đỏ, và đặc biệt **phần gốc cây được quét một lớp vôi trắng** (cao ~0.9m) đặc trưng 100% của cây xanh vỉa hè Hà Nội.
  - **Dãy nhà phố cổ Hà Nội**: Nhà ống kiến trúc Pháp cổ với tường màu vàng vôi (`#dfbe6c`), cửa sổ chớp gỗ xanh lá cây thời Pháp (`#274e37`), gờ chỉ xi măng chia tầng, mái ngói dốc màu đỏ gạch, ban công sắt hoa văn uốn lượn cổ kính, giàn hoa giấy tím hồng rủ xuống và biển số nhà Hà Nội xanh viền trắng ("Số 18 - 34 Phố Tràng Tiền").
  - **Mặt đường & Vỉa hè chi tiết**: Vỉa hè cát vàng ấm, đá bó vỉa hè bê tông (curbstones) chia ngăn, nắp cống thoát nước kim loại dạng nan dọc mép đường, vạch sơn đứt đoạn tim đường và vạch kẻ sang đường cho người đi bộ (zebra crossing) ở góc phố.
  - **Chi tiết quán trà đá mộc mạc**: Phích nước Rạng Đông đỏ tươi quai nhôm, điếu cày nứa bọc đồng có nõ điếu nghiêng 45 độ, thùng xốp trắng giữ đá lạnh, hũ thủy tinh nắp đỏ đựng kẹo lạc/kẹo dồi, mái hiên di động bạt sọc xanh trắng vươn ra che mát.
  - **Xe đạp thồ hoa Hà Nội**: Chiếc xe đạp cổ dựng chân chống nghiêng dưới gốc cây, phía sau chở 2 mẹt thúng đầy hoa sen hồng và cúc họa mi trắng tươi thắm.
  - **Chú cún vàng vỉa hè**: Nằm cuộn tròn thư thả cạnh quầy pha trà, thi thoảng phe phẩy đuôi nhịp nhàng.
- **Phương tiện Giao thông Chuẩn Việt Nam (`vietnamVehicles.ts`)**:
  - **Xe máy Việt Nam kèm người lái (Rider có mũ bảo hiểm)**:
    - *Honda Wave Alpha / Dream*: Thân xe thon gọn (đỏ cờ, xanh rêu, đen mờ), yếm xe màu trắng sữa, bô inox sáng bóng và **giỏ xe kim loại nan sắt ở mũi xe** (đặc trưng xe máy Việt Nam). Tài xế ngồi lái có mũ bảo hiểm chuẩn Việt Nam.
    - *Honda SH*: Dáng xe ga cao ráo, sàn để chân phẳng, đèn pha LED hiện đại.
    - *Xe Shipper công nghệ (GrabFood / ShopeeFood)*: Xe Wave chở thùng hàng giao hàng lớn hình vuông phía sau (thùng xanh lá Grab hoặc thùng cam Shopee), tài xế mặc áo khoác đồng phục và đội mũ bảo hiểm tương ứng.
    - *Xe máy khách đỗ gọn trên vỉa hè*: Chiếc Wave đỏ và SH đen mờ đỗ ngăn nắp sát mép hè.
  - **Ô tô Việt Nam trên đường phố**:
    - *Taxi Xanh SM (VinFast VF e34 / VF 5)*: Xe điện màu xanh ngọc cyan (`#00beaf`) rực rỡ đặc trưng của VinFast Xanh SM, dải đèn LED cánh chim chữ V trước sau, hộp đèn taxi trên nóc.
    - *Xe Buýt Hà Nội (Hanoibus)*: Xe buýt đô thị dài hai tầng màu đỏ tươi và vàng chanh kinh điển, bảng điện tử LED báo tuyến đường (`01: BẾN XE GIA LÂM - BẾN XE YÊN NGHĨA`), các cửa kính hành khách và bánh xe buýt to bản.
    - *Taxi Mai Linh*: Thân xe sedan màu xanh lá cây đậm (`#00843d`), sọc decal vàng chạy dọc hông xe, hộp đèn taxi Mai Linh trên nóc.
    - *Ô tô sedan gia đình*: Các dòng sedan phổ thông màu trắng và đỏ đun.
  - **Quản lý luồng giao thông (`VietnamTrafficManager`)**:
    - Xe máy đi làn trong (tốc độ linh hoạt, có thể nối đuôi nhau), ô tô và xe buýt chạy làn ngoài hai chiều đi và về.
    - Lưu lượng xe tự động co giãn theo chu kỳ giờ thực tế trong game (giờ cao điểm 7-8h sáng & 17-19h chiều đông đúc nhộn nhịp, đêm khuya thưa thớt).

- **Chiếu trực tiếp lên Màn hình TV 3D trên vỉa hè (`CSS3DRenderer`)**:
  - Nhúng video YouTube trực tiếp lên bề mặt màn hình chiếc TV 3D chân đứng ngoài vỉa hè bằng `CSS3DRenderer` và `CSS3DObject`.
  - Video tự động biến dạng phối cảnh 3D (`matrix3d`), co giãn và di chuyển theo góc quay của camera khi người chơi pan/zoom hoặc đổi góc nhìn.
  - Cho phép chuyển đổi linh hoạt 3 chế độ xem mà không bị ngắt quãng video:
    1. `📺 TV Vỉa hè`: Chiếu trực tiếp lên chiếc TV 3D ngoài vỉa hè quán.
    2. `🔲 Rạp chiếu to`: Phóng to toàn màn hình ở chính giữa để xem phim/ca nhạc cùng bạn bè.
    3. `📌 Góc nhỏ (Picture-in-Picture)`: Thu nhỏ dạng PiP ở góc dưới màn hình.

## Tương tác Quầy Trà Đá Bà Ba, Mua Thuốc Lá & Hành Động Hút Thuốc 3D
- **Tương tác quầy bán nước & Bà Ba (`bossModal`)**:
  - Click trực tiếp vào bà chủ quán (bác Ba đội nón quạt mát) hoặc quầy bán trà đá gỗ mộc mạc, hoặc bấm nút `"🏪 Quầy bà Ba"` trên thanh công cụ góc phải màn hình để mở giao diện quầy hàng vỉa hè.
  - Cung cấp 5 món chuẩn nét văn hóa vỉa hè Việt Nam:
    1. 🚬 **Bao thuốc lá Thăng Long (Bao mềm vàng / bao cứng)**: Mua bao thuốc để mở khóa vĩnh viễn hành động và emoji 🚬 Hút thuốc (lưu trạng thái `tdvh_has_cig` vào `localStorage`), đồng thời có nút hút thuốc ngay.
    2. 💨 **Điếu cày thuốc lào Tiên Lãng**: Rít một bi thuốc lào sòng sọc, say ngất ngây, nhả khói mù mịt.
    3. 🥜 **Đĩa hạt dưa đỏ**: Cắn tanh tách vui tai rôm rả chuyện trò.
    4. 🍬 **Thanh kẹo lạc / kẹo dồi bánh đa**: Kẹo bùi béo ngọt thanh, giòn rụm nhâm nhi cùng trà xanh.
    5. 🧊 **Xin thêm đá / Châm trà tươi**: Đầy ắp ly trà đá giải nhiệt ngày hè.
- **Mở rộng biểu tượng phản ứng (Emoji Reactions)**:
  - Bổ sung 3 emoji đặc trưng vào danh sách phản ứng của quán:
    - 🚬 `smoke`: Hút thuốc lá (kèm kiểm tra điều kiện đã mua thuốc lá ở quầy bà Ba).
    - 🥜 `seeds`: Cắn hạt dưa.
    - 🍬 `candy`: Ăn kẹo lạc.
  - Tích hợp kiểm duyệt và đồng bộ realtime qua server: thêm các id phản ứng vào `REACTIONS` trong `@tdvh/shared`, tự động đồng bộ sang tất cả người chơi trong quán.
- **Mô hình & Hiệu ứng Hành Động Hút Thuốc 3D sống động (`Character.smokeAction`)**:
  - Dựng điếu thuốc lá 3D trên tay phải nhân vật (thân trắng, đầu lọc cam vàng) và đầu tàn thuốc đỏ rực (`cigEmber`) phát quang bằng `MeshBasicMaterial`.
  - Hệ thống hạt khói 3D (`smokeGroup`): Khói trắng bồng bềnh bay lên từ đầu tàn thuốc và từ miệng nhân vật, xoay tản ra và mờ dần trong không khí.
  - Chu kỳ diễn hoạt (Animation Loop):
    - Đưa tay cầm điếu thuốc lên môi, đầu nghiêng nhẹ.
    - Rít một hơi: đầu tàn thuốc đỏ rực sáng bừng lên, ngực hơi phập phồng.
    - Ngửa đầu ra sau thả lỏng, hạ tay xuống.
    - Thở ra luồng khói trắng bốc lên cuồn cuộn bay lên trời.
- **Hiệu ứng Ánh sáng Màn hình TV Vỉa Hè**:
  - Đèn chiếu điểm xanh ngọc (`PointLight`) đặt phía trước màn hình TV 3D, tự động hắt ánh sáng lung linh xuống mặt đường nhựa và gạch vỉa hè khi TV đang bật phát sóng.
  - Màn hình CanvasTexture động: Hiển thị chấm đỏ nhấp nháy `● TRỰC TIẾP · TRÀ ĐÁ TV 📺`, visualizer 18 cột sóng nhạc nhảy múa sống động theo giai điệu, sóng sine dao động liên tục và dòng chữ hiển thị bài hát/phim đang phát.

- **Cơ chế Phân quyền Chủ Quán (Admin)**:
  - Khách trong quán (`Session.isAdmin === false`):
    - Có thể dán link phim/nhạc để đưa vào danh sách chờ (`radio_queue`).
    - Có thể chọn các chế độ xem TV cá nhân (TV vỉa hè 3D / Rạp chiếu to / Góc nhỏ PiP) hoặc bật/tắt tiếng riêng.
    - **Không có quyền qua bài hoặc tạm dừng TV của cả quán**: nếu client gửi `adminSkip` hoặc `adminPause`, server sẽ chặn lại và trả mã lỗi `forbidden` (\"Chỉ chủ quán mới có quyền chỉnh qua bài hoặc dừng TV\").
  - Chủ quán (`Session.isAdmin === true`):
    - Đăng nhập quyền Admin bằng cách bấm nút `\"🔐 Đăng nhập Chủ Quán\"` trong bảng điều khiển TV và nhập mật khẩu (mặc định: `trada2026`, hoặc cấu hình qua biến môi trường `ADMIN_KEY`).
    - Khi xác thực thành công, giao diện mở khóa 2 nút điều khiển đặc quyền:
      - `⏭️ Qua bài tiếp theo (Skip)`: Chuyển ngay lập tức sang bài kế tiếp trong list chờ hoặc playlist.
      - `⏸️ Tạm dừng cả quán (Pause)` / `▶️ Tiếp tục phát (Resume)`: Dừng hoặc phát lại video đồng bộ cho tất cả người ngồi trong quán.
- **Tự động Luân chuyển Danh Sách Chờ (Queue) & Playlist Mặc định**:
  - Khi một video phát xong (YouTube Player bắn sự kiện `ENDED` hoặc qua tin nhắn `trackEnded`):
    - Server tự động kiểm tra hàng đợi (`radio_queue`): nếu có bài khách đặt đang chờ, server lập tức lấy bài tiếp theo ra phát và thông báo cho toàn quán.
    - Nếu danh sách chờ rỗng: server tự động luân chuyển tuần hoàn danh sách phát mặc định (`DEFAULT_PLAYLIST`: Big Buck Bunny, Lofi Chill vỉa hè, Hài kịch/Phim ngắn, Ca nhạc đường phố), bài này hết sẽ tự động sang bài tiếp theo mà không bao giờ bị dừng màn hình.

## Tối ưu Màn hình TV 3D: Điền Khít Ô Cửa Giữa & Tràn Viền Full Video
- **Bố trí TV điền trọn ô cửa giữa của quán**:
  - Dỡ bỏ kệ TV chân đứng lăn bánh trên vỉa hè (`tvBase`, bánh xe, trụ sắt) để giải phóng mặt bằng lối đi vỉa hè, tạo không gian thoáng đãng mộc mạc đúng chất trà đá Hà Nội.
  - Tích hợp chiếc TV màn hình lớn gắn âm tường điền trọn ô cửa tầng 1 của ngôi nhà trung tâm (`x = 0, y = 1.42, z = -6.04`), nằm ngay dưới mái hiên bạt sọc xanh trắng và biển hiệu `Trà Đá Vỉa Hè`.
  - Kết cấu khung âm tường gồm:
    - Vỏ mặt sau `box(3.64, 2.72, 0.04)` che khít lòng ô cửa.
    - Màn hình tỉ lệ chuẩn 16:9 (`PlaneGeometry(3.6, 2.025)`).
    - Tấm ốp viền trên `box(3.64, 0.345, 0.05)` bảo vệ mép trên.
    - Cụm loa thanh soundbar công suất lớn `box(3.64, 0.345, 0.05)` với các nan kim loại tản âm xám titan bố trí ngay dưới màn hình, lấp đầy toàn bộ chiều cao 2.7m của ô cửa.
    - Đèn chiếu điểm xanh ngọc `PointLight` hắt sáng bao quát khu vực 3 bàn trà đá trung tâm.
- **Xoá tiêu đề & Hiển thị Full Video 100%**:
  - Xóa bỏ thanh tiêu đề `.tv-dock-title` và thanh header `.tv-dock-header` khi ở chế độ 3D (`display: none !important`).
  - Video YouTube hiển thị 100% tràn viền chuẩn 16:9 (`800px x 450px`, tỉ lệ scale `0.0045` tương ứng chính xác `3.6m x 2.025m`), không còn thanh xám/đen che khuất hay đè lên nội dung phim/nhạc.
  - Ở chế độ Cinema và PiP: Video giữ tỉ lệ 16:9 toàn khung, thanh công cụ chuyển sang dạng nút bấm mờ nổi (overlay) chỉ hiện khi rê chuột (hover), mang lại trải nghiệm xem phim điện ảnh không tì vết.

- **Bốc Quẻ May Mắn Đầu Ngày Quán Bà Ba (`fortuneModal`)**:
  - Ống quẻ tre cổ truyền đặt tại quán cho phép người chơi lắc bốc quẻ đầu ngày với 5+ bài thơ lục bát mang ý nghĩa tốt lành (*Đại Cát, Thượng Cát, Trung Cát, Bình An*).
  - Bốc quẻ tặng ngay 1 đồng tiền lẻ may mắn ngày mới, khích lệ người chơi ghé quán đều đặn.
- **Minigame Oẳn Tù Tì Vỉa Hè (`rpsModal`)**:
  - Cho phép người chơi thách đấu Kéo - Búa - Bao thời gian thực với bạn ngồi cùng quán (hoặc so tài nhanh giải trí).
  - Hai bên bí mật ra đòn (`rock`, `paper`, `scissors`), server phân định thắng thua và trả kết quả đồng bộ.
- **Cơ chế \"Rung Chuông Đãi Cả Quán\" (Bao Trọn Quán)**:
  - Nút `🔔 Đãi cả quán` trên thanh điều khiển ghế ngồi: khi kích hoạt, tất cả 14 cốc trà trên bàn đồng loạt phát sáng hiệu ứng ngọc bích rực rỡ, kèm âm thanh rót nước và toast chúc mừng náo nhiệt gửi đến toàn bộ khách trong quán.
- **Hòm Thư Người Lạ Vỉa Hè (`letterModal`)**:
  - Người chơi có thể viết những bức thư tâm sự ẩn danh gửi vào hòm thư quán (được lọc từ ngữ và lưu vào SQLite).
  - Bất kỳ ai ghé quán cũng có thể bấm `📩 Rút thư người lạ` để đọc những mẩu tâm sự mộc mạc, tạo cảm giác kết nối sâu sắc giữa những người lạ.
- **Sổ Lưu Bút Quán Trà Đá (`guestbookModal`)**:
  - Cho phép khách ghé quán ký tên lưu niệm và để lại cảm nghĩ trong ngày. Toàn bộ lưu bút được lưu trữ và cập nhật realtime cho khách sau đọc.
- **Bàn Cờ Tướng Vỉa Hè 3D (`xiangqiModal`)**:
  - Dựng mô hình bàn cờ tướng gỗ 3D với quân cờ đỏ/đen đặt trên chiếc ghế nhựa cạnh gốc cây sấu.
  - Nhấp vào bàn cờ 3D để mở bảng các thế cờ tàn vỉa hè kinh điển (Khổng Minh Tá Tiễn, Mã Hậu Pháo...) cùng gợi ý chiến thuật độc đáo.

- **Hoàn Tất Triển Khai Toàn Diện 50 Ý Tưởng: Hệ Thống 5 Hub Tinh Tế & Không Đè Nút**:
  - Khắc phục triệt để tình trạng nhồi nhét hàng chục nút gây tràn viền, đè nút và xấu giao diện.
  - Tinh giản toàn bộ hệ thống tương tác thành **5 nút Hub chính duy nhất** ở mép phải màn hình:
    1. 🏪 **Quán Nước**: Quầy Bà Ba, Tùy biến ly đồ uống (`DRINKS`: Trà đá, Cà phê sữa, Nước mía, Trà chanh, Nước sấu), Bốc quẻ may mắn, Hòm thư người lạ, Sổ lưu bút.
    2. 🎮 **Giải Trí**: TV chiếu YouTube (3D/Cinema/PiP/Admin), Bàn cờ tướng vỉa hè, Oẳn tù tì, Bảng phấn chuyện trò.
    3. 🎫 **Khách Quen (Nhóm 1)**: Điểm danh 7 ngày (Daily Streak Rewards), Cấp bậc khách quen (5 cấp độ), Thành tựu vỉa hè (8 huy hiệu), Tủ đồ thời trang & Thú cưng vỉa hè (Mèo mướp vàng, Chó mực, Chim chào mào), Bảng xếp hạng tuần & Phiếu ngồi.
    4. 🌍 **Không Gian (Nhóm 3)**: Đổi bản đồ 3 miền (Hà Nội, Sài Gòn, Hội An), Hệ thống 4 mùa (Xuân, Hạ, Thu, Đông), 5 bộ lọc màu phim hoài niệm (Retro 90s, Cyberpunk, Mưa chiều, Hoàng hôn, Tự nhiên), Góc nhìn FPV mắt người ngồi, Bảng âm thanh ASMR vỉa hè, Tiết kiệm pin (30 FPS).
    5. 💖 **Tiện Ích & Ủng Hộ (Nhóm 4 & Nhóm 5)**: Mời ly trà đá thật (Donate VietQR kèm vương miện VIP), Chụp ảnh Polaroid Check-In sống ảo (xuất file PNG có chữ ký hoài niệm), Đồng hồ học bài Pomodoro 25 phút, Đặt trà thật giao tận nhà (GrabFood/ShopeeFood), Thiệp mời bạn bè ghé quán.

- **Tương Tác Trực Tiếp Khi Nhấp Chuột Vào Bất Kỳ Ai Trong Quán (`playerActionModal`)**:
  - Raycast 3D phát hiện khi rê chuột vào nhân vật người chơi khác hoặc ghế đang có người ngồi: con trỏ tự động chuyển thành hình bàn tay (`pointer`).
  - Nhấp chuột vào người đó sẽ mở ngay **Menu Tương tác Người chơi** riêng biệt gồm 4 hành động giao lưu tức thì:
    1. ✊ **Thách đấu Oẳn Tù Tì**: Gửi lời mời Kéo - Búa - Bao trực tiếp đến người đó, hai bên cùng vào trận so tài.
    2. ♟️ **Mời chơi Cờ Tướng vỉa hè**: Gửi lời mời cùng giải cờ thế và tự động mở bàn cờ tướng cho cả hai.
    3. 🍵 **Đãi ly trà đá đặc biệt (1 xu)**: Tặng ly trà ngọc bích ấm áp cho người bạn này.
    4. 🍻 **Cạn ly làm quen**: Nâng ly chúc sức khỏe gửi thẳng tới nhân vật đó.

- **Khắc phục Triệt để Lỗi Không Nhìn Thấy Nhau & Quy trình Lời Mời Chơi 2 Người (Multiplayer)**:
  - *Khắc phục lỗi không nhìn thấy nhau khi mở 2 tab*:
    - Trước đây `userId` lưu cố định trong `localStorage`, khiến 2 tab trên cùng trình duyệt có chung 1 `userId` và server lập tức ngắt kết nối bản cũ (`replaced`). Đã tách `userId` theo `sessionStorage` riêng của từng tab (hỗ trợ thêm `?user=...`), giúp nhiều tab chạy song song mượt mà.
    - Khi vào quán, client tự động quét trạng thái các ghế (`occupied`) và chọn chiếc ghế trống tốt nhất, tránh trường hợp 2 người tranh chấp cùng 1 ghế mặc định khiến người thứ 2 bị từ chối và không thể ngồi xuống.
  - *Quy trình Lời mời Thách đấu & Chấp nhận 2 người (`gameInviteModal`)*:
    - Khi người A bấm thách đấu (Oẳn tù tì hoặc Cờ tướng): người A nhận thông báo chờ, đồng thời người B hiện ngay **Modal Lời Mời Thách Đấu Vỉa Hè** giữa màn hình (`⚔️ Chấp nhận chơi ngay` hoặc `✕ Từ chối`).
    - Khi người B bấm chấp nhận: cả hai người chơi đồng loạt bước vào trận đấu thời gian thực:
      - **Oẳn Tù Tì**: Cả hai cùng chọn đòn, xem đối phương đã ra đòn hay chưa, và cùng nhìn thấy kết quả thắng/thua được công bố đồng thời.
      - **Cờ Tướng 2 Người**: Bàn cờ tướng tương tác 10x9 mở ra trên cả 2 máy (người mời cầm quân Đỏ đi trước, người nhận cầm quân Đen đi sau), các nước đi đồng bộ realtime qua WebSocket.

- **Khắc phục Lỗi UI Đè Nút, Hoàn Thiện Luật Cờ Tướng, Lá Vàng Mùa Thu & Đồng Bộ Tiền Lẻ**:
  - *Sửa lỗi đè nút action dock & thông báo*: Tách các nút (`treatAllBtn`, `rpsBtn`, `standBtn`) khỏi class `position: fixed` cũ, đưa vào `.dock-action-btn` flexbox tự động co giãn. Đưa thông báo (`.hud-toast`) lên nổi ở góc trên màn hình, không bao giờ che khuất khung nhập chat hay các nút tương tác.
  - *Xóa âm thanh côn trùng*: Đã gỡ bỏ hoàn toàn kênh âm thanh ve sầu / côn trùng đêm khỏi `AudioManager` và giao diện điều chỉnh âm lượng.
  - *Mùa Thu & Lá rụng gió thổi 3D*: Bổ sung hệ thống 150 lá vàng mùa thu (`InstancedMesh`) chao liệng và bay lượn theo làn gió dọc vỉa hè khi chọn Mùa Thu (`autumn`), kết hợp ánh nắng vàng hoàng hôn thơ mộng.
  - *Luật Cờ Tướng chuẩn & Kiểm soát lượt đi*: Xây dựng hàm kiểm tra nước đi hợp lệ (`isLegalXiangqiMove`) theo đúng luật Cờ Tướng vỉa hè (Tướng, Sĩ trong cung; Tượng không qua sông; Pháo phải có ngòi khi ăn; Mã bị cản chân; Tốt qua sông mới được đi ngang). Chỉ cho phép người chơi đi đúng lượt (Đỏ đi trước, Đen đi sau).
  - *Oẳn Tù Tì chuẩn lượt*: Hai người chơi ra đòn bí mật, hiển thị trạng thái chờ và kết quả công bố đồng thời, bổ sung nút `Chơi lại ván nữa 🔄`.
  - *Thông báo tương tác thời gian thực*: Khi có người chơi khác cạn ly, gửi cảm xúc, thách đấu hoặc đãi trà, màn hình người nhận lập tức hiển thị thông báo toast chi tiết.
  - *Đồng bộ cộng tiền lẻ (Coins)*: Bổ sung tin nhắn `{ t: 'claimCoins' }` lên server để cộng dồn tiền lẻ thực tế khi điểm danh 7 ngày, bốc quẻ may mắn hoặc ủng hộ quán, lưu vào SQLite và cập nhật số dư trên thanh HUD ngay lập tức.
  - *Sửa lỗi chiếu TV*: Khắc phục triệt để lỗi YouTube bằng cơ chế tọa độ overlay khớp góc nhìn camera, loại bỏ việc di chuyển thẻ iframe trong DOM (tránh reload/hỏng video player).

- **Thiết Lập Mặc Định Tiết Trời Mùa Thu Phố Cổ (`autumn`)**:
  - Đặt mùa mặc định khi vào quán là **Mùa Thu (`autumn`)**.
  - Bầu trời và ánh nắng mang sắc vàng hổ phách ấm áp, hệ thống 150 lá vàng mùa thu 3D chao liệng và bay lượn theo làn gió dọc vỉa hè hoạt động ngay khi mở web.
  - Huy hiệu thời tiết góc trái trên hiển thị mặc định `🍂 Thu vàng phố cổ`.
