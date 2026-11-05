import { describe, expect, it } from 'vitest';
import {
  COLOR_FILTERS,
  DAILY_STREAK_REWARDS,
  DRINKS,
  getPatronLevel,
  MAP_REGIONS,
  SEASONS,
} from './retention';

describe('retention and immersion system', () => {
  it('hệ thống điểm danh 7 ngày có đủ 7 mốc', () => {
    expect(DAILY_STREAK_REWARDS.length).toBe(7);
    expect(DAILY_STREAK_REWARDS[6]?.rewardCoins).toBe(10);
  });

  it('tính toán cấp bậc khách quen chính xác theo số tuần trà', () => {
    expect(getPatronLevel(0).title).toBe('Khách Vãng Lai');
    expect(getPatronLevel(5).title).toBe('Khách Quen Phố Cổ');
    expect(getPatronLevel(25).title).toBe('Tri Kỷ Quán Bà Ba');
    expect(getPatronLevel(60).title).toBe('Cổ Đông Quán Nước');
    expect(getPatronLevel(120).title).toBe('Huyền Thoại Vỉa Hè');
  });

  it('danh sách các loại đồ uống vỉa hè đa dạng', () => {
    expect(DRINKS.length).toBeGreaterThanOrEqual(5);
    expect(DRINKS.map((d) => d.id)).toContain('tra_da');
    expect(DRINKS.map((d) => d.id)).toContain('cafe_sua');
  });

  it('hỗ trợ 3 bản đồ vùng miền và 4 mùa', () => {
    expect(MAP_REGIONS.length).toBe(3);
    expect(SEASONS.length).toBe(4);
    expect(COLOR_FILTERS.length).toBe(5);
  });
});
