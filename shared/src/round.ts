import { ROUND_MS } from './constants';

export interface RoundInfo {
  /** Chỉ số tuần trà = floor(serverNowMs / ROUND_MS). */
  roundIndex: number;
  /** Mốc bắt đầu tuần trà (ms epoch). */
  startMs: number;
  /** Mốc kết thúc tuần trà (ms epoch). */
  endMs: number;
  /** Tiến độ 0..1 (nửa mở: đạt 1 thì đã sang tuần mới). */
  progress: number;
  /** Số ms còn lại tới lúc đổi tuần trà. */
  remainingMs: number;
}

/**
 * Hàm thuần: tính tuần trà từ thời gian server (ms epoch, UTC).
 * Vì ROUND_MS chia hết cho mốc :00/:30 nên không phụ thuộc múi giờ.
 * Client phải truyền `Date.now() + offset` (offset đo từ server), không dùng giờ máy thô.
 */
export function getRound(nowMs: number): RoundInfo {
  if (!Number.isFinite(nowMs)) throw new RangeError('nowMs phải là số hữu hạn');
  const roundIndex = Math.floor(nowMs / ROUND_MS);
  const startMs = roundIndex * ROUND_MS;
  const elapsed = nowMs - startMs;
  return {
    roundIndex,
    startMs,
    endMs: startMs + ROUND_MS,
    progress: elapsed / ROUND_MS,
    remainingMs: ROUND_MS - elapsed,
  };
}
