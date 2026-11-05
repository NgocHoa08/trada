import { AVATAR_IDS, MOOD_IDS, SEAT_PREFS, AVATARS, MOODS, sanitizeName } from '@tdvh/shared';

export interface Profile {
  name: string;
  avatar: string;
  mood: string;
  seatPref: string;
}

const KEY = 'tdvh.profile.v1';

export const DEFAULT_PROFILE: Profile = {
  name: '',
  avatar: AVATARS[0]?.id ?? 'a1',
  mood: MOODS[1]?.id ?? 'chill',
  seatPref: SEAT_PREFS[1]?.id ?? 't2',
};

/** Kiểm tra dữ liệu đọc từ localStorage; trường nào sai thì dùng mặc định. */
export function loadProfile(): Profile {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_PROFILE };
    const r = raw as Record<string, unknown>;
    return {
      name: typeof r.name === 'string' ? sanitizeName(r.name) : '',
      avatar:
        typeof r.avatar === 'string' && AVATAR_IDS.has(r.avatar)
          ? r.avatar
          : DEFAULT_PROFILE.avatar,
      mood: typeof r.mood === 'string' && MOOD_IDS.has(r.mood) ? r.mood : DEFAULT_PROFILE.mood,
      seatPref:
        typeof r.seatPref === 'string' && SEAT_PREFS.some((p) => p.id === r.seatPref)
          ? r.seatPref
          : DEFAULT_PROFILE.seatPref,
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // trình duyệt chặn lưu (chế độ riêng tư): bỏ qua
  }
}
