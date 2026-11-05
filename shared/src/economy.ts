import { VN_OFFSET_MS } from './time';

/** Bảng chữ cái 31 ký tự dễ đọc, đã loại bỏ 0, O, 1, I, L */
export const RECOVERY_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Sinh mã khôi phục ngẫu nhiên 10 ký tự */
export function generateRecoveryCode(): string {
  let code = '';
  for (let i = 0; i < 10; i++) {
    const idx = Math.floor(Math.random() * RECOVERY_CHARS.length);
    code += RECOVERY_CHARS[idx];
  }
  return code;
}

/** Chuẩn hoá mã khôi phục người dùng nhập vào (bỏ khoảng trắng, viết hoa) */
export function normalizeRecoveryCode(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

export function isValidRecoveryCode(code: string): boolean {
  if (code.length !== 10) return false;
  for (const ch of code) {
    if (!RECOVERY_CHARS.includes(ch)) return false;
  }
  return true;
}

/**
 * Trả về chuỗi ngày YYYY-MM-DD theo giờ VN (UTC+7). Ranh giới lúc 0h đêm giờ VN.
 */
export function getVnDayString(nowMs: number): string {
  const vnDate = new Date(nowMs + VN_OFFSET_MS);
  const y = vnDate.getUTCFullYear();
  const m = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(vnDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Tính ngày liền trước đó (YYYY-MM-DD).
 */
export function getPreviousDayString(dayStr: string): string {
  const [y, m, d] = dayStr.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  date.setUTCDate(date.getUTCDate() - 1);
  const py = date.getUTCFullYear();
  const pm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const pd = String(date.getUTCDate()).padStart(2, '0');
  return `${py}-${pm}-${pd}`;
}

/**
 * Trả về mốc tuần (Chu kỳ tuần bắt đầu lúc 4h sáng thứ Hai giờ VN).
 * Trả về định dạng YYYY-Www (hoặc timestamp bắt đầu tuần).
 */
export function getVnWeekId(nowMs: number): string {
  // Trừ 4 tiếng: Tuần bắt đầu lúc 4h sáng thứ Hai
  // Thời gian dịch chuyển = nowMs + 7h - 4h = nowMs + 3h
  const shiftedMs = nowMs + 3 * 3_600_000;
  const d = new Date(shiftedMs);
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // Thứ 2 = 0, CN = 6
  const mondayMs = shiftedMs - dayOfWeek * 86_400_000;
  const monday = new Date(mondayMs);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const day = String(monday.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

