/** Giờ Việt Nam (Asia/Ho_Chi_Minh) luôn là UTC+7, không có giờ mùa hè. */
export const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;

/** Giờ trong ngày theo giờ VN, số thực trong [0, 24). Ví dụ 18:30 → 18.5. */
export function getVnHour(nowMs: number): number {
  if (!Number.isFinite(nowMs)) throw new RangeError('nowMs phải là số hữu hạn');
  const msOfDay = (((nowMs + VN_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
  return msOfDay / 3_600_000;
}
