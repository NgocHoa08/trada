import type { SeatDef } from './seats';
import { SEATS } from './seats';

export const NAME_MAX = 20;

export interface AvatarDef {
  id: string;
  label: string;
  shirt: number;
  pants: number;
  skin: number;
  hair: number;
  hat: 'nonla' | 'noncoi' | 'cap' | 'none';
}

/** Nhân vật tự dựng bằng hình khối (khi có model KayKit thật thì thay, giữ nguyên id). */
export const AVATARS: readonly AvatarDef[] = [
  {
    id: 'a1',
    label: 'Cô nón lá',
    shirt: 0xd6577a,
    pants: 0x3b3b52,
    skin: 0xf0c8a0,
    hair: 0x1e1612,
    hat: 'nonla',
  },
  {
    id: 'a2',
    label: 'Chú nón cối',
    shirt: 0x6f8a4a,
    pants: 0x4a4030,
    skin: 0xe0b088,
    hair: 0x2a2018,
    hat: 'noncoi',
  },
  {
    id: 'a3',
    label: 'Bạn áo thun',
    shirt: 0x3d8fd1,
    pants: 0x2f3a50,
    skin: 0xf2cfa8,
    hair: 0x241a14,
    hat: 'none',
  },
  {
    id: 'a4',
    label: 'Bà tóc bạc',
    shirt: 0x8a5ca8,
    pants: 0x504058,
    skin: 0xe8bf9a,
    hair: 0xd8d8d8,
    hat: 'none',
  },
  {
    id: 'a5',
    label: 'Anh mũ lưỡi trai',
    shirt: 0xe0a02a,
    pants: 0x30343c,
    skin: 0xd9a77c,
    hair: 0x181210,
    hat: 'cap',
  },
  {
    id: 'a6',
    label: 'Chị áo đỏ',
    shirt: 0xc8352f,
    pants: 0x2a2a30,
    skin: 0xf4d2b0,
    hair: 0x4a2a1a,
    hat: 'none',
  },
];

export interface MoodDef {
  id: string;
  label: string;
  emoji: string;
}

export const MOODS: readonly MoodDef[] = [
  { id: 'vui', label: 'Vui', emoji: '😄' },
  { id: 'chill', label: 'Thư thả', emoji: '😌' },
  { id: 'met', label: 'Hơi mệt', emoji: '🥱' },
  { id: 'nho', label: 'Đang nhớ', emoji: '🥹' },
  { id: 'doi', label: 'Đói bụng', emoji: '🤤' },
  { id: 'tramtu', label: 'Trầm tư', emoji: '🤔' },
];

export const AVATAR_IDS: ReadonlySet<string> = new Set(AVATARS.map((a) => a.id));
export const MOOD_IDS: ReadonlySet<string> = new Set(MOODS.map((m) => m.id));

export interface SeatPrefDef {
  id: string;
  label: string;
}

/** "Chỗ ngồi ưa thích" chọn theo khu vực, không chọn từng ghế. */
export const SEAT_PREFS: readonly SeatPrefDef[] = [
  { id: 't1', label: 'Bàn bên trái' },
  { id: 't2', label: 'Bàn giữa' },
  { id: 't3', label: 'Bàn bên phải' },
  { id: 'curb', label: 'Mép vỉa hè' },
];

export function seatsForPref(pref: string): SeatDef[] {
  const tableId = pref === 'curb' ? null : pref;
  const list = SEATS.filter((s) => s.tableId === tableId);
  // pref lạ thì coi như "chỗ nào cũng được"
  return list.length > 0 ? list : [...SEATS];
}

/**
 * Làm sạch tên hiển thị: bỏ ký tự điều khiển và `<>`, gộp khoảng trắng, cắt còn NAME_MAX ký tự.
 * Chỉ là lớp đầu; hiển thị luôn dùng textContent. Lọc link/từ tục làm ở server (giai đoạn 3).
 */
export function sanitizeName(raw: string): string {
  const noControl = Array.from(raw, (ch) => {
    const c = ch.charCodeAt(0);
    return c < 32 || c === 127 || ch === '<' || ch === '>' ? ' ' : ch;
  }).join('');
  const cleaned = noControl.replace(/\s+/g, ' ').trim();
  return Array.from(cleaned).slice(0, NAME_MAX).join('').trim();
}
