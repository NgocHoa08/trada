import { describe, expect, it } from 'vitest';
import { getVnHour } from './time';

describe('getVnHour', () => {
  it('0h UTC là 7h giờ VN', () => {
    expect(getVnHour(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe(7);
  });

  it('17h UTC là 0h sáng hôm sau giờ VN (ranh giới ngày)', () => {
    expect(getVnHour(Date.UTC(2026, 0, 1, 17, 0, 0))).toBe(0);
    expect(getVnHour(Date.UTC(2026, 0, 1, 16, 59, 59))).toBeCloseTo(24 - 1 / 3600, 5);
  });

  it('có phần lẻ phút', () => {
    expect(getVnHour(Date.UTC(2026, 0, 1, 11, 30, 0))).toBe(18.5);
  });

  it('luôn nằm trong [0, 24), kể cả thời gian âm', () => {
    for (const t of [-1, -86_400_000, 0, 1e12]) {
      const h = getVnHour(t);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(24);
    }
  });
});
