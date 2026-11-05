import { describe, expect, it } from 'vitest';
import { ACCESSORIES, getBossGreeting } from './accessories';

describe('accessories and greetings', () => {
  it('danh sách phụ kiện mở khoá theo chuỗi ngày', () => {
    expect(ACCESSORIES).toHaveLength(5);
    expect(ACCESSORIES[0]?.minStreak).toBe(1);
    expect(ACCESSORIES.at(-1)?.minStreak).toBe(30);
  });

  it('lời chào của bà chủ đổi theo mốc 3, 7, 30 ngày', () => {
    expect(getBossGreeting(0, 'Lan')).toContain('Chào con');
    expect(getBossGreeting(3, 'Lan')).toContain('Lại ghé quán à');
    expect(getBossGreeting(7, 'Lan')).toContain('chăm ghé quán thế');
    expect(getBossGreeting(35, 'Lan')).toContain('Chào khách ruột');
  });
});

