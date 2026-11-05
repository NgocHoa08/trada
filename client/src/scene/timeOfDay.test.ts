import { describe, expect, it } from 'vitest';
import { getLamp, getSkyState, lerpColor } from './timeOfDay';

describe('lerpColor', () => {
  it('đầu mút và giữa', () => {
    expect(lerpColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(lerpColor(0x000000, 0xfefefe, 0.5)).toBe(0x7f7f7f);
  });
});

describe('getLamp', () => {
  it('tắt ban ngày, sáng ban đêm, lên dần lúc chiều tối', () => {
    expect(getLamp(12)).toBe(0);
    expect(getLamp(18.5)).toBeCloseTo(0.5);
    expect(getLamp(20)).toBe(1);
    expect(getLamp(2)).toBe(1);
    expect(getLamp(5.75)).toBeCloseTo(0.5);
  });
});

describe('getSkyState', () => {
  it('ban ngày sáng hơn ban đêm', () => {
    expect(getSkyState(12).sunIntensity).toBeGreaterThan(getSkyState(23).sunIntensity);
  });

  it('khuya vắng xe hơn giờ tan tầm', () => {
    expect(getSkyState(2).traffic).toBeLessThan(getSkyState(17.5).traffic);
  });

  it('liên tục qua nửa đêm và chuẩn hoá giờ ngoài khoảng', () => {
    expect(getSkyState(24).sky).toBe(getSkyState(0).sky);
    expect(getSkyState(-1).sky).toBe(getSkyState(23).sky);
    expect(getSkyState(23.999).sky).toBe(getSkyState(0).sky);
  });

  it('mọi giờ đều cho giá trị hợp lệ', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const s = getSkyState(h);
      expect(s.lamp).toBeGreaterThanOrEqual(0);
      expect(s.lamp).toBeLessThanOrEqual(1);
      expect(Number.isFinite(s.sunIntensity)).toBe(true);
    }
  });
});
