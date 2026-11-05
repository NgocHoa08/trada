export interface Accessory {
  id: string;
  name: string;
  minStreak: number;
  emoji: string;
  desc: string;
}

export const ACCESSORIES: readonly Accessory[] = [
  { id: 'quatgiay', name: 'Quạt giấy thủ công', minStreak: 1, emoji: '🪭', desc: 'Có sẵn cho mọi người ghé quán' },
  { id: 'nonla', name: 'Nón lá truyền thống', minStreak: 3, emoji: '👒', desc: 'Mở khoá khi đạt chuỗi 3 ngày' },
  { id: 'deptong', name: 'Dép tông lào', minStreak: 7, emoji: '🩴', desc: 'Mở khoá khi đạt chuỗi 7 ngày' },
  { id: 'noncoi', name: 'Nón cối thời bao cấp', minStreak: 14, emoji: '⛑️', desc: 'Mở khoá khi đạt chuỗi 14 ngày' },
  { id: 'aomua', name: 'Áo mưa cánh dơi', minStreak: 30, emoji: '🧥', desc: 'Mở khoá khi đạt chuỗi 30 ngày' },
];

/** Lời chào riêng của bà chủ quán theo chuỗi ngày */
export function getBossGreeting(streak: number, name: string): string {
  if (streak >= 30) {
    return `Bà chủ: "Chào khách ruột ${name}! Vẫn góc cũ ly trà đá đậm vị nhé!"`;
  }
  if (streak >= 7) {
    return `Bà chủ: "A ${name}, tuần này chăm ghé quán thế! Trà đá vừa pha mát lạnh đây."`;
  }
  if (streak >= 3) {
    return `Bà chủ: "Lại ghé quán à ${name}, ngồi đi bà rót trà liền!"`;
  }
  return `Bà chủ: "Chào con, vào làm ly trà đá cho mát lòng nhé!"`;
}

