/** Độ dài một tuần trà: 30 phút. */
export const ROUND_MS = 1_800_000;
/** Phải ngồi ít nhất 80% tuần trà (≥ 1440 giây) mới tính là "ngồi đủ". */
export const FULL_ROUND_RATIO = 0.8;
/** Số ký tự tối đa của một "chuyện". */
export const STORY_MAX = 80;
/** Tiền lẻ tối đa kiếm được mỗi ngày (theo giờ VN). */
export const DAILY_COIN_CAP = 10;
/** Số bài tối đa một người được đặt trong hàng chờ loa. */
export const QUEUE_PER_USER = 2;

/** Client gửi ping mỗi 20 giây. */
export const HEARTBEAT_MS = 20_000;
/** Quá 45 giây không có tín hiệu thì server giải phóng ghế. */
export const STALE_MS = 45_000;
/** Phản ứng: 1 lần mỗi 2 giây. */
export const REACT_COOLDOWN_MS = 2_000;
/** Đãi trà: 1 lần mỗi 10 giây. */
export const TREAT_COOLDOWN_MS = 10_000;
/** Trò chuyện: 1 lần mỗi 1.5 giây để tránh spam/flood nhưng cho phép chat liên tục. */
export const CHAT_COOLDOWN_MS = 1_500;
/** Bong bóng "chuyện" hiện trên đầu nhân vật 15 giây. */
export const STORY_BUBBLE_MS = 15_000;
/** Đủ số người KHÁC NHAU báo cáo thì ẩn chuyện. */
export const REPORTS_TO_HIDE = 3;
/** "Ngồi cạnh" = khoảng cách giữa hai ghế không quá 4 mét (cả bàn và bàn kế bên). */
export const NEIGHBOR_DISTANCE = 4;
/** Chống tràn tin: tối đa 20 tin trong 5 giây trên một kết nối. */
export const MSG_BURST = { max: 20, windowMs: 5_000 } as const;
/** Mật khẩu quản trị chủ quán (Admin) mặc định. */
export const DEFAULT_ADMIN_PASS = 'trada2026';

/** Danh sách phát mặc định của quán khi list chờ rỗng (tự động phát tuần hoàn). */
export const DEFAULT_PLAYLIST = [
  { id: 'def-1', videoId: 'aqz-KE-bpKQ', title: 'Phim hoạt hình Big Buck Bunny' },
  { id: 'def-2', videoId: '5qap5aO4i9A', title: 'Lofi Chill Trà Đá Vỉa Hè' },
  { id: 'def-3', videoId: 'ScMzIvxBSi4', title: 'Hài kịch / Phim ngắn thư giãn' },
  { id: 'def-4', videoId: 'kJQP7kiw5Fk', title: 'Ca nhạc acoustic đường phố' },
] as const;

