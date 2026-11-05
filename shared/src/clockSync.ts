/** Đo độ lệch giờ máy so với server (kiểu NTP đơn giản). */
export interface TimeSample {
  /** Giờ máy lúc gửi yêu cầu. */
  t0: number;
  /** Giờ máy lúc nhận phản hồi. */
  t1: number;
  /** Giờ server trong phản hồi. */
  serverTime: number;
}

/** serverNow ≈ clientNow + offset, giả định độ trễ đi và về bằng nhau. */
export function offsetFromSample(s: TimeSample): number {
  return s.serverTime - (s.t0 + s.t1) / 2;
}

/** Lấy mẫu có RTT nhỏ nhất (đáng tin nhất). Trả null nếu không có mẫu hợp lệ. */
export function bestOffset(samples: readonly TimeSample[]): number | null {
  let best: TimeSample | null = null;
  for (const s of samples) {
    if (![s.t0, s.t1, s.serverTime].every(Number.isFinite) || s.t1 < s.t0) continue;
    if (best === null || s.t1 - s.t0 < best.t1 - best.t0) best = s;
  }
  return best ? offsetFromSample(best) : null;
}
