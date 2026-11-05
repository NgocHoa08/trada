import { describe, expect, it } from 'vitest';
import { ROUND_MS } from './constants';
import { getRound } from './round';

// 2026-01-01T00:00:00Z, chia hết cho 30 phút
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);

describe('getRound', () => {
  it('đầu tuần trà: progress = 0', () => {
    const r = getRound(T0);
    expect(r.roundIndex).toBe(Math.floor(T0 / ROUND_MS));
    expect(r.startMs).toBe(T0);
    expect(r.endMs).toBe(T0 + ROUND_MS);
    expect(r.progress).toBe(0);
    expect(r.remainingMs).toBe(ROUND_MS);
  });

  it('giữa tuần trà: progress = 0.5', () => {
    const r = getRound(T0 + ROUND_MS / 2);
    expect(r.progress).toBeCloseTo(0.5);
    expect(r.remainingMs).toBe(ROUND_MS / 2);
  });

  it('1ms trước khi đổi vẫn thuộc tuần cũ', () => {
    const a = getRound(T0 + ROUND_MS - 1);
    const b = getRound(T0 + ROUND_MS);
    expect(b.roundIndex).toBe(a.roundIndex + 1);
    expect(a.progress).toBeLessThan(1);
    expect(b.progress).toBe(0);
  });

  it('đổi tuần đúng lúc :00 và :30 (UTC và giờ VN đều trùng vì lệch 7 tiếng nguyên)', () => {
    const at = (h: number, m: number) => getRound(Date.UTC(2026, 5, 15, h, m, 0)).roundIndex;
    expect(at(10, 29)).toBe(at(10, 0));
    expect(at(10, 30)).toBe(at(10, 0) + 1);
    expect(at(11, 0)).toBe(at(10, 0) + 2);
  });

  it('mọi máy cùng serverNow thì cùng roundIndex (độc lập giờ máy)', () => {
    const serverNow = T0 + 12_345;
    // máy lệch +/- 10 phút nhưng đã bù offset đo được
    const clientClock = serverNow + 600_000;
    const offset = serverNow - clientClock;
    expect(getRound(clientClock + offset).roundIndex).toBe(getRound(serverNow).roundIndex);
  });

  it('thời gian trước 1970 vẫn đúng (floor, không phải trunc)', () => {
    expect(getRound(-1).roundIndex).toBe(-1);
    expect(getRound(-1).progress).toBeCloseTo(1, 5);
  });

  it('ném lỗi với giá trị không hợp lệ', () => {
    expect(() => getRound(NaN)).toThrow(RangeError);
    expect(() => getRound(Infinity)).toThrow(RangeError);
  });
});
