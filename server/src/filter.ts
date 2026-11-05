import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STORY_MAX } from '@tdvh/shared';

export const BLOCKLIST_PATH =
  process.env.BLOCKLIST_PATH ??
  fileURLToPath(new URL('../data/blocklist.vi.json', import.meta.url));

export type FilterReason = 'empty' | 'too_long' | 'link' | 'phone' | 'email' | 'profanity';
export type FilterResult = { ok: true; text: string } | { ok: false; reason: FilterReason };

/** Bỏ dấu tiếng Việt (đ → d) và chuyển chữ thường. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();
}

/** Chữ thường, giữ dấu, chuẩn NFC. */
const lower = (s: string): string => s.normalize('NFC').toLowerCase();

export function loadBlocklist(path: string = BLOCKLIST_PATH): string[] {
  const data: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(data) || !data.every((w) => typeof w === 'string')) {
    throw new Error('blocklist phải là mảng chuỗi');
  }
  return data.map((w) => lower(w).trim()).filter((w) => w !== '');
}

// Chỉ các đuôi tên miền ít gây nhầm với chữ thường ngày; viết liền, không cho khoảng trắng quanh dấu chấm
// (tránh chặn nhầm câu như "vui lắm. Me cũng vậy").
const LINK_RE =
  /(?:https?:\/\/|ftp:\/\/|www\.|\b(?:bit\.ly|goo\.gl|t\.me|tinyurl\.com)\b|\b[a-z0-9-]+\.(?:com|net|org|vn|io|info|biz|xyz|app|dev|link|edu|gov|asia)\b)/i;
const EMAIL_RE = /[^\s@]+\s?(?:@|\(at\))\s?[^\s@]+\.[a-z]{2,}/i;

/** Dãy ≥ 8 chữ số, cho phép chen khoảng trắng . - ( ) _ giữa các số (chặn số điện thoại). */
function hasPhoneLike(s: string): boolean {
  return /\d(?:[\s.\-()_]{0,2}\d){7,}/.test(s);
}

/** Chữ số đọc bằng chữ liền nhau ("không chín tám ..."), chặn lách số điện thoại. */
const DIGIT_WORDS = new Set([
  'khong',
  'mot',
  'hai',
  'ba',
  'bon',
  'nam',
  'sau',
  'bay',
  'tam',
  'chin',
]);
function hasSpelledPhone(folded: string): boolean {
  let run = 0;
  for (const w of folded.split(/[^a-z]+/)) {
    run = DIGIT_WORDS.has(w) ? run + 1 : 0;
    if (run >= 8) return true;
  }
  return false;
}

export class ContentFilter {
  private readonly words: Set<string>;

  /**
   * Từ cấm viết có dấu chỉ khớp khi người dùng cũng viết có dấu, còn từ viết không dấu chỉ khớp
   * khi người dùng cũng viết không dấu. Nhờ vậy "lớn", "các", "buổi" không bị chặn nhầm
   * (vì khi bỏ dấu chúng trùng với từ lóng).
   */
  constructor(blocklist: readonly string[]) {
    this.words = new Set(blocklist.map(lower));
  }

  hasProfanity(text: string): boolean {
    const tokens = lower(text)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
    // Cụm từ dài tới 3 từ
    for (let n = 1; n <= 3; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        if (this.words.has(tokens.slice(i, i + n).join(' '))) return true;
      }
    }
    // Chữ cái đơn lẻ liền nhau, ví dụ "d m m" hoặc "v.c.l"
    let singles = '';
    for (const t of [...tokens, '']) {
      if (Array.from(t).length === 1) singles += t;
      else {
        if (Array.from(singles).length >= 2 && this.words.has(singles)) return true;
        singles = '';
      }
    }
    return false;
  }

  /**
   * Làm sạch và kiểm tra một dòng "chuyện" hoặc tên hiển thị:
   * bỏ HTML, chuẩn hoá khoảng trắng, chặn link/email/số điện thoại/từ tục, giới hạn độ dài.
   */
  check(raw: string, maxLen: number = STORY_MAX): FilterResult {
    const text = raw
      .normalize('NFC')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[<>]/g, ' ')
      // ký tự điều khiển và ký tự ẩn/đổi chiều chữ
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060\ufeff]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text === '') return { ok: false, reason: 'empty' };
    if (Array.from(text).length > maxLen) return { ok: false, reason: 'too_long' };

    const folded = fold(text);
    if (EMAIL_RE.test(text)) return { ok: false, reason: 'email' };
    if (LINK_RE.test(text) || LINK_RE.test(folded)) return { ok: false, reason: 'link' };
    if (hasPhoneLike(text) || hasSpelledPhone(folded)) return { ok: false, reason: 'phone' };
    if (this.hasProfanity(text)) return { ok: false, reason: 'profanity' };
    return { ok: true, text };
  }
}

export const FILTER_MESSAGES: Record<FilterReason, string> = {
  empty: 'Bạn viết gì đó nhé.',
  too_long: `Chuyện hơi dài, tối đa ${STORY_MAX} ký tự thôi nha.`,
  link: 'Quán không cho dán đường link nhé.',
  phone: 'Quán không cho đăng số điện thoại nhé.',
  email: 'Quán không cho đăng email nhé.',
  profanity: 'Lời lẽ này hơi nặng, bạn nói nhẹ nhàng hơn nhé.',
};
