/** Hệ thống Điểm danh 7 ngày */
export interface DailyReward {
  day: number;
  rewardCoins: number;
  label: string;
  itemReward?: string;
}

export const DAILY_STREAK_REWARDS: readonly DailyReward[] = [
  { day: 1, rewardCoins: 1, label: '1 Xu chào ngày mới' },
  { day: 2, rewardCoins: 2, label: '2 Xu + Đĩa kẹo lạc' },
  { day: 3, rewardCoins: 2, label: '2 Xu + Mở khoá Kính râm vỉa hè', itemReward: 'glasses' },
  { day: 4, rewardCoins: 3, label: '3 Xu may mắn' },
  { day: 5, rewardCoins: 3, label: '3 Xu + Dép tổ ong 12 màu', itemReward: 'toong' },
  { day: 6, rewardCoins: 4, label: '4 Xu tích lũy' },
  { day: 7, rewardCoins: 10, label: '10 Xu + Danh hiệu Thổ Địa Hàng Khay 👑', itemReward: 'title_thodia' },
] as const;

/** Hệ thống Cấp bậc Khách quen */
export interface PatronLevel {
  level: number;
  title: string;
  minFullRounds: number;
  color: string;
  badge: string;
}

export const PATRON_LEVELS: readonly PatronLevel[] = [
  { level: 1, title: 'Khách Vãng Lai', minFullRounds: 0, color: '#a0aec0', badge: '🌱' },
  { level: 2, title: 'Khách Quen Phố Cổ', minFullRounds: 5, color: '#48bb78', badge: '🍵' },
  { level: 3, title: 'Tri Kỷ Quán Bà Ba', minFullRounds: 20, color: '#4299e1', badge: '⭐' },
  { level: 4, title: 'Cổ Đông Quán Nước', minFullRounds: 50, color: '#ed8936', badge: '👑' },
  { level: 5, title: 'Huyền Thoại Vỉa Hè', minFullRounds: 100, color: '#ecc94b', badge: '🔥' },
] as const;

export function getPatronLevel(totalFullRounds: number): PatronLevel {
  for (let i = PATRON_LEVELS.length - 1; i >= 0; i--) {
    const l = PATRON_LEVELS[i]!;
    if (totalFullRounds >= l.minFullRounds) return l;
  }
  return PATRON_LEVELS[0]!;
}

/** Hệ thống Thành tựu vỉa hè */
export interface Achievement {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  rewardCoins: number;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first_tea', title: 'Ngụm trà đầu tiên', desc: 'Ngồi uống xong trọn vẹn 1 tuần trà', emoji: '🍵', rewardCoins: 2 },
  { id: 'seeds_master', title: 'Bậc thầy cắn hạt dưa', desc: 'Bấm cắn hạt dưa 30 lần tại quán', emoji: '🥜', rewardCoins: 3 },
  { id: 'generous', title: 'Tay chơi hào hiệp', desc: 'Đãi bạn ngồi cạnh một ly trà đá đặc biệt', emoji: '🎁', rewardCoins: 2 },
  { id: 'treat_all', title: 'Bao trọn quán', desc: 'Rung chuông chiêu đãi tất cả 14 bàn', emoji: '🔔', rewardCoins: 5 },
  { id: 'smoke_chill', title: 'Khói thuốc mây bay', desc: 'Thưởng thức bao thuốc Thăng Long hoặc rít điếu cày', emoji: '🚬', rewardCoins: 2 },
  { id: 'night_owl', title: 'Cú đêm phố cổ', desc: 'Ghé quán ngồi trong khung giờ khuya từ 0h - 4h', emoji: '🦉', rewardCoins: 3 },
  { id: 'dj_master', title: 'DJ Vỉa Hè', desc: 'Chiếu 3 video/bài hát lên màn hình TV', emoji: '📺', rewardCoins: 3 },
  { id: 'fortune_lucky', title: 'Bàn tay vàng', desc: 'Lắc được một quẻ Đại Cát từ ống xăm Bà Ba', emoji: '🎋', rewardCoins: 3 },
] as const;

/** Thú cưng vỉa hè */
export interface PetDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

export const PETS: readonly PetDef[] = [
  { id: 'cat', name: 'Mèo mướp vàng', emoji: '🐱', desc: 'Nằm cuộn tròn ngủ lười dưới chân ghế' },
  { id: 'dog', name: 'Chó mực vỉa hè', emoji: '🐕', desc: 'Lăng xăng mừng khách đến chơi quán' },
  { id: 'bird', name: 'Chào mào lồng tre', emoji: '🐦', desc: 'Treo trên cành sấu cổ thụ hót líu lo' },
] as const;

/** Tuỳ biến ly đồ uống */
export interface DrinkDef {
  id: string;
  name: string;
  color: number;
  emoji: string;
  desc: string;
}

/** Bản đồ 3 Miền */
export type MapRegion = 'hanoi' | 'saigon' | 'danang';

export interface MapDef {
  id: MapRegion;
  name: string;
  subtitle: string;
  emoji: string;
}

export const MAP_REGIONS: readonly MapDef[] = [
  { id: 'hanoi', name: 'Phố Cổ Hà Nội', subtitle: 'Phố Tràng Tiền - Cổ kính & rêu phong', emoji: '🏮' },
  { id: 'saigon', name: 'Cà Phê Bệt Sài Gòn', subtitle: 'Nhà Thờ Đức Bà - Nắng vàng rực rỡ', emoji: '☀️' },
  { id: 'danang', name: 'Bến Biển Hội An', subtitle: 'Bờ biển đêm hè - Gió mát & đèn lồng', emoji: '🌊' },
] as const;

/** 4 Mùa */
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonDef {
  id: SeasonType;
  name: string;
  emoji: string;
  desc: string;
}

export const SEASONS: readonly SeasonDef[] = [
  { id: 'spring', name: 'Mùa Xuân', emoji: '🌸', desc: 'Hoa đào khoe sắc, mưa phùn ấm áp' },
  { id: 'summer', name: 'Mùa Hạ', emoji: '☀️', desc: 'Nắng vàng rực rỡ, tiếng ve râm ran' },
  { id: 'autumn', name: 'Mùa Thu', emoji: '🍂', desc: 'Lá vàng bay nhẹ, gió heo may thoang thoảng' },
  { id: 'winter', name: 'Mùa Đông', emoji: '❄️', desc: 'Se lạnh phố đông, bếp than hồng ấm cúng' },
] as const;

/** Bộ lọc màu màn hình (Atmospheric Filters) */
export type ColorFilter = 'normal' | 'retro90s' | 'cyberpunk' | 'moodyRain' | 'warmSunset';

export interface FilterDef {
  id: ColorFilter;
  name: string;
  cssFilter: string;
  desc: string;
}

export const COLOR_FILTERS: readonly FilterDef[] = [
  { id: 'normal', name: 'Màu tự nhiên', cssFilter: 'none', desc: 'Màu sắc thực tế nguyên bản' },
  { id: 'retro90s', name: 'Hà Nội Thập Niên 90', cssFilter: 'sepia(0.35) contrast(1.1) brightness(0.95) saturate(1.2)', desc: 'Hoài niệm màu phim Kodak xưa' },
  { id: 'cyberpunk', name: 'Cyberpunk Vỉa Hè', cssFilter: 'hue-rotate(270deg) saturate(1.4) contrast(1.15)', desc: 'Ánh đèn neon huyền ảo' },
  { id: 'moodyRain', name: 'Mưa Chiều Lặng Lẽ', cssFilter: 'grayscale(0.35) contrast(1.05) brightness(0.92)', desc: 'Tông lạnh lắng đọng suy tư' },
  { id: 'warmSunset', name: 'Hoàng Hôn Nắng Vàng', cssFilter: 'sepia(0.2) saturate(1.4) brightness(1.02)', desc: 'Nắng chiều ấm áp vỉa hè' },
] as const;


export const DRINKS: readonly DrinkDef[] = [
  { id: 'tra_da', name: 'Trà đá Hà Nội', color: 0xc4802a, emoji: '🍵', desc: 'Đậm vị chè tươi chát ngọt giải nhiệt' },
  { id: 'cafe_sua', name: 'Cà phê sữa đá Sài Gòn', color: 0x6f4e37, emoji: '☕', desc: 'Thơm nức mũi, đậm đà béo ngậy' },
  { id: 'nuoc_mia', name: 'Nước mía siêu sạch', color: 0x98d85b, emoji: '🎋', desc: 'Ngọt lịm mát rượi thơm hương quất' },
  { id: 'tra_chanh', name: 'Trà chanh chém gió', color: 0xe5c158, emoji: '🍋', desc: 'Chua thanh ngọt mát chuẩn phố Nhà Thờ' },
  { id: 'nuoc_sau', name: 'Nước sấu ngâm gừng', color: 0xa87c3a, emoji: '🫒', desc: 'Chua giòn thơm nồng mùi gừng tươi' },
] as const;
