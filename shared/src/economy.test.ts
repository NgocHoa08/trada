import { describe, expect, it } from 'vitest';
import {
  generateRecoveryCode,
  isValidRecoveryCode,
  normalizeRecoveryCode,
  getVnDayString,
  getPreviousDayString,
  getVnWeekId,
} from './economy';

describe('economy helpers', () => {
  it('sinh mã khôi phục hợp lệ 10 ký tự, không chứa ký tự dễ nhầm lẫn 0, O, 1, I, L', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRecoveryCode();
      expect(code).toHaveLength(10);
      expect(isValidRecoveryCode(code)).toBe(true);
      expect(code).not.toMatch(/[0O1IL]/);
    }
  });

  it('chuẩn hoá mã khôi phục', () => {
    expect(normalizeRecoveryCode('abc-def-2345')).toBe('ABCDEF2345');
    expect(normalizeRecoveryCode(' A B C D E F 2 3 4 5 ')).toBe('ABCDEF2345');
  });

  it('tính ngày VN qua ranh giới 0h đúng', () => {
    // 2026-05-01 16:59:59 UTC = 2026-05-01 23:59:59 VN
    const tBefore = Date.UTC(2026, 4, 1, 16, 59, 59);
    expect(getVnDayString(tBefore)).toBe('2026-05-01');

    // 2026-05-01 17:00:00 UTC = 2026-05-02 00:00:00 VN
    const tAfter = Date.UTC(2026, 4, 1, 17, 0, 0);
    expect(getVnDayString(tAfter)).toBe('2026-05-02');
  });

  it('tính ngày liền trước chính xác qua tháng và năm', () => {
    expect(getPreviousDayString('2026-05-01')).toBe('2026-04-30');
    expect(getPreviousDayString('2026-01-01')).toBe('2025-12-31');
  });

  it('mốc tuần bắt đầu từ 4h sáng thứ Hai giờ VN', () => {
    // Thứ Hai 2026-05-04 03:59:00 VN (chưa tới 4h sáng): vẫn thuộc tuần trước (bắt đầu 2026-04-27)
    // 03:59 VN = Chủ Nhật 20:59 UTC
    const sunNight = Date.UTC(2026, 4, 3, 20, 59, 0);
    expect(getVnWeekId(sunNight)).toBe('2026-04-27');

    // Thứ Hai 2026-05-04 04:00:00 VN (đã sang 4h sáng): sang tuần mới 2026-05-04
    // 04:00 VN = Chủ Nhật 21:00 UTC
    const monMorning = Date.UTC(2026, 4, 3, 21, 0, 0);
    expect(getVnWeekId(monMorning)).toBe('2026-05-04');
  });
});

