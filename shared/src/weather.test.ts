import { describe, expect, it } from 'vitest';
import { getWeatherForRound, WEATHER_OPTIONS } from './weather';

describe('weather', () => {
  it('trả về loại thời tiết hợp lệ cho các roundIndex', () => {
    const valid = ['sunny', 'rainy', 'cloudy'];
    for (let r = 0; r < 50; r++) {
      const w = getWeatherForRound(r);
      expect(valid).toContain(w);
    }
  });

  it('tính xác định: cùng roundIndex luôn cho cùng một thời tiết', () => {
    expect(getWeatherForRound(123456)).toBe(getWeatherForRound(123456));
    expect(getWeatherForRound(9999)).toBe(getWeatherForRound(9999));
  });

  it('có đủ cả nắng và mưa trong các tuần trà', () => {
    const results = new Set<string>();
    for (let r = 0; r < 100; r++) {
      results.add(getWeatherForRound(r));
    }
    expect(results.has('sunny')).toBe(true);
    expect(results.has('rainy')).toBe(true);
  });

  it('danh sách WEATHER_OPTIONS có 4 tuỳ chọn', () => {
    expect(WEATHER_OPTIONS.length).toBe(4);
    expect(WEATHER_OPTIONS.map((o) => o.id)).toEqual(['auto', 'sunny', 'rainy', 'cloudy']);
  });
});
